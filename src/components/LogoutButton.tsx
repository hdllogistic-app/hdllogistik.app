'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <LogOut className="w-4 h-4 text-red-400" />
      )}
      <span>Keluar</span>
    </button>
  );
}
