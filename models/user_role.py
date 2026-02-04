from enum import Enum

# Enum defining the possible roles for a user in the system
class UserRole(str, Enum):
    USER = "user"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
