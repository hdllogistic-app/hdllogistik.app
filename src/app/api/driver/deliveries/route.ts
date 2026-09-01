import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { getJakartaDateInfo } from '@/modules/manifest/utils/resi-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict DAL Check: Must be authenticated user with DRIVER role
    const currentUser = await requireRole([USER_ROLES.DRIVER]);

    // 2. Strict Data Isolation: employeeId is derived ONLY from verified session
    const driverEmployeeId = currentUser.employeeId;
    if (!driverEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Akun ini tidak terhubung dengan data Driver.' },
        { status: 403 }
      );
    }

    const { businessDate } = getJakartaDateInfo();

    // 3. Query active delivery assignments for this Driver
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        driverId: driverEmployeeId,
      },
      include: {
        delivery: {
          include: {
            manifest: {
              select: {
                resiNumber: true,
                recipientName: true,
                recipientPhone: true,
                recipientProvinceArea: true,
                recipientAddress: true,
                shareLocationUrl: true,
                weightKg: true,
                koliCount: true,
                itemName: true,
              },
            },
            proof: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    let totalDeliveries = assignments.length;
    let successCount = 0;
    let pendingCount = 0;

    const items = assignments.map((a) => {
      const status = a.delivery.status;
      if (status === 'SUCCESS') successCount++;
      else if (status !== 'CANCELLED') pendingCount++;

      return {
        deliveryId: a.delivery.id,
        manifestId: a.delivery.manifestId,
        resiNumber: a.delivery.manifest.resiNumber,
        recipientName: a.delivery.manifest.recipientName,
        recipientPhone: a.delivery.manifest.recipientPhone,
        recipientArea: a.delivery.manifest.recipientProvinceArea,
        recipientAddress: a.delivery.manifest.recipientAddress,
        shareLocationUrl: a.delivery.manifest.shareLocationUrl || null,
        itemName: a.delivery.manifest.itemName,
        weightKg: a.delivery.manifest.weightKg.toNumber(),
        koliCount: a.delivery.manifest.koliCount,
        status,
        assignedAt: a.assignedAt.toISOString(),
        hasProof: !!a.delivery.proof,
      };
    });

    return NextResponse.json({
      success: true,
      driverName: currentUser.employeeName,
      date: businessDate.toISOString().split('T')[0],
      summary: {
        totalDeliveries,
        successCount,
        pendingCount,
      },
      deliveries: items,
    });
  } catch (error) {
    console.error('GET /api/driver/deliveries Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar penugasan delivery.' },
      { status: 500 }
    );
  }
}
