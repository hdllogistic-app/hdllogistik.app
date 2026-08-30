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

    const customers = await prisma.customer.findMany({
      where: { active: true },
      select: {
        id: true,
        customerCode: true,
        name: true,
        phone: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('[Customer Search API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pelanggan.' },
      { status: 500 }
    );
  }
}
