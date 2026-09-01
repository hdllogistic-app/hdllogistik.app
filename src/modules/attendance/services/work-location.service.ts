import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export interface CreateWorkLocationPayload {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active?: boolean;
}

export interface UpdateWorkLocationPayload {
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  active?: boolean;
}

export async function getWorkLocationsService(onlyActive = false) {
  try {
    const where: Prisma.WorkLocationWhereInput = onlyActive ? { active: true } : {};

    const locations = await prisma.workLocation.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Auto-seed default location if database has 0 locations
    if (locations.length === 0) {
      const defaultLoc = await prisma.workLocation.create({
        data: {
          name: 'Gudang Utama HDL',
          latitude: new Prisma.Decimal('-6.20000000'),
          longitude: new Prisma.Decimal('106.81666600'),
          radiusMeters: new Prisma.Decimal('100.00'),
          active: true,
        },
      });
      return {
        success: true,
        locations: [
          {
            id: defaultLoc.id,
            name: defaultLoc.name,
            latitude: defaultLoc.latitude.toNumber(),
            longitude: defaultLoc.longitude.toNumber(),
            radiusMeters: defaultLoc.radiusMeters.toNumber(),
            active: defaultLoc.active,
          },
        ],
      };
    }

    const items = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude.toNumber(),
      longitude: loc.longitude.toNumber(),
      radiusMeters: loc.radiusMeters.toNumber(),
      active: loc.active,
    }));

    return {
      success: true,
      locations: items,
    };
  } catch (err) {
    console.error('[Get Work Locations Service Error]', err);
    return { success: false, error: 'Gagal mengambil data lokasi absensi.' };
  }
}

export async function createWorkLocationService(
  payload: CreateWorkLocationPayload,
  userId: string
) {
  try {
    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: 'Nama lokasi wajib diisi.' };
    }
    if (payload.latitude === undefined || isNaN(payload.latitude)) {
      return { success: false, error: 'Latitude wajib diisi.' };
    }
    if (payload.longitude === undefined || isNaN(payload.longitude)) {
      return { success: false, error: 'Longitude wajib diisi.' };
    }
    if (!payload.radiusMeters || payload.radiusMeters <= 0) {
      return { success: false, error: 'Radius (meter) harus lebih besar dari 0.' };
    }

    const newLoc = await prisma.$transaction(async (tx) => {
      const loc = await tx.workLocation.create({
        data: {
          name: payload.name.trim(),
          latitude: new Prisma.Decimal(payload.latitude.toFixed(8)),
          longitude: new Prisma.Decimal(payload.longitude.toFixed(8)),
          radiusMeters: new Prisma.Decimal(payload.radiusMeters.toFixed(2)),
          active: payload.active !== undefined ? payload.active : true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'WorkLocation',
          entityId: loc.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            name: loc.name,
            latitude: payload.latitude,
            longitude: payload.longitude,
            radiusMeters: payload.radiusMeters,
          }),
        },
      });

      return loc;
    });

    return {
      success: true,
      location: {
        id: newLoc.id,
        name: newLoc.name,
        latitude: newLoc.latitude.toNumber(),
        longitude: newLoc.longitude.toNumber(),
        radiusMeters: newLoc.radiusMeters.toNumber(),
        active: newLoc.active,
      },
      message: `Lokasi absensi "${newLoc.name}" berhasil ditambahkan.`,
    };
  } catch (err: any) {
    console.error('[Create Work Location Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal menambahkan lokasi absensi baru.',
    };
  }
}

export async function updateWorkLocationService(
  locationId: string,
  payload: UpdateWorkLocationPayload,
  userId: string
) {
  try {
    const existing = await prisma.workLocation.findUnique({
      where: { id: locationId },
    });

    if (!existing) {
      return { success: false, error: 'Lokasi absensi tidak ditemukan.' };
    }

    const dataToUpdate: Prisma.WorkLocationUpdateInput = {};

    if (payload.name !== undefined) {
      if (!payload.name.trim()) return { success: false, error: 'Nama lokasi tidak boleh kosong.' };
      dataToUpdate.name = payload.name.trim();
    }
    if (payload.latitude !== undefined) {
      dataToUpdate.latitude = new Prisma.Decimal(payload.latitude.toFixed(8));
    }
    if (payload.longitude !== undefined) {
      dataToUpdate.longitude = new Prisma.Decimal(payload.longitude.toFixed(8));
    }
    if (payload.radiusMeters !== undefined) {
      if (payload.radiusMeters <= 0) return { success: false, error: 'Radius harus lebih besar dari 0.' };
      dataToUpdate.radiusMeters = new Prisma.Decimal(payload.radiusMeters.toFixed(2));
    }
    if (payload.active !== undefined) {
      dataToUpdate.active = payload.active;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const loc = await tx.workLocation.update({
        where: { id: locationId },
        data: dataToUpdate,
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'WorkLocation',
          entityId: loc.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            name: loc.name,
            updates: payload,
          }),
        },
      });

      return loc;
    });

    return {
      success: true,
      location: {
        id: updated.id,
        name: updated.name,
        latitude: updated.latitude.toNumber(),
        longitude: updated.longitude.toNumber(),
        radiusMeters: updated.radiusMeters.toNumber(),
        active: updated.active,
      },
      message: `Lokasi absensi "${updated.name}" berhasil diperbarui.`,
    };
  } catch (err: any) {
    console.error('[Update Work Location Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memperbarui lokasi absensi.',
    };
  }
}
