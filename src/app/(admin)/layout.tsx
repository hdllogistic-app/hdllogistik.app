import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Admin Desktop Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            {/* Real HDL LOGISTIK Logo Asset */}
            <Image
              src="/icons/icon.svg"
              alt="HDL LOGISTIK"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain shrink-0 shadow-md shadow-sky-500/10 group-hover:scale-105 transition"
            />
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-white">HDL LOGISTIK</h1>
              <span className="text-xs text-sky-400 font-medium">Admin & Operational Web</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            Timezone: Asia/Jakarta
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Ready</span>
          </span>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
