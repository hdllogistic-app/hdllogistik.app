import { LogoutButton } from '@/components/LogoutButton';
import { requireDriver } from '@/lib/auth/dal';

export default async function MobileDriverPage() {
  // DAL Server-side driver access check against live PostgreSQL database
  const driverScope = await requireDriver();

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider border border-amber-500/20">
            Mobile Driver Interface
          </div>
          <LogoutButton />
        </div>
        <h2 className="text-xl font-bold text-slate-100">HDL LOGISTIK — Mobile Driver</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Portal Operasional Kurir / Driver. Employee ID Scope: <strong className="text-amber-300">{driverScope.employeeId || 'OWNER Access'}</strong>
        </p>
      </div>
    </div>
  );
}
