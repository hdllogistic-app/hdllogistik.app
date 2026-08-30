import { LogoutButton } from '@/components/LogoutButton';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';

export default async function MobileOpsPage() {
  // DAL Server-side authorization check against live PostgreSQL database
  const user = await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-500/20">
            Mobile OPS Interface
          </div>
          <LogoutButton />
        </div>
        <h2 className="text-xl font-bold text-slate-100">HDL LOGISTIK — Mobile OPS</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Portal Operasional Lapangan (Mobile OPS). Logged in as: <strong className="text-slate-200">{user.employeeName}</strong> ({user.role})
        </p>
      </div>
    </div>
  );
}
