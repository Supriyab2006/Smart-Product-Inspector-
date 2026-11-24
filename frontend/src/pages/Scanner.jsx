import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Camera, RefreshCw, CheckCircle2, AlertTriangle, AlertOctagon,
  Barcode, ShieldCheck, Heart, Sparkles, ChevronRight, Eye, FileText,
  Clock, ArrowRight, Zap, Info, X, ScanLine
} from 'lucide-react';
import Badge from '../components/Badge';
import FieldEditor from '../components/FieldEditor';
import PdfReport from '../components/PdfReport';

export default function Scanner({ currentScan, setCurrentScan, user }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [scanResult, setScanResult] = useState(currentScan || null);
  const [showRawText, setShowRawText] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [samplesList, setSamplesList] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Load sample cases & recent scan history
  useEffect(() => {
    fetch('/api/samples')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load samples');
        return res.json();
      })
      .then((data) => setSamplesList(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error fetching samples:', err);
        setSamplesList([]);
      });

    fetch('/api/history?limit=6')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
      })
      .then((data) => setRecentScans(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error fetching history:', err);
        setRecentScans([]);
      });
  }, []);

  // Update parent global state when scanResult updates
  useEffect(() => {
    if (scanResult && setCurrentScan) {
      setCurrentScan(scanResult);
    }
  }, [scanResult]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopCamera();
    uploadAndScan(file);
  };

  const uploadAndScan = async (file, textInput = null) => {
    setIsScanning(true);
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (textInput) {
      formData.append('raw_text_input', textInput);
    }
    formData.append('user_email', user?.email || 'guest@labelguard.in');

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setScanResult(data);
      // Refresh recent scans
      fetch('/api/history?limit=6')
        .then((r) => r.json())
        .then((d) => setRecentScans(d));
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Sample case loader
  const handleLoadSample = (sample) => {
    setSelectedFile(null);
    setPreviewUrl(sample.image_url || `/samples/${sample.id}.png`);
    uploadAndScan(null, sample.raw_text);
  };

  // Camera handling
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check permissions or use image upload.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      handleFileSelected(file);
    }, 'image/jpeg', 0.95);
  };

  // Re-evaluation handler from FieldEditor
  const handleReevaluate = async (editedFields) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedFields,
          user_email: user?.email || 'guest@labelguard.in',
        }),
      });
      const data = await res.json();
      setScanResult((prev) => ({
        ...prev,
        fields: data.fields,
        compliance: data.compliance,
        ingredients_analysis: data.ingredients_analysis,
        barcode_info: data.barcode_info,
      }));
    } catch (err) {
      console.error('Re-evaluation error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Categories list for Browse by Category
  const categories = [
    { name: 'Packaged Food', icon: '🥫', count: '15 items', desc: 'Atta, Noodles, Ketchup' },
    { name: 'Beverages', icon: '🥤', count: '15 items', desc: 'Juices, Sodas, Teas' },
    { name: 'Snacks', icon: '🥨', count: '15 items', desc: 'Chips, Bhujia, Makhana' },
    { name: 'Dairy', icon: '🧀', count: '8 items', desc: 'Butter, Cheese, Curd' },
    { name: 'Bakery', icon: '🍪', count: '10 items', desc: 'Biscuits, Bread, Cakes' },
    { name: 'Supplements', icon: '💊', count: '6 items', desc: 'Whey, Multivitamins' },
    { name: 'Cosmetics', icon: '💄', count: '10 items', desc: 'Lipstick, Foundation' },
    { name: 'Skincare', icon: '🧴', count: '20 items', desc: 'Serums, Creams, SPF' },
    { name: 'Haircare', icon: '💆', count: '8 items', desc: 'Shampoo, Conditioners' },
    { name: 'Personal Care', icon: '🧼', count: '7 items', desc: 'Soaps, Toothpastes' },
    { name: 'Baby Products', icon: '👶', count: '5 items', desc: 'Wipes, Diaper Creams' },
    { name: 'Household', icon: '🧹', count: '6 items', desc: 'Cleaners, Detergents' },
  ];

  const productType = scanResult?.fields?.product_type || 'food';
  const compliance = scanResult?.compliance;
  const ingredientsData = scanResult?.ingredients_analysis;
  const barcodeInfo = scanResult?.barcode_info;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5 text-teal-300" />
            Smart India Hackathon 2026 • Problem SIH26034
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Scan & Check Legal Metrology Compliance
          </h1>
          <p className="text-teal-100/80 text-sm mt-2 leading-relaxed">
            Upload or capture an image of any packaged commodity label. Our OpenCV + Tesseract pipeline will extract all 10 statutory declarations, check GS1 barcode integrity, identify allergens, and audit against the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
      </div>

      {/* Sample Cases Quick Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quick Test Cases (1-Click Evaluation)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Preloaded test images & labels</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {(Array.isArray(samplesList) ? samplesList : []).map((sample, idx) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample)}
              className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition flex flex-col justify-between group"
            >
              <div>
                <span className="text-[10px] font-bold text-teal-700 block">Case {idx + 1}</span>
                <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 line-clamp-1">
                  {sample.name.split(':')[1]?.trim() || sample.name}
                </span>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                  {sample.description}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className={`font-semibold ${
                  sample.expected_verdict === 'COMPLIANT' ? 'text-emerald-600' :
                  sample.expected_verdict === 'PARTIALLY COMPLIANT' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {sample.expected_verdict}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Scanner Section (2-Columns: Upload/Camera & Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input (Drag & Drop / Camera / Preview) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-600" />
                Product Label Input
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    isCameraActive
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isCameraActive ? 'Close Camera' : 'Webcam Scan'}
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border-2 border-teal-500">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-full font-bold text-xs shadow-lg transition flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Label
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Drag & Drop Box */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Product Label Preview"
                      className="max-h-64 mx-auto rounded-xl object-contain border border-slate-200 shadow-sm"
                    />
                    <div className="text-xs text-slate-500">
                      Click or drag a new image to replace
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center border border-teal-100 shadow-sm">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drop product label image here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        or click to browse from device (JPG, PNG, WebP)
                      </p>
                    </div>
                    <div className="text-[11px] text-teal-700 font-medium bg-teal-50/60 py-1 px-3 rounded-full inline-block">
                      Supports phone photos, packaging scans, and label crops
                    </div>
                  </div>
                )}

                {/* Scanning Spinner Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10">
                    <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">Running OCR & Preprocessing...</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Applying bilateral denoise, adaptive thresholding & rotation checks
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw OCR Text Toggle */}
            {scanResult?.raw_text && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-teal-700 font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {showRawText ? 'Hide Raw OCR Text' : 'View Extracted Raw OCR Text'}
                  </span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {scanResult.raw_text.length} chars
                  </span>
                </button>

                {showRawText && (
                  <div className="mt-2 p-3 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {scanResult.raw_text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Scan Results & Analysis */}
        <div className="lg:col-span-7 space-y-6">
          {scanResult && scanResult.fields ? (
            <>
              {/* Verdict Summary Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Product Scan Result
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">
                      {scanResult.fields.brand ? `${scanResult.fields.brand} ` : ''}
                      {scanResult.fields.product_name || 'Scanned Commodity'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold uppercase">
                        {scanResult.fields.category || 'Commodity'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600">
                        Type: <span className="font-semibold capitalize text-teal-700">{productType}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    Download PDF Report
                  </button>
                </div>

                {/* 3 Metric Badges: Legal Metrology Score, Health/Skin Score, Barcode Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                  {/* 1. Legal Metrology */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        Legal Metrology
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900">
                          {compliance?.score || 0}%
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          compliance?.verdict === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800' :
                          compliance?.verdict === 'PARTIALLY COMPLIANT' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {compliance?.verdict || 'PENDING'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/compliance')}
                      className="mt-3 text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 text-left"
                    >
                      View 10 Rules <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 2. Health / Skin Score */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {productType === 'food' ? 'Nutritional Health' : 'Dermal / Skin Safety'}
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900">
                          {ingredientsData?.health_score ?? 75}/100
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          (ingredientsData?.health_score ?? 75) >= 70 ? 'bg-emerald-100 text-emerald-800' :
                          (ingredientsData?.health_score ?? 75) >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {productType === 'food'
                            ? (ingredientsData?.health_verdict || 'HEALTHY')
                            : (ingredientsData?.skin_verdict || 'GOOD FOR SKIN')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-3">
                      {ingredientsData?.summary?.safe || 0} Safe • {ingredientsData?.summary?.caution || 0} Caution • {ingredientsData?.summary?.avoid || 0} Avoid
                    </span>
                  </div>

                  {/* 3. Barcode Verification */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-slate-700" />
                        GS1 Barcode
                      </span>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-1 truncate">
                        {barcodeInfo?.value || scanResult.fields.barcode || 'N/A'}
                      </div>
                      <div className="mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          barcodeInfo?.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {barcodeInfo?.is_valid ? 'VALID CHECKSUM' : 'INVALID'}
                        </span>
                        {barcodeInfo?.is_india_prefix && (
                          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                            890 INDIA
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 truncate" title={barcodeInfo?.reason}>
                      {barcodeInfo?.reason || 'Barcode parsed'}
                    </p>
                  </div>
                </div>

                {/* Allergens Alert Banner */}
                {ingredientsData?.allergens && ingredientsData.allergens.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Declared Allergens Identified: </span>
                      <span className="font-semibold text-rose-700">{ingredientsData.allergens.join(', ')}</span>.
                      <span className="text-amber-800 ml-1">Mandatory allergen warning required under FSSAI rules.</span>
                    </div>
                  </div>
                )}

                {/* Banned Ingredients Alert */}
                {ingredientsData?.banned_ingredients && ingredientsData.banned_ingredients.length > 0 && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Critical Regulatory Flag: </span>
                      <span>Product contains ingredients banned or restricted in major jurisdictions:</span>
                      <ul className="list-disc list-inside mt-1 font-medium space-y-0.5">
                        {ingredientsData.banned_ingredients.map((b, idx) => (
                          <li key={idx}>
                            <span className="font-bold">{b.ingredient}</span>: {b.regulation?.reason} (Banned in: {b.regulation?.banned_in?.join(', ')})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyzed Ingredients List with Badges */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Ingredients Safety Profile</h3>
                    <p className="text-xs text-slate-500">
                      Hover or tap any badge to see scientific assessment and skin effects.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Caution</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Avoid / Banned</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {ingredientsData?.ingredients && ingredientsData.ingredients.length > 0 ? (
                    ingredientsData.ingredients.map((ing, i) => (
                      <Badge
                        key={i}
                        level={ing.safety_level}
                        text={ing.name}
                        reason={ing.reason}
                        skinEffect={ing.skin_effect}
                        eNumber={ing.e_number}
                        isBanned={ing.is_banned}
                      />
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      No parsed ingredients found. You can add them in the editor below.
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Fields Box Component */}
              <FieldEditor
                fields={scanResult.fields}
                missingFields={scanResult.missing_fields}
                tips={scanResult.tips}
                onReevaluate={handleReevaluate}
                isUpdating={isUpdating}
              />
            </>
          ) : (
            /* Empty State / Initial Guidance */
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center border border-teal-100">
                <ScanLine className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-900 text-base">Ready to Scan Product Label</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Upload an image from your device or select one of the 1-click test cases above. Our system extracts the 10 mandatory Legal Metrology declarations, checks the barcode checksum, and maps ingredients against safety databases.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">✅ 10-Point Legal Metrology Check</span>
                <span className="flex items-center gap-1">✅ Barcode GS1 Modulo-10</span>
                <span className="flex items-center gap-1">✅ 150+ Ingredient Safety Database</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Browse by Category Cards Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Browse Products by Category</h2>
            <p className="text-xs text-slate-500">
              Explore 125+ pre-evaluated Indian packaged commodities across 12 distinct sectors.
            </p>
          </div>
          <button
            onClick={() => navigate('/explorer')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            Open Explorer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => navigate(`/explorer?category=${encodeURIComponent(cat.name)}`)}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl block mb-2">{cat.icon}</span>
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-teal-700 transition">
                  {cat.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-teal-600 mt-3 pt-2 border-t border-slate-100 block">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Scans Table Section */}
      {recentScans && recentScans.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Scans & Audits</h2>
            </div>
            <span className="text-xs text-slate-400">Recorded in SQLite database</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3 text-center">Compliance</th>
                  <th className="py-2.5 px-3 text-center">Health/Skin</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(Array.isArray(recentScans) ? recentScans : []).map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {scan.brand ? `${scan.brand} - ` : ''}{scan.product_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{scan.category}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {scan.barcode}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        scan.compliance_verdict === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800' :
                        scan.compliance_verdict === 'PARTIALLY COMPLIANT' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {scan.compliance_score}% {scan.compliance_verdict}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-teal-700">{scan.health_score}/100</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      <PdfReport
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        data={scanResult}
      />
    </div>
  );
}
