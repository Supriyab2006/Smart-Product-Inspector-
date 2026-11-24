# LabelGuard India

**Smart India Hackathon 2026 — Problem SIH26034**  
*Software System to check compliance of Packaged Commodities under Legal Metrology Rules by scanning products, images and labels.*

---

## 📌 Project Overview

**LabelGuard India** is an automated compliance verification and safety auditing web application. Built for enforcement officers, manufacturers, and consumers, it enables one-click scanning of packaged commodity labels to:
1. **Extract 10 Mandatory Declarations** via an OpenCV preprocessing pipeline and Tesseract OCR engine with multi-rotation fallbacks (0°, 90°, 180°, 270°).
2. **Audit Legal Metrology Compliance** against the *Legal Metrology (Packaged Commodities) Rules, 2011* (Rules 6 & 12), computing a compliance score percentage, classifying products as **COMPLIANT**, **PARTIALLY COMPLIANT**, or **NON-COMPLIANT**, and generating statutory remedial fixes.
3. **Verify GS1 Barcodes** with mathematical Modulo-10 checksum validation (EAN-13, EAN-8, UPC-A) and GS1 India `890` prefix identification.
4. **Fuzzy-Match Ingredients** using a reference database of 200+ food and cosmetic ingredients, flagging declared allergens (Milk, Nuts, Gluten, Soy) and global banned substances (Potassium Bromate, Titanium Dioxide E171, BVO, etc.).
5. **Export Printable PDF Audit Certificates** with official timestamps and legal references.

---

## 📂 Project Folder Structure

```
mini2/
├── backend/
│   ├── data/
│   │   ├── ingredients.json        # 207 ingredients with safety ratings, aliases & E-numbers
│   │   ├── items.json              # 125 reference products across 12 sectors
│   │   └── regulations.json        # Banned/restricted ingredients across 7 countries
│   ├── samples/
│   │   ├── sample-1-compliant.png / .txt          # Case 1: 100% Compliant snack
│   │   ├── sample-2-missing-mrp.png / .txt        # Case 2: Missing MRP declaration
│   │   ├── sample-3-wrong-unit.png / .txt         # Case 3: Imperial oz unit violation
│   │   ├── sample-4-invalid-barcode.png / .txt    # Case 4: Corrupted barcode checksum
│   │   ├── sample-5-banned-ingredient.png / .txt  # Case 5: Banned Potassium Bromate
│   │   └── samples_index.json
│   ├── compliance.py              # 10 Legal Metrology Rules & GS1 barcode checksum engine
│   ├── db.py                      # SQLite database storage (users & scan history)
│   ├── generate_data.py           # Reference data generator
│   ├── generate_samples.py        # 5 sample test case images & labels generator
│   ├── main.py                    # FastAPI server & REST API endpoints
│   ├── matcher.py                 # Fuzzy ingredient matching (difflib) & health scoring
│   ├── ocr.py                     # OpenCV 2x scaling, denoise, adaptive threshold & Tesseract OCR
│   ├── test_samples.py            # Automated test suite for the 5 sample cases
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Badge.jsx          # Green/Yellow/Red ingredient safety badge
│   │   │   ├── FieldEditor.jsx    # Interactive editable boxes for extracted fields
│   │   │   ├── Navbar.jsx         # Navigation bar with SIH 2026 branding
│   │   │   └── PdfReport.jsx      # Printable official Legal Metrology audit certificate
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Page 1: Split auth (Sign-up, Sign-in, Guest access)
│   │   │   ├── Scanner.jsx        # Page 2: Drag & drop upload, webcam, 1-click test cases
│   │   │   ├── Explorer.jsx       # Page 3: 125+ commodities explorer & ingredients modal
│   │   │   ├── ComplianceChecker.jsx # Page 4: 10-point statutory checklist & violation fixes
│   │   │   └── Regulations.jsx    # Page 5: Global banned ingredients & country tabs
│   │   ├── App.jsx                # Application routes & global scan state
│   │   ├── index.css              # Tailwind CSS styles & print stylesheet
│   │   └── main.jsx               # React entry point
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js             # Vite config with backend proxy
│
└── README.md
```

---

## ⚙️ Prerequisites & Installation

### 1. Install Tesseract OCR Engine

