"""
Import recipes from Excel file into the database with auto English translation.
Usage:
  1. Copy your Excel file to the VPS
  2. Copy it into the backend container:
       sudo docker cp receptai.xlsx find-your-meal-backend-1:/app/receptai.xlsx
  3. Run this script:
       sudo docker compose exec backend python import_excel.py
"""
import sys
import os
import time

sys.path.insert(0, '/app')

import pandas as pd
from deep_translator import GoogleTranslator
from app.database import SessionLocal
from app import models

EXCEL_PATH = '/app/receptai.xlsx'
SHEET_NAME = 'Receptų ingredientai'
SKIP_ROWS  = ['iš viso', 'viso', 'iš viso:', 'nan', '']

translator = GoogleTranslator(source='lt', target='en')


def translate(text: str) -> str:
    """Translate Lithuanian text to English with retry."""
    try:
        result = translator.translate(text)
        time.sleep(0.3)   # be polite to Google Translate
        return result or text
    except Exception as e:
        print(f"    [translation error] {e} — keeping original")
        return text


def translate_list(items: list[str]) -> list[str]:
    return [translate(item) for item in items]


def import_recipes():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: File not found at {EXCEL_PATH}")
        print("Copy your Excel file first:")
        print("  sudo docker cp receptai.xlsx find-your-meal-backend-1:/app/receptai.xlsx")
        sys.exit(1)

    print(f"Reading {EXCEL_PATH} ...")
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)
    df.columns = ['recipe', 'ingredient', 'quantity']
    df = df.dropna(subset=['recipe', 'ingredient'])
    df['recipe']     = df['recipe'].astype(str).str.strip()
    df['ingredient'] = df['ingredient'].astype(str).str.strip()
    df['quantity']   = df['quantity'].astype(str).str.strip()

    db = SessionLocal()
    added = skipped = 0

    for recipe_name, group in df.groupby('recipe', sort=False):
        if recipe_name.lower() in SKIP_ROWS:
            continue

        # Build Lithuanian ingredients list
        ingredients_lt = []
        for _, row in group.iterrows():
            ingredient = row['ingredient']
            quantity   = row['quantity']
            if ingredient.lower() in SKIP_ROWS:
                continue
            if quantity in ('nan', '-', ''):
                ingredients_lt.append(ingredient)
            else:
                ingredients_lt.append(f"{ingredient} {quantity}")

        if not ingredients_lt:
            continue

        # Skip if already exists
        existing = db.query(models.Recipe).filter(
            models.Recipe.title_lt == recipe_name
        ).first()
        if existing:
            print(f"  SKIP  '{recipe_name}' — already in database")
            skipped += 1
            continue

        print(f"  ADD   '{recipe_name}' — translating...")

        # Translate to English
        title_en       = translate(recipe_name)
        ingredients_en = translate_list(ingredients_lt)

        recipe = models.Recipe(
            title          = title_en,
            title_lt       = recipe_name,
            description_lt = '-',
            ingredients    = ingredients_en,
            ingredients_lt = ingredients_lt,
            steps          = ['-'],
            steps_lt       = ['-'],
        )
        db.add(recipe)
        print(f"    '{recipe_name}' → '{title_en}' ({len(ingredients_lt)} ingredients)")
        added += 1

    db.commit()
    db.close()
    print(f"\nDone! Added: {added}, Skipped: {skipped}")
    print("You can now edit each recipe in the admin panel to add steps, description and photo.")


if __name__ == '__main__':
    import_recipes()
