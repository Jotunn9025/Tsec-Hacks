from pydantic import BaseModel
from typing import Optional

class WatchActivityUpdate(BaseModel):
    lecture_id: int
    watch_time_increment_seconds: float
    completed: Optional[bool] = False
    is_exit: Optional[bool] = False
