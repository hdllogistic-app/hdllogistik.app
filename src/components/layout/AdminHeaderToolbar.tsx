'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Clock,
} from 'lucide-react';

export function AdminHeaderToolbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
      {/* LEFT: Search Bar Shell */}
      <div className="relative flex-1 max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-sky-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari fitur (cth: Kas Masuk, Rekap Gaji, Attendance)..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:border-sky-500 focus:outline-none placeholder:text-slate-500 transition shadow-inner"
        />
      </div>

      {/* RIGHT: Utility Controls (Timezone, Ready, Bell & User Profile) */}
      <div className="flex items-center justify-end gap-3 shrink-0">
        {/* Timezone & System Status Chips */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Asia/Jakarta</span>
          </span>
          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Ready</span>
          </span>
        </div>

        {/* Bell Notification Button */}
        <button
          type="button"
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition relative shadow-sm"
          title="Notifikasi Operasional"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950"></span>
        </button>

        {/* User Profile Card / Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition text-left shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-xs shrink-0">
              HG
            </div>
            <div className="hidden sm:block overflow-hidden">
              <div className="text-xs font-bold text-slate-100 truncate leading-tight">
                Hadi Gustian
              </div>
              <div className="text-[10px] text-sky-400 font-mono font-medium truncate">
                OWNER
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
          </button>

          {/* Optional Profile Quick Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn text-xs space-y-0.5">
              <div className="p-2 border-b border-slate-800 text-slate-300">
                <div className="font-bold text-white">Hadi Gustian</div>
                <div className="text-[10px] text-slate-400">hadi@hdllogistik.id</div>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition font-medium"
                >
                  Keluar / Logout
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
