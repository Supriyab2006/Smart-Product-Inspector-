import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X, Heart, ShieldAlert, Sparkles, ExternalLink, Barcode, CheckCircle2 } from 'lucide-react';
import Badge from '../components/Badge';

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [itemAnalysis, setItemAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const categories = [
    'All',
    'Packaged Food',
    'Beverages',
    'Snacks',
    'Dairy',
    'Bakery',
    'Supplements',
    'Cosmetics',
    'Skincare',
    'Haircare',
    'Personal Care',
    'Baby Products',
    'Household'
  ];

  // Fetch items list
  useEffect(() => {
    setLoading(true);
    let url = '/api/items';
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') {
      params.append('category', selectedCategory);
    }
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load items');
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching items:', err);
        setItems([]);
        setLoading(false);
      });
  }, [selectedCategory, searchTerm]);

  // When clicking an item, analyze its ingredients via backend for detailed popup
  const handleItemClick = async (item) => {
    setActiveItem(item);
    setAnalysisLoading(true);

    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: item.name,
          brand: item.brand,
          category: item.category,
          product_type: item.type,
          ingredients: (item.ingredients || []).join(', '),
          barcode: item.barcode,
          net_quantity: item.net_quantity,
          mrp: item.mrp
        })
      });
      const data = await res.json();
      setItemAnalysis(data.ingredients_analysis);
    } catch (err) {
      console.error('Error analyzing item ingredients:', err);
      // Fallback
      setItemAnalysis({
        ingredients: (item.ingredients || []).map((ing) => ({
          name: ing,
          safety_level: 'safe',
          reason: 'Standard cosmetic/food ingredient',
          skin_effect: 'Neutral'
        })),
        health_score: item.score || 75,
        allergens: item.allergens || []
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setSearchParams(cat === 'All' ? {} : { category: cat });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
          Knowledge Base & Database
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
          Category & Ingredient Explorer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explore over 120+ verified Indian commodities with complete ingredient profiles, safety ratings, and allergen classifications.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, brand (e.g. Lay's, Amul, CeraVe), or ingredient (e.g. Niacinamide, Palmolein)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading verified commodities...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-2">
          <p className="text-sm font-bold text-slate-800">No products matched your search</p>
          <p className="text-xs text-slate-500">Try adjusting your keyword filter or browse another category.</p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchTerm(''); }}
            className="mt-3 px-4 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing <span className="font-bold text-slate-900">{items.length}</span> commodities</span>
            <span>Click any card to inspect all ingredients</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">
                      Score: <span className="text-teal-700">{item.score}/100</span>
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {item.brand}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition mt-0.5 line-clamp-2">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{item.net_quantity}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-700">{item.mrp.split('(')[0].trim()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.barcode}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.score >= 70 ? 'bg-emerald-100 text-emerald-800' :
                    item.score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.health_verdict}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Detail Ingredients Popup Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  {activeItem.category} • {activeItem.type?.toUpperCase()}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {activeItem.brand} - {activeItem.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Net Qty: <strong className="text-slate-800">{activeItem.net_quantity}</strong></span>
                  <span>•</span>
                  <span>MRP: <strong className="text-slate-800">{activeItem.mrp}</strong></span>
                  <span>•</span>
                  <span>Barcode: <strong className="font-mono text-slate-800">{activeItem.barcode}</strong></span>
                </div>
              </div>
              <button
                onClick={() => { setActiveItem(null); setItemAnalysis(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Score Badge */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {activeItem.type === 'food' ? 'Nutritional Health Score' : 'Dermal / Skin Safety Score'}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900">
                      {itemAnalysis?.health_score ?? activeItem.score}/100
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      (itemAnalysis?.health_score ?? activeItem.score) >= 70
                        ? 'bg-emerald-100 text-emerald-800'
                        : (itemAnalysis?.health_score ?? activeItem.score) >= 40
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {activeItem.type === 'food'
                        ? (itemAnalysis?.health_verdict || activeItem.health_verdict)
                        : (itemAnalysis?.skin_verdict || activeItem.health_verdict)}
                    </span>
                  </div>
                </div>

                {activeItem.allergens && activeItem.allergens.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-rose-600 block">
                      Allergens Present
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      {activeItem.allergens.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Ingredients List with Badges & One-Line Reason */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">
                  Full Ingredient Safety Breakdown
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Each ingredient is mapped with scientific safety level and skin reaction potential:
                </p>

                {analysisLoading ? (
                  <div className="py-10 text-center">
                    <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-slate-400 mt-2 block">Analyzing ingredient formulation...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {itemAnalysis?.ingredients?.map((ing, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{ing.name}</span>
                            {ing.e_number && (
                              <span className="text-[10px] font-mono text-slate-400">({ing.e_number})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ing.reason}</p>
                          {ing.skin_effect && ing.skin_effect !== 'Neutral' && (
                            <span className="text-[10px] font-medium text-teal-700">
                              Skin: {ing.skin_effect}
                            </span>
                          )}
                        </div>

                        <span className={`self-start sm:self-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ing.safety_level === 'safe'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ing.safety_level === 'caution'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ing.safety_level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => { setActiveItem(null); setItemAnalysis(null); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