- **Windows**:
  - Download and install the 64-bit installer from UB-Mannheim:  
    👉 [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)  
  - Default installation directory: `C:\Program Files\Tesseract-OCR\tesseract.exe` (automatically autodetected by `ocr.py`).
- **Ubuntu / Debian**:
  ```bash
  sudo apt update
  sudo apt install -y tesseract-ocr libtesseract-dev
  ```
- **macOS**:
  ```bash
  brew install tesseract
  ```

---

### 2. Backend Setup (Python FastAPI)

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will run at `http://127.0.0.1:8000`.  
   Interactive Swagger docs are accessible at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup (React + Vite + Tailwind CSS)

1. Open a second terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The web application will open at `http://localhost:5173`.

---

## 🧪 Testing the 5 Sample Cases

You can run the automated verification script from the root directory:
```bash
python backend/test_samples.py
```

### The 5 Preloaded Test Cases:
| Case | Label Sample | What it Tests | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Case 1** | *Haldiram's Aloo Bhujia* | All 10 declarations, valid 890 barcode, metric unit, MRP incl. taxes, FSSAI | **100% COMPLIANT** (0 violations) |
| **Case 2** | *Swiss Alps Dark Chocolate* | Imported chocolate lacking mandatory Indian MRP with inclusive tax statement | **PARTIALLY COMPLIANT** (Flags Rule 6(1)(e)) |
| **Case 3** | *Nutty Delight Peanut Butter* | Package declaring net quantity in imperial ounces (`16 oz`) alone without metric | **PARTIALLY COMPLIANT** (Flags Rule 12 non-metric violation) |
| **Case 4** | *Noodle Express Instant Noodles*| EAN-13 barcode with corrupted check digit (`8901234567899`) | **PARTIALLY COMPLIANT** (Flags invalid Modulo-10 checksum) |
| **Case 5** | *Golden Crust White Bread* | Sliced bread containing prohibited flour treatment agent **Potassium Bromate** | **PARTIALLY COMPLIANT / UNHEALTHY** (Flags banned additive & missing tax statement) |

*You can also click on any of these cases directly in the Scanner or Compliance pages with 1 click.*

---

## 🏛️ The 10 Legal Metrology Rules Checklist (2011)

1. **Rule 6(1)(a)** — Manufacturer, packer, or importer name and registered commercial address.
2. **Rule 6(1)(b)** — Generic or common name of the commodity on the principal display panel.
3. **Rule 6(1)(c) & Rule 12** — Net quantity in standard SI metric units (`g`, `kg`, `ml`, `L`). Imperial units alone (`oz`, `lbs`) are prohibited.
4. **Rule 6(1)(e)** — Maximum Retail Price (MRP) in Indian currency with statutory wording: *"inclusive of all taxes"*.
5. **Rule 6(1)(d)** — Month and year of manufacture, packing, or import (`MM/YYYY`).
6. **FSSA 2006 / Rule 6(1)** — Best Before / Expiry date declaration for perishable food commodities.
7. **Rule 6(1)(f)** — Name, address, telephone number, and email of the consumer grievance redressal officer.
8. **Rule 6(1)(g)** — Clear Country of Origin declaration (*"Made in India"* or country of import).
9. **GS1 Barcoding Directive** — Valid GS1 standard barcode (EAN-13, EAN-8, UPC-A) with Modulo-10 checksum verification; `890` prefix indicates GS1 India.
10. **FSSAI Regulations** — 14-digit Food Business Operator license number on food packages.

---

## 🔬 Safety & Regulation Coverage

- **Health Scores**: Categorized as **HEALTHY** (≥70), **MODERATE** (40–69), or **UNHEALTHY** (<40).
- **Cosmetic Skin Safety**: Rated **GOOD FOR SKIN** (≥70), **OKAY FOR SKIN** (40–69), or **BAD FOR SKIN** (<40).
- **Banned Ingredients Monitored**: Potassium Bromate, Titanium Dioxide (E171), Brominated Vegetable Oil (BVO), Azodicarbonamide, Red Dye No. 3, Ractopamine, rBGH, Hydroquinone, Mercury, Lead in cosmetics, Isobutylparaben, Zinc Pyrithione (EU cosmetic ban), etc.
- **Jurisdictions Compared**: India, USA, European Union, UK, Canada, Australia, Japan.

---

## ⚖️ Statutory Disclaimer

> *"Reference information, verify with official FSSAI / CDSCO / FDA / EFSA sources."*
