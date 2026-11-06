import os
import uuid
import json
import io
import re
import urllib.request
import urllib.error
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from PIL import Image
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_admin
from ..nutrition_data import lookup_nutrition, piece_weight, can_weight, PINCH_G
from ..ocr import ocr_bytes
from ..ingredients import items_from_lines, normalize_items, lines_from_items, units_for_prompt, parse_line, parse_line_default_amount, to_grams, amount_to_float

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


KIMI_MODEL = "kimi-k2.6"


def _call_kimi_json(prompt: str) -> dict:
    api_key = os.getenv("KIMI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="KIMI_API_KEY not set in environment.")

    body = json.dumps({
        "model": KIMI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        # kimi-k2.6 has a fixed temperature (0.6 without thinking), so none is sent.
        "thinking": {"type": "disabled"},
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.moonshot.ai/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=150) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise HTTPException(status_code=500, detail=f"Kimi API error: {e} — {error_body}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kimi API error: {e}")

    try:
        content = result["choices"][0]["message"]["content"]
        start = content.find('{')
        end = content.rfind('}')
        if start == -1 or end == -1:
            raise ValueError("No JSON object found")
        return json.loads(content[start:end+1])
    except Exception:
        raw = result["choices"][0]["message"]["content"]
        raise HTTPException(status_code=500, detail=f"Could not parse Kimi response as JSON. Raw: {raw[:500]}")


KIMI_PROMPT = """Extract the recipe from the text below and return ONLY a valid JSON object with these exact fields:
{
  "title": "recipe name in English",
  "title_lt": "recipe name in Lithuanian",
  "description_lt": "short description in Lithuanian (2-3 sentences)",
  "ingredients": [
    {"amount": "500", "unit": "g", "name": "flour", "name_lt": "miltai"},
    {"amount": "2", "unit": "", "name": "eggs", "name_lt": "kiaušiniai"},
    {"amount": "", "unit": "", "name": "salt to taste", "name_lt": "druska pagal skonį"}
  ],
  "steps": ["step 1 in English", "step 2 in English"],
  "steps_lt": ["step 1 in Lithuanian", "step 2 in Lithuanian"]
}
Rules for ingredients:
- "amount" is the number exactly as written (e.g. "500", "1/2", "1.5", "2-3"), or "" if there is none.
- "unit" must be one of: """ + units_for_prompt() + """, or "" if there is no unit or it is not in the list
  (then put the unit word into the name, e.g. "handful of spinach").
- "name" is the ingredient in English, "name_lt" in Lithuanian, both without the amount and unit.
Return ONLY the JSON, no markdown, no explanation.

Recipe text:
"""


@router.post("/import-text", response_model=schemas.RecipeOut)
def import_recipe_from_text(
    payload: schemas.ImportTextRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    data = _call_kimi_json(KIMI_PROMPT + payload.text)

    required = ["title", "title_lt", "description_lt", "ingredients", "steps", "steps_lt"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=500, detail="Kimi response missing required fields.")

    if db.query(models.Recipe).filter(models.Recipe.title == data["title"]).first():
        raise HTTPException(status_code=409, detail=f"Recipe '{data['title']}' already exists.")

    items = normalize_items(data["ingredients"])
    if not items:
        raise HTTPException(status_code=500, detail="Kimi returned no ingredients.")
    ingredients_en, ingredients_lt = lines_from_items(items)

    recipe = models.Recipe(
        title          = data["title"],
        title_lt       = data["title_lt"],
        description_lt = data["description_lt"] or "-",
        ingredients    = ingredients_en,
        ingredients_lt = ingredients_lt,
        ingredient_items = items,
        steps          = data["steps"] or ["-"],
        steps_lt       = data["steps_lt"] or ["-"],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


MAX_OCR_PHOTOS = 10


@router.post("/ocr-photos", response_model=schemas.OcrResult)
def ocr_photos(
    photos: List[UploadFile] = File(...),
    _admin=Depends(get_current_admin),
):
    """Free, local OCR with Tesseract. Reads each photo in the order given and
    returns the combined text for review — nothing is saved."""
    if len(photos) > MAX_OCR_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Upload at most {MAX_OCR_PHOTOS} photos at once.")

    pages = []
    for photo in photos:
        content = photo.file.read()
        try:
            Image.open(io.BytesIO(content)).verify()
        except Exception:
            raise HTTPException(status_code=400, detail=f"Could not read '{photo.filename}'. Use JPG, PNG or WebP.")
        try:
            text = ocr_bytes(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR failed on '{photo.filename}': {e}")
        if text:
            pages.append(text)

    if not pages:
        raise HTTPException(status_code=422, detail="No text found in the photos.")
    return {"text": "\n\n".join(pages)}


# Ingredients with no amount that don't need one ("salt to taste", "parsley for garnish").
OPTIONAL_RE = re.compile(r"to taste|for serving|for garnish|for decoration|optional|as needed|pagal skon", re.IGNORECASE)


def _grams_for(parsed: dict, line: str) -> Optional[float]:
    """Weight in grams of one ingredient line, from its weight/volume, piece count, pinch or can."""
    name = parsed["name"] or line
    grams = to_grams(parsed["amount"], parsed["unit"], name)
    if grams:
        return grams
    qty = amount_to_float(parsed["amount"])
    if not qty:
        return None
    unit = parsed["unit"]
    if unit in ("", "pcs", "clove"):
        per_piece = piece_weight(name)
        if unit == "clove" and per_piece is not None and "garlic" not in name.lower():
            return None  # "clove" only means a garlic clove here
        return qty * per_piece if per_piece else None
    if unit == "pinch":
        return qty * PINCH_G
    if unit == "can":
        return qty * can_weight(name)
    return None


@router.post("/estimate-nutrition", response_model=schemas.NutritionEstimate)
def estimate_nutrition(
    payload: schemas.NutritionEstimateRequest,
    _admin=Depends(get_current_admin),
):
    ingredients = [i for i in payload.ingredients if i.strip()]
    if not ingredients:
        raise HTTPException(status_code=422, detail="No ingredients provided.")
    servings = payload.servings if payload.servings and payload.servings > 0 else 1

    total_kcal = 0.0
    total_protein = 0.0
    total_weight = 0.0
    skipped = []

    for ing in ingredients:
        parsed = parse_line_default_amount(ing)
        nutrition = lookup_nutrition(parsed["name"] or ing)
        grams = _grams_for(parsed, ing) if nutrition else None
        if nutrition and grams:
            kcal_per_100g, protein_per_100g = nutrition
            total_kcal += grams * kcal_per_100g / 100
            total_protein += grams * protein_per_100g / 100
            total_weight += grams
        elif not parsed["amount"] and OPTIONAL_RE.search(ing):
            continue
        else:
            skipped.append(ing)

    if total_weight <= 0:
        raise HTTPException(status_code=422, detail="Could not estimate nutrition: no ingredient had a known value and amount.")

    return schemas.NutritionEstimate(
        calories=round(total_kcal / servings),
        protein_g=round(total_protein / servings, 1),
        serving_weight_g=round(total_weight / servings),
        skipped=skipped,
    )


def _ensure_items(recipe: models.Recipe) -> models.Recipe:
    """Recipes added outside the app (e.g. import_excel.py) may not have structured items yet."""
    if recipe.ingredient_items is None:
        recipe.ingredient_items = items_from_lines(recipe.ingredients, recipe.ingredients_lt)
    return recipe


def _resolve_ingredients(ingredient_items: Optional[str], ingredients: Optional[str], ingredients_lt: Optional[str]):
    """Form sends ingredient_items (JSON); plain lists are still accepted for older clients."""
    if ingredient_items:
        items = normalize_items(json.loads(ingredient_items))
    else:
        items = items_from_lines(json.loads(ingredients or "[]"), json.loads(ingredients_lt or "[]"))
    en, lt = lines_from_items(items)
    return items, en, lt


@router.get("/", response_model=List[schemas.RecipeOut])
def list_recipes(db: Session = Depends(get_db)):
    recipes = db.query(models.Recipe).order_by(models.Recipe.created_at.desc()).all()
    return [_ensure_items(r) for r in recipes]


@router.get("/{recipe_id}", response_model=schemas.RecipeOut)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _ensure_items(recipe)


@router.post("/", response_model=schemas.RecipeOut)
def create_recipe(
    title: str = Form(...),
    title_lt: str = Form(...),
    description_lt: str = Form(...),
    ingredient_items: Optional[str] = Form(None),
    ingredients: Optional[str] = Form(None),
    ingredients_lt: Optional[str] = Form(None),
    steps: str = Form(...),
    steps_lt: str = Form(...),
    calories: Optional[int] = Form(None),
    protein_g: Optional[float] = Form(None),
    serving_weight_g: Optional[int] = Form(None),
    servings: Optional[int] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    items, ingredients_en, ingredients_lt_list = _resolve_ingredients(ingredient_items, ingredients, ingredients_lt)
    photo_path = save_photo(photo) if photo and photo.filename else None
    recipe = models.Recipe(
        title=title,
        title_lt=title_lt,
        description_lt=description_lt,
        ingredients=ingredients_en,
        ingredients_lt=ingredients_lt_list,
        ingredient_items=items,
        steps=json.loads(steps),
        steps_lt=json.loads(steps_lt),
        photo=photo_path,
        calories=calories,
        protein_g=protein_g,
        serving_weight_g=serving_weight_g,
        servings=servings,
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
    ingredient_items: Optional[str] = Form(None),
    ingredients: Optional[str] = Form(None),
    ingredients_lt: Optional[str] = Form(None),
    steps: str = Form(...),
    steps_lt: str = Form(...),
    calories: Optional[int] = Form(None),
    protein_g: Optional[float] = Form(None),
    serving_weight_g: Optional[int] = Form(None),
    servings: Optional[int] = Form(None),
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
    items, ingredients_en, ingredients_lt_list = _resolve_ingredients(ingredient_items, ingredients, ingredients_lt)
    recipe.ingredients = ingredients_en
    recipe.ingredients_lt = ingredients_lt_list
    recipe.ingredient_items = items
    recipe.steps = json.loads(steps)
    recipe.steps_lt = json.loads(steps_lt)
    recipe.calories = calories
    recipe.protein_g = protein_g
    recipe.serving_weight_g = serving_weight_g
    recipe.servings = servings

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
