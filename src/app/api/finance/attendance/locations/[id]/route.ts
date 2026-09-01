import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { updateWorkLocationService } from '@/modules/attendance/services/work-location.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'FINANCE')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updateWorkLocationService(id, body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/finance/attendance/locations/[id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui lokasi absensi.' },
      { status: 500 }
    );
  }
}
