"""
Structured ingredients: each ingredient is {amount, unit, name, name_lt}.

- amount: text as written ("500", "1/2", "2-3", "1,5") or "" when none
- unit:   one of the keys in UNITS, or "" when none (e.g. "2 eggs", "salt to taste")
- name / name_lt: ingredient name in English / Lithuanian

The plain-text lists (recipe.ingredients / ingredients_lt) are still stored,
generated from the items, so the recipe page, nutrition estimate and older
code keep working.
"""
import re
from itertools import zip_longest

# key: (English label, Lithuanian label, aliases recognised when parsing text)
UNITS = {
    "g":     ("g", "g", ["g", "g.", "gr", "gr.", "gram", "grams", "gramas", "gramai", "gramų"]),
    "kg":    ("kg", "kg", ["kg", "kg.", "kilogram", "kilograms", "kilogramas", "kilogramai", "kilogramų"]),
    "ml":    ("ml", "ml", ["ml", "ml.", "milliliter", "milliliters", "millilitre", "millilitres", "mililitrai", "mililitrų"]),
    "l":     ("l", "l", ["l", "l.", "liter", "liters", "litre", "litres", "litras", "litrai", "litro", "litrų"]),
    "tsp":   ("tsp", "a. š.", ["šaukštelis", "tsp", "tsp.", "teaspoon", "teaspoons", "a.š.", "a. š.", "arb. š.", "arb.š.",
                                    "šaukštelis", "šaukšteliai", "šaukštelio", "šaukštelių", "arbatinis šaukštelis",
                                    "arbatiniai šaukšteliai", "arbatinio šaukštelio", "arbatinių šaukštelių"]),
    "tbsp":  ("tbsp", "v. š.", ["šaukštas", "tbsp", "tbsp.", "tablespoon", "tablespoons", "v.š.", "v. š.", "valg. š.", "valg.š.",
                                   "šaukštas", "šaukštai", "šaukšto", "šaukštų", "valgomasis šaukštas",
                                   "valgomieji šaukštai", "valgomojo šaukšto", "valgomųjų šaukštų"]),
    "cup":   ("cup", "stikl.", ["stiklinė", "cup", "cups", "stiklinė", "stiklinės", "stiklinių"]),
    "pcs":   ("pcs", "vnt.", ["pcs", "pcs.", "pc", "pc.", "piece", "pieces", "vnt", "vnt."]),
    "pinch": ("pinch", "žiupsn.", ["žiupsnelis", "pinch", "pinches", "žiupsnelis", "žiupsnelio", "žiupsneliai", "žiupsnelių"]),
    "clove": ("clove", "skilt.", ["skiltelė", "clove", "cloves", "skiltelė", "skiltelės", "skiltelių"]),
    "pack":  ("pack", "pak.", ["pakelis", "pack", "packs", "package", "packet", "pakelis", "pakeliai", "pakelio", "pakelių"]),
    "can":   ("can", "skard.", ["skardinė", "can", "cans", "tin", "skardinė", "skardinės", "skardinių"]),
}

_ALIAS_TO_KEY = {}
for _key, (_en, _lt, _aliases) in UNITS.items():
    for _a in [_key, _en, _lt, *_aliases]:
        _ALIAS_TO_KEY.setdefault(_a.lower(), _key)

_AMOUNT = r"(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?|[½¼¾⅓⅔⅛])"
_UNIT = "|".join(re.escape(a) for a in sorted(_ALIAS_TO_KEY, key=len, reverse=True))
# Unit must be followed by whitespace, punctuation or end (so "l" doesn't match "lemon").
_UNIT_RE = rf"(?P<unit>{_UNIT})(?=[\s,;:)]|$)"

_LEADING = re.compile(rf"^(?P<amount>{_AMOUNT})\s*(?:{_UNIT_RE})?[\s,:-]*(?P<name>.*)$", re.IGNORECASE)
_TRAILING = re.compile(rf"^(?P<name>.*?)[\s,:–-]+(?P<amount>{_AMOUNT})\s*(?:{_UNIT_RE})?\.?$", re.IGNORECASE)


def unit_key(text: str) -> str:
    """Map a unit as written ("tablespoons", "v.š.") to a key in UNITS, or "" if unknown."""
    return _ALIAS_TO_KEY.get((text or "").strip().lower(), "")


