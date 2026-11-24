import React from 'react';
import { Printer, X, Download, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, FileText } from 'lucide-react';

export default function PdfReport({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const { fields, compliance, ingredients_analysis, barcode_info } = data;
  const now = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  const verdict = compliance?.verdict || 'NON-COMPLIANT';
  const score = compliance?.score || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Action bar (hidden in print) */}
        <div className="sticky top-0 z-10 bg-slate-800 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-sm">Official Legal Metrology Compliance Inspection Report</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-800" id="compliance-report-document">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Smart India Hackathon 2026 • SIH26034</span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">LEGAL METROLOGY COMPLIANCE AUDIT</h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Packaged Commodities Rules, 2011 Verification Assessment
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-500">REF: LG-{Math.floor(100000 + Math.random() * 900000)}</div>
                <div className="text-xs text-slate-600 mt-1">Date: {now}</div>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
                  Tool: LabelGuard India v1.0
                </div>
              </div>
            </div>
          </div>

          {/* Product Overview Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Product Name</span>
              <span className="font-bold text-slate-900">{fields?.product_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Brand</span>
              <span className="font-bold text-slate-900">{fields?.brand || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Net Quantity</span>
              <span className="font-bold text-slate-900">{fields?.net_quantity || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Declared MRP</span>
              <span className="font-bold text-slate-900">{fields?.mrp || 'N/A'}</span>
            </div>
          </div>

          {/* Barcode & Score Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl border-2 border-slate-800 bg-white">
            <div>
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Overall Compliance Verdict</span>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-2xl font-black tracking-tight ${
                  verdict === 'COMPLIANT' ? 'text-emerald-700' :
                  verdict === 'PARTIALLY COMPLIANT' ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {verdict}
                </span>
                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-sm font-bold">
                  {score}% Score
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {compliance?.passed_count || 0} of {compliance?.total_checks || 10} statutory clauses satisfied
              </p>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-6 text-left sm:text-right">
              <span className="text-xs font-bold uppercase text-slate-500">Barcode Evaluation</span>
              <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                {barcode_info?.value || fields?.barcode || 'N/A'}
              </div>
              <div className="text-[11px] font-medium text-slate-600">
                {barcode_info?.is_valid ? '✅ Checksum Verified' : '❌ Invalid Checksum'} • {barcode_info?.is_india_prefix ? '🇮🇳 GS1 India 890 Prefix' : 'International Prefix'}
              </div>
            </div>
          </div>

          {/* 10-Point Checklist */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3">
              10-Point Legal Metrology Statutory Rule Checklist
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Rule Provision</th>
                    <th className="py-2.5 px-3">Extracted Label Content</th>
                    <th className="py-2.5 px-3 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compliance?.checklist?.map((item) => (
                    <tr key={item.rule_id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center font-bold text-slate-500">{item.rule_id}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-[10px] text-slate-500">{item.reference}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                        {item.extracted_value}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          item.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Violations & Prescribed Fixes */}
          {compliance?.violations && compliance.violations.length > 0 && (
            <div>
              <h3 className="font-bold text-rose-800 text-sm uppercase tracking-wider mb-3">
                Detected Violations & Statutory Suggested Fixes
              </h3>
              <div className="space-y-2.5">
                {compliance.violations.map((v, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-rose-900">
                      <span>{idx + 1}. {v.title} ({v.rule})</span>
                      <span className="text-[10px] px-2 py-0.5 bg-rose-200 text-rose-800 rounded uppercase font-bold">
                        {v.severity}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1">{v.message}</p>
                    <div className="mt-2 text-teal-900 bg-teal-50/80 p-2 rounded-lg font-medium border border-teal-200 text-[11px]">
                      <span className="font-bold">Required Manufacturer Fix: </span>
                      {v.fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredient Safety & Allergens */}
          {ingredients_analysis && (
            <div className="pt-2 border-t border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">
                Ingredient Safety & Allergen Summary
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-800">Health Score: </span>
                  <span className="font-bold text-teal-700">{ingredients_analysis.health_score}/100</span> ({ingredients_analysis.health_verdict})
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Identified Allergens: </span>
                  {ingredients_analysis.allergens?.length > 0 ? (
                    <span className="font-bold text-rose-600">{ingredients_analysis.allergens.join(', ')}</span>
                  ) : (
                    <span className="text-slate-500">None detected</span>
                  )}
                </div>
                {ingredients_analysis.banned_ingredients?.length > 0 && (
                  <div className="w-full text-rose-700 font-bold">
                    ⚠️ Contains ingredients prohibited/restricted in other jurisdictions: {ingredients_analysis.banned_ingredients.map(b => b.ingredient).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statutory Sign-off Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed text-center">
            This report is digitally generated by LabelGuard India under Smart India Hackathon 2026 (Problem SIH26034) for automated Legal Metrology (Packaged Commodities) Rules, 2011 compliance scanning. Reference information; verify with official FSSAI / Legal Metrology / CDSCO authorities.
          </div>
        </div>
      </div>
    </div>
  );
}
