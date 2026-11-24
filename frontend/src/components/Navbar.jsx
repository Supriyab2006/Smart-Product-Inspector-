import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ScanLine, Compass, Scale, BookOpen, LogOut, User } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/scanner', label: 'Scanner', icon: ScanLine },
    { to: '/explorer', label: 'Categories & Ingredients', icon: Compass },
    { to: '/compliance', label: 'Legal Metrology Checker', icon: Scale },
    { to: '/regulations', label: 'Banned & Regulations', icon: BookOpen },
  ];

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/scanner" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">LabelGuard</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-800 rounded uppercase tracking-wider">India</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">SIH 2026 • SIH26034 Legal Metrology</p>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                    {user.email || 'Guest User'}
                  </span>
                  <span className="text-[10px] text-teal-600 font-medium uppercase">
                    {user.role === 'guest' ? 'Guest Access' : 'Verified User'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  <User className="w-4 h-4" />
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2 bg-slate-50 px-2 overflow-x-auto">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
