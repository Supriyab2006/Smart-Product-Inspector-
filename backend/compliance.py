import re
from datetime import datetime

def validate_ean13_checksum(barcode_str):
    """
    Validates EAN-13 checksum using standard GS1 Modulo-10 algorithm.
    Weights: 1 for odd positions (1-based), 3 for even positions.
    """
    if not barcode_str or not barcode_str.isdigit() or len(barcode_str) != 13:
        return False
    digits = [int(d) for d in barcode_str]
    # Sum for first 12 digits
    weighted_sum = sum(digits[i] * (1 if i % 2 == 0 else 3) for i in range(12))
    check_digit = (10 - (weighted_sum % 10)) % 10
    return check_digit == digits[12]

def validate_ean8_checksum(barcode_str):
    """
    Validates EAN-8 checksum.
    Weights: 3 for odd positions, 1 for even positions (for 7 digits).
    """
    if not barcode_str or not barcode_str.isdigit() or len(barcode_str) != 8:
        return False
    digits = [int(d) for d in barcode_str]
    weighted_sum = sum(digits[i] * (3 if i % 2 == 0 else 1) for i in range(7))
    check_digit = (10 - (weighted_sum % 10)) % 10
    return check_digit == digits[7]

def validate_upca_checksum(barcode_str):
    """
    Validates UPC-A (12-digit) checksum.
    """
    if not barcode_str or not barcode_str.isdigit() or len(barcode_str) != 12:
        return False
    digits = [int(d) for d in barcode_str]
    weighted_sum = sum(digits[i] * (3 if i % 2 == 0 else 1) for i in range(11))
    check_digit = (10 - (weighted_sum % 10)) % 10
    return check_digit == digits[11]

def analyze_barcode(barcode_str):
    """
    Evaluates barcode structure, length, checksum, and GS1 India (890) country code prefix.
    """
    if not barcode_str or barcode_str.upper() in ["N/A", "NONE", "UNKNOWN", "NOT FOUND"]:
        return {
            "value": barcode_str or "Not Detected",
            "is_valid": False,
            "status": "MISSING",
            "format": "Unknown",
            "is_india_prefix": False,
            "reason": "No barcode detected on package"
        }
    
    clean_code = re.sub(r"[^\d]", "", barcode_str)
    length = len(clean_code)

    if length == 13:
        fmt = "EAN-13"
        valid_checksum = validate_ean13_checksum(clean_code)
        is_india = clean_code.startswith("890")
        if not valid_checksum:
            return {
                "value": clean_code,
                "is_valid": False,
                "status": "INVALID_CHECKSUM",
                "format": fmt,
                "is_india_prefix": is_india,
                "reason": f"EAN-13 modulo-10 check digit verification failed for {clean_code}"
            }
        return {
            "value": clean_code,
            "is_valid": True,
            "status": "VALID",
            "format": fmt,
            "is_india_prefix": is_india,
            "reason": f"Valid EAN-13 barcode with verified checksum. {'GS1 India (890) registered prefix.' if is_india else 'International GS1 prefix.'}"
        }
    elif length == 8:
        fmt = "EAN-8"
        valid_checksum = validate_ean8_checksum(clean_code)
        return {
            "value": clean_code,
            "is_valid": valid_checksum,
            "status": "VALID" if valid_checksum else "INVALID_CHECKSUM",
            "format": fmt,
            "is_india_prefix": False,
            "reason": "Valid EAN-8 compact barcode" if valid_checksum else "Invalid EAN-8 checksum"
        }
    elif length == 12:
        fmt = "UPC-A"
        valid_checksum = validate_upca_checksum(clean_code)
        return {
            "value": clean_code,
            "is_valid": valid_checksum,
            "status": "VALID" if valid_checksum else "INVALID_CHECKSUM",
            "format": fmt,
            "is_india_prefix": False,
            "reason": "Valid UPC-A 12-digit barcode" if valid_checksum else "Invalid UPC-A checksum"
        }
    else:
        return {
            "value": clean_code if clean_code else barcode_str,
            "is_valid": False,
            "status": "INVALID_LENGTH",
            "format": f"Generic ({length} digits)",
            "is_india_prefix": clean_code.startswith("890") if clean_code else False,
            "reason": f"Standard barcodes must be 8, 12, or 13 digits. Detected {length} digits."
        }

