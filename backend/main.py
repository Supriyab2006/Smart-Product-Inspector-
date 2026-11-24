import os
import sys
import json
import hashlib
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from db import init_db, save_scan, get_recent_scans, get_connection
from ocr import perform_ocr_with_fallbacks, extract_fields_from_text, detect_barcode
from compliance import check_legal_metrology_compliance, analyze_barcode
from matcher import analyze_ingredients, load_json

# Initialize SQLite database
init_db()

app = FastAPI(
    title="LabelGuard India API",
    description="Backend OCR & Legal Metrology Compliance Engine for SIH 2026 (SIH26034)",
    version="1.0.0"
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount samples directory for direct image viewing
SAMPLES_DIR = os.path.join(CURRENT_DIR, "samples")
if os.path.exists(SAMPLES_DIR):
    app.mount("/samples", StaticFiles(directory=SAMPLES_DIR), name="samples")

# Load reference datasets
DATA_DIR = os.path.join(CURRENT_DIR, "data")
ITEMS_DB = load_json("items.json")
INGREDIENTS_DB = load_json("ingredients.json")
REGULATIONS_DB = load_json("regulations.json")

# Pydantic schemas
class AuthRequest(BaseModel):
    email: str
    password: str

class FieldRecheckRequest(BaseModel):
    product_name: Optional[str] = ""
    brand: Optional[str] = ""
    category: Optional[str] = "Packaged Food"
    product_type: Optional[str] = "food"
    ingredients: Optional[str] = ""
    net_quantity: Optional[str] = ""
    mrp: Optional[str] = ""
    mfg_date: Optional[str] = ""
    expiry_date: Optional[str] = ""
    manufacturer_address: Optional[str] = ""
    consumer_care: Optional[str] = ""
    fssai_no: Optional[str] = ""
    country_of_origin: Optional[str] = ""
    barcode: Optional[str] = ""
    user_email: Optional[str] = "guest@labelguard.in"

# ----------------- AUTH ENDPOINTS -----------------

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

@app.post("/api/auth/register")
def register_user(req: AuthRequest):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    pw_hash = hash_pw(req.password)
    cursor.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (req.email, pw_hash))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "User registered successfully",
        "user": {"email": req.email, "role": "user"}
    }

