'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Loader2, Clock, CheckCircle2 } from 'lucide-react';

interface AttendanceSummary {
  totalPresentCount: number;
  latestAttendanceDate: string | null;
}

export default function HelperHomePage() {
  const [helperName, setHelperName] = useState<string>('Helper');
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalPresentCount: 0,
    latestAttendanceDate: null,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHelperHomeData() {
      try {
        const res = await fetch('/api/helper/attendance');
        const data = await res.json();
        if (data.success) {
          if (data.helperName) setHelperName(data.helperName);
          if (Array.isArray(data.attendances)) {
            setSummary({
              totalPresentCount: data.attendances.length,
              latestAttendanceDate: data.attendances[0]?.date || null,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load helper home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHelperHomeData();
  }, []);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="p-5 bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
            HELPER OPERATIONAL DASHBOARD
          </span>
          <h2 className="text-xl font-black text-white">Halo, {helperName}! 👋</h2>
          <p className="text-xs text-slate-300">
            Selamat bekerja. Pastikan selalu mencatat kehadiran operasional Anda setiap hari.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
          <div className="w-8 h-8 mx-auto bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">Kehadiran (30 Hari)</span>
          <span className="text-lg font-black text-white font-mono">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-emerald-400" /> : `${summary.totalPresentCount} Hari`}
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
          <div className="w-8 h-8 mx-auto bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">Absen Terakhir</span>
          <span className="text-xs font-black text-sky-400 font-mono">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto text-sky-400" />
            ) : (
              summary.latestAttendanceDate || 'Belum Ada'
            )}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aksi Cepat</h3>

        <Link
          href="/helper/attendance"
          className="p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between group transition shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                Riwayat Kehadiran (Absensi)
              </h4>
              <p className="text-[11px] text-slate-400">Cek riwayat jam masuk & pulang operasional</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition" />
        </Link>
      </div>
    </div>
  );
}
