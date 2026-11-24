import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, ArrowRight, UserCheck, CheckCircle2, Scale, ScanLine, FileCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      navigate('/scanner');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/guest');
      const data = await res.json();
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      navigate('/scanner');
    } catch (err) {
      // Fallback local guest
      if (onLoginSuccess) {
        onLoginSuccess({ email: 'guest@labelguard.in', role: 'guest' });
      }
      navigate('/scanner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Column: Branding & Features (Teal/Green theme) */}
      <div className="md:w-1/2 bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 p-8 md:p-14 text-white flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-white">LabelGuard India</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-widest">
                  Smart India Hackathon 2026
                </span>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-full font-mono">
                  SIH26034
                </span>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-teal-50">
              Automated Legal Metrology & Product Safety Verification
            </h1>
            <p className="text-teal-200/80 text-sm md:text-base leading-relaxed max-w-lg">
              Scan packaged commodity labels to instantly verify the 10 mandatory Legal Metrology (Packaged Commodities) Rules, 2011 declarations, validate GS1 barcodes, and analyze ingredients against global banned substances.
            </p>
          </div>

          <div className="mt-10 space-y-3.5 max-w-md">
            {[
              { icon: ScanLine, title: 'Multi-Angle OCR & OpenCV Preprocessing', desc: 'Automatic 2x cubic scaling, adaptive thresholding, and rotation fallbacks.' },
              { icon: Scale, title: '10-Point Legal Metrology Rule Checklist', desc: 'Checks MRP inclusive of taxes, metric net quantity, FSSAI, and origin.' },
              { icon: FileCheck, title: 'Fuzzy Ingredient & Banned Substance Matcher', desc: '150+ chemical profiles, allergen detection, and international regulatory cross-checks.' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-800/40 border border-teal-700/50 backdrop-blur-sm">
                  <div className="p-2 rounded-lg bg-teal-700/50 text-teal-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-teal-100">{item.title}</h2>
                    <p className="text-[11px] text-teal-300/80 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-8 pt-6 border-t border-teal-700/40 text-[11px] text-teal-300/60">
          Developed for SIH 2026 Problem SIH26034: "Software System to check compliance of Packaged Commodities under Legal Metrology Rules by scanning products, images and labels."
        </div>
      </div>

      {/* Right Column: Split Auth Form */}
      <div className="md:w-1/2 p-8 md:p-14 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {isSignUp ? 'Create an Account' : 'Welcome to LabelGuard'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isSignUp
                ? 'Sign up to store scan audits and export compliance certificates.'
                : 'Sign in to access your audit records or continue immediately as guest.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@enforcement.gov.in or user@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Sign Up & Continue' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guest Action */}
          <div className="mt-5">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium uppercase">Or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Continue as Guest (Instant Access)</span>
            </button>
          </div>

          {/* Toggle Login / Signup */}
          <div className="mt-6 text-center text-xs text-slate-600">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); }}
                  className="font-bold text-teal-600 hover:text-teal-700 underline ml-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); }}
                  className="font-bold text-teal-600 hover:text-teal-700 underline ml-1"
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
