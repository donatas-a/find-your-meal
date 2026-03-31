import os
import uuid
import json
import io
import time
import urllib.request
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from PIL import Image
from deep_translator import GoogleTranslator
from recipe_scrapers import scrape_me, WebsiteNotImplementedError
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


# ── URL import helpers ────────────────────────────────────────────────────────

def _translate_list(items: list[str], translator: GoogleTranslator) -> list[str]:
    result = []
    for text in items:
        try:
            result.append(translator.translate(text) or text)
            time.sleep(0.3)
        except Exception:
            result.append(text)
    return result


# ── URL import endpoint ───────────────────────────────────────────────────────

@router.post("/import-url", response_model=schemas.RecipeOut)
def import_recipe_from_url(
    payload: schemas.ImportUrlRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    try:
        scraper = scrape_me(payload.url)
    except WebsiteNotImplementedError:
        raise HTTPException(status_code=422, detail="This site is not supported. Try allrecipes.com, bbcgoodfood.com, seriouseats.com, etc.")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch page: {e}")

    title_en       = scraper.title() or ''
    description_en = scraper.description() or ''
    ingredients_en = scraper.ingredients() or []
    try:
        steps_en = scraper.instructions_list() or []
    except Exception:
        raw = scraper.instructions() or ''
        steps_en = [s.strip() for s in raw.split('\n') if s.strip()]

    if not title_en or not ingredients_en:
        raise HTTPException(status_code=422, detail="Could not extract title or ingredients from the page.")

    if db.query(models.Recipe).filter(models.Recipe.title == title_en).first():
        raise HTTPException(status_code=409, detail=f"Recipe '{title_en}' already exists.")

    en_lt = GoogleTranslator(source='en', target='lt')
    try:
        title_lt       = en_lt.translate(title_en) or title_en
        description_lt = en_lt.translate(description_en) if description_en else '-'
        ingredients_lt = _translate_list(ingredients_en, en_lt)
        steps_lt       = _translate_list(steps_en, en_lt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

    recipe = models.Recipe(
        title          = title_en,
        title_lt       = title_lt,
        description_lt = description_lt or '-',
        ingredients    = ingredients_en,
        ingredients_lt = ingredients_lt,
        steps          = steps_en or ['-'],
        steps_lt       = steps_lt or ['-'],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


KIMI_PROMPT = """Extract the recipe from the text below and return ONLY a valid JSON object with these exact fields:
{
  "title": "recipe name in English",
  "title_lt": "recipe name in Lithuanian",
  "description_lt": "short description in Lithuanian (2-3 sentences)",
  "ingredients": ["ingredient 1 in English", "ingredient 2 in English"],
  "ingredients_lt": ["ingredient 1 in Lithuanian", "ingredient 2 in Lithuanian"],
  "steps": ["step 1 in English", "step 2 in English"],
  "steps_lt": ["step 1 in Lithuanian", "step 2 in Lithuanian"]
}
Return ONLY the JSON, no markdown, no explanation.

Recipe text:
"""


@router.post("/import-text", response_model=schemas.RecipeOut)
def import_recipe_from_text(
    payload: schemas.ImportTextRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    api_key = os.getenv("KIMI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="KIMI_API_KEY not set in environment.")

    body = json.dumps({
        "model": "kimi-latest",
        "messages": [{"role": "user", "content": KIMI_PROMPT + payload.text}],
        "temperature": 0.1,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.moonshot.cn/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kimi API error: {e}")

    try:
        content = result["choices"][0]["message"]["content"].strip()
        # Strip markdown code block if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        data = json.loads(content)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not parse Kimi response as JSON.")

    required = ["title", "title_lt", "description_lt", "ingredients", "ingredients_lt", "steps", "steps_lt"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=500, detail="Kimi response missing required fields.")

    if db.query(models.Recipe).filter(models.Recipe.title == data["title"]).first():
        raise HTTPException(status_code=409, detail=f"Recipe '{data['title']}' already exists.")

    recipe = models.Recipe(
        title          = data["title"],
        title_lt       = data["title_lt"],
        description_lt = data["description_lt"] or "-",
        ingredients    = data["ingredients"],
        ingredients_lt = data["ingredients_lt"],
        steps          = data["steps"] or ["-"],
        steps_lt       = data["steps_lt"] or ["-"],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


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
