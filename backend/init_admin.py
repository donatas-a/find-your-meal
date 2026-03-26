"""Run once at container startup to create the admin user if it doesn't exist."""
import os
import sys

sys.path.insert(0, "/app")

from app.database import SessionLocal, engine
from app import models
from app.auth import hash_password

models.Base.metadata.create_all(bind=engine)

username = os.getenv("ADMIN_USERNAME", "admin")
password = os.getenv("ADMIN_PASSWORD", "changeme123")

db = SessionLocal()
try:
    existing = db.query(models.Admin).filter(models.Admin.username == username).first()
    if not existing:
        admin = models.Admin(username=username, hashed_password=hash_password(password))
        db.add(admin)
        db.commit()
        print(f"Admin user '{username}' created.")
    else:
        print(f"Admin user '{username}' already exists.")
finally:
    db.close()
