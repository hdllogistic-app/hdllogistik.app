import React from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F1] text-[#171717] font-sans antialiased">
      {/* Admin Desktop Header - Clean Light Theme */}
      <header className="border-b border-[#E8E7E3] bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-8 w-8 rounded-lg bg-[#171717] flex items-center justify-center font-black text-amber-400 text-sm shadow-md group-hover:bg-[#262626] transition">
              H
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-none tracking-tight text-[#171717]">
                HDL LOGISTIK
              </h1>
              <span className="text-[11px] text-neutral-500 font-medium">
                Admin & Operational Web
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center space-x-4 text-xs text-neutral-500">
          <span className="px-3 py-1 rounded-full bg-[#F6F5F1] border border-[#E8E7E3] text-neutral-700 font-mono font-medium">
            Timezone: Asia/Jakarta
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Ready</span>
          </span>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <AdminSidebar />

        {/* Light Workspace Main Canvas */}
        <main className="flex-1 p-6 md:p-8 bg-[#F6F5F1] overflow-y-auto min-h-[calc(100vh-65px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
