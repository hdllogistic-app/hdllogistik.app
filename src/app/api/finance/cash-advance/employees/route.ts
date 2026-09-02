import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getEligibleKasbonEmployeesService } from '@/modules/finance/services/cash-advance.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const result = await getEligibleKasbonEmployeesService();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/cash-advance/employees Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data karyawan kasbon.' },
      { status: 500 }
    );
  }
}
