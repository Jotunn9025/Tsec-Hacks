from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Optional
from datetime import datetime
import os
import uuid

from auth.dependencies import get_db, get_current_user, RoleChecker
from models.user import User
from models.user_role import UserRole
from models.live_session import LiveSession, SessionRegistration, LiveSessionStatus
from pydantic import BaseModel

router = APIRouter(
    prefix="/live",
    tags=["live-sessions"]
)

instructor_only = RoleChecker([UserRole.INSTRUCTOR])
student_only = RoleChecker([UserRole.USER])

# ============================================
# SCHEMAS
# ============================================

class LiveSessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    price: float = 0.0
    max_participants: Optional[int] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None

class LiveSessionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    instructor_id: int
    instructor_name: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    status: str
    price: float
    max_participants: Optional[int]
    current_participants: int = 0
    thumbnail_url: Optional[str]
    category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class RegistrationOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    paid_amount: float
    registered_at: datetime
    attended: bool
    session: Optional[LiveSessionOut] = None

    class Config:
        from_attributes = True

class StreamingTokenRequest(BaseModel):
    session_id: int
    role: str  # "publisher" or "subscriber"

class StreamingTokenResponse(BaseModel):
    token: str
    channel_name: str
    uid: int
    app_id: str

# ============================================
# WebSocket Chat Manager
# ============================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
    
    async def broadcast(self, message: dict, session_id: int, exclude: WebSocket = None):
        """Broadcast message to all clients, optionally excluding one (the sender)."""
        for connection in self.active_connections.get(session_id, []):
            if connection == exclude:
                continue  # Skip the sender
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ============================================
# INSTRUCTOR ENDPOINTS
# ============================================

