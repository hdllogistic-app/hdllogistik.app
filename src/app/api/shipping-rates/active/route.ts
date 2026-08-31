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
    ]);

    const activeRates = await prisma.shippingRate.findMany({
      where: { active: true },
      select: {
        id: true,
        province: true,
        city: true,
        ratePerKg: true,
      },
      orderBy: [
        { province: 'asc' },
        { city: 'asc' },
      ],
    });

    const rates = activeRates.map((r) => ({
      id: r.id,
      province: r.province,
      city: r.city,
      ratePerKg: r.ratePerKg.toNumber(),
    }));

    return NextResponse.json({
      success: true,
      rates,
    });
  } catch (error) {
    console.error('[Active Shipping Rates GET Error]', error);
    const message = error instanceof Error ? error.message : 'Akses ditolak atau terjadi kesalahan sistem.';
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
