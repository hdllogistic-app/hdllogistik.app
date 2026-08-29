import React from 'react';

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
          <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            H
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">HDL LOGISTIK</h1>
            <span className="text-xs text-sky-400 font-medium">Admin & Operational Web</span>
          </div>
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
        {/* Desktop Sidebar Placeholder */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/40 p-4 hidden md:block">
          <nav className="space-y-1 text-sm">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Modul Utama
            </div>
            <div className="px-3 py-2 rounded-md bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
              Dashboard
            </div>
            <div className="px-3 py-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition">
              Input Manifest
            </div>
            <div className="px-3 py-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition">
              Penjadwalan Driver
            </div>
            <div className="px-3 py-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition">
              Finance & Cashflow
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
