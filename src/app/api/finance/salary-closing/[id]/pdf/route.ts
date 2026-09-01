import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getSalarySlipSnapshotService } from '@/modules/finance/services/salary-closing.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
    ]);

    const { id } = await params;
    const result = await getSalarySlipSnapshotService(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/salary-closing/[id]/pdf Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat slip gaji.' },
      { status: 500 }
    );
  }
}
