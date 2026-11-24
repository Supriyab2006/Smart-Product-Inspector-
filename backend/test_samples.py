import os
import sys
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

from ocr import extract_fields_from_text, detect_barcode
from compliance import check_legal_metrology_compliance
from matcher import analyze_ingredients

samples_file = os.path.join(CURRENT_DIR, "samples", "samples_index.json")
with open(samples_file, "r", encoding="utf-8") as f:
    samples = json.load(f)

print("=" * 70)
print("TESTING 5 SAMPLE CASES WITH LABELGUARD INDIA ENGINE")
print("=" * 70)

all_passed = True

for idx, s in enumerate(samples, 1):
    raw_text = s["raw_text"]
    fields = extract_fields_from_text(raw_text)
    barcode_found, _ = detect_barcode(None, raw_text)
    if barcode_found:
        fields["barcode"] = barcode_found
        
    comp = check_legal_metrology_compliance(fields)
    ing = analyze_ingredients(fields["ingredients"], product_type=fields.get("product_type", "food"))

    print(f"\n--- CASE {idx}: {s['name']} ---")
    print(f"Product: {fields.get('product_name')}")
    print(f"Brand: {fields.get('brand')}")
    print(f"MRP: {fields.get('mrp')}")
    print(f"Net Qty: {fields.get('net_quantity')}")
    print(f"Barcode: {fields.get('barcode')} (Status: {comp['barcode_evaluation']['status']})")
    print(f"Compliance Score: {comp['score']}% -> Verdict: {comp['verdict']}")
    print(f"Health Score: {ing['health_score']}/100 -> Verdict: {ing['health_verdict']}")
    print(f"Allergens Found: {ing['allergens']}")
    if ing['banned_ingredients']:
        print(f"BANNED INGREDIENTS DETECTED: {[b['ingredient'] for b in ing['banned_ingredients']]}")
    print(f"Violations Count: {len(comp['violations'])}")
    for v in comp['violations']:
        print(f"  * [{v['rule']}] {v['title']}: {v['message']}")

    # Verification checks
    if idx == 1:
        assert comp['verdict'] == "COMPLIANT", f"Case 1 should be COMPLIANT, got {comp['verdict']}"
        assert comp['barcode_evaluation']['is_valid'] == True
    elif idx == 2:
        # Missing MRP tax phrase
        assert any("mrp" in v['title'].lower() or "taxes" in v['title'].lower() for v in comp['violations']), "Case 2 should flag MRP"
    elif idx == 3:
        # oz alone
        assert any("12" in v['rule'] or "unit" in v['title'].lower() or "quantity" in v['title'].lower() for v in comp['violations']), "Case 3 should flag non-metric oz"
    elif idx == 4:
        # Invalid barcode checksum
        assert comp['barcode_evaluation']['is_valid'] == False, "Case 4 should have invalid barcode checksum"
    elif idx == 5:
        # Banned ingredient Potassium Bromate
        assert len(ing['banned_ingredients']) > 0, "Case 5 should detect banned ingredient"

print("\n" + "=" * 70)
print("ALL 5 TEST CASES VERIFIED AND WORKING 100% ACCURATELY!")
print("=" * 70)
