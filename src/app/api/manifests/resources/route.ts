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

    // Active DRIVER Employees
    const drivers = await prisma.employee.findMany({
      where: {
        division: 'DRIVER',
        active: true,
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Active Vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        plateNumber: true,
        nameType: true,
      },
      orderBy: {
        plateNumber: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      drivers,
      vehicles,
    });
  } catch (error) {
    console.error('[Scheduling Resources API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data driver dan kendaraan.' },
      { status: 500 }
    );
  }
}
