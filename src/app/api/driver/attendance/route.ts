import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireRole([USER_ROLES.DRIVER]);
    const driverEmployeeId = currentUser.employeeId;

    if (!driverEmployeeId) {
      return NextResponse.json({ success: false, error: 'Unauthenticated driver.' }, { status: 403 });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: driverEmployeeId,
      },
      include: {
        workLocation: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const items = attendances.map((a) => ({
      id: a.id,
      date: a.date.toISOString().split('T')[0],
      clockIn: a.clockIn.toISOString(),
      clockOut: a.clockOut ? a.clockOut.toISOString() : null,
      workLocationName: a.workLocation.name,
      status: a.status,
      notes: a.notes,
    }));

    return NextResponse.json({
      success: true,
      driverName: currentUser.employeeName,
      attendances: items,
    });
  } catch (error) {
    console.error('GET /api/driver/attendance Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil riwayat absensi driver.' },
      { status: 500 }
    );
  }
}
