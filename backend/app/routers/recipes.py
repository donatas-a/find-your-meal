import os
import uuid
import json
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from PIL import Image
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_admin

router = APIRouter()
UPLOAD_DIR = "/app/uploads"


def save_photo(file: UploadFile) -> str:
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format")
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = file.file.read()
    img = Image.open(io.BytesIO(content))
    img.thumbnail((1200, 1200))
    img.save(filepath, optimize=True, quality=85)
    return f"/uploads/{filename}"


def remove_photo(path: Optional[str]):
    if path:
        full = os.path.join("/app", path.lstrip("/"))
        if os.path.exists(full):
            os.remove(full)


@router.get("/", response_model=List[schemas.RecipeOut])
def list_recipes(db: Session = Depends(get_db)):
    return db.query(models.Recipe).order_by(models.Recipe.created_at.desc()).all()


@router.get("/{recipe_id}", response_model=schemas.RecipeOut)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/", response_model=schemas.RecipeOut)
def create_recipe(
    title: str = Form(...),
    title_lt: str = Form(...),
    description_lt: str = Form(...),
    ingredients: str = Form(...),
    ingredients_lt: str = Form(...),
    steps: str = Form(...),
    steps_lt: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    photo_path = save_photo(photo) if photo and photo.filename else None
    recipe = models.Recipe(
        title=title,
        title_lt=title_lt,
        description_lt=description_lt,
        ingredients=json.loads(ingredients),
        ingredients_lt=json.loads(ingredients_lt),
        steps=json.loads(steps),
        steps_lt=json.loads(steps_lt),
        photo=photo_path,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.put("/{recipe_id}", response_model=schemas.RecipeOut)
def update_recipe(
    recipe_id: int,
    title: str = Form(...),
    title_lt: str = Form(...),
    description_lt: str = Form(...),
    ingredients: str = Form(...),
    ingredients_lt: str = Form(...),
    steps: str = Form(...),
    steps_lt: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe.title = title
    recipe.title_lt = title_lt
    recipe.description_lt = description_lt
    recipe.ingredients = json.loads(ingredients)
    recipe.ingredients_lt = json.loads(ingredients_lt)
    recipe.steps = json.loads(steps)
    recipe.steps_lt = json.loads(steps_lt)

    if photo and photo.filename:
        remove_photo(recipe.photo)
        recipe.photo = save_photo(photo)

    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    remove_photo(recipe.photo)
    db.delete(recipe)
    db.commit()
    return {"ok": True}
