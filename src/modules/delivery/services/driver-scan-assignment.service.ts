import { prisma } from '@/lib/prisma';

export function sanitizeResiNumber(rawInput?: string | null): string {
  if (!rawInput) return '';
  // Trim whitespace and keep alphanumeric characters, hyphens only
  return rawInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export async function lookupResiForScanService(
  driverEmployeeId: string,
  rawResiNumber: string
) {
  try {
    const resiNumber = sanitizeResiNumber(rawResiNumber);
    if (!resiNumber) {
      return { success: false, error: 'Nomor resi wajib diisi.' };
    }

    const manifest = await prisma.manifest.findUnique({
      where: { resiNumber },
      include: {
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
              orderBy: { assignedAt: 'desc' },
              take: 1,
              include: { driver: true },
            },
            proof: true,
          },
        },
      },
    });

    if (!manifest || !manifest.delivery) {
      return {
        success: false,
        notFound: true,
        error: `Nomor resi ${resiNumber} tidak ditemukan di HDL LOGISTIK.`,
      };
    }

    const delivery = manifest.delivery;
    const activeAssignment = delivery.assignments[0];
    const hasProof = !!delivery.proof;
    const status = delivery.status;

    let isAssignedToSelf = false;
    let isAssignedToOther = false;
    let otherDriverName = null;

    if (activeAssignment) {
      if (activeAssignment.driverId === driverEmployeeId) {
        isAssignedToSelf = true;
      } else {
        isAssignedToOther = true;
        otherDriverName = activeAssignment.driver.fullName;
      }
    }

    let isEligibleForScan = false;
    let statusMessage = '';

    if (status === 'SUCCESS' || hasProof) {
      statusMessage = 'Paket ini sudah selesai tanda terima (SUCCESS).';
    } else if (status === 'CANCELLED') {
      statusMessage = 'Paket ini sudah dibatalkan (CANCELLED).';
    } else if (isAssignedToSelf) {
      statusMessage = 'Paket ini sudah ada di Delivery Anda.';
    } else if (isAssignedToOther) {
      statusMessage = `Paket ini sudah dijadwalkan ke driver lain (${otherDriverName}).`;
    } else if (status === 'PENDING') {
      statusMessage = 'Paket ini saat ini berstatus PENDING.';
    } else if (status === 'READY') {
      isEligibleForScan = true;
      statusMessage = 'Paket siap dijadwalkan ke Anda.';
    } else {
      statusMessage = `Status pengiriman: ${status}`;
    }

    return {
      success: true,
      resiNumber: manifest.resiNumber,
      deliveryId: delivery.id,
      manifestId: manifest.id,
      recipientName: manifest.recipientName,
      recipientArea: manifest.recipientProvinceArea,
      recipientAddress: manifest.recipientAddress,
      itemName: manifest.itemName,
      weightKg: manifest.weightKg.toNumber(),
      koliCount: manifest.koliCount,
      status: delivery.status,
      isEligibleForScan,
      isAssignedToSelf,
      isAssignedToOther,
      otherDriverName,
      statusMessage,
    };
  } catch (err) {
    console.error('[Lookup Resi For Scan Error]', err);
    return { success: false, error: 'Gagal mencari data resi.' };
  }
}

export async function assignResiToDriverService(
  driverEmployeeId: string,
  userId: string,
  rawResiNumber: string
) {
  try {
    const resiNumber = sanitizeResiNumber(rawResiNumber);
    if (!resiNumber) {
      return { success: false, error: 'Nomor resi wajib diisi.' };
    }

    const manifest = await prisma.manifest.findUnique({
      where: { resiNumber },
      include: {
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
              orderBy: { assignedAt: 'desc' },
              take: 1,
              include: { driver: true },
            },
            proof: true,
          },
        },
      },
    });

    if (!manifest || !manifest.delivery) {
      return {
        success: false,
        notFound: true,
        error: `Nomor resi ${resiNumber} tidak ditemukan di HDL LOGISTIK.`,
      };
    }

    const delivery = manifest.delivery;
    const activeAssignment = delivery.assignments[0];

    // Check SUCCESS / CANCELLED
    if (delivery.status === 'SUCCESS' || delivery.proof) {
      return {
        success: false,
        alreadyCompleted: true,
        deliveryId: delivery.id,
        error: 'Paket ini sudah selesai tanda terima.',
      };
    }
    if (delivery.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Paket ini sudah dibatalkan/void.',
      };
    }

    // Check existing assignment
    if (activeAssignment) {
      if (activeAssignment.driverId === driverEmployeeId) {
        return {
          success: true,
          alreadyAssignedToSelf: true,
          deliveryId: delivery.id,
          resiNumber: manifest.resiNumber,
          recipientName: manifest.recipientName,
          message: 'Paket ini sudah ada di Delivery Anda.',
        };
      } else {
        return {
          success: false,
          error: `Paket ini sudah dijadwalkan ke driver lain (${activeAssignment.driver.fullName}).`,
        };
      }
    }

    // Must be READY for new assignment
    if (delivery.status !== 'READY') {
      return {
        success: false,
        error: `Status pengiriman saat ini (${delivery.status}) tidak dapat dijadwalkan.`,
      };
    }

    // Atomic transaction for self-scan assignment
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // Conditional update for double-scan concurrency protection
      const updatedDelivery = await tx.delivery.updateMany({
        where: {
          id: delivery.id,
          status: 'READY',
        },
        data: {
          status: 'ASSIGNED',
          driverId: driverEmployeeId,
        },
      });

      if (updatedDelivery.count === 0) {
        throw new Error('Paket baru saja dijadwalkan ke driver lain.');
      }

      const assignment = await tx.deliveryAssignment.create({
        data: {
          deliveryId: delivery.id,
          manifestId: manifest.id,
          driverId: driverEmployeeId,
          assignedById: userId,
          source: 'OPS_SCAN',
          assignedAt: now,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          status: 'ASSIGNED',
          notes: 'Self-scan assignment oleh Driver',
          actorId: userId,
          timestamp: now,
        },
      });

      return assignment;
    });

    return {
      success: true,
      assignmentId: result.id,
      deliveryId: delivery.id,
      resiNumber: manifest.resiNumber,
      recipientName: manifest.recipientName,
      status: 'ASSIGNED',
      assignedAt: now.toISOString(),
      message: `✓ PAKET BERHASIL DIJADWALKAN: ${manifest.resiNumber}`,
    };
  } catch (err: any) {
    console.error('[Assign Resi To Driver Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal menjadwalkan paket.',
    };
  }
}
