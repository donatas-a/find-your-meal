"""
Import a recipe from any website supported by recipe-scrapers (500+ sites).
https://github.com/hhursev/recipe-scrapers

Usage (inside Docker container):
  sudo docker compose exec backend python import_url.py <url>

Example:
  sudo docker compose exec backend python import_url.py https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
"""
import sys
import time

sys.path.insert(0, '/app')

from recipe_scrapers import scrape_me, WebsiteNotImplementedError
from deep_translator import GoogleTranslator
from app.database import SessionLocal
from app import models


def translate(text: str, translator: GoogleTranslator) -> str:
    if not text or text == '-':
        return text
    try:
        result = translator.translate(text)
        time.sleep(0.3)
        return result or text
    except Exception as e:
        print(f"  [translation error] {e} — keeping original")
        return text


def import_from_url(url: str):
    print(f"\nFetching: {url}")
    try:
        scraper = scrape_me(url)
    except WebsiteNotImplementedError:
        print("ERROR: This site is not supported by recipe-scrapers.")
        print("See supported sites: https://github.com/hhursev/recipe-scrapers#scrapers-available-for")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Could not scrape page — {e}")
        sys.exit(1)

    title_en       = scraper.title() or ''
    description_en = scraper.description() or ''
    ingredients_en = scraper.ingredients() or []
    try:
        steps_en = scraper.instructions_list() or []
    except Exception:
        raw = scraper.instructions() or ''
        steps_en = [s.strip() for s in raw.split('\n') if s.strip()]

    if not title_en or not ingredients_en:
        print("ERROR: Could not extract title or ingredients.")
        sys.exit(1)

    print(f"\nRecipe found:  {title_en}")
    print(f"Ingredients:   {len(ingredients_en)}")
    print(f"Steps:         {len(steps_en)}")

    db = SessionLocal()
    if db.query(models.Recipe).filter(models.Recipe.title == title_en).first():
        print(f"\nSKIP: '{title_en}' already exists in the database.")
        db.close()
        return

    print("\nTranslating to Lithuanian...")
    en_lt = GoogleTranslator(source='en', target='lt')

    title_lt       = translate(title_en, en_lt)
    description_lt = translate(description_en, en_lt) if description_en else '-'
    ingredients_lt = [translate(i, en_lt) for i in ingredients_en]
    steps_lt       = [translate(s, en_lt) for s in steps_en]

    print(f"  Title: {title_en} → {title_lt}")

    recipe = models.Recipe(
        title          = title_en,
        title_lt       = title_lt,
        description_lt = description_lt,
        ingredients    = ingredients_en,
        ingredients_lt = ingredients_lt,
        steps          = steps_en  or ['-'],
        steps_lt       = steps_lt  or ['-'],
    )
    db.add(recipe)
    db.commit()
    db.close()

    print(f"\nDone! '{title_en}' saved.")
    print("Add a photo via the admin panel.")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python import_url.py <recipe-url>")
        sys.exit(1)

    import_from_url(sys.argv[1])
