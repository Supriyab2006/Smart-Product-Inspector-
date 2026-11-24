import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "labelguard.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Scan History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        product_name TEXT,
        brand TEXT,
        category TEXT,
        barcode TEXT,
        compliance_score REAL,
        compliance_verdict TEXT,
        health_score REAL,
        health_verdict TEXT,
        extracted_fields TEXT,
        violations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()

def save_scan(user_email, product_name, brand, category, barcode, compliance_score, compliance_verdict, health_score, health_verdict, fields_dict, violations_list):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO scan_history (user_email, product_name, brand, category, barcode, compliance_score, compliance_verdict, health_score, health_verdict, extracted_fields, violations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_email or "guest@labelguard.in",
        product_name or "Unknown Product",
        brand or "Unknown Brand",
        category or "Packaged Food",
        barcode or "N/A",
        compliance_score,
        compliance_verdict,
        health_score,
        health_verdict,
        json.dumps(fields_dict),
        json.dumps(violations_list)
    ))
    scan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return scan_id

def get_recent_scans(limit=10):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scan_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "user_email": r["user_email"],
            "product_name": r["product_name"],
            "brand": r["brand"],
            "category": r["category"],
            "barcode": r["barcode"],
            "compliance_score": r["compliance_score"],
            "compliance_verdict": r["compliance_verdict"],
            "health_score": r["health_score"],
            "health_verdict": r["health_verdict"],
            "extracted_fields": json.loads(r["extracted_fields"]) if r["extracted_fields"] else {},
            "violations": json.loads(r["violations"]) if r["violations"] else [],
            "created_at": r["created_at"]
        })
    conn.close()
    return results

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
