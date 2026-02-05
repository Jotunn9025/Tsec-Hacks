from pydantic import BaseModel
from typing import List

class ChunkVisitIn(BaseModel):
    lecture_id: int
    timestamp: float

class ChunkActivityOut(BaseModel):
    index: int
    start_time: float
    end_time: float
    visit_count: int

class LectureChunksOut(BaseModel):
    lecture_id: int
    chunks: List[ChunkActivityOut]
