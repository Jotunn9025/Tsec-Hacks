import os
import shutil
import uuid
from fastapi import UploadFile

# Use relative path for internal storage, but absolute for saving
BASE_UPLOADS_DIR = "uploads"

def save_file_locally(file: UploadFile, folder: str) -> str:
    """
    Saves a file to the local uploads directory.
    Returns the path relative to the server root (e.g., /uploads/courses/filename.jpg).
    """
    # Create target directory if it doesn't exist
    target_dir = os.path.join(BASE_UPLOADS_DIR, folder)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    # Generate a unique filename to avoid collisions
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(target_dir, unique_filename)

    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return the public URL path
    return f"/{BASE_UPLOADS_DIR}/{folder}/{unique_filename}"
