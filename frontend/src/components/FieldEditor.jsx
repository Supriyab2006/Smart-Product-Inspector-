import React, { useState } from 'react';
import { Edit3, CheckCircle2, AlertCircle, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';

export default function FieldEditor({ fields, onFieldsChange, onReevaluate, isUpdating, missingFields = [], tips }) {
  const [formData, setFormData] = useState({ ...fields });

  // Update internal state when parent fields change
  React.useEffect(() => {
    setFormData({ ...fields });
  }, [fields]);

  const handleChange = (key, value) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    if (onFieldsChange) {
      onFieldsChange(updated);
    }
  };

  const fieldDefinitions = [
    { key: 'product_name', label: 'Product Name', placeholder: 'e.g. Aloo Bhujia', type: 'text', required: true },
    { key: 'brand', label: 'Brand Name', placeholder: "e.g. Haldiram's", type: 'text', required: true },
    { key: 'category', label: 'Category', placeholder: 'e.g. Packaged Food, Snacks, Skincare', type: 'select', 
      options: ['Packaged Food', 'Snacks', 'Beverages', 'Dairy', 'Bakery', 'Supplements', 'Cosmetics', 'Skincare', 'Haircare', 'Personal Care', 'Baby Products', 'Household'] },
    { key: 'product_type', label: 'Product Classification', type: 'select', options: ['food', 'cosmetic', 'household'] },
    { key: 'net_quantity', label: 'Net Quantity (Metric SI)', placeholder: 'e.g. 200 g, 500 ml, 1 kg', type: 'text', required: true, hint: 'Units like "oz" or "lbs" alone violate Rule 12' },
    { key: 'mrp', label: 'Maximum Retail Price (MRP)', placeholder: 'e.g. Rs. 60.00 (incl. of all taxes)', type: 'text', required: true, hint: 'Must include "incl. of all taxes"' },
    { key: 'mfg_date', label: 'Mfg / Packing Date', placeholder: 'e.g. 15/10/2026', type: 'text', required: true },
    { key: 'expiry_date', label: 'Best Before / Expiry Date', placeholder: 'e.g. Best Before 6 months from mfg', type: 'text', required: true },
    { key: 'fssai_no', label: 'FSSAI License No (14 Digits)', placeholder: 'e.g. Lic. No. 10012011000123', type: 'text', required: false, hint: 'Mandatory for food & beverage items' },
    { key: 'country_of_origin', label: 'Country of Origin', placeholder: 'e.g. Made in India', type: 'text', required: true },
    { key: 'barcode', label: 'Barcode (EAN-13 / UPC)', placeholder: 'e.g. 8904004400128', type: 'text', required: true, hint: '890 indicates GS1 India prefix' },
    { key: 'consumer_care', label: 'Customer Care Details', placeholder: 'Phone: 1800-425-1947, email: care@brand.com', type: 'text', required: true },
    { key: 'manufacturer_address', label: 'Manufacturer / Packer Name & Full Address', placeholder: 'Corporate registered office, plot no, city, state, PIN', type: 'textarea', required: true },
    { key: 'ingredients', label: 'Ingredients List (Post "Ingredients")', placeholder: 'Comma-separated ingredients...', type: 'textarea', required: true }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onReevaluate) {
      onReevaluate(formData);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-lg">Extracted Product Declarations</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified fields extracted via OCR. You can edit any field to correct OCR mistakes and re-evaluate compliance instantly.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUpdating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Re-checking...' : 'Re-evaluate Compliance'}
        </button>
      </div>

      {/* Missing fields alert banner if any */}
      {missingFields && missingFields.length > 0 && (
        <div className="my-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Some fields were not detected by OCR: </span>
            <span>{missingFields.join(', ')}. You can fill them in manually below.</span>
            {tips && (
              <p className="mt-1 text-slate-600 font-medium">
                💡 <span className="font-semibold text-amber-900">Tip:</span> {tips}
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldDefinitions.map((field) => {
          const val = formData[field.key] || '';
          const isMissing = !val || val === 'Not Found';

          return (
            <div
              key={field.key}
              className={`flex flex-col ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                {isMissing ? (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                    Not Detected
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Found
                  </span>
                )}
              </div>

              {field.type === 'textarea' ? (
                <textarea
                  rows={field.key === 'ingredients' ? 3 : 2}
                  value={val}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`px-3 py-2 text-xs rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${
                    isMissing
                      ? 'border-amber-300 bg-amber-50/20 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={val}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 capitalize"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`px-3 py-2 text-xs rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${
                    isMissing
                      ? 'border-amber-300 bg-amber-50/20 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                />
              )}

              {field.hint && (
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <HelpCircle className="w-2.5 h-2.5" />
                  {field.hint}
                </span>
              )}
            </div>
          );
        })}
      </form>
    </div>
  );
}
