from sqlalchemy.orm import Session
from models.lecture_chunk import LectureChunk

CHUNK_SIZE_SECONDS = 300  # 5 minutes

def generate_lecture_chunks(db: Session, lecture_id: int, duration_seconds: int):
    """
    Divides a lecture into fixed-size chunks and saves them to the database.
    Deletes existing chunks for the lecture before regenerating.
    """
    # Clear existing chunks
    db.query(LectureChunk).filter(LectureChunk.lecture_id == lecture_id).delete()
    
    if duration_seconds <= 0:
        return

    num_chunks = (duration_seconds + CHUNK_SIZE_SECONDS - 1) // CHUNK_SIZE_SECONDS
    
    for i in range(num_chunks):
        start_time = i * CHUNK_SIZE_SECONDS
        end_time = min((i + 1) * CHUNK_SIZE_SECONDS, duration_seconds)
        
        new_chunk = LectureChunk(
            lecture_id=lecture_id,
            index=i,
            start_time=float(start_time),
            end_time=float(end_time)
        )
        db.add(new_chunk)
    
    db.commit()
