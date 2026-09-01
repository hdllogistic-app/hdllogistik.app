import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { getPresignedDeliveryProofUrl } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict DAL Check: Privileged roles only
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: 'deliveryId wajib diisi.' },
        { status: 400 }
      );
    }

    const proof = await prisma.deliveryProof.findUnique({
      where: { deliveryId },
    });

    if (!proof || !proof.photoUrl) {
      return NextResponse.json(
        { success: false, error: 'Foto bukti serah terima (POD) tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 2. Generate short-lived signed URL for private R2 bucket (expires in 5 minutes)
    const presignedResult = await getPresignedDeliveryProofUrl(proof.photoUrl, 300);

    if (!presignedResult.success || !presignedResult.url) {
      return NextResponse.json(
        { success: false, error: presignedResult.error || 'Gagal mengambil akses foto POD.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: presignedResult.url,
      actualRecipientName: proof.actualRecipientName,
      receivedAt: proof.receivedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/manifests/check/proof Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengunduh foto bukti TTD.' },
      { status: 500 }
    );
  }
}
