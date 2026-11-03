"""
Free, local OCR for recipe photos using Tesseract.

Used by the backend (/api/recipes/ocr-photos), and can also be run on its own
to test OCR quality without Docker:

    python backend/app/ocr.py path\\to\\photo.jpg [more photos...]

Each photo's text is printed and saved next to it as <photo>.txt.

Standalone requirements (Windows):
  1. Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
     During install, under "Additional language data", tick Lithuanian.
  2. pip install pillow pytesseract
"""
import io
import os
import re
import sys

import pytesseract
from PIL import Image, ImageOps

# On Windows, Tesseract is usually not on PATH; use the default install location.
_WIN_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.name == "nt" and os.path.exists(_WIN_TESSERACT):
    pytesseract.pytesseract.tesseract_cmd = _WIN_TESSERACT

LANGS = "lit+eng"


def prepare_image(img: Image.Image) -> Image.Image:
    """Clean-up that helps Tesseract: fix rotation, grayscale, contrast, upscale small images."""
    img = ImageOps.exif_transpose(img)  # respect phone camera rotation
    img = ImageOps.autocontrast(img.convert("L"))
    if max(img.size) < 1500:
        scale = 1500 / max(img.size)
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    return img


def ocr_image(img: Image.Image) -> str:
    text = pytesseract.image_to_string(prepare_image(img), lang=LANGS)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def ocr_bytes(content: bytes) -> str:
    return ocr_image(Image.open(io.BytesIO(content)))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for path in sys.argv[1:]:
        text = ocr_image(Image.open(path))
        out = os.path.splitext(path)[0] + ".txt"
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"===== {path}  ->  {out}\n{text or '(no text found)'}\n")
