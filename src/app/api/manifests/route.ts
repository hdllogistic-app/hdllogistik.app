import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { createManifestService } from '@/modules/manifest/services/create-manifest.service';
import { listManifestsService } from '@/modules/manifest/services/list-manifests.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // DAL Authorization: OWNER, ADMIN, OPS, and FINANCE are permitted to view list
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { searchParams } = new URL(request.url);

    const area = searchParams.get('area') || 'ALL';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 25;

    const result = await listManifestsService({
      area,
      search,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Manifest List API Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Same-Origin CSRF Protection
    if (!validateSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-origin request rejected.' },
        { status: 403 }
      );
    }

    // 2. Server-side DAL Authorization (OWNER, ADMIN, OPS allowed. FINANCE & DRIVER blocked)
    const user = await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
    ]);

    const body = await request.json();

    // 3. Delegate to Domain Service
    const result = await createManifestService(body, user.userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, manifest: result.manifest },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Manifest API Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
