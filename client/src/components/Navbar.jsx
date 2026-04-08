import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isSuperadmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperadmin;

  const links = isSuperadmin ? [
    { to: '/settings', label: 'ניהול עסקים', icon: '🏢' },
  ] : [
    { to: '/new',       label: 'תיקון חדש',    icon: '➕' },
    { to: '/repairs',   label: 'תיקונים',       icon: '🔧' },
    { to: '/dashboard', label: 'דשבורד',        icon: '📊' },
    { to: '/statuses',  label: 'סטטוסים',       icon: '⚙️' },
    ...(isAdmin ? [{ to: '/settings', label: 'הגדרות', icon: '👥' }] : []),
  ];

  const isActive = (to) => location.pathname === to;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-brand-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link to="/repairs" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="אריזו"
              className="h-8 sm:h-10 w-auto object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User + logout (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-brand-600">{user?.display_name || user?.username}</p>
              {user?.business_name && <p className="text-xs text-gray-400">{user.business_name}</p>}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
            >
              יציאה
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-brand-50"
            aria-label="תפריט"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-brand-100 px-3 pb-3 fade-in">
          <div className="py-2 border-b border-gray-100 mb-2">
            <p className="text-sm font-medium text-brand-600">{user?.display_name || user?.username}</p>
            {user?.business_name && <p className="text-xs text-gray-400">{user.business_name}</p>}
          </div>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium mb-1 transition-colors ${
                isActive(link.to)
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-700 hover:bg-brand-50'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { handleLogout(); setMenuOpen(false); }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-500 hover:bg-red-50 w-full mt-1"
          >
            <span>🚪</span>
            יציאה מהמערכת
          </button>
        </div>
      )}
    </header>
  );
}