def parse_line(line: str) -> dict:
    """Split "500 g miltų" / "miltai 500 g" / "druska" into amount, unit and name."""
    s = re.sub(r"\s+", " ", (line or "")).strip()
    s = re.sub(r"^[-•*–]\s*", "", s)
    for pattern in (_LEADING, _TRAILING):
        m = pattern.match(s)
        if m and m.group("name").strip():
            return {
                "amount": m.group("amount").strip(),
                "unit": unit_key(m.group("unit") or ""),
                "name": m.group("name").strip(" ,;:-"),
            }
    return {"amount": "", "unit": "", "name": s}


_VULGAR = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}


def amount_to_float(text: str):
    """Turn an amount as written ("1,5", "1/2", "1 1/2", "2-3", "½") into a number, or None."""
    s = (text or "").strip().replace(",", ".")
    if not s:
        return None
    if s in _VULGAR:
        return _VULGAR[s]
    try:
        parts = re.split(r"\s*[-–]\s*", s)  # range: use the midpoint
        vals = []
        for part in parts:
            total = 0.0
            for tok in part.split():
                if "/" in tok:
                    a, b = tok.split("/")
                    total += float(a) / float(b)
                else:
                    total += float(tok)
            vals.append(total)
        return sum(vals) / len(vals)
    except (ValueError, ZeroDivisionError):
        return None


# Millilitres per volume unit, and grams per ml for ingredients that differ a lot from water.
_ML_PER_UNIT = {"ml": 1, "l": 1000, "tsp": 5, "tbsp": 15, "cup": 240}
_DENSITY_G_PER_ML = [  # first keyword match wins; default is 1.0 (water, milk, juice, broth)
    (("oil",), 0.92), (("butter",), 0.96), (("honey",), 1.42), (("syrup",), 1.3),
    (("flour",), 0.53), (("sugar",), 0.85), (("rice",), 0.8), (("oat",), 0.4),
    (("cocoa",), 0.45), (("breadcrumb",), 0.45), (("salt",), 1.2),
]


def to_grams(amount: str, unit: str, name: str):
    """Weight in grams for a weight or volume amount, or None for units we can't convert (pcs, clove...)."""
    qty = amount_to_float(amount)
    if qty is None:
        return None
    if unit == "g":
        return qty
    if unit == "kg":
        return qty * 1000
    if unit in _ML_PER_UNIT:
        text = (name or "").lower()
        density = next((d for kws, d in _DENSITY_G_PER_ML if all(k in text for k in kws)), 1.0)
        return qty * _ML_PER_UNIT[unit] * density
    return None


def items_from_lines(lines_en: list, lines_lt: list) -> list:
    """Build structured items from the English and Lithuanian text lists (paired by position)."""
    items = []
    for en, lt in zip_longest(lines_en or [], lines_lt or [], fillvalue=""):
        pe, pl = parse_line(en), parse_line(lt)
        items.append({
            "amount": pl["amount"] or pe["amount"],
            "unit": pl["unit"] or pe["unit"],
            "name": pe["name"] or pl["name"],
            "name_lt": pl["name"] or pe["name"],
        })
    return [i for i in items if i["name"] or i["name_lt"]]


def normalize_items(raw: list) -> list:
    """Clean items coming from the form or from Kimi. Accepts dicts or plain strings."""
    out = []
    for r in raw or []:
        if isinstance(r, str):
            p = parse_line(r)
            r = {**p, "name_lt": p["name"]}
        if not isinstance(r, dict):
            continue
        amount = str(r.get("amount") or "").strip()
        unit_text = str(r.get("unit") or "").strip()
        name = str(r.get("name") or "").strip()
        name_lt = str(r.get("name_lt") or "").strip()
        unit = unit_text if unit_text in UNITS else unit_key(unit_text)
        if unit_text and not unit:
            # Unknown unit (e.g. "handful"): keep it as part of the name so nothing is lost.
            name = f"{unit_text} {name}".strip()
            name_lt = f"{unit_text} {name_lt}".strip()
        if not (name or name_lt):
            continue
        out.append({"amount": amount, "unit": unit, "name": name or name_lt, "name_lt": name_lt or name})
    return out


def format_item(item: dict, lang: str = "en") -> str:
    unit = UNITS.get(item.get("unit", ""), ("", "", []))[0 if lang == "en" else 1]
    name = item.get("name") if lang == "en" else item.get("name_lt")
    return " ".join(p for p in (item.get("amount", ""), unit, name or "") if p)


def lines_from_items(items: list) -> tuple:
    return [format_item(i, "en") for i in items], [format_item(i, "lt") for i in items]


def units_for_prompt() -> str:
    return ", ".join(f'"{k}"' for k in UNITS)
