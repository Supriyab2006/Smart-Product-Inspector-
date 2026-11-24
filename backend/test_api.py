import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

import os
import sys
import asyncio

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

from main import (
    guest_login, get_items, get_ingredients, get_regulations,
    get_scan_history, reevaluate_compliance, scan_product_label,
    FieldRecheckRequest
)
from starlette.datastructures import UploadFile
import io

print("=" * 60)
print("TESTING FASTAPI ROUTE HANDLERS DIRECTLY")
print("=" * 60)

# 1. Guest Auth
res = guest_login()
assert res["success"] == True
print("1. guest_login() -> OK:", res["user"])

# 2. Reference Items
items_data = get_items(category="Snacks")
assert items_data["total"] >= 15
print(f"2. get_items(category='Snacks') -> OK ({items_data['total']} items)")

# 3. Ingredients
ings = get_ingredients(search="Niacinamide")
assert ings["total"] >= 1
print(f"3. get_ingredients(search='Niacinamide') -> OK: {ings['ingredients'][0]['name']}")

# 4. Regulations
regs = get_regulations(country="India")
assert regs["total"] >= 1
print(f"4. get_regulations(country='India') -> OK: {regs['total']} regulations returned")

# 5. Full OCR with Image File Upload!
async def test_ocr():
    img_path = os.path.join(CURRENT_DIR, "samples", "sample-1-compliant.png")
    with open(img_path, "rb") as f:
        file_bytes = f.read()
    
    upload_file = UploadFile(filename="sample-1-compliant.png", file=io.BytesIO(file_bytes))
    ocr_res = await scan_product_label(file=upload_file, raw_text_input=None)
    assert ocr_res["success"] == True
    print("5. scan_product_label (Real Image OCR) -> OK:")
    print("   - Raw text extracted length:", len(ocr_res["raw_text"]))
    print("   - Product Name:", ocr_res["fields"].get("product_name"))
    print("   - MRP:", ocr_res["fields"].get("mrp"))
    print("   - Net Qty:", ocr_res["fields"].get("net_quantity"))
    print("   - Barcode:", ocr_res["fields"].get("barcode"))
    print("   - Compliance Score:", ocr_res["compliance"]["score"], "%")
    print("   - Compliance Verdict:", ocr_res["compliance"]["verdict"])

asyncio.run(test_ocr())

# 6. Compliance Recheck with Edited Fields
recheck_req = FieldRecheckRequest(
    product_name="Edited Aloo Bhujia",
    brand="Haldiram's",
    category="Snacks",
    product_type="food",
    ingredients="Potato, Palmolein, Gram Flour, Iodised Salt",
    net_quantity="200 g",
    mrp="Rs. 60.00 (inclusive of all taxes)",
    mfg_date="15/10/2026",
    expiry_date="Best Before 6 months",
    manufacturer_address="Plot 11, Industrial Area, Noida, UP, India",
    consumer_care="1800-425-1947, care@haldirams.com",
    fssai_no="10012011000123",
    country_of_origin="Made in India",
    barcode="8901058852332"
)
recheck_res = reevaluate_compliance(recheck_req)
assert recheck_res["compliance"]["verdict"] == "COMPLIANT"
print("6. reevaluate_compliance() -> OK:", recheck_res["compliance"]["verdict"])

# 7. Scan History in SQLite
history = get_scan_history(limit=5)
assert len(history) >= 1
print(f"7. get_scan_history() -> OK ({len(history)} scan records retrieved from SQLite)")

print("=" * 60)
print("ALL BACKEND ENDPOINTS AND REAL OCR VERIFIED SUCCESSFULLY!")
print("=" * 60)

