import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict DAL Check: Must be authenticated user with HELPER role
    const currentUser = await requireRole([USER_ROLES.HELPER]);

    // 2. Strict Data Isolation: employeeId is derived ONLY from verified session
    const helperEmployeeId = currentUser.employeeId;
    if (!helperEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Akun ini tidak terhubung dengan data Helper.' },
        { status: 403 }
      );
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: helperEmployeeId,
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
      helperName: currentUser.employeeName,
      attendances: items,
    });
  } catch (error) {
    console.error('GET /api/helper/attendance Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil riwayat absensi helper.' },
      { status: 500 }
    );
  }
}
