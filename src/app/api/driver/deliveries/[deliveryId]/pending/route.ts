import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { processDeliveryPendingService } from '@/modules/delivery/services/driver-delivery.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  // 1. Authenticate user: Must be DRIVER
  const currentUser = await requireRole([USER_ROLES.DRIVER]);

  // 2. Derive employeeId strictly from session
  const driverEmployeeId = currentUser.employeeId;
  if (!driverEmployeeId) {
    return NextResponse.json(
      { success: false, error: 'Akun Anda tidak terhubung dengan data Driver.' },
      { status: 403 }
    );
  }

  try {
    const { deliveryId } = await params;
    const body = await request.json();
    const { reasonCode, customReasonText } = body || {};

    const result = await processDeliveryPendingService(
      driverEmployeeId,
      deliveryId,
      String(reasonCode || ''),
      customReasonText ? String(customReasonText) : undefined
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/driver/deliveries/[deliveryId]/pending Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses Delivery Pending.' },
      { status: 500 }
    );
  }
}
