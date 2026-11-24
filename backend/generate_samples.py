import os
import json
from PIL import Image, ImageDraw, ImageFont

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

samples = [
    {
        "id": "sample-1-compliant",
        "name": "Case 1: Fully Compliant Indian Packaged Snack",
        "description": "Standard packaged food with all 10 Legal Metrology declarations, valid 890 GS1 India barcode, FSSAI 14-digit number, metric units, and consumer care details.",
        "expected_verdict": "COMPLIANT",
        "expected_score": 100,
        "raw_text": """HALDIRAM'S
ALOO BHUJIA
Crispy Potato & Gram Flour Spiced Sticks
Ingredients: Potato (44%), Edible Vegetable Oil (Palmolein), Gram Pulse Flour (12%), Tepary Bean Flour, Iodised Salt, Red Chilli, Black Pepper, Dry Ginger, Cardamom, Clove Oil, Citric Acid (E330).
Net Quantity: 200 g
MRP: Rs. 60.00 (inclusive of all taxes)
Mfg. Date: 15/10/2026
Best Before: 6 months from packaging
Manufactured by: Haldiram Snacks Pvt. Ltd., Plot No. 11, Industrial Area, Noida, Gautam Budh Nagar, Uttar Pradesh - 201301, India.
Customer Care: 1800-425-1947, email: customercare@haldirams.com
Country of Origin: Made in India
FSSAI Lic. No. 10012011000123
Barcode: 8901058852332"""
    },
    {
        "id": "sample-2-missing-mrp",
        "name": "Case 2: Missing MRP & Taxes (Imported Chocolate)",
        "description": "Imported chocolate label lacking mandatory Indian MRP with 'inclusive of all taxes' declaration under Rule 6(1)(e).",
        "expected_verdict": "PARTIALLY COMPLIANT",
        "expected_score": 75,
        "raw_text": """SWISS ALPS
PREMIUM DARK CHOCOLATE 70%
Ingredients: Cocoa Solids, Cocoa Butter, Sugar, Soy Lecithin (E322), Bourbon Vanilla.
Net Quantity: 100 g
Mfg. Date: 01/09/2026
Best Before: 01/09/2027
Manufactured by: Chocolatier Suisse SA, Rue des Alpes 45, 8001 Zurich, Switzerland.
Imported by: Global Confectionery Imports Ltd., Lower Parel, Mumbai - 400013, India.
Customer Care: care@globalimports.in, Tel: 022-24901122
Country of Origin: Switzerland
FSSAI Lic. No. 10015022000888
Barcode: 7610123456789"""
    },
    {
        "id": "sample-3-wrong-unit",
        "name": "Case 3: Non-Metric Unit (Imperial oz Alone)",
        "description": "Peanut butter jar declaring net quantity only in imperial ounces (16 oz) without mandatory metric units (g/kg), violating Rule 6(1)(c) and Rule 12.",
        "expected_verdict": "PARTIALLY COMPLIANT",
        "expected_score": 75,
        "raw_text": """NUTTY DELIGHT
CRUNCHY PEANUT BUTTER
Ingredients: Roasted Peanuts (90%), Vegetable Oil, Cane Sugar, Salt.
Net Quantity: 16 oz
MRP: Rs. 299.00 (inclusive of all taxes)
Mfg. Date: 12/08/2026
Best Before: 12 months from mfg date
Manufactured by: American Harvest Foods, 452 Industrial Highway, Atlanta, GA, USA.
Imported by: NutriFoods Retail India Pvt Ltd, Whitefield, Bengaluru - 560066.
Customer Care: 1800-200-9988, care@nutrifoods.in
Country of Origin: USA
FSSAI Lic. No. 10016043000512
Barcode: 012345678905"""
    },
    {
        "id": "sample-4-invalid-barcode",
        "name": "Case 4: Corrupted Barcode Checksum",
        "description": "Ready-to-eat noodles package with an invalid EAN-13 check digit that fails the GS1 Modulo-10 checksum validation.",
        "expected_verdict": "PARTIALLY COMPLIANT",
        "expected_score": 85,
        "raw_text": """NOODLE EXPRESS
MASALA INSTANT NOODLES
Ingredients: Refined Wheat Flour (Maida), Palm Oil, Iodised Salt, Wheat Gluten, Spices (Onion, Turmeric, Cumin, Chilli), Acidity Regulator (E330).
Net Quantity: 70 g
MRP: Rs. 15.00 (inclusive of all taxes)
Mfg. Date: 20/09/2026
Best Before: 9 months from mfg date
Manufactured by: Quick Food Solutions Ltd., Sector 62, Gurugram, Haryana - 122001, India.
Customer Care: 1800-111-222, support@noodleexpress.in
Country of Origin: Made in India
FSSAI Lic. No. 10014064000333
Barcode: 8901234567899"""  # Note: Check digit 9 is invalid for 890123456789x (correct is 8901234567891)
    },
    {
        "id": "sample-5-banned-ingredient",
        "name": "Case 5: Prohibited Ingredient (Potassium Bromate in Bread)",
        "description": "Bakery white sliced bread declaring Potassium Bromate (E924), which is strictly banned in India since 2016 and internationally due to carcinogenic risks.",
        "expected_verdict": "NON-COMPLIANT",
        "expected_score": 50,
        "raw_text": """GOLDEN CRUST
WHITE SLICED BREAD
Ingredients: Refined Wheat Flour (Maida), Water, Sugar, Yeast, Edible Vegetable Oil, Iodised Salt, Flour Treatment Agent (Potassium Bromate E924), Preservative (E282).
Net Quantity: 400 g
MRP: Rs. 40.00
Mfg. Date: 21/11/2026
Best Before: 5 days from packaging
Manufactured by: Golden Crust Bakers, Okhla Phase III, New Delhi - 110020, India.
Customer Care: 011-26810099, contact@goldencrust.com
Country of Origin: Made in India
FSSAI Lic. No. 10013011000999
Barcode: 8906001234567"""
    }
]

