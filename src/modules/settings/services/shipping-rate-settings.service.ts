import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export const createShippingRateSchema = z.object({
  province: z.string().trim().min(1, 'Provinsi wajib diisi.'),
  city: z.string().trim().min(1, 'Kota / Kabupaten wajib diisi.'),
  ratePerKg: z.number({ message: 'Tarif ongkir harus berupa angka.' }).gt(0, 'Tarif ongkir per kg harus lebih besar dari Rp 0.'),
});

export const updateShippingRateSchema = z.object({
  ratePerKg: z.number().gt(0, 'Tarif ongkir per kg harus lebih besar dari Rp 0.').optional(),
  active: z.boolean().optional(),
});

export function normalizeLocation(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toUpperCase();
}

export interface ListShippingRatesFilters {
  search?: string;
  status?: string;
}

export async function listShippingRatesService(filters: ListShippingRatesFilters) {
  try {
    const where: Prisma.ShippingRateWhereInput = {};

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { province: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.status && filters.status !== 'ALL') {
      where.active = filters.status === 'ACTIVE';
    }

    const totalCount = await prisma.shippingRate.count();
    const activeCount = await prisma.shippingRate.count({ where: { active: true } });
    const inactiveCount = totalCount - activeCount;

    const records = await prisma.shippingRate.findMany({
      where,
      orderBy: [
        { province: 'asc' },
        { city: 'asc' },
      ],
    });

    const rates = records.map((r) => ({
      id: r.id,
      province: r.province,
      city: r.city,
      ratePerKg: r.ratePerKg.toNumber(),
      active: r.active,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      success: true,
      summary: {
        totalCount,
        activeCount,
        inactiveCount,
      },
      rates,
    };
  } catch (err) {
    console.error('[List Shipping Rates Error]', err);
    return {
      success: false,
      summary: { totalCount: 0, activeCount: 0, inactiveCount: 0 },
      rates: [],
      error: 'Gagal mengambil data tarif ongkir.',
    };
  }
}

export async function createShippingRateService(
  rawInput: z.infer<typeof createShippingRateSchema>,
  actorUserId: string
) {
  const parseResult = createShippingRateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data tarif tidak valid.',
    };
  }

  const { province: rawProvince, city: rawCity, ratePerKg } = parseResult.data;
  const province = normalizeLocation(rawProvince);
  const city = normalizeLocation(rawCity);

  try {
    // Unique Check for province + city
    const existing = await prisma.shippingRate.findUnique({
      where: {
        province_city: {
          province,
          city,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Tarif ongkir untuk ${city}, ${province} sudah terdaftar.`,
      };
    }

    const newRate = await prisma.shippingRate.create({
      data: {
        province,
        city,
        ratePerKg: new Prisma.Decimal(ratePerKg),
        active: true,
      },
    });

    // AuditLog CREATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'CREATE',
        entityType: 'SHIPPING_RATE',
        entityId: newRate.id,
        metadataJson: JSON.stringify({
          province,
          city,
          ratePerKg,
          active: true,
        }),
      },
    });

    return {
      success: true,
      rate: {
        id: newRate.id,
        province: newRate.province,
        city: newRate.city,
        ratePerKg: newRate.ratePerKg.toNumber(),
        active: newRate.active,
      },
    };
  } catch (err) {
    console.error('[Create Shipping Rate Error]', err);
    return {
      success: false,
      error: 'Gagal menambahkan data tarif ongkir.',
    };
  }
}

export async function updateShippingRateService(
  id: string,
  rawInput: z.infer<typeof updateShippingRateSchema>,
  actorUserId: string
) {
  const parseResult = updateShippingRateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data update tarif tidak valid.',
    };
  }

  const { ratePerKg, active } = parseResult.data;

  try {
    const existing = await prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Data tarif ongkir tidak ditemukan.' };
    }

    const updateData: Prisma.ShippingRateUpdateInput = {};
    if (ratePerKg !== undefined) {
      updateData.ratePerKg = new Prisma.Decimal(ratePerKg);
    }
    if (active !== undefined) {
      updateData.active = active;
    }

    const updated = await prisma.shippingRate.update({
      where: { id },
      data: updateData,
    });

    // AuditLog UPDATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'UPDATE',
        entityType: 'SHIPPING_RATE',
        entityId: updated.id,
        metadataJson: JSON.stringify({
          province: updated.province,
          city: updated.city,
          ratePerKg: updated.ratePerKg.toNumber(),
          active: updated.active,
        }),
      },
    });

    return {
      success: true,
      rate: {
        id: updated.id,
        province: updated.province,
        city: updated.city,
        ratePerKg: updated.ratePerKg.toNumber(),
        active: updated.active,
      },
    };
  } catch (err) {
    console.error('[Update Shipping Rate Error]', err);
    return {
      success: false,
      error: 'Gagal memperbarui data tarif ongkir.',
    };
  }
}
