import cloudinary
import cloudinary.uploader
from config import settings

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_video(file):
    """
    Uploads a video file to Cloudinary.
    Returns the secure URL of the uploaded video.
    """
    upload_result = cloudinary.uploader.upload(
        file,
        resource_type="video",
        folder="lectures"
    )
    return upload_result.get("secure_url")

def upload_image(file):
    """
    Uploads an image file to Cloudinary.
    Returns the secure URL of the uploaded image.
    """
    upload_result = cloudinary.uploader.upload(
        file,
        resource_type="image",
        folder="courses"
    )
    return upload_result.get("secure_url")
