'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, MapPin, Globe, User, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Header() {
  const pathname = usePathname();
  const { user, locale, setLocale, setUser } = useAppStore();

  const handleLogout = () => {
    localStorage.removeItem('cc_access_token');
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight tracking-tight">CityClean</span>
            <span className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">Civic Redressal</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className={`hover:text-emerald-600 transition-colors ${pathname === '/' ? 'text-emerald-700 font-semibold' : ''}`}>
            Home
          </Link>
          <Link href="/report" className={`hover:text-emerald-600 transition-colors ${pathname === '/report' ? 'text-emerald-700 font-semibold' : ''}`}>
            Report Issue
          </Link>
          <Link href="/smoke-monitoring" className={`hover:text-emerald-600 transition-colors ${pathname === '/smoke-monitoring' ? 'text-emerald-700 font-semibold' : ''}`}>
            Smoke Monitoring
          </Link>
          <Link href="/complaints" className={`hover:text-emerald-600 transition-colors ${pathname?.startsWith('/complaints') ? 'text-emerald-700 font-semibold' : ''}`}>
            Complaints & Problems
          </Link>
          <Link href="/transparency" className={`hover:text-emerald-600 transition-colors ${pathname === '/transparency' ? 'text-emerald-700 font-semibold' : ''}`}>
            Public Map & Stats
          </Link>
          {user?.role === 'OFFICER' && (
            <Link href="/officer" className="text-emerald-700 font-semibold hover:underline">
              Officer Queue
            </Link>
          )}
          {user?.role === 'SUPERVISOR' && (
            <Link href="/supervisor" className="text-emerald-700 font-semibold hover:underline">
              Supervisor Zone
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="text-emerald-700 font-semibold hover:underline">
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Right Action Icons: Language toggle & User profile */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* User Profile or Login */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900">{user.name}</span>
                <span className="text-[10px] text-emerald-600 font-medium">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