@router.post("/instructor/sessions", response_model=LiveSessionOut)
async def create_live_session(
    session_in: LiveSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new scheduled live session."""
    # Generate unique channel name
    channel_name = f"session_{uuid.uuid4().hex[:12]}"
    
    new_session = LiveSession(
        title=session_in.title,
        description=session_in.description,
        instructor_id=current_user.id,
        scheduled_start=session_in.scheduled_start,
        scheduled_end=session_in.scheduled_end,
        price=session_in.price,
        max_participants=session_in.max_participants,
        thumbnail_url=session_in.thumbnail_url,
        category=session_in.category,
        status=LiveSessionStatus.SCHEDULED,
        agora_channel=channel_name
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return LiveSessionOut(
        **{c.name: getattr(new_session, c.name) for c in new_session.__table__.columns},
        instructor_name=current_user.name,
        current_participants=0
    )

@router.get("/instructor/sessions", response_model=List[LiveSessionOut])
async def get_instructor_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sessions created by the instructor."""
    sessions = db.query(LiveSession).filter(
        LiveSession.instructor_id == current_user.id
    ).order_by(LiveSession.scheduled_start.desc()).all()
    
    result = []
    for s in sessions:
        participant_count = db.query(SessionRegistration).filter(
            SessionRegistration.session_id == s.id
        ).count()
        result.append(LiveSessionOut(
            **{c.name: getattr(s, c.name) for c in s.__table__.columns},
            instructor_name=current_user.name,
            current_participants=participant_count
        ))
    return result

@router.post("/instructor/sessions/{session_id}/start", response_model=LiveSessionOut)
async def start_live_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark session as live (go live)."""
    session = db.query(LiveSession).filter(
        LiveSession.id == session_id,
        LiveSession.instructor_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != LiveSessionStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Session cannot be started")
    
    session.status = LiveSessionStatus.LIVE
    session.actual_start = datetime.utcnow()
    db.commit()
    db.refresh(session)
    
    participant_count = db.query(SessionRegistration).filter(
        SessionRegistration.session_id == session.id
    ).count()
    
    return LiveSessionOut(
        **{c.name: getattr(session, c.name) for c in session.__table__.columns},
        instructor_name=current_user.name,
        current_participants=participant_count
    )

@router.post("/instructor/sessions/{session_id}/end", response_model=LiveSessionOut)
async def end_live_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a live session."""
    session = db.query(LiveSession).filter(
        LiveSession.id == session_id,
        LiveSession.instructor_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != LiveSessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session is not live")
    
    session.status = LiveSessionStatus.ENDED
    session.actual_end = datetime.utcnow()
    db.commit()
    db.refresh(session)
    
    participant_count = db.query(SessionRegistration).filter(
        SessionRegistration.session_id == session.id
    ).count()
    
    return LiveSessionOut(
        **{c.name: getattr(session, c.name) for c in session.__table__.columns},
        instructor_name=current_user.name,
        current_participants=participant_count
    )

# ============================================
# STUDENT ENDPOINTS
# ============================================

@router.get("/student/sessions", response_model=List[LiveSessionOut])
async def browse_live_sessions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Browse available live sessions (scheduled and live)."""
    query = db.query(LiveSession).filter(
        or_(
            LiveSession.status == LiveSessionStatus.SCHEDULED,
            LiveSession.status == LiveSessionStatus.LIVE
        )
    )
    
    if status_filter:
        query = query.filter(LiveSession.status == status_filter)
    
    sessions = query.order_by(LiveSession.scheduled_start.asc()).all()
    
    result = []
    for s in sessions:
        participant_count = db.query(SessionRegistration).filter(
            SessionRegistration.session_id == s.id
        ).count()
        result.append(LiveSessionOut(
            **{c.name: getattr(s, c.name) for c in s.__table__.columns},
            instructor_name=s.instructor.name if s.instructor else None,
            current_participants=participant_count
        ))
    return result

@router.get("/student/sessions/{session_id}", response_model=LiveSessionOut)
async def get_session_details(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get details of a specific session."""
    session = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    participant_count = db.query(SessionRegistration).filter(
        SessionRegistration.session_id == session.id
    ).count()
    
    return LiveSessionOut(
        **{c.name: getattr(session, c.name) for c in session.__table__.columns},
        instructor_name=session.instructor.name if session.instructor else None,
        current_participants=participant_count
    )

@router.post("/student/sessions/{session_id}/register", response_model=RegistrationOut)
async def register_for_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pre-register for a scheduled session (with payment)."""
    session = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status not in [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE]:
        raise HTTPException(status_code=400, detail="Session is not available for registration")
    
    # Check if already registered
    existing = db.query(SessionRegistration).filter(
        SessionRegistration.session_id == session_id,
        SessionRegistration.student_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this session")
    
    # Check max participants
    if session.max_participants:
        current_count = db.query(SessionRegistration).filter(
            SessionRegistration.session_id == session_id
        ).count()
        if current_count >= session.max_participants:
            raise HTTPException(status_code=400, detail="Session is full")
    
    # TODO: Integrate with payment API to deduct from wallet
    # For now, we'll just create the registration
    
    registration = SessionRegistration(
        session_id=session_id,
        student_id=current_user.id,
        paid_amount=session.price,
        attended=False
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    
    return registration

@router.post("/student/sessions/{session_id}/join", response_model=RegistrationOut)
async def join_live_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a live session (register if not already, mark as attended)."""
    session = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != LiveSessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session is not live")
    
    # Check if already registered
    registration = db.query(SessionRegistration).filter(
        SessionRegistration.session_id == session_id,
        SessionRegistration.student_id == current_user.id
    ).first()
    
    if not registration:
        # Check max participants
        if session.max_participants:
            current_count = db.query(SessionRegistration).filter(
                SessionRegistration.session_id == session_id
            ).count()
            if current_count >= session.max_participants:
                raise HTTPException(status_code=400, detail="Session is full")
        
        # TODO: Integrate with payment API
        registration = SessionRegistration(
            session_id=session_id,
            student_id=current_user.id,
            paid_amount=session.price,
            attended=True
        )
        db.add(registration)
    else:
        registration.attended = True
    
    db.commit()
    db.refresh(registration)
    
    return registration

@router.get("/student/my-registrations", response_model=List[RegistrationOut])
async def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sessions the student has registered for."""
    registrations = db.query(SessionRegistration).filter(
        SessionRegistration.student_id == current_user.id
    ).all()
    
    result = []
    for r in registrations:
        session = r.session
        participant_count = db.query(SessionRegistration).filter(
            SessionRegistration.session_id == session.id
        ).count()
        session_out = LiveSessionOut(
            **{c.name: getattr(session, c.name) for c in session.__table__.columns},
            instructor_name=session.instructor.name if session.instructor else None,
            current_participants=participant_count
        )
        result.append(RegistrationOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            paid_amount=r.paid_amount,
            registered_at=r.registered_at,
            attended=r.attended,
            session=session_out
        ))
    return result

# ============================================
# STREAMING TOKEN
# ============================================

@router.post("/streaming/token", response_model=StreamingTokenResponse)
async def get_streaming_token(
    request: StreamingTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Agora RTC token for streaming."""
    session = db.query(LiveSession).filter(LiveSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify access
    is_instructor = session.instructor_id == current_user.id
    
    if not is_instructor:
        # Check if student is registered
        registration = db.query(SessionRegistration).filter(
            SessionRegistration.session_id == request.session_id,
            SessionRegistration.student_id == current_user.id
        ).first()
        if not registration:
            raise HTTPException(status_code=403, detail="Not registered for this session")
    
    # Generate token using Agora Token Builder
    try:
        from agora_token_builder import RtcTokenBuilder
        import time
        
        app_id = os.getenv("AGORA_APP_ID")
        app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
        
        if not app_id or not app_certificate:
            raise HTTPException(status_code=500, detail="Agora credentials not configured")
        
        channel_name = session.agora_channel
        uid = current_user.id
        expiry_time = int(time.time()) + 3600 * 24  # 24 hours
        
        # Role: 1 = publisher (instructor), 2 = subscriber (student)
        role = 1 if request.role == "publisher" else 2
        
        token = RtcTokenBuilder.buildTokenWithUid(
            app_id, app_certificate, channel_name, uid, role, expiry_time
        )
        
        return StreamingTokenResponse(
            token=token,
            channel_name=channel_name,
            uid=uid,
            app_id=app_id
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="Agora token builder not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")

# ============================================
# WEBSOCKET CHAT
# ============================================

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: int,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time chat during live sessions."""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast message to all connected clients except sender
            await manager.broadcast({
                "user_id": data.get("user_id"),
                "username": data.get("username", "Anonymous"),
                "message": data.get("message"),
                "timestamp": datetime.utcnow().isoformat()
            }, session_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
