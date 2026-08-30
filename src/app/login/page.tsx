'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginId.trim() || !password) {
      setErrorMessage('Login ID dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Login ID atau password tidak valid.');
        setLoading(false);
        return;
      }

      // Redirect upon successful authentication
      const destination = data.redirectTo || '/';
      router.push(destination);
      router.refresh();
    } catch {
      setErrorMessage('Gagal menghubungkan ke server. Periksa koneksi Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              HDL LOGISTIK
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sistem Operasional Logistics & Transport Management
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert Banner */}
            {errorMessage && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-sm animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* Login ID Input */}
            <div className="space-y-2">
              <label
                htmlFor="loginId"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Login ID Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  disabled={loading}
                  placeholder="Masukkan Login ID (contoh: HDLOWNER001)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Ke Sistem</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} HDL LOGISTIK. All rights reserved.
        </div>
      </div>
    </div>
  );
}
