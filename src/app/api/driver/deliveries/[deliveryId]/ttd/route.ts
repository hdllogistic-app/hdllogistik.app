import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { processDeliveryTtdService } from '@/modules/delivery/services/delivery-execution.service';

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
    const formData = await request.formData();

    const actualRecipientName = formData.get('actualRecipientName') as string;
    const photoFile = formData.get('photo') as File | null;
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;

    if (!photoFile) {
      return NextResponse.json(
        { success: false, error: 'Foto Bukti Tanda Terima wajib diunggah.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await photoFile.arrayBuffer();
    const photoBuffer = Buffer.from(arrayBuffer);

    const result = await processDeliveryTtdService(driverEmployeeId, {
      deliveryId,
      actualRecipientName: actualRecipientName || '',
      photoBuffer,
      mimeType: photoFile.type || 'image/jpeg',
      originalFilename: photoFile.name || 'photo.jpg',
      latitude,
      longitude,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/driver/deliveries/[deliveryId]/ttd Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses Tanda Terima Pengiriman.' },
      { status: 500 }
    );
  }
}
