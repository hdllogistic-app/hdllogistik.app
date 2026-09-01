import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const reassignDeliverySchema = z.object({
  driverId: z.string().uuid('Pilihan Driver tidak valid.'),
  vehicleId: z.string().uuid('Pilihan Kendaraan tidak valid.'),
});

export type ReassignDeliveryInput = z.infer<typeof reassignDeliverySchema>;

export interface ReassignDeliveryResult {
  success: boolean;
  driverName?: string;
  vehiclePlate?: string;
  error?: string;
}

export async function reassignDeliveryService(
  manifestId: string,
  rawInput: ReassignDeliveryInput,
  actorUserId: string
): Promise<ReassignDeliveryResult> {
  const parseResult = reassignDeliverySchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data input penugasan ulang tidak valid.',
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
        fullName: true,
      },
    });

    if (!driver) {
      return { success: false, error: 'Driver yang dipilih tidak valid atau tidak aktif.' };
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
      },
    });

    if (!vehicle) {
      return { success: false, error: 'Kendaraan yang dipilih tidak valid atau tidak aktif.' };
    }

    // 3. Revalidate Manifest & Delivery State
    const manifest = await prisma.manifest.findUnique({
      where: { id: manifestId },
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

    if (!manifest || !manifest.delivery) {
      return { success: false, error: 'Manifest atau data delivery tidak ditemukan.' };
    }

    if (manifest.status === 'VOID') {
      return { success: false, error: 'Manifest yang sudah di-void tidak dapat di-edit penjadwalannya.' };
    }

    if (manifest.delivery.status !== 'ASSIGNED') {
      return {
        success: false,
        error: `Hanya penugasan berstatus ASSIGNED yang dapat di-edit. Status saat ini: ${manifest.delivery.status}.`,
      };
    }

    const currentAssignment = manifest.delivery.assignments[0];
    if (!currentAssignment) {
      return {
        success: false,
        error: 'Penugasan aktif tidak ditemukan. Silakan muat ulang data.',
      };
    }

    // Check No-Op
    if (currentAssignment.driverId === input.driverId && currentAssignment.vehicleId === input.vehicleId) {
      return {
        success: false,
        error: 'Tidak ada perubahan penjadwalan.',
      };
    }

    // 4. Atomic Concurrency-Safe Reassignment Transaction
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Concurrency Double Check
      const activeAssignment = await tx.deliveryAssignment.findFirst({
        where: {
          id: currentAssignment.id,
          unassignedAt: null,
        },
      });

      if (!activeAssignment) {
        throw new Error('CONCURRENCY_CONFLICT');
      }

      // Close current assignment
      await tx.deliveryAssignment.update({
        where: { id: currentAssignment.id },
        data: { unassignedAt: now },
      });

      // Create new assignment record
      await tx.deliveryAssignment.create({
        data: {
          deliveryId: manifest.delivery!.id,
          manifestId: manifest.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          assignedById: actorUserId,
          source: 'DESKTOP_BATCH',
          assignedAt: now,
          unassignedAt: null,
        },
      });

      // Update Delivery driverId
      await tx.delivery.update({
        where: { id: manifest.delivery!.id },
        data: { driverId: driver.id },
      });

      // AuditLog ASSIGN / UPDATE
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'ASSIGN',
          entityType: 'MANIFEST',
          entityId: manifest.id,
          metadataJson: JSON.stringify({
            resiNumber: manifest.resiNumber,
            reassignment: true,
            previousDriverId: currentAssignment.driverId,
            newDriverId: driver.id,
            previousVehicleId: currentAssignment.vehicleId,
            newVehicleId: vehicle.id,
          }),
        },
      });
    });

    return {
      success: true,
      driverName: driver.fullName,
      vehiclePlate: vehicle.plateNumber,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'CONCURRENCY_CONFLICT') {
      return {
        success: false,
        error: 'Penjadwalan telah berubah oleh pengguna lain. Muat ulang data dan coba kembali.',
      };
    }

    console.error('[Reassign Delivery Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengubah penugasan driver.',
    };
  }
}
