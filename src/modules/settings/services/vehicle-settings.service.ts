import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export const createVehicleSchema = z.object({
  plateNumber: z.string().trim().min(1, 'Nomor polisi wajib diisi.'),
  nameType: z.string().trim().min(1, 'Jenis / nama kendaraan wajib diisi.'),
  notes: z.string().trim().optional(),
});

export const updateVehicleSchema = z.object({
  nameType: z.string().trim().min(1, 'Jenis / nama kendaraan wajib diisi.').optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().optional(),
});

export function normalizePlateNumber(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toUpperCase();
}

export interface ListVehiclesFilters {
  search?: string;
  status?: string;
}

export async function listVehiclesService(filters: ListVehiclesFilters) {
  try {
    const where: Prisma.VehicleWhereInput = {};

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { plateNumber: { contains: q, mode: 'insensitive' } },
        { nameType: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.status && filters.status !== 'ALL') {
      where.active = filters.status === 'ACTIVE';
    }

    const totalCount = await prisma.vehicle.count();
    const activeCount = await prisma.vehicle.count({ where: { active: true } });
    const inactiveCount = totalCount - activeCount;

    const records = await prisma.vehicle.findMany({
      where,
      orderBy: { plateNumber: 'asc' },
    });

    const vehicles = records.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      nameType: v.nameType,
      notes: v.notes || '',
      active: v.active,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    return {
      success: true,
      summary: {
        totalCount,
        activeCount,
        inactiveCount,
      },
      vehicles,
    };
  } catch (err) {
    console.error('[List Vehicles Error]', err);
    return {
      success: false,
      summary: { totalCount: 0, activeCount: 0, inactiveCount: 0 },
      vehicles: [],
      error: 'Gagal mengambil data armada kendaraan.',
    };
  }
}

export async function createVehicleService(
  rawInput: z.infer<typeof createVehicleSchema>,
  actorUserId: string
) {
  const parseResult = createVehicleSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data armada tidak valid.',
    };
  }

  const { plateNumber: rawPlate, nameType: rawName, notes } = parseResult.data;
  const plateNumber = normalizePlateNumber(rawPlate);
  const nameType = rawName.trim();

  try {
    // Unique Check for plateNumber
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber },
    });

    if (existing) {
      return {
        success: false,
        error: `Nomor polisi ${plateNumber} sudah terdaftar.`,
      };
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        plateNumber,
        nameType,
        notes: notes || null,
        active: true,
      },
    });

    // AuditLog CREATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'CREATE',
        entityType: 'VEHICLE',
        entityId: newVehicle.id,
        metadataJson: JSON.stringify({
          plateNumber,
          nameType,
          active: true,
        }),
      },
    });

    return {
      success: true,
      vehicle: {
        id: newVehicle.id,
        plateNumber: newVehicle.plateNumber,
        nameType: newVehicle.nameType,
        notes: newVehicle.notes || '',
        active: newVehicle.active,
      },
    };
  } catch (err) {
    console.error('[Create Vehicle Error]', err);
    return {
      success: false,
      error: 'Gagal menambahkan data armada kendaraan.',
    };
  }
}

export async function updateVehicleService(
  id: string,
  rawInput: z.infer<typeof updateVehicleSchema>,
  actorUserId: string
) {
  const parseResult = updateVehicleSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data update armada tidak valid.',
    };
  }

  const { nameType, notes, active } = parseResult.data;

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Data armada kendaraan tidak ditemukan.' };
    }

    const updateData: Prisma.VehicleUpdateInput = {};
    if (nameType !== undefined) updateData.nameType = nameType.trim();
    if (notes !== undefined) updateData.notes = notes.trim() || null;
    if (active !== undefined) updateData.active = active;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: updateData,
    });

    // AuditLog UPDATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'UPDATE',
        entityType: 'VEHICLE',
        entityId: updated.id,
        metadataJson: JSON.stringify({
          plateNumber: updated.plateNumber,
          nameType: updated.nameType,
          active: updated.active,
        }),
      },
    });

    return {
      success: true,
      vehicle: {
        id: updated.id,
        plateNumber: updated.plateNumber,
        nameType: updated.nameType,
        notes: updated.notes || '',
        active: updated.active,
      },
    };
  } catch (err) {
    console.error('[Update Vehicle Error]', err);
    return {
      success: false,
      error: 'Gagal memperbarui data armada kendaraan.',
    };
  }
}
