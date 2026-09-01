import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { Coins, UserCheck, Truck, Building2, ChevronRight } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SettingsLandingPage() {
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold uppercase tracking-wider border border-sky-500/20 mb-2">
            Modul Pengaturan Master
          </div>
          <h1 className="text-2xl font-bold text-slate-100">HDL LOGISTIK — Pengaturan System</h1>
          <p className="text-slate-400 text-sm mt-1">
            Kelola master data customer penagihan, tarif ongkir, driver operasional, dan armada kendaraan perusahaan.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          User: <span className="text-white font-bold">{user.employeeName}</span> ({user.role})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Master Customer */}
        <Link
          href="/settings/customers"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900 transition-all shadow-xl space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">Master Customer</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kelola master data customer penagihan, kode customer, kontak, dan alamat penagihan resmi.
            </p>
          </div>
        </Link>

        {/* Database Ongkir */}
        <Link
          href="/settings/shipping-rates"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900 transition-all shadow-xl space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">Database Ongkir</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kelola area tujuan berdasarkan provinsi dan kota/kabupaten serta tarif ongkir per kilogram.
            </p>
          </div>
        </Link>

        {/* Pengaturan Team */}
        <Link
          href="/settings/team"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900 transition-all shadow-xl space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl group-hover:scale-105 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">Pengaturan Team</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kelola anggota team dan divisi operasional.
            </p>
          </div>
        </Link>

        {/* Pengaturan Armada */}
        <Link
          href="/settings/vehicles"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900 transition-all shadow-xl space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">Pengaturan Armada</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kelola armada kendaraan operasional, nomor polisi, dan status kelayakan penugasan delivery.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
