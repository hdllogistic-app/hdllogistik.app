import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getTodayJakartaStr } from '../utils/date-utils';

export interface ManifestListFilters {
  startDate?: string;
  endDate?: string;
  area?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ManifestSummaryDTO {
  totalCount: number;
  totalWeightKg: number;
  totalShippingFee: number;
  totalRecipientBill: number;
}

export interface ManifestListItemDTO {
  id: string;
  resiNumber: string;
  date: Date;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientProvinceArea: string;
  recipientAddress: string;
  itemName: string;
  weightKg: number;
  koliCount: number;
  shippingRatePerKg: number;
  totalShippingFee: number;
  codAmount: number;
  totalRecipientBill: number;
  billingMode: string;
  paymentDeliveryMethod: string;
  manifestStatus: string;
  deliveryStatus: string;
  driver: {
    id: string;
    employeeCode: string;
    fullName: string;
  } | null;
  vehicle: {
    id: string;
    plateNumber: string;
    nameType: string;
  } | null;
  createdAt: Date;
}

export interface ListManifestsResult {
  success: boolean;
  filters: {
    startDate: string;
    endDate: string;
    area: string;
    search: string;
    status: string;
    page: number;
    limit: number;
  };
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  summary: ManifestSummaryDTO;
  manifests: ManifestListItemDTO[];
  error?: string;
}


/**
 * Builds reusable Prisma ManifestWhereInput from filters with Asia/Jakarta date range bounds.
 */
export function buildManifestWhereInput(filters: ManifestListFilters): Prisma.ManifestWhereInput {
  const where: Prisma.ManifestWhereInput = {};

  // Date Range Filtering (Asia/Jakarta boundaries)
  const today = getTodayJakartaStr();
  const startDate = filters.startDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)
    ? filters.startDate
    : (filters.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate) ? filters.endDate : today);
  const endDate = filters.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)
    ? filters.endDate
    : startDate;

  if (startDate > endDate) {
    throw new Error('Tanggal awal tidak boleh melebihi tanggal akhir.');
  }

  const startUtc = new Date(`${startDate}T00:00:00.000+07:00`);
  const endUtc = new Date(`${endDate}T23:59:59.999+07:00`);

  where.createdAt = {
    gte: startUtc,
    lte: endUtc,
  };

  if (filters.area && filters.area !== 'ALL' && filters.area.trim() !== '') {
    where.recipientProvinceArea = filters.area.trim();
  }

  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.trim();
    where.OR = [
      { resiNumber: { contains: q, mode: 'insensitive' } },
      { senderName: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filters.status && filters.status !== 'ALL' && filters.status.trim() !== '') {
    where.delivery = {
      status: filters.status.trim() as any,
    };
  }

  return where;
}

/**
 * Domain Service to query manifests and summary aggregates database-side.
 */
export async function listManifestsService(
  filters: ManifestListFilters
): Promise<ListManifestsResult> {
  const today = getTodayJakartaStr();
  const startDate = filters.startDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)
    ? filters.startDate
    : (filters.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate) ? filters.endDate : today);
  const endDate = filters.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)
    ? filters.endDate
    : startDate;

  try {
    const where = buildManifestWhereInput(filters);

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    // Database-side Count and Aggregates matching filters
    const totalItems = await prisma.manifest.count({ where });

    const aggregateResult = await prisma.manifest.aggregate({
      where,
      _sum: {
        weightKg: true,
        totalShippingFee: true,
        totalRecipientBill: true,
      },
    });

    const summary: ManifestSummaryDTO = {
      totalCount: totalItems,
      totalWeightKg: aggregateResult._sum.weightKg ? aggregateResult._sum.weightKg.toNumber() : 0,
      totalShippingFee: aggregateResult._sum.totalShippingFee ? aggregateResult._sum.totalShippingFee.toNumber() : 0,
      totalRecipientBill: aggregateResult._sum.totalRecipientBill ? aggregateResult._sum.totalRecipientBill.toNumber() : 0,
    };

    // Database-side Paginated Manifest List Query
    const records = await prisma.manifest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        delivery: {
          include: {
            driver: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
              },
            },
            assignments: {
              where: { unassignedAt: null },
              orderBy: { assignedAt: 'desc' },
              take: 1,
              include: {
                vehicle: {
                  select: {
                    id: true,
                    plateNumber: true,
                    nameType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const manifests: ManifestListItemDTO[] = records.map((m) => {
      const activeAssignment = m.delivery?.assignments[0];
      const activeVehicle = activeAssignment?.vehicle || null;

      return {
        id: m.id,
        resiNumber: m.resiNumber,
        date: m.date,
        senderName: m.senderName,
        senderPhone: m.senderPhone,
        recipientName: m.recipientName,
        recipientPhone: m.recipientPhone,
        recipientProvinceArea: m.recipientProvinceArea,
        recipientAddress: m.recipientAddress,
        itemName: m.itemName,
        weightKg: m.weightKg.toNumber(),
        koliCount: m.koliCount,
        shippingRatePerKg: m.shippingRatePerKg.toNumber(),
        totalShippingFee: m.totalShippingFee.toNumber(),
        codAmount: m.codAmount.toNumber(),
        totalRecipientBill: m.totalRecipientBill.toNumber(),
        billingMode: m.billingMode,
        paymentDeliveryMethod: m.paymentDeliveryMethod,
        manifestStatus: m.status,
        deliveryStatus: m.delivery?.status || 'READY',
        driver: m.delivery?.driver
          ? {
              id: m.delivery.driver.id,
              employeeCode: m.delivery.driver.employeeCode,
              fullName: m.delivery.driver.fullName,
            }
          : null,
        vehicle: activeVehicle
          ? {
              id: activeVehicle.id,
              plateNumber: activeVehicle.plateNumber,
              nameType: activeVehicle.nameType,
            }
          : null,
        createdAt: m.createdAt,
      };
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      success: true,
      filters: {
        startDate,
        endDate,
        area: filters.area || 'ALL',
        search: filters.search || '',
        status: filters.status || 'ALL',
        page,
        limit,
      },
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
      summary,
      manifests,
    };
  } catch (err) {
    console.error('[List Manifests Service Error]', err);
    const message = err instanceof Error ? err.message : 'Gagal mengambil data manifest dari database.';
    return {
      success: false,
      filters: {
        startDate,
        endDate,
        area: filters.area || 'ALL',
        search: filters.search || '',
        status: filters.status || 'ALL',
        page: 1,
        limit: 25,
      },
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 25,
      },
      summary: {
        totalCount: 0,
        totalWeightKg: 0,
        totalShippingFee: 0,
        totalRecipientBill: 0,
      },
      manifests: [],
      error: message,
    };
  }
}
