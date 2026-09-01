import { prisma } from '@/lib/prisma';

export const PENDING_REASON_MAP: Record<string, string> = {
  RESCHEDULE: 'Reschedule',
  RECIPIENT_UNREACHABLE: 'Penerima Tidak Bisa Dihubungi',
  RECIPIENT_REQUEST_RETURN: 'Penerima Meminta Retur',
  RECIPIENT_REJECTED: 'Penerima Menolak',
  OTHER: 'Lainnya',
};

export function getJakartaDateBounds(dateStr?: string) {
  let year: number;
  let month: number;
  let day: number;

  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    year = jkt.getFullYear();
    month = jkt.getMonth() + 1;
    day = jkt.getDate();
  }

  const formattedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));

  return { formattedDateStr, startUtc, endUtc };
}

export async function getDriverDeliveriesService(
  driverEmployeeId: string,
  dateStr?: string,
  filterTab: 'all' | 'delivery' | 'success' | 'pending' = 'all'
) {
  try {
    const { formattedDateStr, startUtc, endUtc } = getJakartaDateBounds(dateStr);

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        driverId: driverEmployeeId,
        assignedAt: {
          gte: startUtc,
          lte: endUtc,
        },
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

    let actionableCount = 0;
    let successCount = 0;
    let pendingCount = 0;

    const allMapped = assignments.map((a) => {
      const status = a.delivery.status;
      const hasProof = !!a.delivery.proof;

      // MUTUALLY EXCLUSIVE CLASSIFICATION:
      // 1. SUCCESS: status is SUCCESS or has DeliveryProof
      // 2. PENDING: not SUCCESS and status is PENDING
      // 3. ACTIONABLE DELIVERY: not SUCCESS, not PENDING, not CANCELLED (e.g. ASSIGNED/IN_DELIVERY)
      const isSuccess = status === 'SUCCESS' || hasProof;
      const isPending = !isSuccess && status === 'PENDING';
      const isActionable = !isSuccess && !isPending && status !== 'CANCELLED';

      if (isSuccess) successCount++;
      else if (isPending) pendingCount++;
      else if (isActionable) actionableCount++;

      let pendingReasonTitle = null;
      if (a.delivery.pendingReason) {
        pendingReasonTitle = PENDING_REASON_MAP[a.delivery.pendingReason] || a.delivery.pendingReason;
      }

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
        pendingReason: a.delivery.pendingReason,
        pendingReasonTitle,
        pendingNotes: a.delivery.pendingNotes,
        pendingAt: a.delivery.pendingAt ? a.delivery.pendingAt.toISOString() : null,
        assignedAt: a.assignedAt.toISOString(),
        hasProof,
        isSuccess,
        isPending,
        isActionable,
      };
    });

    let filteredItems = allMapped;
    if (filterTab === 'success') {
      filteredItems = allMapped.filter((item) => item.isSuccess);
    } else if (filterTab === 'pending') {
      filteredItems = allMapped.filter((item) => item.isPending);
    } else {
      // Default ('all' / 'delivery') tab: Contains ONLY actionable deliveries still needing action
      filteredItems = allMapped.filter((item) => item.isActionable);
    }

    return {
      success: true,
      selectedDate: formattedDateStr,
      summary: {
        totalDeliveries: assignments.length,
        totalPackages: assignments.length,
        deliveryCount: actionableCount,
        successCount,
        pendingCount,
      },
      deliveries: filteredItems,
    };
  } catch (err) {
    console.error('[Get Driver Deliveries Service Error]', err);
    return { success: false, error: 'Gagal mengambil daftar pengiriman driver.' };
  }
}

export async function processDeliveryPendingService(
  driverEmployeeId: string,
  deliveryId: string,
  reasonCode: string,
  customReasonText?: string
) {
  try {
    if (!deliveryId) {
      return { success: false, error: 'ID Pengiriman wajib diisi.' };
    }
    if (!reasonCode || !PENDING_REASON_MAP[reasonCode]) {
      return { success: false, error: 'Alasan pending wajib dipilih dari pilihan yang tersedia.' };
    }

    const reasonTitle = PENDING_REASON_MAP[reasonCode];
    const notesClean = customReasonText ? customReasonText.trim() : '';

    if (reasonCode === 'OTHER' && !notesClean) {
      return { success: false, error: 'Alasan Lainnya wajib diisi.' };
    }
    if (notesClean.length > 250) {
      return { success: false, error: 'Alasan terlalu panjang (maksimal 250 karakter).' };
    }

    // Query Delivery & check ownership
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        manifest: { select: { resiNumber: true, recipientName: true } },
        assignments: { where: { unassignedAt: null }, orderBy: { assignedAt: 'desc' }, take: 1 },
        events: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    if (!delivery) {
      return { success: false, error: 'Data pengiriman tidak ditemukan.' };
    }

    const activeAssign = delivery.assignments[0];
    const isAssignedDriver = delivery.driverId === driverEmployeeId || (activeAssign && activeAssign.driverId === driverEmployeeId);

    if (!isAssignedDriver) {
      return { success: false, error: 'Tugas pengiriman ini tidak ditugaskan kepada Anda.' };
    }

    if (delivery.status === 'SUCCESS') {
      return { success: false, error: 'Pengiriman ini sudah SUCCESS dan tidak dapat diubah menjadi Pending.' };
    }
    if (delivery.status === 'CANCELLED') {
      return { success: false, error: 'Pengiriman ini sudah dibatalkan/void.' };
    }

    // Concurrency protection: If same pending reason registered in last 30 seconds, prevent duplicate submit
    const latestEvent = delivery.events[0];
    const now = new Date();
    if (
      latestEvent &&
      latestEvent.status === 'PENDING' &&
      delivery.pendingReason === reasonCode &&
      now.getTime() - latestEvent.timestamp.getTime() < 30000
    ) {
      return {
        success: true,
        deliveryId,
        status: 'PENDING',
        reasonTitle,
        pendingAt: delivery.pendingAt ? delivery.pendingAt.toISOString() : now.toISOString(),
        message: 'Status Pending sudah dicatat.',
      };
    }

    const eventNotes = `PENDING: ${reasonTitle}${notesClean ? ' - ' + notesClean : ''}`;

    const updated = await prisma.$transaction(async (tx) => {
      const del = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PENDING',
          pendingReason: reasonCode,
          pendingNotes: notesClean || null,
          pendingAt: now,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          status: 'PENDING',
          notes: eventNotes,
        },
      });

      return del;
    });

    return {
      success: true,
      deliveryId: updated.id,
      status: updated.status,
      reasonCode: updated.pendingReason,
      reasonTitle,
      notes: updated.pendingNotes,
      pendingAt: updated.pendingAt ? updated.pendingAt.toISOString() : now.toISOString(),
      message: `Delivery Pending Berhasil Dicatat untuk Resi ${delivery.manifest.resiNumber}!`,
    };
  } catch (err: any) {
    console.error('[Process Delivery Pending Error]', err);
    return { success: false, error: err.message || 'Gagal mencatat delivery pending.' };
  }
}
