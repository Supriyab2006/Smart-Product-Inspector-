import os
import re
import shutil
import cv2
import numpy as np
from PIL import Image
import pytesseract

# Configure Tesseract binary path
if shutil.which("tesseract"):
    pytesseract.pytesseract.tesseract_cmd = "tesseract"
elif os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
elif os.path.exists(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"

# Try importing pyzbar safely
HAS_PYZBAR = False
try:
    from pyzbar import pyzbar
    HAS_PYZBAR = True
except Exception:
    HAS_PYZBAR = False

# OpenCV Barcode Detector fallback
OPENCV_BARCODE_DETECTOR = None
try:
    if hasattr(cv2, "barcode") and hasattr(cv2.barcode, "BarcodeDetector"):
        OPENCV_BARCODE_DETECTOR = cv2.barcode.BarcodeDetector()
except Exception:
    OPENCV_BARCODE_DETECTOR = None

def preprocess_image(cv_img, mode="adaptive"):
    """
    Applies OpenCV preprocessing pipeline:
    - Resize 2x with cubic interpolation
    - Convert to Grayscale
    - Denoise with bilateral/Gaussian filtering
    - Thresholding: Adaptive or Otsu
    """
    # Resize 2x
    h, w = cv_img.shape[:2]
    resized = cv2.resize(cv_img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    
    # Grayscale
    if len(resized.shape) == 3:
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    else:
        gray = resized

    # Denoise
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    if mode == "adaptive":
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
        )
    elif mode == "otsu":
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        thresh = denoised

    return thresh

def rotate_image(image, angle):
    """Rotates image by 0, 90, 180, or 270 degrees."""
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image

def detect_barcode(cv_img, raw_text=""):
    """
    Attempts barcode detection via:
    1. pyzbar (if available)
    2. OpenCV BarcodeDetector
    3. Regex matching in raw text for GS1 / EAN barcode numbers (e.g. 890xxxxxxxxxx)
    """
    barcode_found = None
    barcode_type = None

    # 1. pyzbar
    if HAS_PYZBAR and cv_img is not None:
        try:
            barcodes = pyzbar.decode(cv_img)
            if barcodes:
                barcode_found = barcodes[0].data.decode("utf-8")
                barcode_type = barcodes[0].type
        except Exception:
            pass

    # 2. OpenCV Barcode Detector
    if not barcode_found and OPENCV_BARCODE_DETECTOR is not None and cv_img is not None:
        try:
            ok, decoded_info, decoded_type, _ = OPENCV_BARCODE_DETECTOR.detectAndDecode(cv_img)
            if ok and len(decoded_info) > 0 and decoded_info[0]:
                barcode_found = str(decoded_info[0])
                barcode_type = str(decoded_type[0]) if len(decoded_type) > 0 else "EAN-13"
        except Exception:
            pass

    # 3. Text-based Regex match fallback (looks for 13, 12, or 8 digit numbers, prioritizing 890)
    if not barcode_found and raw_text:
        # Prioritize 890 GS1 India prefix
        match_890 = re.search(r"\b(890\d{10})\b", raw_text)
        if match_890:
            barcode_found = match_890.group(1)
            barcode_type = "EAN-13 (Extracted from Label Text)"
        else:
            # First check specifically for "Barcode: XXXXXXXXXXXXX"
            match_labeled = re.search(r"(?:barcode|ean|upc)\s*[:\-]?\s*(\d{8,14})", raw_text, re.IGNORECASE)
            if match_labeled:
                barcode_found = match_labeled.group(1)
                barcode_type = f"GS1 Barcode ({len(barcode_found)} digits)"
            else:
                # Check 13-digit then 12-digit
                match_13 = re.search(r"\b(\d{13})\b", raw_text)
                if match_13:
                    barcode_found = match_13.group(1)
                    barcode_type = "EAN-13"
                else:
                    match_12 = re.search(r"\b(\d{12})\b", raw_text)
                    if match_12:
                        barcode_found = match_12.group(1)
                        barcode_type = "UPC-A"
                    else:
                        match_8 = re.search(r"(?<!tel[:\s])(?<!phone[:\s])\b(\d{8})\b", raw_text, re.IGNORECASE)
                        if match_8:
                            barcode_found = match_8.group(1)
                            barcode_type = "EAN-8"

    return barcode_found, barcode_type

def perform_ocr_with_fallbacks(cv_img):
    """
    Runs Tesseract OCR. If result is empty or minimal,
    retries with different preprocessing settings and rotations (0, 90, 180, 270),
    keeping the result with the highest word count and keyword score.
    """
    best_text = ""
    best_score = -1

    keywords = [
        "mrp", "rs", "net", "qty", "ingredients", "mfg", "exp", "batch",
        "pkd", "fssai", "care", "customer", "email", "consumer", "ltd", "address"
    ]

    for angle in [0, 90, 180, 270]:
        rotated = rotate_image(cv_img, angle)
        
        for mode in ["adaptive", "otsu", "grayscale"]:
            preprocessed = preprocess_image(rotated, mode=mode)
            
            try:
                # PSM 3: Fully automatic page segmentation without OSD
                text = pytesseract.image_to_string(preprocessed, config="--oem 3 --psm 3")
            except Exception:
                # Fallback to direct RGB PIL image
                try:
                    pil_img = Image.fromarray(cv2.cvtColor(rotated, cv2.COLOR_BGR2RGB))
                    text = pytesseract.image_to_string(pil_img)
                except Exception as e:
                    text = ""

            text_clean = text.strip()
            text_lower = text_clean.lower()
            
            # Score this attempt based on length and recognized packaging keywords
            keyword_hits = sum(1 for kw in keywords if kw in text_lower)
            score = (keyword_hits * 100) + len(text_clean)

            if score > best_score:
                best_score = score
                best_text = text_clean

            # If we found strong matches with lots of text, break early for speed
            if keyword_hits >= 5 and len(text_clean) > 200:
                return best_text

    return best_text

def extract_fields_from_text(raw_text):
    """
    Extracts all 10 key fields using regex, patterns, and heuristics:
    - Product name & brand
    - Ingredients list
    - Net quantity
    - MRP / price
    - Manufacturing / packing date
    - Best before / Expiry date
    - Manufacturer / packer name & address
    - Customer care phone / email
    - FSSAI license number (14 digits)
    - Country of origin
    - Barcode number
    """
    fields = {
        "product_name": "",
        "brand": "",
        "ingredients": "",
        "net_quantity": "",
        "mrp": "",
        "mfg_date": "",
        "expiry_date": "",
        "manufacturer_address": "",
        "consumer_care": "",
        "fssai_no": "",
        "country_of_origin": "",
        "barcode": "",
        "product_type": "food"
    }

    if not raw_text:
        return fields

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. INGREDIENTS LIST
    # Text after "Ingredients", "Contents", "Composition" up to next section or end
    ing_match = re.search(
        r"(?:ingredients|contents|composition)\s*[:\-]\s*(.+?)(?=\n\s*(?:mfg|exp|mrp|best before|net|pkd|fssai|marketed|manufactured|nutritional|customer care|batch)|\Z)",
        raw_text,
        re.IGNORECASE | re.DOTALL
    )
    if ing_match:
        fields["ingredients"] = ing_match.group(1).replace("\n", " ").strip()
    else:
        # Fallback line by line
        for i, line in enumerate(lines):
            if re.search(r"^(?:ingredients|contents|composition)\b", line, re.IGNORECASE):
                collected = [line]
                for next_line in lines[i+1:i+6]:
                    if re.search(r"^(?:mfg|exp|mrp|best before|net|fssai|marketed|nutritional)", next_line, re.IGNORECASE):
                        break
                    collected.append(next_line)
                fields["ingredients"] = " ".join(collected)
                fields["ingredients"] = re.sub(r"^(?:ingredients|contents|composition)\s*[:\-]?\s*", "", fields["ingredients"], flags=re.IGNORECASE).strip()
                break

    # 2. NET QUANTITY
    qty_match = re.search(
        r"(?:net\s*(?:qty|quantity|wt|weight)?\.?\s*[:\-]?\s*)?(\b\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|grams|ml|l|ltr|litres|pcs|units?|u|sheets|tablets|capsules|wipes|oz|fl\s*oz|lbs)\b)",
        raw_text,
        re.IGNORECASE
    )
    if qty_match:
        fields["net_quantity"] = qty_match.group(1).strip()
    else:
        # Fallback scan for metric weights
        any_qty = re.search(r"\b(\d+(?:\.\d+)?\s*(?:kg|g|gm|ml|l|ltr))\b", raw_text, re.IGNORECASE)
        if any_qty:
            fields["net_quantity"] = any_qty.group(1).strip()

    # 3. MRP / PRICE
    mrp_line = ""
    for line in lines:
        line_clean = line.strip()
        # Look specifically for lines starting with or containing "MRP" or "Maximum Retail Price"
        if re.search(r"\b(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price)\b", line_clean, re.IGNORECASE):
            mrp_line = line_clean
            break
        # Or explicit price lines with currency symbols and numbers
        elif re.search(r"\b(?:retail\s*price|price)\s*[:\-]?\s*(?:rs\.?|₹|inr)\s*\d+", line_clean, re.IGNORECASE):
            mrp_line = line_clean
            break
        elif re.search(r"^(?:rs\.?|₹|inr)\s*\d+(\.\d{1,2})?\s*(?:incl|inclusive|\/[-=])", line_clean, re.IGNORECASE):
            mrp_line = line_clean
            break

    if mrp_line:
        fields["mrp"] = mrp_line
    else:
        # Regex search specifically requiring "MRP" keyword
        mrp_explicit = re.search(
            r"\b(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(\(?\s*(?:incl\.?|inclusive)?\s*(?:of)?\s*all\s*taxes\s*\)?)?",
            raw_text,
            re.IGNORECASE
        )
        if mrp_explicit:
            amt = mrp_explicit.group(1)
            tax_str = mrp_explicit.group(2) if mrp_explicit.group(2) else ""
            fields["mrp"] = f"MRP: Rs. {amt} {tax_str}".strip()

    # 4. MANUFACTURING / PACKING DATE
    mfg_match = re.search(
        r"(?:mfg\.?(?:\s*date)?|pkd\.?(?:\s*date)?|packed\s*(?:on|date)?|mfd\.?|date\s*of\s*mfg)\s*[:\-]?\s*(\b(?:\d{1,2}[/\-\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s/\-\.]+\d{2,4})\b)",
        raw_text,
        re.IGNORECASE
    )
    if mfg_match:
        fields["mfg_date"] = mfg_match.group(1).strip()
    else:
        # Try generic date
        date_cand = re.search(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4}|\d{2}[/\-]\d{4})\b", raw_text)
        if date_cand:
            fields["mfg_date"] = date_cand.group(1).strip()

    # 5. EXPIRY / BEST BEFORE DATE
    exp_match = re.search(
        r"(?:exp\.?(?:\s*date)?|expiry(?:\s*date)?|use\s*by|best\s*before)\s*[:\-]?\s*([^\n\.,]+(?:\b(?:\d{1,2}[/\-\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s/\-\.]+\d{2,4}|\d+\s*months|\d+\s*days|\d+\s*years)\b)?)",
        raw_text,
        re.IGNORECASE
    )
    if exp_match:
        fields["expiry_date"] = exp_match.group(0).strip()
    else:
        bb_generic = re.search(r"\b(best\s*before\s*[^,\n\.]+)", raw_text, re.IGNORECASE)
        if bb_generic:
            fields["expiry_date"] = bb_generic.group(1).strip()

    # 6. MANUFACTURER / PACKER NAME & ADDRESS
    mfg_addr_match = re.search(
        r"(?:manufactured|mfd|packed|marketed|imported|pkd)\s*(?:by|at)?\s*[:\-]?\s*(.+?)(?=\n\s*(?:mrp|net|fssai|ingredients|batch|best before|customer care|regd\.?\s*off)|\Z)",
        raw_text,
        re.IGNORECASE | re.DOTALL
    )
    if mfg_addr_match:
        addr = mfg_addr_match.group(1).replace("\n", ", ").strip()
        fields["manufacturer_address"] = addr[:250]
    else:
        # Look for address keywords: Pvt Ltd, Plot No, Industrial Area, PIN, etc.
        for i, line in enumerate(lines):
            if any(k in line.lower() for k in ["pvt ltd", "ltd.", "private limited", "plot no", "ind. area", "industrial area", "road", "factory", "village"]):
                collected = [line]
                for next_l in lines[i+1:i+4]:
                    collected.append(next_l)
                fields["manufacturer_address"] = ", ".join(collected)[:250]
                break

    # 7. CUSTOMER CARE / CONSUMER GRIEVANCE
    care_match = re.search(
        r"(?:customer\s*care|consumer\s*(?:care|cell|grievance|service)|helpline|toll\s*free)\s*[:\-]?\s*(.+?)(?=\n\s*(?:mrp|mfg|exp|fssai|ingredients)|\Z)",
        raw_text,
        re.IGNORECASE | re.DOTALL
    )
    if care_match:
        fields["consumer_care"] = care_match.group(0).replace("\n", " ").strip()[:200]
    else:
        # Check for email or phone
        email = re.search(r"[\w\.\-]+@[\w\.\-]+\.[a-zA-Z]{2,}", raw_text)
        phone = re.search(r"\b(?:\+91[\-\s]?)?[1-9]\d{9}\b|\b1800[\-\s]?\d{3}[\-\s]?\d{3,4}\b", raw_text)
        parts = []
        if phone:
            parts.append(f"Phone: {phone.group(0)}")
        if email:
            parts.append(f"Email: {email.group(0)}")
        if parts:
            fields["consumer_care"] = "; ".join(parts)

    # 8. FSSAI LICENSE NUMBER (14 digits)
    fssai_match = re.search(r"(?:fssai|lic\.?\s*(?:no\.?)?)\s*[:\-]?\s*(\d{14})", raw_text, re.IGNORECASE)
    if fssai_match:
        fields["fssai_no"] = f"Lic. No. {fssai_match.group(1)}"
    else:
        # Any standalone 14-digit number
        any_14 = re.search(r"\b(1\d{13}|2\d{13})\b", raw_text)
        if any_14:
            fields["fssai_no"] = f"Lic. No. {any_14.group(1)}"

    # 9. COUNTRY OF ORIGIN
    origin_match = re.search(
        r"(?:country\s*of\s*origin|made\s*in|product\s*of|manufactured\s*in)\s*[:\-]?\s*([a-zA-Z\s]+)",
        raw_text,
        re.IGNORECASE
    )
    if origin_match:
        fields["country_of_origin"] = origin_match.group(0).strip()
    elif re.search(r"\b(?:made\s*in\s*india|product\s*of\s*india)\b", raw_text, re.IGNORECASE):
        fields["country_of_origin"] = "Made in India"
    elif "india" in raw_text.lower():
        fields["country_of_origin"] = "India"

    # 10. PRODUCT NAME & BRAND
    # Often found on the first 1-3 prominent lines
    if lines:
        fields["product_name"] = lines[0]
        if len(lines) > 1 and len(lines[0]) < 20:
            fields["brand"] = lines[0]
            fields["product_name"] = lines[1]
        else:
            # Common brand heuristics
            known_brands = [
                "Haldiram's", "Lay's", "Kurkure", "Bikaji", "Amul", "Britannia", "Parle",
                "Nestle", "Cadbury", "Coca-Cola", "Pepsi", "Mother Dairy", "Patanjali",
                "The Ordinary", "Minimalist", "CeraVe", "Neutrogena", "Nivea", "Dove",
                "Head & Shoulders", "Mamaearth", "Colgate", "Dettol", "Harpic", "Vim", "Surf Excel"
            ]
            for kb in known_brands:
                if re.search(r"\b" + re.escape(kb) + r"\b", raw_text, re.IGNORECASE):
                    fields["brand"] = kb
                    break

    # Determine product type (Food / Cosmetic / Household)
    text_lower = raw_text.lower()
    if any(k in text_lower for k in ["serum", "cleanser", "moisturizer", "sunscreen", "lipstick", "lotion", "cream", "shampoo", "conditioner", "cosmetic", "skin", "hair", "dandruff"]):
        fields["product_type"] = "cosmetic"
    elif any(k in text_lower for k in ["cleaner", "detergent", "disinfectant", "bleach", "dishwash", "toilet", "mosquito", "baking soda"]):
        fields["product_type"] = "household"
    else:
        fields["product_type"] = "food"

    return fields
