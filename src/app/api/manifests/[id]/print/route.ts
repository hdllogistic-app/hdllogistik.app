import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // 1. CSRF Protection
    if (!validateSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-origin request rejected.' },
        { status: 403 }
      );
    }

    // 2. Server-side DAL Authorization (OWNER, ADMIN, OPS allowed)
    const user = await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
    ]);

    const { id } = await params;

    // 3. Verify Manifest existence
    const manifest = await prisma.manifest.findFirst({
      where: {
        OR: [{ id }, { resiNumber: id }],
      },
      select: {
        id: true,
        resiNumber: true,
      },
    });

    if (!manifest) {
      return NextResponse.json(
        { success: false, error: 'Manifest tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 4. Create ManifestPrintLog & AuditLog PRINT
    await prisma.$transaction([
      prisma.manifestPrintLog.create({
        data: {
          manifestId: manifest.id,
          printedById: user.userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'PRINT',
          entityType: 'MANIFEST',
          entityId: manifest.id,
          metadataJson: JSON.stringify({
            resiNumber: manifest.resiNumber,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Print logged successfully',
      resiNumber: manifest.resiNumber,
    });
  } catch (error) {
    console.error('[Manifest Print API Error]', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