@app.post("/api/auth/login")
def login_user(req: AuthRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or user["password_hash"] != hash_pw(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "success": True,
        "message": "Login successful",
        "user": {"email": req.email, "role": "user"}
    }

@app.get("/api/auth/guest")
def guest_login():
    return {
        "success": True,
        "message": "Guest session initialized",
        "user": {"email": "guest@labelguard.in", "role": "guest"}
    }

# ----------------- OCR & COMPLIANCE ENDPOINTS -----------------

@app.post("/api/ocr")
async def scan_product_label(
    file: Optional[UploadFile] = File(None),
    raw_text_input: Optional[str] = Form(None),
    user_email: Optional[str] = Form("guest@labelguard.in")
):
    """
    Main OCR Endpoint:
    Accepts an uploaded image file (or direct text), executes OpenCV preprocessing
    and Tesseract OCR with multi-rotation retry, extracts all 10 key fields,
    decodes/verifies the barcode, checks 10 Legal Metrology compliance rules,
    and analyzes ingredients with fuzzy safety scoring.
    """
    raw_text = ""
    barcode_found = None
    barcode_type = None
    cv_img = None

    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if cv_img is not None:
            raw_text = perform_ocr_with_fallbacks(cv_img)
            barcode_found, barcode_type = detect_barcode(cv_img, raw_text)
    
    # If raw_text_input was directly supplied (e.g. for sample test case)
    if raw_text_input and not raw_text:
        raw_text = raw_text_input.strip()
        barcode_found, barcode_type = detect_barcode(None, raw_text)

    # If OCR was completely empty or minimal, supply helpful tips
    tips = "Use good light, hold the camera straight, avoid shadows and glare, and upload a clear and large image."

    if not raw_text or len(raw_text.strip()) < 10:
        return {
            "success": False,
            "raw_text": raw_text,
            "message": "Could not extract sufficient text from image. Please ensure the label is clear and well-lit.",
            "tips": tips,
            "fields": {},
            "compliance": None,
            "ingredients_analysis": None
        }

    # Extract all 10 fields
    fields = extract_fields_from_text(raw_text)
    
    # Overwrite barcode if detected by image detector
    if barcode_found:
        fields["barcode"] = barcode_found

    # Run Legal Metrology compliance evaluation
    compliance_result = check_legal_metrology_compliance(fields)

    # Run ingredient fuzzy safety matching & health/skin scoring
    product_type = fields.get("product_type", "food")
    ingredients_analysis = analyze_ingredients(fields.get("ingredients", ""), product_type=product_type)

    # Determine missing fields for clean user feedback
    field_labels = {
        "product_name": "Product Name",
        "brand": "Brand Name",
        "ingredients": "Ingredients List",
        "net_quantity": "Net Quantity",
        "mrp": "Maximum Retail Price (MRP)",
        "mfg_date": "Manufacturing / Packing Date",
        "expiry_date": "Best Before / Expiry Date",
        "manufacturer_address": "Manufacturer Name & Address",
        "consumer_care": "Customer Care Contact",
        "fssai_no": "FSSAI License Number",
        "country_of_origin": "Country of Origin",
        "barcode": "Barcode"
    }
    missing_fields = [label for key, label in field_labels.items() if not fields.get(key)]

    clean_email = user_email if isinstance(user_email, str) else "guest@labelguard.in"

    # Save scan to SQLite history
    scan_id = save_scan(
        user_email=clean_email,
        product_name=fields.get("product_name"),
        brand=fields.get("brand"),
        category=fields.get("category", "Packaged Food"),
        barcode=fields.get("barcode"),
        compliance_score=compliance_result["score"],
        compliance_verdict=compliance_result["verdict"],
        health_score=ingredients_analysis["health_score"] if product_type == "food" else ingredients_analysis["skin_score"],
        health_verdict=ingredients_analysis["health_verdict"] if product_type == "food" else ingredients_analysis["skin_verdict"],
        fields_dict=fields,
        violations_list=compliance_result["violations"]
    )

    return {
        "success": True,
        "scan_id": scan_id,
        "raw_text": raw_text,
        "fields": fields,
        "missing_fields": missing_fields,
        "tips": tips,
        "barcode_info": compliance_result["barcode_evaluation"],
        "compliance": compliance_result,
        "ingredients_analysis": ingredients_analysis
    }

@app.post("/api/compliance/check")
def reevaluate_compliance(fields: FieldRecheckRequest):
    """
    Re-evaluates compliance and ingredient scores after user edits fields in the UI.
    """
    fields_dict = fields.dict()
    compliance_result = check_legal_metrology_compliance(fields_dict)
    ingredients_analysis = analyze_ingredients(fields.ingredients or "", product_type=fields.product_type)

    # Save updated scan to history
    scan_id = save_scan(
        user_email=fields.user_email,
        product_name=fields.product_name,
        brand=fields.brand,
        category=fields.category,
        barcode=fields.barcode,
        compliance_score=compliance_result["score"],
        compliance_verdict=compliance_result["verdict"],
        health_score=ingredients_analysis["health_score"] if fields.product_type == "food" else ingredients_analysis["skin_score"],
        health_verdict=ingredients_analysis["health_verdict"] if fields.product_type == "food" else ingredients_analysis["skin_verdict"],
        fields_dict=fields_dict,
        violations_list=compliance_result["violations"]
    )

    return {
        "success": True,
        "scan_id": scan_id,
        "fields": fields_dict,
        "barcode_info": compliance_result["barcode_evaluation"],
        "compliance": compliance_result,
        "ingredients_analysis": ingredients_analysis
    }

# ----------------- REFERENCE DATA ENDPOINTS -----------------

@app.get("/api/items")
def get_items(category: Optional[str] = None, search: Optional[str] = None):
    results = ITEMS_DB
    if category and category.lower() != "all":
        results = [item for item in results if item.get("category", "").lower() == category.lower()]
    if search:
        q = search.lower().strip()
        results = [
            item for item in results
            if q in item.get("name", "").lower()
            or q in item.get("brand", "").lower()
            or any(q in ing.lower() for ing in item.get("ingredients", []))
        ]
    return {
        "total": len(results),
        "items": results
    }

@app.get("/api/ingredients")
def get_ingredients(search: Optional[str] = None, type_filter: Optional[str] = None, safety: Optional[str] = None):
    results = INGREDIENTS_DB
    if safety:
        results = [ing for ing in results if ing.get("safety_level") == safety]
    if type_filter:
        results = [ing for ing in results if type_filter.lower() in ing.get("type", "").lower()]
    if search:
        q = search.lower().strip()
        results = [
            ing for ing in results
            if q in ing.get("name", "").lower()
            or any(q in a.lower() for a in ing.get("aliases", []))
            or (ing.get("e_number") and q in ing.get("e_number", "").lower())
        ]
    return {
        "total": len(results),
        "ingredients": results
    }

@app.get("/api/regulations")
def get_regulations(country: Optional[str] = None, search: Optional[str] = None):
    results = REGULATIONS_DB
    if country and country.lower() != "all":
        results = [
            r for r in results
            if any(country.lower() in b.lower() for b in r.get("banned_in", []))
            or any(country.lower() in res.lower() for res in r.get("restricted_in", []))
        ]
    if search:
        q = search.lower().strip()
        results = [
            r for r in results
            if q in r.get("ingredient", "").lower()
            or q in r.get("used_in", "").lower()
            or q in r.get("reason", "").lower()
        ]
    return {
        "total": len(results),
        "regulations": results
    }

@app.get("/api/history")
def get_scan_history(limit: int = 15):
    return get_recent_scans(limit=limit)

@app.get("/api/samples")
def get_samples():
    samples_file = os.path.join(SAMPLES_DIR, "samples_index.json")
    if os.path.exists(samples_file):
        with open(samples_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Add static URL paths for frontend
            for item in data:
                item["image_url"] = f"/samples/{item['id']}.png"
            return data
    return []

# Serve compiled React frontend if present
FRONTEND_DIST = os.path.abspath(os.path.join(CURRENT_DIR, "..", "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("samples/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