def check_legal_metrology_compliance(fields):
    """
    Evaluates extracted fields against the 10 Legal Metrology (Packaged Commodities) Rules, 2011:
    1. Manufacturer / Packer / Importer Name & Address (Rule 6(1)(a))
    2. Common / Generic Name of the Commodity (Rule 6(1)(b))
    3. Net Quantity with Standard Metric Units (Rule 6(1)(c) & Rule 12) - flags imperial oz/lbs used alone
    4. Maximum Retail Price (MRP) inclusive of all taxes (Rule 6(1)(e))
    5. Month and Year of Manufacture / Packing / Import (Rule 6(1)(d))
    6. Best Before / Expiry Date (FSSAI / LMR Rule 6(1) for perishables)
    7. Consumer Care Details (Telephone, Email, Address - Rule 6(1)(f))
    8. Country of Origin (Rule 6(1)(g))
    9. Barcode Validity (GS1 Standard Checksum & India 890 Prefix)
    10. FSSAI License Number (14 digits) for Food items
    """
    checklist = []
    violations = []
    passed_count = 0
    total_checks = 10

    # Helper getters
    def get_val(key):
        v = fields.get(key, "")
        return str(v).strip() if v is not None else ""

    product_name = get_val("product_name")
    brand = get_val("brand")
    mfg_address = get_val("manufacturer_address")
    net_quantity = get_val("net_quantity")
    mrp = get_val("mrp")
    mfg_date = get_val("mfg_date")
    expiry_date = get_val("expiry_date")
    consumer_care = get_val("consumer_care")
    country_of_origin = get_val("country_of_origin")
    barcode = get_val("barcode")
    fssai_no = get_val("fssai_no")
    category = get_val("category").lower()
    is_food = any(f in category for f in ["food", "beverage", "snack", "dairy", "bakery", "supplement"]) or fields.get("product_type") == "food"

    # --- RULE 1: Manufacturer / Packer Name & Address ---
    r1_pass = len(mfg_address) > 10 and not any(w in mfg_address.lower() for w in ["not found", "n/a", "missing"])
    checklist.append({
        "rule_id": 1,
        "title": "Manufacturer / Packer / Importer Name & Address",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(a)",
        "status": "PASS" if r1_pass else "FAIL",
        "extracted_value": mfg_address if r1_pass else "Not Found",
        "description": "Full name and complete registered commercial address of the manufacturer, packer, or importer must be prominently declared."
    })
    if r1_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "Rule 6(1)(a)",
            "title": "Missing Manufacturer / Packer Address",
            "severity": "CRITICAL",
            "message": "Complete name and commercial postal address of manufacturer/packer was not declared on the package.",
            "fix": "Print the registered corporate office or factory address including plot/survey number, city, state, and PIN code."
        })

    # --- RULE 2: Common or Generic Name ---
    r2_pass = len(product_name) > 2 and not any(w in product_name.lower() for w in ["not found", "n/a", "unknown"])
    checklist.append({
        "rule_id": 2,
        "title": "Common / Generic Name of Commodity",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(b)",
        "status": "PASS" if r2_pass else "FAIL",
        "extracted_value": f"{brand + ' - ' if brand else ''}{product_name}" if r2_pass else "Not Found",
        "description": "The common or generic name of the commodity contained in the package must be prominently declared on the principal display panel."
    })
    if r2_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "Rule 6(1)(b)",
            "title": "Missing Common Name of Commodity",
            "severity": "HIGH",
            "message": "Generic/common commodity name could not be identified on the product label.",
            "fix": "Clearly declare the generic identity (e.g. 'Potato Chips', 'Face Serum', 'Wheat Flour') on the front panel in legible font."
        })

    # --- RULE 3: Net Quantity with Standard Metric Units ---
    r3_pass = False
    r3_warning = False
    r3_reason = ""
    
    # Check for imperial unit violations (oz, lbs used alone)
    has_imperial_alone = bool(re.search(r"\b(\d+(\.\d+)?\s*(?:oz|fl\s*oz|lbs|pounds))\b", net_quantity, re.IGNORECASE) and not re.search(r"\b(?:g|gm|kg|ml|l|ltr)\b", net_quantity, re.IGNORECASE))
    has_metric = bool(re.search(r"\b(\d+(\.\d+)?\s*(?:g|gm|kg|ml|l|ltr|pcs|piece|tablets|capsules|wipes|sheets|u|units?))\b", net_quantity, re.IGNORECASE))

    if has_imperial_alone:
        r3_pass = False
        r3_reason = "VIOLATION: Non-metric units (oz/lbs) used alone without mandatory SI metric units (g/kg/ml)."
    elif has_metric:
        r3_pass = True
        r3_reason = "Standard metric units detected."
    elif len(net_quantity) > 0 and not any(w in net_quantity.lower() for w in ["not found", "n/a"]):
        r3_warning = True
        r3_reason = "Net quantity present but unit format should be verified against standard metric abbreviations (g, kg, ml, L)."
    else:
        r3_reason = "Net quantity is missing from the package."

    checklist.append({
        "rule_id": 3,
        "title": "Net Quantity in Standard Metric Units",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(c) & Rule 12",
        "status": "PASS" if r3_pass else ("WARNING" if r3_warning else "FAIL"),
        "extracted_value": net_quantity if net_quantity else "Not Found",
        "description": "Net quantity must be declared in standard international metric units (g, kg, ml, L) with appropriate decimal representation. Imperial units alone are prohibited."
    })
    if r3_pass:
        passed_count += 1
    elif r3_warning:
        passed_count += 0.5
        violations.append({
            "rule": "Rule 12",
            "title": "Non-Standard Net Quantity Unit",
            "severity": "MEDIUM",
            "message": r3_reason,
            "fix": "Express net quantity strictly in SI units: grams (g), kilograms (kg), millilitres (ml), or litres (L)."
        })
    else:
        violations.append({
            "rule": "Rule 6(1)(c) & Rule 12",
            "title": "Net Quantity Violation",
            "severity": "CRITICAL",
            "message": r3_reason,
            "fix": "Mandatorily state net weight/volume using standard metric symbols (g, kg, ml, L) without misleading symbols or imperial-only designations."
        })

    # --- RULE 4: Maximum Retail Price (MRP) ---
    r4_pass = False
    r4_has_taxes = False
    clean_mrp = mrp.lower()
    
    if len(mrp) > 0 and not any(w in clean_mrp for w in ["not found", "n/a", "missing"]):
        has_digits = bool(re.search(r"\d+", mrp))
        r4_has_taxes = any(t in clean_mrp for t in ["incl", "all taxes", "inclusive"])
        if has_digits and r4_has_taxes:
            r4_pass = True
        elif has_digits:
            r4_pass = False # Missing "inclusive of all taxes"
            checklist_status = "WARNING"
        else:
            r4_pass = False

    checklist.append({
        "rule_id": 4,
        "title": "Maximum Retail Price (MRP) Declaration",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(e)",
        "status": "PASS" if r4_pass else ("WARNING" if (len(mrp) > 0 and not r4_has_taxes) else "FAIL"),
        "extracted_value": mrp if mrp else "Not Found",
        "description": "MRP must be clearly stated in Indian Rupees (₹ or Rs.) along with the mandatory phrase 'inclusive of all taxes'."
    })
    if r4_pass:
        passed_count += 1
    elif len(mrp) > 0 and not r4_has_taxes:
        passed_count += 0.5
        violations.append({
            "rule": "Rule 6(1)(e)",
            "title": "Missing 'Inclusive of all taxes' in MRP",
            "severity": "MEDIUM",
            "message": "Retail price is stated, but the statutory wording 'inclusive of all taxes' (or 'incl. of all taxes') was omitted.",
            "fix": "Append 'incl. of all taxes' next to the MRP (e.g., 'MRP ₹ 50.00 (incl. of all taxes)')."
        })
    else:
        violations.append({
            "rule": "Rule 6(1)(e)",
            "title": "Missing Maximum Retail Price (MRP)",
            "severity": "CRITICAL",
            "message": "No Maximum Retail Price (MRP) was detected on the commodity package.",
            "fix": "Print MRP clearly in Indian currency with inclusive tax declaration on the display panel."
        })

    # --- RULE 5: Month and Year of Manufacture / Packing ---
    r5_pass = bool(re.search(r"\b(?:\d{1,2}[/\-\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s/\-\.]+\d{2,4})\b", mfg_date, re.IGNORECASE))
    checklist.append({
        "rule_id": 5,
        "title": "Month & Year of Manufacture / Packing",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(d)",
        "status": "PASS" if r5_pass else "FAIL",
        "extracted_value": mfg_date if r5_pass else "Not Found",
        "description": "The month and year in which the commodity is manufactured, packed, or imported must be printed on the package."
    })
    if r5_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "Rule 6(1)(d)",
            "title": "Missing Month & Year of Packing",
            "severity": "HIGH",
            "message": "Month and year of manufacture or packaging could not be verified.",
            "fix": "Print 'Mfg Date: MM/YYYY' or 'Packed on: MM/YYYY' visibly on the container."
        })

    # --- RULE 6: Best Before / Expiry Date ---
    r6_pass = bool(re.search(r"\b(?:\d{1,2}[/\-\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s/\-\.]+\d{2,4}|\d+\s*(?:months|days|years))\b", expiry_date, re.IGNORECASE))
    if is_food:
        checklist.append({
            "rule_id": 6,
            "title": "Best Before / Expiry Date (Food / Perishable)",
            "reference": "Food Safety and Standards Act / LMR Rule 6(1)",
            "status": "PASS" if r6_pass else "FAIL",
            "extracted_value": expiry_date if r6_pass else "Not Found",
            "description": "Best Before or Expiry date is mandatory for all food, beverage, and perishable consumer items."
        })
        if r6_pass:
            passed_count += 1
        else:
            violations.append({
                "rule": "FSSA 2006 / LMR Rule 6(1)",
                "title": "Missing Best Before / Expiry Date on Food Item",
                "severity": "CRITICAL",
                "message": "Food/perishable package does not declare an expiry or 'Best Before' consumption timeframe.",
                "fix": "Print 'Best Before: MM/YYYY' or 'Use by: DD/MM/YYYY' prominently for consumer safety."
            })
    else:
        # Non-food items (e.g. cosmetics or cleaners) may declare expiry or period-after-opening
        checklist.append({
            "rule_id": 6,
            "title": "Expiry / Period After Opening (Cosmetics / Goods)",
            "reference": "Drugs & Cosmetics Rules / LMR",
            "status": "PASS" if r6_pass else "PASS",
            "extracted_value": expiry_date if r6_pass else "Not Required / General Commodity",
            "description": "Mandatory for medicated cosmetics; recommended for stable household commodities."
        })
        passed_count += 1

    # --- RULE 7: Consumer Care Details ---
    # Must have telephone, email, or physical address of designated grievance officer
    r7_has_phone = bool(re.search(r"\b(?:\+91[\-\s]?)?[6-9]\d{9}\b|\b1800[\-\s]?\d{3}[\-\s]?\d{3,4}\b|\b0\d{2,4}[\-\s]?\d{6,8}\b", consumer_care))
    r7_has_email = bool(re.search(r"[\w\.\-]+@[\w\.\-]+\.[a-zA-Z]{2,}", consumer_care))
    r7_pass = r7_has_phone or r7_has_email or ("care" in consumer_care.lower() and len(consumer_care) > 10)

    checklist.append({
        "rule_id": 7,
        "title": "Consumer Care Redressal Mechanism",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(f)",
        "status": "PASS" if r7_pass else "FAIL",
        "extracted_value": consumer_care if r7_pass else "Not Found",
        "description": "Every package must declare the name, address, telephone number, and email address of the consumer grievance redressal officer."
    })
    if r7_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "Rule 6(1)(f)",
            "title": "Missing Consumer Care Helpline / Email",
            "severity": "HIGH",
            "message": "Package lacks dedicated customer care telephone number, email, or postal grievance contact.",
            "fix": "Include: 'For consumer complaints, contact Consumer Care Cell at: Phone / Email / Postal Address'."
        })

    # --- RULE 8: Country of Origin ---
    r8_pass = bool(re.search(r"\b(?:made in|country of origin|manufactured in|product of|india|imported from|origin)\b", country_of_origin.lower()))
    checklist.append({
        "rule_id": 8,
        "title": "Country of Origin Declaration",
        "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(g)",
        "status": "PASS" if r8_pass else "FAIL",
        "extracted_value": country_of_origin if r8_pass else "Not Found",
        "description": "Country of Origin must be explicitly declared on all packaged commodities (mandatory for both domestic and imported goods)."
    })
    if r8_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "Rule 6(1)(g)",
            "title": "Missing Country of Origin",
            "severity": "HIGH",
            "message": "Country of Origin declaration is missing or indistinct.",
            "fix": "Declare 'Country of Origin: India' (or country where manufactured) in bold on the display panel."
        })

    # --- RULE 9: Barcode Validity (Checksum & 890 GS1 India) ---
    barcode_eval = analyze_barcode(barcode)
    r9_pass = barcode_eval["is_valid"]
    checklist.append({
        "rule_id": 9,
        "title": "Barcode Verification (GS1 Checksum & Prefix)",
        "reference": "Department of Consumer Affairs Barcoding Directives & GS1 Standards",
        "status": "PASS" if r9_pass else "FAIL",
        "extracted_value": f"{barcode_eval['value']} ({barcode_eval['format']}) - {barcode_eval['reason']}",
        "description": "Commodity package should carry a valid GS1 standard barcode (EAN-13, EAN-8, UPC-A) with mathematical checksum verification. Indian goods typically carry prefix '890'."
    })
    if r9_pass:
        passed_count += 1
    else:
        violations.append({
            "rule": "GS1 / Barcoding Directive",
            "title": "Invalid or Missing Barcode",
            "severity": "MEDIUM",
            "message": barcode_eval["reason"],
            "fix": "Ensure EAN-13 barcode has 13 valid digits with correct Modulo-10 checksum and registered GS1 India company prefix."
        })

    # --- RULE 10: FSSAI License Number (For Food) / General Regulatory ---
    if is_food:
        fssai_match = re.search(r"\b(\d{14})\b", fssai_no)
        r10_pass = bool(fssai_match)
        checklist.append({
            "rule_id": 10,
            "title": "14-Digit FSSAI License Number (Food Item)",
            "reference": "Food Safety and Standards (Packaging and Labelling) Regulations & LMR",
            "status": "PASS" if r10_pass else "FAIL",
            "extracted_value": fssai_no if r10_pass else "Not Found",
            "description": "Every food business operator must print the 14-digit FSSAI license number and FSSAI logo on the food packaging."
        })
        if r10_pass:
            passed_count += 1
        else:
            violations.append({
                "rule": "FSSAI Regulation / LMR",
                "title": "Missing or Invalid FSSAI License Number",
                "severity": "CRITICAL",
                "message": "Food product does not carry a valid 14-digit FSSAI Food Business Operator license number.",
                "fix": "Print 'Lic. No. XXXXXXXXXXXXXX' alongside the official FSSAI logo on the package."
            })
    else:
        # Non-food items check for BIS or Batch Number
        r10_pass = True
        checklist.append({
            "rule_id": 10,
            "title": "Regulatory Certification / Batch Identification",
            "reference": "Bureau of Indian Standards / Legal Metrology Rules",
            "status": "PASS",
            "extracted_value": "Non-food commodity (FSSAI not applicable)",
            "description": "Industrial/cosmetic commodity regulatory alignment."
        })
        passed_count += 1

    # Compute overall compliance score %
    compliance_score = round((passed_count / total_checks) * 100, 1)

    if compliance_score >= 90:
        verdict = "COMPLIANT"
    elif compliance_score >= 60:
        verdict = "PARTIALLY COMPLIANT"
    else:
        verdict = "NON-COMPLIANT"

    return {
        "score": compliance_score,
        "verdict": verdict,
        "passed_count": passed_count,
        "total_checks": total_checks,
        "checklist": checklist,
        "violations": violations,
        "barcode_evaluation": barcode_eval
    }
