import React from 'react';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { ShippingRateSettingsView } from './ShippingRateSettingsView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ShippingRateSettingsPage() {
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20 mb-2">
            Master Data Ongkir
          </div>
          <h1 className="text-2xl font-bold text-slate-100">HDL LOGISTIK — Database Ongkir</h1>
          <p className="text-slate-400 text-sm mt-1">
            Kelola tarif ongkir per kilogram berdasarkan Provinsi dan Kota / Kabupaten.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          User: <span className="text-white font-bold">{user.employeeName}</span> ({user.role})
        </div>
      </div>

      <ShippingRateSettingsView userRole={user.role} />
    </div>
  );
}
