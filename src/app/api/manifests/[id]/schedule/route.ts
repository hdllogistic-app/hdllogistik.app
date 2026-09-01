import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { reassignDeliveryService } from '@/modules/manifest/services/reassign-delivery.service';

/**
 * PATCH /api/manifests/[id]/schedule
 * Reassigns an ASSIGNED delivery to a new Driver and Vehicle.
 * Allowed roles: OWNER, ADMIN, OPS.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (user.role === 'FINANCE' || user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await reassignDeliveryService(id, body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      driverName: result.driverName,
      vehiclePlate: result.vehiclePlate,
    });
  } catch (err) {
    console.error('PATCH /api/manifests/[id]/schedule error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
