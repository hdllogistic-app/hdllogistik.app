import React from 'react';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { InputManifestForm } from './InputManifestForm';

export default async function InputManifestPage() {
  // Server-side DAL Authorization check (OWNER, ADMIN, OPS allowed. FINANCE & DRIVER blocked)
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20 mb-2">
            Form Input Manifest Resi Pengiriman
          </div>
          <h1 className="text-2xl font-bold text-slate-100">HDL LOGISTIK — Form Input Manifest</h1>
          <p className="text-slate-400 text-sm mt-1">
            Harap Masukan Data Dengan Benar dan Teliti
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          Operator: <span className="text-white font-bold">{user.employeeName}</span> ({user.role})
        </div>
      </div>

      <InputManifestForm />
    </div>
  );
}
