import React from 'react';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      {/* Driver Mobile Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col border-x border-slate-800 bg-slate-900 shadow-2xl">
        {/* Driver Header */}
        <header className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-sm text-slate-100">HDL DRIVER MOBILE</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Driver PWA
          </span>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>

        {/* Driver Bottom Nav Placeholder */}
        <nav className="border-t border-slate-800 bg-slate-950 px-4 py-2 flex justify-around text-[10px] text-slate-400">
          <div className="flex flex-col items-center text-emerald-400">
            <span>🚚</span>
            <span>Delivery</span>
          </div>
          <div className="flex flex-col items-center">
            <span>📍</span>
            <span>Absensi</span>
          </div>
          <div className="flex flex-col items-center">
            <span>💰</span>
            <span>Salary</span>
          </div>
          <div className="flex flex-col items-center">
            <span>👤</span>
            <span>Profile</span>
          </div>
        </nav>
      </div>
    </div>
  );
}
