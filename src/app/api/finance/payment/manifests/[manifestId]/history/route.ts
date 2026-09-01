import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getAdjustmentHistoryTimelineService } from '@/modules/payment/services/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manifestId: string }> }
) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const { manifestId } = await params;
    const result = await getAdjustmentHistoryTimelineService(manifestId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/payment/manifests/[manifestId]/history Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat riwayat adjustment.' },
      { status: 500 }
    );
  }
}
