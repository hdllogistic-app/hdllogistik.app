import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { updateDriverService } from '@/modules/settings/services/driver-settings.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-origin request rejected.' },
        { status: 403 }
      );
    }

    const user = await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
    ]);

    const { id } = await params;
    const body = await request.json();

    const result = await updateDriverService(id, body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, driver: result.driver });
  } catch (error) {
    console.error('[Drivers PATCH Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
