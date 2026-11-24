import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function Badge({ level = 'safe', text, reason, skinEffect, eNumber, isBanned }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
  let dotClass = "bg-emerald-500";
  let Icon = ShieldCheck;

  if (level === 'caution' || level === 'warning') {
    bgClass = "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
    dotClass = "bg-amber-500";
    Icon = AlertTriangle;
  } else if (level === 'avoid' || level === 'red' || level === 'fail' || isBanned) {
    bgClass = "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100";
    dotClass = "bg-rose-500";
    Icon = AlertOctagon;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all shadow-sm ${bgClass}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass} ${isBanned ? 'animate-pulse' : ''}`} />
        <span className="truncate max-w-[180px]">{text}</span>
        {eNumber && <span className="opacity-75 text-[10px]">({eNumber})</span>}
      </button>

      {showTooltip && (reason || skinEffect) && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none border border-slate-700">
          <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
            <span>{text}</span>
            <span className={`uppercase text-[10px] px-1.5 py-0.5 rounded ${
              level === 'safe' ? 'bg-emerald-800 text-emerald-200' :
              level === 'caution' ? 'bg-amber-800 text-amber-200' : 'bg-rose-800 text-rose-200'
            }`}>
              {level}
            </span>
          </div>
          {reason && <p className="text-slate-300 leading-relaxed mb-1">{reason}</p>}
          {skinEffect && skinEffect !== 'Neutral' && (
            <p className="text-teal-300 text-[11px] font-medium">Skin Effect: {skinEffect}</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
