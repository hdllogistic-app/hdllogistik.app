import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getManifestTrackingService } from '@/modules/manifest/services/manifest-tracking.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict DAL Check: OWNER, ADMIN, OPS, FINANCE permitted to track manifests
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { searchParams } = new URL(request.url);
    const resiParam = searchParams.get('resi') || '';

    if (!resiParam.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor resi wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await getManifestTrackingService(resiParam);

    if (!result.success) {
      return NextResponse.json(
        { success: false, notFound: result.notFound, error: result.error },
        { status: result.notFound ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('GET /api/manifests/check Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses pencarian resi manifest.' },
      { status: 500 }
    );
  }
}
