import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { getPresignedProofUrl, isR2Configured } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adjustmentId: string }> }
) {
  try {
    // Authenticated roles only: OWNER, ADMIN, FINANCE.
    // Denied for OPS & DRIVER.
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
    ]);

    const { adjustmentId } = await params;
    const adjustment = await prisma.manifestPaymentAdjustment.findUnique({
      where: { id: adjustmentId },
      select: { transferProofObjectKey: true },
    });

    if (!adjustment || !adjustment.transferProofObjectKey) {
      return NextResponse.json(
        { success: false, error: 'Bukti transfer tidak ditemukan untuk adjustment ini.' },
        { status: 404 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudflare R2 belum dikonfigurasi pada environment server.',
          isR2Missing: true,
        },
        { status: 503 }
      );
    }

    const res = await getPresignedProofUrl(adjustment.transferProofObjectKey, 300); // 5-minute expiry
    if (!res.success || !res.url) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: res.url });
  } catch (error: any) {
    console.error('GET /api/finance/payment/proof/[adjustmentId] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat bukti transfer.' },
      { status: 500 }
    );
  }
}
