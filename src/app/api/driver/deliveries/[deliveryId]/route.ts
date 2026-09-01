import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    const currentUser = await requireRole([USER_ROLES.DRIVER]);
    const driverEmployeeId = currentUser.employeeId;

    if (!driverEmployeeId) {
      return NextResponse.json({ success: false, error: 'Unauthenticated driver.' }, { status: 403 });
    }

    const { deliveryId } = await params;

    // Strict Data Isolation: Delivery must belong to current Driver
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        assignments: {
          some: {
            driverId: driverEmployeeId,
          },
        },
      },
      include: {
        manifest: {
          select: {
            resiNumber: true,
            recipientName: true,
            recipientPhone: true,
            recipientProvinceArea: true,
            recipientAddress: true,
            shareLocationUrl: true,
            itemName: true,
            weightKg: true,
            koliCount: true,
            notes: true,
          },
        },
        proof: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Detail delivery tidak ditemukan atau tidak milik Anda.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      delivery: {
        id: delivery.id,
        manifestId: delivery.manifestId,
        resiNumber: delivery.manifest.resiNumber,
        recipientName: delivery.manifest.recipientName,
        recipientPhone: delivery.manifest.recipientPhone,
        recipientArea: delivery.manifest.recipientProvinceArea,
        recipientAddress: delivery.manifest.recipientAddress,
        shareLocationUrl: delivery.manifest.shareLocationUrl || null,
        itemName: delivery.manifest.itemName,
        weightKg: delivery.manifest.weightKg.toNumber(),
        koliCount: delivery.manifest.koliCount,
        notes: delivery.manifest.notes,
        status: delivery.status,
        proof: delivery.proof
          ? {
              actualRecipientName: delivery.proof.actualRecipientName,
              receivedAt: delivery.proof.receivedAt.toISOString(),
              photoUrl: delivery.proof.photoUrl,
              signatureUrl: delivery.proof.signatureUrl,
              notes: delivery.proof.notes,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('GET /api/driver/deliveries/[deliveryId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail delivery.' },
      { status: 500 }
    );
  }
}
