"""Static per-100g nutrition lookup table for common recipe ingredients.

Each entry is (keywords, kcal_per_100g, protein_g_per_100g). `keywords` is a
tuple of substrings that must ALL appear in the (lowercased) ingredient text
for the entry to match. Entries are checked in order, so more specific
entries (e.g. "cottage cheese") must come before generic ones (e.g. "cheese").
"""

from typing import Optional, Tuple

NUTRITION_TABLE: list[tuple[tuple[str, ...], float, float]] = [
    # Dairy & eggs
    (("egg",), 155, 13),
    (("cottage cheese", "9"), 145, 14),
    (("cottage cheese",), 98, 11),
    (("varške", "9"), 145, 14),
    (("varškė", "9"), 145, 14),
    (("varške",), 98, 11),
    (("varškė",), 98, 11),
    (("mozzarella",), 280, 22),
    (("cheddar",), 403, 25),
    (("parmesan",), 431, 38),
    (("feta",), 264, 14),
    (("cream cheese",), 342, 6),
    (("hard cheese",), 380, 27),
    (("cheese",), 350, 25),
    (("sour cream",), 193, 2.4),
    (("greek yogurt",), 97, 9),
    (("yogurt",), 61, 3.5),
    (("yoghurt",), 61, 3.5),
    (("butter",), 717, 0.85),
    (("heavy cream",), 340, 2.1),
    (("whipping cream",), 340, 2.1),
    (("cream",), 195, 2.4),
    (("whole milk",), 61, 3.2),
    (("milk",), 50, 3.4),

    # Fats & oils
    (("olive oil",), 884, 0),
    (("sunflower oil",), 884, 0),
    (("vegetable oil",), 884, 0),
    (("oil",), 884, 0),

    # Doughs & grains
    (("filo",), 300, 7),
    (("phyllo",), 300, 7),
    (("puff pastry",), 558, 6),
    (("flour",), 364, 10),
    (("bread",), 265, 9),
    (("rice",), 130, 2.7),
    (("pasta",), 158, 5.8),
    (("oat",), 389, 17),

    # Meats & fish
    (("chicken breast",), 165, 31),
    (("chicken thigh",), 209, 26),
    (("chicken",), 239, 27),
    (("ground beef",), 254, 17),
    (("beef", "mince"), 254, 17),
    (("beef",), 250, 26),
    (("pork",), 242, 27),
    (("bacon",), 541, 37),
    (("salmon",), 208, 20),
    (("tuna",), 132, 28),
    (("shrimp",), 99, 24),
    (("prawn",), 99, 24),

    # Vegetables
    (("spinach",), 23, 2.9),
    (("tomato",), 18, 0.9),
    (("onion",), 40, 1.1),
    (("garlic",), 149, 6.4),
    (("carrot",), 41, 0.9),
    (("cucumber",), 15, 0.7),
    (("bell pepper",), 31, 1),
    (("mushroom",), 22, 3.1),
    (("broccoli",), 34, 2.8),
    (("cabbage",), 25, 1.3),
    (("lettuce",), 15, 1.4),
    (("potato",), 77, 2),
    (("avocado",), 160, 2),

    # Nuts & seeds
    (("sesame",), 573, 18),
    (("sunflower seed",), 584, 21),
    (("walnut",), 654, 15),
    (("almond",), 579, 21),
    (("peanut",), 567, 26),

    # Sweet & baking
    (("sugar",), 387, 0),
    (("honey",), 304, 0.3),
    (("dark chocolate",), 546, 7.8),
    (("chocolate",), 535, 7.6),
    (("cocoa",), 228, 20),
    (("baking powder",), 53, 0),
    (("yeast",), 105, 36),

    # Legumes
    (("black bean",), 132, 8.9),
    (("lentil",), 116, 9),
    (("chickpea",), 164, 8.9),
    (("bean",), 127, 8.7),

    # Other
    (("tofu",), 76, 8),
    (("mayonnaise",), 680, 1),
    (("ketchup",), 112, 1.2),
    (("soy sauce",), 53, 8),
    (("coconut milk",), 230, 2.3),
    (("vinegar",), 18, 0),
    (("lemon",), 29, 1.1),
    (("banana",), 89, 1.1),
    (("apple",), 52, 0.3),
]


def lookup_nutrition(ingredient: str) -> Optional[Tuple[float, float]]:
    """Return (kcal_per_100g, protein_g_per_100g) for a known ingredient, or None."""
    text = ingredient.lower()
    for keywords, kcal, protein in NUTRITION_TABLE:
        if all(kw in text for kw in keywords):
            return kcal, protein
    return None
