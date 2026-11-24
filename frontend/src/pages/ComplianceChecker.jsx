import React, { useState, useEffect } from 'react';
import {
  Scale, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2,
  FileText, ArrowRight, RefreshCw, Barcode, HelpCircle, Download, ExternalLink
} from 'lucide-react';
import PdfReport from '../components/PdfReport';

export default function ComplianceChecker({ currentScan, setCurrentScan, user }) {
  const [data, setData] = useState(currentScan || null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(!currentScan);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Load sample cases if no scan is loaded
  useEffect(() => {
    fetch('/api/samples')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load samples');
        return res.json();
      })
      .then((list) => {
        const safeList = Array.isArray(list) ? list : [];
        setSamples(safeList);
        if (!currentScan && safeList.length > 0) {
          // Auto load Case 1
          loadSampleCase(safeList[0]);
        }
      })
      .catch((err) => {
        console.error('Error fetching samples:', err);
        setSamples([]);
      });
  }, []);

  const loadSampleCase = async (sample) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('raw_text_input', sample.raw_text);
      formData.append('user_email', user?.email || 'guest@labelguard.in');

      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      setData(result);
      if (setCurrentScan) {
        setCurrentScan(result);
      }
    } catch (err) {
      console.error('Error evaluating sample:', err);
    } finally {
      setLoading(false);
    }
  };

  const compliance = data?.compliance;
  const fields = data?.fields;
  const barcodeInfo = data?.barcode_info;
  const score = compliance?.score || 0;
  const verdict = compliance?.verdict || 'NON-COMPLIANT';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
            Statutory Legal Metrology Verification
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            Compliance Audit & Checklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6 & Rule 12 Automated Verification Engine.
          </p>
        </div>

        {data && (
          <button
            onClick={() => setShowPdf(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-center"
          >
            <FileText className="w-4 h-4 text-teal-400" />
            Download PDF Report
          </button>
        )}
      </div>

      {/* Quick Test Case Switcher Tabs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Switch Test Case Label:
          </span>
          <span className="text-[11px] text-slate-400">Evaluate specific regulatory conditions</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(Array.isArray(samples) ? samples : []).map((s, idx) => (
            <button
              key={s.id}
              onClick={() => loadSampleCase(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition text-slate-700"
            >
              Case {idx + 1}: {s.name.split(':')[1]?.trim() || s.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Auditing label declarations against Legal Metrology Rules...</p>
        </div>
      ) : !data || !compliance ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <p className="text-sm font-bold text-slate-800">No active scan loaded</p>
          <p className="text-xs text-slate-500">Go to the Scanner to upload an image, or click one of the test cases above.</p>
        </div>
      ) : (
        <>
          {/* Main Verdict & Score Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Compliance Classification
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className={`text-3xl font-black tracking-tight ${
                  verdict === 'COMPLIANT' ? 'text-emerald-700' :
                  verdict === 'PARTIALLY COMPLIANT' ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {verdict}
                </h2>
                <span className="text-lg font-black text-white bg-slate-900 px-3 py-1 rounded-xl">
                  {score}% COMPLIANCE SCORE
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                {compliance.passed_count} of {compliance.total_checks} statutory Legal Metrology clauses fulfilled.
                {compliance.violations?.length > 0 && (
                  <span className="text-rose-700 font-semibold ml-1">
                    {compliance.violations.length} actionable non-compliances flagged.
                  </span>
                )}
              </p>
            </div>

            <div className="md:col-span-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Commodity:</span>
                <span className="font-bold text-slate-900 truncate max-w-[160px]">{fields?.product_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Brand:</span>
                <span className="font-bold text-slate-900">{fields?.brand || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Declared MRP:</span>
                <span className="font-bold text-slate-900">{fields?.mrp || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Barcode (GS1):</span>
                <span className="font-mono font-bold text-slate-900">{barcodeInfo?.value || fields?.barcode || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* 10-Point Checklist Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  10-Point Legal Metrology (Packaged Commodities) Rules, 2011 Checklist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed statutory rule evaluation based on the extracted declarations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Statutory Provision</th>
                    <th className="py-3 px-4">Legal Citation</th>
                    <th className="py-3 px-4">Extracted Label Content</th>
                    <th className="py-3 px-4 text-center w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compliance.checklist?.map((item) => (
                    <tr key={item.rule_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {item.rule_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.title}
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-sm">
                          {item.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-teal-700 whitespace-nowrap">
                        {item.reference.split('-')[1]?.trim() || item.reference}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono text-[11px] max-w-xs truncate" title={item.extracted_value}>
                        {item.extracted_value}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          item.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status === 'PASS' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : item.status === 'WARNING' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <AlertOctagon className="w-3 h-3" />
                          )}
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Violations & Prescribed Fixes Section */}
          {compliance.violations && compliance.violations.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
              <div>
                <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  Statutory Violations & Prescribed Fixes
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manufacturers must rectify these non-compliances prior to commercial distribution under penalty of the Legal Metrology Act, 2009.
                </p>
              </div>

              <div className="space-y-3">
                {compliance.violations.map((v, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-rose-950">
                        {i + 1}. {v.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800 uppercase">
                        {v.rule} • {v.severity}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">
                      {v.message}
                    </p>

                    <div className="p-3 rounded-xl bg-white border border-teal-200 text-teal-950">
                      <span className="font-bold text-teal-800 block text-[11px] uppercase tracking-wider mb-0.5">
                        Statutory Suggested Fix:
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-700">
                        {v.fix}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* PDF Report Modal */}
      <PdfReport
        isOpen={showPdf}
        onClose={() => setShowPdf(false)}
        data={data}
      />
    </div>
  );
}
