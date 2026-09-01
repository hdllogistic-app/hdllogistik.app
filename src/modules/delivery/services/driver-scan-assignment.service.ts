import { prisma } from '@/lib/prisma';
import { PENDING_REASON_MAP } from './driver-delivery.service';

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
    let previousDriverName = activeAssignment ? activeAssignment.driver.fullName : null;

    if (activeAssignment) {
      if (activeAssignment.driverId === driverEmployeeId) {
        isAssignedToSelf = true;
      } else {
        isAssignedToOther = true;
        otherDriverName = activeAssignment.driver.fullName;
      }
    }

    let isEligibleForScan = false;
    let isPendingRescan = false;
    let lastPendingReasonTitle = null;
    let statusMessage = '';

    if (status === 'SUCCESS' || hasProof) {
      statusMessage = 'Paket ini sudah selesai tanda terima (SUCCESS).';
    } else if (status === 'CANCELLED') {
      statusMessage = 'Paket ini sudah dibatalkan/void (CANCELLED).';
    } else if (status === 'PENDING') {
      isEligibleForScan = true;
      isPendingRescan = true;
      if (delivery.pendingReason) {
        lastPendingReasonTitle =
          PENDING_REASON_MAP[delivery.pendingReason] || delivery.pendingReason;
      }
      if (isAssignedToSelf) {
        statusMessage = 'Paket PENDING terdeteksi. Mulai delivery ulang untuk paket ini.';
      } else {
        statusMessage = `Paket PENDING terdeteksi (sebelumnya: ${
          previousDriverName || 'Driver Lain'
        }). Jadwalkan delivery ulang ke Anda.`;
      }
    } else if (status === 'READY') {
      isEligibleForScan = true;
      statusMessage = 'Paket siap dijadwalkan ke Anda.';
    } else if (isAssignedToSelf) {
      statusMessage = 'Paket ini sudah ada di Delivery Anda.';
    } else if (isAssignedToOther) {
      statusMessage = `Paket ini sedang dijadwalkan ke driver lain (${otherDriverName}).`;
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
      isPendingRescan,
      lastPendingReasonTitle,
      previousDriverName,
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

    // Reject SUCCESS or CANCELLED
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

    // Check ordinary active assignment (non-Pending)
    if (delivery.status !== 'PENDING' && activeAssignment) {
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
          error: `Paket ini sedang dijadwalkan ke driver lain (${activeAssignment.driver.fullName}).`,
        };
      }
    }

    // Must be READY or PENDING for scan assignment
    if (delivery.status !== 'READY' && delivery.status !== 'PENDING') {
      return {
        success: false,
        error: `Status pengiriman saat ini (${delivery.status}) tidak dapat dijadwalkan.`,
      };
    }

    // Atomic transaction for self-scan / re-delivery assignment
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const currentDelivery = await tx.delivery.findUnique({
        where: { id: delivery.id },
        include: {
          assignments: {
            where: { unassignedAt: null },
          },
        },
      });

      if (!currentDelivery) {
        throw new Error('Data pengiriman tidak ditemukan.');
      }

      if (currentDelivery.status === 'SUCCESS' || currentDelivery.status === 'CANCELLED') {
        throw new Error('Paket telah selesai atau dibatalkan.');
      }

      // Close existing active assignment (if any)
      if (currentDelivery.assignments.length > 0) {
        await tx.deliveryAssignment.updateMany({
          where: {
            deliveryId: currentDelivery.id,
            unassignedAt: null,
          },
          data: {
            unassignedAt: now,
          },
        });
      }

      // Conditional update on Delivery (resets status to ASSIGNED, updates driverId, clears pending fields)
      const updatedDelivery = await tx.delivery.updateMany({
        where: {
          id: currentDelivery.id,
          status: { in: ['READY', 'PENDING', 'ASSIGNED', 'IN_DELIVERY'] },
        },
        data: {
          status: 'ASSIGNED',
          driverId: driverEmployeeId,
          pendingReason: null,
          pendingNotes: null,
          pendingAt: null,
        },
      });

      if (updatedDelivery.count === 0) {
        throw new Error('Paket baru saja dijadwalkan untuk pengiriman ulang oleh driver lain.');
      }

      // Create new DeliveryAssignment for this attempt with assignedAt = NOW
      const newAssignment = await tx.deliveryAssignment.create({
        data: {
          deliveryId: currentDelivery.id,
          manifestId: manifest.id,
          driverId: driverEmployeeId,
          assignedById: userId,
          source: 'OPS_SCAN',
          assignedAt: now,
        },
      });

      // Log event
      const eventNotes =
        currentDelivery.status === 'PENDING'
          ? currentDelivery.driverId === driverEmployeeId
            ? 'Mulai delivery ulang (Reaktivasi Paket Pending)'
            : 'Penugasan delivery ulang oleh Driver (Sebelumnya Pending)'
          : 'Self-scan assignment oleh Driver';

      await tx.deliveryEvent.create({
        data: {
          deliveryId: currentDelivery.id,
          status: 'ASSIGNED',
          notes: eventNotes,
          actorId: userId,
          timestamp: now,
        },
      });

      return newAssignment;
    });

    const isPendingReactivation = delivery.status === 'PENDING';
    const successMsg = isPendingReactivation
      ? `✓ PAKET MASUK DELIVERY: ${manifest.resiNumber}`
      : `✓ PAKET BERHASIL DIJADWALKAN: ${manifest.resiNumber}`;

    return {
      success: true,
      assignmentId: result.id,
      deliveryId: delivery.id,
      resiNumber: manifest.resiNumber,
      recipientName: manifest.recipientName,
      status: 'ASSIGNED',
      assignedAt: now.toISOString(),
      isPendingReactivation,
      message: successMsg,
    };
  } catch (err: any) {
    console.error('[Assign Resi To Driver Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal menjadwalkan paket.',
    };
  }
}
