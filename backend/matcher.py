import json
import os
import re
from difflib import SequenceMatcher, get_close_matches

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

INGREDIENTS_DB = load_json("ingredients.json")
REGULATIONS_DB = load_json("regulations.json")

# Prebuild normalized lookup maps
INGREDIENT_LOOKUP = {}
NAME_LIST = []

for ing in INGREDIENTS_DB:
    primary_name = ing["name"]
    clean_primary = primary_name.lower().strip()
    INGREDIENT_LOOKUP[clean_primary] = ing
    NAME_LIST.append(clean_primary)
    
    # Aliases
    for alias in ing.get("aliases", []):
        clean_alias = alias.lower().strip()
        if clean_alias not in INGREDIENT_LOOKUP:
            INGREDIENT_LOOKUP[clean_alias] = ing
            NAME_LIST.append(clean_alias)
            
    # E number
    e_num = ing.get("e_number")
    if e_num:
        clean_e = e_num.lower().strip()
        INGREDIENT_LOOKUP[clean_e] = ing
        # Also map without 'e' e.g. "322" or "e-322"
        INGREDIENT_LOOKUP[clean_e.replace("e", "")] = ing
        INGREDIENT_LOOKUP[f"e-{clean_e.replace('e', '')}"] = ing
        NAME_LIST.append(clean_e)

def normalize_text(text):
    text = text.lower()
    text = re.sub(r"[\(\)\[\],;:\.\*\-]", " ", text)
    return " ".join(text.split())

def find_best_match(raw_token):
    token = raw_token.lower().strip()
    # Strip percentage numbers like "10%", "26%", etc.
    token = re.sub(r"\d+(\.\d+)?%", "", token).strip()
    
    if not token or len(token) < 2:
        return None

    # 1. Exact match
    if token in INGREDIENT_LOOKUP:
        return INGREDIENT_LOOKUP[token]

    # 2. Substring match
    for name in NAME_LIST:
        if len(name) > 3 and (name in token or token in name):
            return INGREDIENT_LOOKUP[name]

    # 3. Fuzzy match with difflib
    matches = get_close_matches(token, NAME_LIST, n=1, cutoff=0.68)
    if matches:
        return INGREDIENT_LOOKUP[matches[0]]

    # 4. Check E-numbers in token (e.g. "INS 330", "E-211", "Preservative (202)")
    e_match = re.search(r"\b(?:ins|e)?\s*[-]?\s*(\d{3,4}[a-z]?)\b", token)
    if e_match:
        code = e_match.group(1).lower()
        if code in INGREDIENT_LOOKUP:
            return INGREDIENT_LOOKUP[code]
        if f"e{code}" in INGREDIENT_LOOKUP:
            return INGREDIENT_LOOKUP[f"e{code}"]

    return None

def check_banned_ingredient(ingredient_name):
    clean_name = ingredient_name.lower().strip()
    for reg in REGULATIONS_DB:
        reg_ing = reg["ingredient"].lower()
        if reg_ing in clean_name or clean_name in reg_ing:
            return reg
        # Check sub words
        ratio = SequenceMatcher(None, clean_name, reg_ing).ratio()
        if ratio > 0.75:
            return reg
    return None

def parse_ingredients_text(raw_ingredients_text):
    """
    Splits ingredients string by comma, semicolon, bullet points, or newlines.
    Handles nested parentheses cleanly.
    """
    if not raw_ingredients_text:
        return []

    # Clean header prefix if present (e.g., "Ingredients: ")
    clean_text = re.sub(r"^(?:ingredients|contents|composition)\s*[:\-]\s*", "", raw_ingredients_text, flags=re.IGNORECASE)
    
    tokens = []
    current = []
    depth = 0
    
    for char in clean_text:
        if char in "([":
            depth += 1
            current.append(char)
        elif char in ")]":
            if depth > 0:
                depth -= 1
            current.append(char)
        elif char in ",\n;•|" and depth == 0:
            token = "".join(current).strip()
            if token:
                tokens.append(token)
            current = []
        else:
            current.append(char)
            
    if current:
        token = "".join(current).strip()
        if token:
            tokens.append(token)

    return tokens

