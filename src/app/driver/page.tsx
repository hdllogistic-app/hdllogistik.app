'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, CheckCircle2, Clock, ChevronRight, Loader2, Calendar, Package } from 'lucide-react';

interface DeliverySummary {
  totalDeliveries: number;
  successCount: number;
  pendingCount: number;
}

export default function DriverHomePage() {
  const [driverName, setDriverName] = useState<string>('Driver');
  const [summary, setSummary] = useState<DeliverySummary>({
    totalDeliveries: 0,
    successCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDriverHomeData() {
      try {
        const res = await fetch('/api/driver/deliveries');
        const data = await res.json();
        if (data.success) {
          if (data.driverName) setDriverName(data.driverName);
          if (data.summary) setSummary(data.summary);
        }
      } catch (err) {
        console.error('Failed to load driver home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDriverHomeData();
  }, []);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="p-5 bg-gradient-to-br from-sky-900/40 via-slate-900 to-slate-950 border border-sky-800/40 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
            DRIVER OPERATIONAL DASHBOARD
          </span>
          <h2 className="text-xl font-black text-white">Halo, {driverName}! 👋</h2>
          <p className="text-xs text-slate-300">
            Siap untuk pengiriman paket hari ini? Pastikan selalu periksa alamat & penerima.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
          <div className="w-7 h-7 mx-auto bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">Total Delivery</span>
          <span className="text-base font-black text-white font-mono">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-sky-400" /> : summary.totalDeliveries}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
          <div className="w-7 h-7 mx-auto bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">Sudah TTD</span>
          <span className="text-base font-black text-emerald-400 font-mono">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-emerald-400" /> : summary.successCount}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
          <div className="w-7 h-7 mx-auto bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">Pending</span>
          <span className="text-base font-black text-amber-400 font-mono">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-amber-400" /> : summary.pendingCount}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aksi Cepat</h3>

        <Link
          href="/driver/scan"
          className="p-4 bg-gradient-to-r from-sky-950/80 to-slate-900 border border-sky-800/60 hover:border-sky-500 rounded-xl flex items-center justify-between group transition shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-lg group-hover:scale-110 transition">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition flex items-center gap-1.5">
                <span>📦 SCAN PAKET</span>
                <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] rounded font-mono">Self-Assign</span>
              </h4>
              <p className="text-[11px] text-slate-300">Scan barcode resi untuk jadwalkan tugas ke Anda</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/driver/delivery"
          className="p-4 bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl flex items-center justify-between group transition shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition">
                Daftar Delivery Tugas
              </h4>
              <p className="text-[11px] text-slate-400">Lihat seluruh resi pengiriman hari ini</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition" />
        </Link>

        <Link
          href="/driver/attendance"
          className="p-4 bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl flex items-center justify-between group transition shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition">
                Riwayat Absensi
              </h4>
              <p className="text-[11px] text-slate-400">Cek status kehadiran & lokasi kerja</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition" />
        </Link>
      </div>
    </div>
  );
}
