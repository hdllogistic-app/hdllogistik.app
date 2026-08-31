import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const records = await prisma.manifest.findMany({
      select: {
        recipientProvinceArea: true,
      },
      distinct: ['recipientProvinceArea'],
      orderBy: {
        recipientProvinceArea: 'asc',
      },
    });

    const areas = records
      .map((r) => r.recipientProvinceArea)
      .filter((a) => a && a.trim() !== '');

    return NextResponse.json({ success: true, areas });
  } catch (error) {
    console.error('[Manifest Areas API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar wilayah tujuan.' },
      { status: 500 }
    );
  }
}
