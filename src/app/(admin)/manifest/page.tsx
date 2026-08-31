import React from 'react';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { RincianManifestView } from './RincianManifestView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function RincianManifestPage() {
  // Server-side DAL Authorization check (OWNER, ADMIN, OPS, and FINANCE permitted to view list)
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
    USER_ROLES.FINANCE,
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold uppercase tracking-wider border border-sky-500/20 mb-2">
            Modul Operasional & Penjadwalan
          </div>
          <h1 className="text-2xl font-bold text-slate-100">HDL LOGISTIK — Rincian Manifest</h1>
          <p className="text-slate-400 text-sm mt-1">
            Daftar rincian manifest operasional pengiriman dan modul penjadwalan driver & armada kendaraan.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          User: <span className="text-white font-bold">{user.employeeName}</span> ({user.role})
        </div>
      </div>

      <RincianManifestView userRole={user.role} />
    </div>
  );
}