def draw_label_image(sample_item):
    """
    Renders high-resolution product packaging label image with border,
    header, text layout, and simulated barcode graphic.
    """
    width, height = 700, 750
    img = Image.new("RGB", (width, height), color=(252, 252, 250))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([(15, 15), (width - 15, height - 15)], outline=(30, 41, 59), width=3)
    # Header background bar
    draw.rectangle([(18, 18), (width - 18, 70)], fill=(15, 118, 110))

    try:
        font_header = ImageFont.truetype("arial.ttf", 24)
        font_sub = ImageFont.truetype("arial.ttf", 16)
        font_text = ImageFont.truetype("arial.ttf", 14)
        font_bold = ImageFont.truetype("arialbd.ttf", 14)
    except Exception:
        font_header = font_sub = font_text = font_bold = ImageFont.load_default()

    # Title in header
    draw.text((30, 30), sample_item["id"].upper(), fill=(255, 255, 255), font=font_header)

    y = 85
    lines = sample_item["raw_text"].splitlines()
    for i, line in enumerate(lines):
        if i == 0: # Brand
            draw.text((30, y), line, fill=(13, 148, 136), font=font_header)
            y += 32
        elif i == 1: # Product Name
            draw.text((30, y), line, fill=(15, 23, 42), font=font_sub)
            y += 26
        elif "Ingredients:" in line:
            # Word wrap ingredients
            draw.text((30, y), "Ingredients:", fill=(15, 23, 42), font=font_bold)
            y += 20
            ing_body = line.replace("Ingredients:", "").strip()
            # simple wrapping
            words = ing_body.split()
            cur_line = ""
            for w in words:
                if len(cur_line + " " + w) > 75:
                    draw.text((35, y), cur_line, fill=(51, 65, 85), font=font_text)
                    y += 18
                    cur_line = w
                else:
                    cur_line = (cur_line + " " + w).strip()
            if cur_line:
                draw.text((35, y), cur_line, fill=(51, 65, 85), font=font_text)
                y += 22
        elif "Barcode:" in line:
            # Barcode line
            code_str = line.replace("Barcode:", "").strip()
            draw.text((30, y), f"BARCODE: {code_str}", fill=(15, 23, 42), font=font_bold)
            y += 24
            # Draw synthetic barcode lines
            bx = 30
            by = y
            for char_idx, char in enumerate(code_str):
                bar_w = 2 if int(char) % 2 == 0 else 4
                bar_h = 45
                draw.rectangle([(bx, by), (bx + bar_w, by + bar_h)], fill=(0, 0, 0))
                bx += bar_w + 3
            y += 55
        else:
            # Bold label keywords
            parts = line.split(":", 1)
            if len(parts) == 2:
                draw.text((30, y), parts[0] + ":", fill=(15, 23, 42), font=font_bold)
                draw.text((180, y), parts[1].strip()[:70], fill=(51, 65, 85), font=font_text)
            else:
                draw.text((30, y), line[:80], fill=(51, 65, 85), font=font_text)
            y += 22

    # Save PNG
    png_path = os.path.join(SAMPLES_DIR, f"{sample_item['id']}.png")
    img.save(png_path)
    
    # Save TXT
    txt_path = os.path.join(SAMPLES_DIR, f"{sample_item['id']}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(sample_item["raw_text"])

    print(f"Generated sample: {png_path} and {txt_path}")

# Run generation
for s in samples:
    draw_label_image(s)

with open(os.path.join(SAMPLES_DIR, "samples_index.json"), "w", encoding="utf-8") as f:
    json.dump(samples, f, indent=2)

print("All 5 sample cases generated successfully!")
