import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from .database import engine, Base, SessionLocal
from . import models
from .ingredients import items_from_lines
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

    # Add nutrition columns to pre-existing recipes tables
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories INTEGER"))
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein_g FLOAT"))
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS serving_weight_g INTEGER"))
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredient_items JSONB"))
        conn.commit()

    backfill_ingredient_items()

    os.makedirs("/app/uploads", exist_ok=True)


def backfill_ingredient_items():
    """One-time conversion: split older recipes' ingredient lines into amount / unit / name."""
    db = SessionLocal()
    try:
        recipes = db.query(models.Recipe).filter(models.Recipe.ingredient_items.is_(None)).all()
        for r in recipes:
            r.ingredient_items = items_from_lines(r.ingredients, r.ingredients_lt)
        if recipes:
            db.commit()
            print(f"Converted ingredients for {len(recipes)} recipe(s).")
    finally:
        db.close()


app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
