from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.websockets import WebSocketState
import sqlite3
import cv2
import numpy as np
from ultralytics import YOLO
import asyncio
import base64
from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel
import os
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolo12x.pt")
#most accurate person detection model from yolov12 series

def init_db():
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            username TEXT NOT NULL,
            classname TEXT NOT NULL,
            lec_name TEXT NOT NULL,
            presence_log TEXT NOT NULL,
            start_timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

active_sessions = {}

class SessionData:
    def __init__(self, session_id: str, username: str, classname: str, lec_name: str):
        self.session_id = session_id
        self.username = username
        self.classname = classname
        self.lec_name = lec_name
        self.presence_log = ""
        self.start_timestamp = datetime.now().isoformat()
        self.last_check_time = datetime.now()
        self.person_detected = False

class AttendanceQuery(BaseModel):
    username: str
    classname: str
    lec_name: str

def detect_person(frame_data: bytes) -> bool:
    try:
        nparr = np.frombuffer(base64.b64decode(frame_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        results = model(frame, verbose=False)
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                if class_id == 0:  # Class 0 means person in pretrained model
                    return True
        
        return False
    except Exception as e:
        print(f"Error in person detection: {e}")
        return False

def save_session_to_db(session: SessionData):
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO attendance (session_id, username, classname, lec_name, presence_log, start_timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session.session_id, session.username, session.classname, 
          session.lec_name, session.presence_log, session.start_timestamp))
    conn.commit()
    conn.close()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    session = None
    periodic_task = None
    session_saved = False
    
    try:
        init_data = await websocket.receive_json()
        username = init_data.get("username")
        classname = init_data.get("classname")
        lec_name = init_data.get("lec_name")
        
        if not all([username, classname, lec_name]):
            await websocket.send_json({"error": "Missing required fields"})
            await websocket.close()
            return
        
        session = SessionData(session_id, username, classname, lec_name)
        active_sessions[session_id] = session
        
        await websocket.send_json({
            "status": "connected",
            "session_id": session_id
        })

        async def check_presence_periodically():
            try:
                while True:
                    await asyncio.sleep(1)

                    if session.person_detected:
                        session.presence_log += "1"
                    else:
                        session.presence_log += "0"
                    
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({
                            "status": "update",
                            "presence_log": session.presence_log,
                            "person_detected": session.person_detected,
                            "duration": len(session.presence_log)
                        })
                    else:
                        break
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Error in periodic check: {e}")
        periodic_task = asyncio.create_task(check_presence_periodically())

        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "frame":
                frame_data = data.get("frame")
                if frame_data:
                    session.person_detected = detect_person(frame_data)
            
            elif data.get("type") == "end_session":
                if session.presence_log and not session_saved:
                    save_session_to_db(session)
                    session_saved = True
                
                await websocket.send_json({
                    "status": "session_ended",
                    "presence_log": session.presence_log,
                    "total_duration": len(session.presence_log)
                })
                break
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    
    finally:
        if periodic_task and not periodic_task.done():
            periodic_task.cancel()
            try:
                await periodic_task
            except asyncio.CancelledError:
                pass
        if session and session_id in active_sessions:
            if session.presence_log and not session_saved:
                save_session_to_db(session)
            del active_sessions[session_id]

        try:
            await websocket.close()
        except Exception:
            pass

@app.get("/attendance")
async def get_attendance(username: str, classname: str, lec_name: str):
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT session_id, presence_log, start_timestamp
        FROM attendance
        WHERE username = ? AND classname = ? AND lec_name = ?
        ORDER BY start_timestamp ASC
    """, (username, classname, lec_name))
    
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        raise HTTPException(status_code=404, detail="No attendance records found")
    concatenated_log = ""
    sessions = []
    
    for row in rows:
        session_id, presence_log, start_timestamp = row
        concatenated_log += presence_log
        sessions.append({
            "session_id": session_id,
            "presence_log": presence_log,
            "start_timestamp": start_timestamp,
            "duration_seconds": len(presence_log)
        })
    
    total_seconds = len(concatenated_log)
    present_seconds = concatenated_log.count("1")
    attendance_percentage = (present_seconds / total_seconds * 100) if total_seconds > 0 else 0
    
    return {
        "username": username,
        "classname": classname,
        "lec_name": lec_name,
        "total_sessions": len(rows),
        "concatenated_presence_log": concatenated_log,
        "total_duration_seconds": total_seconds,
        "present_seconds": present_seconds,
        "absent_seconds": total_seconds - present_seconds,
        "attendance_percentage": round(attendance_percentage, 2),
        "sessions": sessions
    }

@app.get("/")
async def read_index():
    return FileResponse("index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)