def analyze_ingredients(raw_ingredients_text, product_type="food"):
    """
    Analyzes an ingredients text string or list of ingredients.
    Returns:
    - items: list of analyzed ingredient objects with badge colors (green, yellow, red), reasons, skin effect.
    - allergens: list of detected allergens (milk, nuts, gluten, soy, etc.)
    - banned_found: list of ingredients flagged in regulations
    - health_score: 0-100
    - health_verdict: HEALTHY / MODERATE / UNHEALTHY (for food)
    - skin_score: 0-100
    - skin_verdict: GOOD FOR SKIN / OKAY FOR SKIN / BAD FOR SKIN (for cosmetic)
    """
    if isinstance(raw_ingredients_text, list):
        tokens = raw_ingredients_text
    else:
        tokens = parse_ingredients_text(raw_ingredients_text)

    analyzed_items = []
    allergens_detected = set()
    banned_items = []

    safe_count = 0
    caution_count = 0
    avoid_count = 0

    for token in tokens:
        matched = find_best_match(token)
        banned_reg = check_banned_ingredient(token)
        
        if matched:
            display_name = matched["name"]
            safety = matched.get("safety_level", "safe")
            reason = matched.get("reason", "Standard ingredient")
            skin_effect = matched.get("skin_effect", "Neutral")
            allergen = matched.get("allergen")
            e_number = matched.get("e_number")
        else:
            display_name = token.title()
            safety = "safe"
            reason = "General food/cosmetic ingredient"
            skin_effect = "Neutral"
            allergen = None
            e_number = None

        if banned_reg:
            safety = "avoid"
            reason = f"ALERT: Restricted/Banned in {', '.join(banned_reg['banned_in'][:3])}. {banned_reg['reason']}"
            banned_items.append({
                "ingredient": display_name,
                "regulation": banned_reg
            })

        # Allergen detection from allergen field or keyword check
        token_lower = token.lower()
        if allergen:
            allergens_detected.add(allergen.capitalize())
        else:
            if any(w in token_lower for w in ["milk", "dairy", "cheese", "butter", "whey", "casein"]):
                allergens_detected.add("Milk")
            elif any(w in token_lower for w in ["peanut", "almond", "cashew", "walnut", "hazelnut", "tree nut"]):
                allergens_detected.add("Nuts")
            elif any(w in token_lower for w in ["wheat", "gluten", "maida", "atta", "barley", "rye"]):
                allergens_detected.add("Gluten")
            elif any(w in token_lower for w in ["soy", "soya", "lecithin"]):
                allergens_detected.add("Soy")
            elif any(w in token_lower for w in ["egg", "albumen"]):
                allergens_detected.add("Egg")
            elif any(w in token_lower for w in ["fish", "salmon", "tuna"]):
                allergens_detected.add("Fish")
            elif any(w in token_lower for w in ["sulphite", "sulfite", "metabisulphite"]):
                allergens_detected.add("Sulphites")

        # Color mapping: green (safe), yellow (caution), red (avoid)
        badge_color = "green" if safety == "safe" else ("yellow" if safety == "caution" else "red")
        
        if safety == "safe":
            safe_count += 1
        elif safety == "caution":
            caution_count += 1
        else:
            avoid_count += 1

        analyzed_items.append({
            "raw_token": token,
            "name": display_name,
            "badge": badge_color,
            "safety_level": safety,
            "reason": reason,
            "skin_effect": skin_effect,
            "e_number": e_number,
            "is_banned": bool(banned_reg)
        })

    total = len(analyzed_items)
    if total == 0:
        base_score = 75
    else:
        # Score calculation: Start with 100, deduct for caution (-8) and avoid (-25)
        penalty = (caution_count * 8) + (avoid_count * 25)
        base_score = max(5, min(100, 100 - penalty))

    # Food health verdict
    if base_score >= 70:
        health_verdict = "HEALTHY"
    elif base_score >= 40:
        health_verdict = "MODERATE"
    else:
        health_verdict = "UNHEALTHY"

    # Cosmetic skin verdict
    if base_score >= 70:
        skin_verdict = "GOOD FOR SKIN"
    elif base_score >= 40:
        skin_verdict = "OKAY FOR SKIN"
    else:
        skin_verdict = "BAD FOR SKIN"

    return {
        "ingredients": analyzed_items,
        "allergens": sorted(list(allergens_detected)),
        "banned_ingredients": banned_items,
        "health_score": base_score,
        "health_verdict": health_verdict,
        "skin_score": base_score,
        "skin_verdict": skin_verdict,
        "summary": {
            "total": total,
            "safe": safe_count,
            "caution": caution_count,
            "avoid": avoid_count
        }
    }
