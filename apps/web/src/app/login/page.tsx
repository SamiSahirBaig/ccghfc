'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await ApiClient.post('/auth/login', { email, password });
      if (res.success && res.data) {
        localStorage.setItem('cc_access_token', res.data.tokens.accessToken);
        setUser(res.data.user);

        // Redirect based on role
        if (res.data.user.role === 'OFFICER') router.push('/officer');
        else if (res.data.user.role === 'SUPERVISOR') router.push('/supervisor');
        else if (res.data.user.role === 'ADMIN') router.push('/admin');
        else router.push('/report');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sign in to CityClean</h1>
        <p className="text-xs text-slate-500">Access your citizen reports or municipal staff queue</p>
      </div>

      <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xl space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="citizen@cityclean.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast-Login Helpers */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block text-center">
            Demo Credentials (1-Click Fill)
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemo('citizen@cityclean.gov')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 border border-slate-200 text-center font-medium"
            >
              Citizen Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('officer@cityclean.gov')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 border border-slate-200 text-center font-medium"
            >
              Officer Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('supervisor@cityclean.gov')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 border border-slate-200 text-center font-medium"
            >
              Supervisor Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@cityclean.gov')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 border border-slate-200 text-center font-medium"
            >
              Admin Demo
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-emerald-700 font-bold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
