import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { previewSalaryClosingService } from '@/modules/finance/services/salary-closing.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
    ]);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const employeeId = searchParams.get('employeeId') || undefined;

    const result = await previewSalaryClosingService(startDate, endDate, employeeId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/salary-closing/preview Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat preview salary closing.' },
      { status: 500 }
    );
  }
}
