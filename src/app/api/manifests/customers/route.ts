import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const customers = await prisma.customer.findMany({
      where: { active: true },
      select: {
        id: true,
        customerCode: true,
        name: true,
        phone: true,
        email: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        customerCode: c.customerCode,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        address: c.address,
      })),
    });
  } catch (error) {
    console.error('GET /api/manifests/customers Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar customer aktif.' },
      { status: 500 }
    );
  }
}
