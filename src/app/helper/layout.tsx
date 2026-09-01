'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, User, Users as LogoIcon } from 'lucide-react';

export default function HelperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/helper', label: 'Home', icon: Home },
    { href: '/helper/attendance', label: 'Absensi', icon: Calendar },
    { href: '/helper/profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto relative border-x border-slate-800 shadow-2xl">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <LogoIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-wider text-white">HDL HELPER</span>
            <span className="text-[10px] block text-emerald-400 font-mono -mt-0.5">MOBILE V1</span>
          </div>
        </div>
        <div className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full text-[10px] font-bold">
          ONLINE
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">{children}</main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/helper'
              ? pathname === '/helper'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition ${
                isActive
                  ? 'text-emerald-400 bg-emerald-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
