import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Scanner from './pages/Scanner';
import Explorer from './pages/Explorer';
import ComplianceChecker from './pages/ComplianceChecker';
import Regulations from './pages/Regulations';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('labelguard_user');
      return saved ? JSON.parse(saved) : { email: 'guest@labelguard.in', role: 'guest' };
    } catch {
      return { email: 'guest@labelguard.in', role: 'guest' };
    }
  });

  const [currentScan, setCurrentScan] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('labelguard_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('labelguard_user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="flex-grow">
          <Routes>
            <Route
              path="/login"
              element={<Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route
              path="/scanner"
              element={
                <Scanner
                  currentScan={currentScan}
                  setCurrentScan={setCurrentScan}
                  user={user}
                />
              }
            />
            <Route
              path="/explorer"
              element={<Explorer />}
            />
            <Route
              path="/compliance"
              element={
                <ComplianceChecker
                  currentScan={currentScan}
                  setCurrentScan={setCurrentScan}
                  user={user}
                />
              }
            />
            <Route
              path="/regulations"
              element={<Regulations />}
            />
            <Route path="*" element={<Navigate to="/scanner" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            LabelGuard India • Smart India Hackathon 2026 (Problem SIH26034)
          </p>
          <p className="text-slate-400">
            Automated Legal Metrology (Packaged Commodities) Rules, 2011 & Food Safety Compliance Engine
          </p>
        </footer>
      </div>
    </Router>
  );
}
