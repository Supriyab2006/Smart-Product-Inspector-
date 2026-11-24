import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Globe, AlertTriangle, ShieldAlert, ExternalLink, Lightbulb, Info } from 'lucide-react';

export default function Regulations() {
  const [regulations, setRegulations] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const countries = [
    'All',
    'India',
    'USA',
    'European Union',
    'UK',
    'Canada',
    'Australia',
    'Japan'
  ];

  // Did You Know facts
  const didYouKnow = [
    {
      title: "Potassium Bromate in Bread",
      fact: "Potassium bromate (E924) was banned in India in 2016 by FSSAI after CSE testing found it in 84% of bread samples. It remains permitted in the USA with voluntary phase-outs.",
      icon: "🍞"
    },
    {
      title: "Titanium Dioxide (E171) Nanoparticles",
      fact: "In 2022, the European Food Safety Authority (EFSA) banned E171 in all food across the EU due to DNA accumulation and genotoxicity risks, while it is still widely used in Indian and US candies.",
      icon: "🍬"
    },
    {
      title: "Chewing Gum in Singapore",
      fact: "Since 1992, commercial import and sale of chewing gum has been illegal in Singapore under the Control of Manufacture Act to protect public cleanliness and MRT railway door sensors.",
      icon: "🇸🇬"
    },
    {
      title: "Brominated Vegetable Oil (BVO)",
      fact: "Used to keep citrus sodas cloudy, BVO was banned in India and the EU decades ago. The US FDA finally revoked its food authorization in July 2024 following thyroid damage studies.",
      icon: "🥤"
    }
  ];

  useEffect(() => {
    setLoading(true);
    let url = '/api/regulations';
    const params = new URLSearchParams();
    if (selectedCountry !== 'All') {
      params.append('country', selectedCountry);
    }
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load regulations');
        return res.json();
      })
      .then((data) => {
        setRegulations(Array.isArray(data?.regulations) ? data.regulations : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching regulations:', err);
        setRegulations([]);
        setLoading(false);
      });
  }, [selectedCountry, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
          Global Regulatory Intelligence
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
          Banned & Restricted Ingredients Across Jurisdictions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Compare food, cosmetic, and chemical additive restrictions across India, the European Union, USA, UK, Canada, Australia, and Japan.
        </p>
      </div>

      {/* Did You Know Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Did You Know? (Global Food & Cosmetic Facts)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {didYouKnow.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl block mb-2">{item.icon}</span>
                <h3 className="font-bold text-xs text-slate-900">{item.title}</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                  {item.fact}
                </p>
              </div>
              <span className="text-[10px] text-amber-800 font-semibold mt-3 pt-2 border-t border-amber-200/50 block">
                Statutory Precedent
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ingredient name (e.g. Potassium Bromate, Titanium Dioxide, Hydroquinone, BVO)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        {/* Country Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCountry === c
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3 h-3" />
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Regulations Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying global regulatory databases...</p>
        </div>
      ) : regulations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-sm font-bold text-slate-800">No regulations matched your search query</p>
          <p className="text-xs text-slate-500 mt-1">Try selecting 'All' countries or resetting the search term.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Statutory Additive & Ingredient Regulations
              </h2>
              <p className="text-xs text-slate-500">
                Showing {regulations.length} entries matching jurisdiction criteria.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Common Applications</th>
                  <th className="py-3 px-4">Banned / Prohibited In</th>
                  <th className="py-3 px-4">Scientific & Health Reason</th>
                  <th className="py-3 px-4 text-center">Regulatory Status</th>
                  <th className="py-3 px-4 text-right">Source & Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regulations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {r.ingredient}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {r.used_in}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {r.banned_in?.map((c, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c === 'India'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-md">
                      {r.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="text-[11px] font-medium text-slate-800">{r.year}</div>
                      <div className="text-[10px] text-teal-700 font-medium truncate max-w-[140px]" title={r.source}>
                        {r.source.split(';')[0]}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mandatory Statutory Disclaimer as requested */}
      <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 text-center text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4 text-teal-600" />
          Statutory Regulatory Notice
        </div>
        <p className="italic text-slate-500">
          "Reference information, verify with official FSSAI / CDSCO / FDA / EFSA sources."
        </p>
      </div>
    </div>
  );
}
