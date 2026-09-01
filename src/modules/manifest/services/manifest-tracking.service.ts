import { prisma } from '@/lib/prisma';
import { sanitizeResiNumber } from '@/modules/delivery/services/driver-scan-assignment.service';
import { PENDING_REASON_MAP } from '@/modules/delivery/services/driver-delivery.service';

export async function getManifestTrackingService(rawResiNumber: string) {
  try {
    const resiNumber = sanitizeResiNumber(rawResiNumber);
    if (!resiNumber) {
      return { success: false, error: 'Nomor resi wajib diisi.' };
    }

    const manifest = await prisma.manifest
      .findUnique({
        where: { resiNumber },
        include: {
          customer: {
            select: { name: true, phone: true },
          },
          delivery: {
            include: {
              assignments: {
                include: {
                  driver: {
                    select: { id: true, fullName: true, employeeCode: true },
                  },
                },
                orderBy: { assignedAt: 'asc' },
              },
              events: {
                include: {
                  actor: {
                    select: { name: true, employee: { select: { fullName: true } } },
                  },
                },
                orderBy: { timestamp: 'desc' },
              },
              proof: true,
            },
          },
        },
      })
      .catch(() => null);

    if (!manifest) {
      return {
        success: false,
        notFound: true,
        error: `Nomor resi ${resiNumber} tidak ditemukan.`,
      };
    }

    // 1. Sender & Recipient Information
    const sender = {
      name: manifest.senderName,
      phone: manifest.senderPhone,
      area: '-',
      address: manifest.senderAddress,
    };

    const recipient = {
      name: manifest.recipientName,
      phone: manifest.recipientPhone,
      area: manifest.recipientProvinceArea,
      address: manifest.recipientAddress,
      shareLocationUrl: manifest.shareLocationUrl || null,
    };

    // 2. Summary Card
    const summary = {
      resiNumber: manifest.resiNumber,
      customerName: manifest.customer?.name || manifest.senderName || 'Customer Umum',
      itemName: manifest.itemName,
      weightKg: manifest.weightKg.toNumber(),
      koliCount: manifest.koliCount,
      billingType: manifest.paymentDeliveryMethod || manifest.billingMode || 'CASH',
      codAmount: manifest.codAmount ? manifest.codAmount.toNumber() : null,
      createdAt: manifest.createdAt.toISOString(),
    };

    // 3. Current Status & Active Driver Attributions
    const delivery = manifest.delivery;
    const assignments = delivery?.assignments || [];
    const events = delivery?.events || [];
    const proof = delivery?.proof || null;

    const activeAssignment = assignments.find((a) => a.unassignedAt === null) || assignments[assignments.length - 1];
    const currentDriverName = activeAssignment ? activeAssignment.driver.fullName : null;
    const currentStatus = delivery ? delivery.status : 'READY';

    let lastUpdatedAt = manifest.createdAt.toISOString();
    if (events.length > 0) {
      lastUpdatedAt = events[0].timestamp.toISOString();
    } else if (delivery?.updatedAt) {
      lastUpdatedAt = delivery.updatedAt.toISOString();
    }

    // Status Title Translation Map
    const statusTitleMap: Record<string, string> = {
      READY: 'MANIFEST DIBUAT',
      ASSIGNED: 'DIJADWALKAN UNTUK DELIVERY',
      IN_DELIVERY: 'DALAM PENGIRIMAN',
      PENDING: 'DELIVERY PENDING',
      SUCCESS: 'SUDAH TTD / SERAH TERIMA BERHASIL',
      CANCELLED: 'DIBATALKAN / VOID',
    };

    let pendingReasonTitle = null;
    if (delivery?.pendingReason) {
      pendingReasonTitle = PENDING_REASON_MAP[delivery.pendingReason] || delivery.pendingReason;
    }

    // 4. Progress Stages (4 Horizontal Expedition Stages)
    const isScheduled = assignments.length > 0;
    const isInDelivery = !!(delivery && delivery.status !== 'READY');
    const isSuccess = !!(delivery && (delivery.status === 'SUCCESS' || proof));
    const isPending = !!(delivery && delivery.status === 'PENDING');

    const progressStages = [
      {
        id: 'STAGE_CREATED',
        label: 'MANIFEST DIBUAT',
        completed: true,
        active: !isScheduled,
        timestamp: manifest.createdAt.toISOString(),
      },
      {
        id: 'STAGE_SCHEDULED',
        label: 'DIJADWALKAN',
        completed: isScheduled,
        active: isScheduled && !isSuccess && currentStatus === 'ASSIGNED',
        timestamp: assignments.length > 0 ? assignments[0].assignedAt.toISOString() : null,
      },
      {
        id: 'STAGE_DELIVERY',
        label: 'DALAM PENGIRIMAN',
        completed: isInDelivery,
        active: isInDelivery && !isSuccess,
        isPending,
        pendingReasonTitle,
        timestamp: delivery?.updatedAt ? delivery.updatedAt.toISOString() : null,
      },
      {
        id: 'STAGE_SUCCESS',
        label: 'TANDA TERIMA',
        completed: isSuccess,
        active: isSuccess,
        timestamp: proof?.receivedAt ? proof.receivedAt.toISOString() : null,
      },
    ];

    // 5. Timeline Events Construction (Chronological Descending - Newest First)
    const timeline: Array<{
      id: string;
      title: string;
      description: string;
      notes?: string | null;
      timestamp: string;
      type: 'CREATED' | 'SCHEDULED' | 'IN_DELIVERY' | 'PENDING' | 'SUCCESS' | 'CANCELLED';
      driverName?: string | null;
      pendingReasonTitle?: string | null;
    }> = [];

    // Add DeliveryProof Event if SUCCESS
    if (proof) {
      timeline.push({
        id: `proof-${proof.id}`,
        title: 'TANDA TERIMA BERHASIL (SUCCESS)',
        description: `Serah terima paket berhasil kepada: ${proof.actualRecipientName}`,
        notes: null,
        timestamp: proof.receivedAt.toISOString(),
        type: 'SUCCESS',
        driverName: currentDriverName,
      });
    }

    // Add DeliveryEvent records
    for (const ev of events) {
      let type: 'CREATED' | 'SCHEDULED' | 'IN_DELIVERY' | 'PENDING' | 'SUCCESS' | 'CANCELLED' = 'IN_DELIVERY';
      if (ev.status === 'PENDING') type = 'PENDING';
      else if (ev.status === 'SUCCESS') type = 'SUCCESS';
      else if (ev.status === 'ASSIGNED') type = 'SCHEDULED';
      else if (ev.status === 'CANCELLED') type = 'CANCELLED';

      let evReasonTitle = null;
      if (type === 'PENDING' && delivery?.pendingReason) {
        evReasonTitle = PENDING_REASON_MAP[delivery.pendingReason] || delivery.pendingReason;
      }

      timeline.push({
        id: ev.id,
        title: statusTitleMap[ev.status] || ev.status,
        description: ev.notes || 'Pembaruan status operasional pengiriman.',
        notes: ev.notes || null,
        timestamp: ev.timestamp.toISOString(),
        type,
        driverName: ev.actor?.employee?.fullName || ev.actor?.name || currentDriverName,
        pendingReasonTitle: evReasonTitle,
      });
    }

    // Add Assignment records if not already represented
    for (let i = assignments.length - 1; i >= 0; i--) {
      const a = assignments[i];
      const hasDuplicateEvent = timeline.some(
        (t) => t.type === 'SCHEDULED' && Math.abs(new Date(t.timestamp).getTime() - a.assignedAt.getTime()) < 5000
      );
      if (!hasDuplicateEvent) {
        timeline.push({
          id: `assignment-${a.id}`,
          title: 'PAKET DIJADWALKAN KE DRIVER',
          description: `Paket dijadwalkan kepada driver: ${a.driver.fullName}`,
          notes: a.unassignedAt ? `Telah dialihkan pada ${new Date(a.unassignedAt).toLocaleDateString('id-ID')}` : null,
          timestamp: a.assignedAt.toISOString(),
          type: 'SCHEDULED',
          driverName: a.driver.fullName,
        });
      }
    }

    // Add Foundational Manifest Created Event
    timeline.push({
      id: `manifest-${manifest.id}`,
      title: 'MANIFEST DIBUAT',
      description: 'Resi dan data paket dibuat di HDL LOGISTIK.',
      notes: null,
      timestamp: manifest.createdAt.toISOString(),
      type: 'CREATED',
      driverName: null,
    });

    // Sort timeline descending (newest timestamp first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      success: true,
      data: {
        summary,
        sender,
        recipient,
        currentStatus: {
          code: currentStatus,
          title: statusTitleMap[currentStatus] || currentStatus,
          driverName: currentDriverName || '-',
          lastUpdatedAt,
          area: manifest.recipientProvinceArea,
          isPending,
          pendingReasonTitle,
        },
        progressStages,
        timeline,
        proof: proof
          ? {
              id: proof.id,
              deliveryId: delivery!.id,
              actualRecipientName: proof.actualRecipientName,
              receivedAt: proof.receivedAt.toISOString(),
              driverName: currentDriverName,
            }
          : null,
      },
    };
  } catch (err) {
    console.error('[Get Manifest Tracking Service Error]', err);
    return { success: false, error: 'Gagal mengambil data tracking manifest.' };
  }
}
