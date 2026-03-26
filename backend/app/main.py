import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError
from .database import engine, Base
from .routers import auth, recipes

app = FastAPI(title="Find Your Meal", docs_url="/api/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    # Wait for database
    for _ in range(30):
        try:
            with engine.connect():
                break
        except OperationalError:
            time.sleep(2)

    Base.metadata.create_all(bind=engine)
    os.makedirs("/app/uploads", exist_ok=True)


app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
