import { LogoutButton } from '@/components/LogoutButton';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';

export default async function AdminPage() {
  // DAL Server-side authorization check against live PostgreSQL database
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold uppercase tracking-wider border border-sky-500/20">
            Desktop Operational Interface
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Halo, <strong className="text-slate-200">{user.employeeName}</strong> ({user.role})
            </span>
            <LogoutButton />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-100">HDL LOGISTIK — Admin Web</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Selamat datang di portal Admin & Operasional HDL LOGISTIK V2. Autentikasi dan fondasi arsitektur DAL terverifikasi aman.
        </p>
      </div>
    </div>
  );
}
