import React from 'react';

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col border-x border-slate-800 bg-slate-900 shadow-2xl">
        {/* Mobile Header */}
        <header className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-bold text-sm text-slate-100">HDL OPS MOBILE</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            OPS Interface
          </span>
        </header>

        {/* Mobile Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Quick Action Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 px-4 py-3 text-center text-xs text-slate-500">
          Mobile Operational Interface PWA
        </footer>
      </div>
    </div>
  );
}
