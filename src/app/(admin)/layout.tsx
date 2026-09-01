import React from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Admin Desktop Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20 group-hover:bg-sky-400 transition">
              H
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">HDL LOGISTIK</h1>
              <span className="text-xs text-sky-400 font-medium">Admin & Operational Web</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            Timezone: Asia/Jakarta
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            System Ready
          </span>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/40 p-4 hidden md:block shrink-0">
          <nav className="space-y-4 text-sm">
            {/* Modul Utama */}
            <div className="space-y-1">
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Modul Utama
              </div>
              <Link
                href="/"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/manifest/input"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Input Manifest
              </Link>
              <Link
                href="/manifest"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Rincian Manifest
              </Link>
              <Link
                href="/monitoring/delivery"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Monitoring Delivery
              </Link>
              <div className="px-3 py-2 rounded-md text-slate-500 cursor-not-allowed">
                Finance & Cashflow
              </div>
            </div>

            {/* Pengaturan */}
            <div className="space-y-1 border-t border-slate-800/80 pt-3">
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pengaturan
              </div>
              <Link
                href="/settings/shipping-rates"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Database Ongkir
              </Link>
              <Link
                href="/settings/team"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Pengaturan Team
              </Link>
              <Link
                href="/settings/vehicles"
                className="block px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition font-medium"
              >
                Pengaturan Armada
              </Link>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
