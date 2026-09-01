import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const bulkScheduleSchema = z.object({
  area: z.string().trim().optional(),
  manifestIds: z.array(z.string().uuid('ID Manifest tidak valid.')).min(1, 'Pilih minimal 1 manifest untuk dijadwalkan.'),
  driverId: z.string().uuid('Pilihan Driver tidak valid.'),
  vehicleId: z.string().uuid('Pilihan Kendaraan tidak valid.'),
});

export type BulkScheduleInput = z.infer<typeof bulkScheduleSchema>;

export interface BulkScheduleResult {
  success: boolean;
  scheduledCount?: number;
  driverName?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  error?: string;
}

/**
 * Domain Service for Bulk Scheduling Manifests to Driver & Vehicle (V1.2 Flexible Multi-Area).
 * - Enforces server-side revalidation of Driver & Vehicle active status.
 * - Supports multi-area batches across different destination areas.
 * - Enforces strict DeliveryStatus.READY eligibility and rejects batch if ANY active assignment exists.
 * - Uses atomic conditional state transitions (updateMany) inside 1 transaction for concurrency safety.
 */
export async function bulkScheduleManifestsService(
  rawInput: BulkScheduleInput,
  actorUserId: string
): Promise<BulkScheduleResult> {
  const parseResult = bulkScheduleSchema.safeParse(rawInput);

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Data input penjadwalan tidak valid.';
    return {
      success: false,
      error: firstError,
    };
  }

  const input = parseResult.data;

  try {
    // 1. Revalidate Active Driver
    const driver = await prisma.employee.findFirst({
      where: {
        id: input.driverId,
        active: true,
        division: 'DRIVER',
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
      },
    });

    if (!driver) {
      return {
        success: false,
        error: 'Driver yang dipilih tidak valid atau tidak aktif.',
      };
    }

    // 2. Revalidate Active Vehicle
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        active: true,
      },
      select: {
        id: true,
        plateNumber: true,
        nameType: true,
      },
    });

    if (!vehicle) {
      return {
        success: false,
        error: 'Kendaraan yang dipilih tidak valid atau tidak aktif.',
      };
    }

    // 3. Revalidate Selected Manifests State
    const manifests = await prisma.manifest.findMany({
      where: {
        id: { in: input.manifestIds },
      },
      include: {
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
            },
          },
        },
      },
    });

    if (manifests.length !== input.manifestIds.length) {
      return {
        success: false,
        error: 'Satu atau lebih manifest yang dipilih tidak ditemukan di database.',
      };
    }

    for (const m of manifests) {
      // Delivery Status Eligibility
      if (!m.delivery || m.delivery.status !== 'READY') {
        const currentStatus = m.delivery?.status || 'UNKNOWN';
        return {
          success: false,
          error: `Manifest ${m.resiNumber} berstatus ${currentStatus}. Hanya manifest berstatus READY yang dapat dijadwalkan.`,
        };
      }

      // Active Assignment Check (NO REASSIGNMENT IN BULK SCHEDULE)
      if (m.delivery.assignments.length > 0) {
        return {
          success: false,
          error: `Manifest ${m.resiNumber} sudah memiliki penugasan driver aktif. Gunakan Edit Penjadwalan untuk mengubah penugasan.`,
        };
      }
    }

    // 4. Atomic Concurrency-Safe Transaction
    const scheduledCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      const now = new Date();

      for (const m of manifests) {
        if (!m.delivery) continue;

        // Active Assignment Double Check inside transaction
        const activeCount = await tx.deliveryAssignment.count({
          where: {
            deliveryId: m.delivery.id,
            unassignedAt: null,
          },
        });

        if (activeCount > 0) {
          throw new Error(`CONCURRENCY_CONFLICT:${m.resiNumber}`);
        }

        // Atomic Conditional State Transition: ONLY update if status is still READY
        const updateResult = await tx.delivery.updateMany({
          where: {
            id: m.delivery.id,
            status: 'READY',
          },
          data: {
            status: 'ASSIGNED',
            driverId: driver.id,
          },
        });

        if (updateResult.count !== 1) {
          throw new Error(`CONCURRENCY_CONFLICT:${m.resiNumber}`);
        }

        // Create DeliveryAssignment history record with vehicleId
        await tx.deliveryAssignment.create({
          data: {
            deliveryId: m.delivery.id,
            manifestId: m.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            assignedById: actorUserId,
            source: 'DESKTOP_BATCH',
            assignedAt: now,
            unassignedAt: null,
          },
        });

        // Create AuditLog ASSIGN
        await tx.auditLog.create({
          data: {
            actorId: actorUserId,
            action: 'ASSIGN',
            entityType: 'MANIFEST',
            entityId: m.id,
            metadataJson: JSON.stringify({
              resiNumber: m.resiNumber,
              driverId: driver.id,
              driverName: driver.fullName,
              vehicleId: vehicle.id,
              vehiclePlate: vehicle.plateNumber,
              area: m.recipientProvinceArea,
            }),
          },
        });

        count++;
      }

      return count;
    });

    return {
      success: true,
      scheduledCount,
      driverName: driver.fullName,
      vehiclePlate: vehicle.plateNumber,
      vehicleType: vehicle.nameType,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CONCURRENCY_CONFLICT:')) {
      const resi = err.message.replace('CONCURRENCY_CONFLICT:', '');
      return {
        success: false,
        error: `Sebagian manifest (${resi}) sudah berubah status atau telah dijadwalkan oleh pengguna lain. Muat ulang data dan coba kembali.`,
      };
    }

    console.error('[Bulk Schedule Manifests Service Error]', err);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses penjadwalan batch.',
    };
  }
}
