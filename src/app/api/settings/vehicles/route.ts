import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  listVehiclesService,
  createVehicleService,
} from '@/modules/settings/services/vehicle-settings.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
    ]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    const result = await listVehiclesService({ search, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Vehicles GET Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const result = await createVehicleService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, vehicle: result.vehicle }, { status: 201 });
  } catch (error) {
    console.error('[Vehicles POST Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
