import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getDeliveryProofSignedUrlService } from '@/modules/delivery/services/delivery-execution.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    const currentUser = await requireRole([
      USER_ROLES.DRIVER,
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { deliveryId } = await params;
    const driverEmployeeId = currentUser.employeeId || '';

    const result = await getDeliveryProofSignedUrlService(
      driverEmployeeId,
      currentUser.role,
      deliveryId
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/driver/deliveries/[deliveryId]/proof Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil foto bukti pengiriman.' },
      { status: 500 }
    );
  }
}
