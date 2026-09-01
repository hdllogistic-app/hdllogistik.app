import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export interface DeliveryMonitoringFilters {
  date?: string; // YYYY-MM-DD in Asia/Jakarta
  teamId?: string;
  search?: string;
}

export interface TeamMonitoringSummaryDTO {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  totalDelivery: number;
  totalTtd: number;
  totalPending: number;
  achievement: number; // percentage formatted to 2 decimals
}

export interface OverallMonitoringSummaryDTO {
  totalDelivery: number;
  totalTtd: number;
  totalPending: number;
  achievement: number;
}

export interface DeliveryMonitoringResult {
  success: boolean;
  dateStr: string;
  summary: OverallMonitoringSummaryDTO;
  teams: TeamMonitoringSummaryDTO[];
  error?: string;
}

export interface DetailDeliveryItemDTO {
  id: string;
  manifestId: string;
  resiNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientProvinceArea: string;
  recipientAddress: string;
  deliveryStatus: string;
  ttdStatus: 'TTD' | 'PENDING';
  ttdReceivedAt: string | null;
  signatureUrl: string | null;
  driverName: string;
  vehiclePlate: string | null;
}

export interface DetailDeliveryResult {
  success: boolean;
  employeeName: string;
  employeeCode: string;
  dateStr: string;
  summary: {
    totalDelivery: number;
    totalTtd: number;
    totalPending: number;
  };
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  deliveries: DetailDeliveryItemDTO[];
  error?: string;
}

/**
 * Converts YYYY-MM-DD string in Asia/Jakarta timezone (+07:00) into UTC Date boundary.
 */
export function getAsiaJakartaDateBoundary(dateStr?: string): {
  dateStr: string;
  startUtc: Date;
  endUtc: Date;
} {
  let targetDate = dateStr;
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    // Current Asia/Jakarta date
    const now = new Date();
    const jakartaDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    targetDate = jakartaDate.toISOString().split('T')[0];
  }

  // 00:00:00.000 +07:00 -> Subtract 7 hours for UTC
  const startUtc = new Date(`${targetDate}T00:00:00.000+07:00`);
  const endUtc = new Date(`${targetDate}T23:59:59.999+07:00`);

  return { dateStr: targetDate, startUtc, endUtc };
}

/**
 * Service to aggregate daily delivery, TTD, pending, and achievement per driver team.
 */
export async function getDeliveryMonitoringService(
  filters: DeliveryMonitoringFilters
): Promise<DeliveryMonitoringResult> {
  try {
    const { dateStr, startUtc, endUtc } = getAsiaJakartaDateBoundary(filters.date);

    // Query active DeliveryAssignments for business date, taking latest assignment per delivery
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        assignedAt: { lte: endUtc },
        OR: [{ unassignedAt: null }, { unassignedAt: { gte: startUtc } }],
        delivery: {
          status: { notIn: ['CANCELLED'] },
          manifest: { status: { notIn: ['VOID'] } },
        },
        driver: {
          division: 'DRIVER',
          ...(filters.teamId ? { id: filters.teamId } : {}),
          ...(filters.search
            ? {
                OR: [
                  { fullName: { contains: filters.search.trim(), mode: 'insensitive' } },
                  { employeeCode: { contains: filters.search.trim(), mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      include: {
        driver: true,
        delivery: {
          include: {
            proof: true,
            manifest: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Deduplicate: Each Delivery ID is attributed ONLY to its latest active assignment
    const seenDeliveryIds = new Set<string>();
    const teamMap = new Map<
      string,
      {
        employeeId: string;
        employeeCode: string;
        employeeName: string;
        totalDelivery: number;
        totalTtd: number;
      }
    >();

    for (const a of assignments) {
      if (seenDeliveryIds.has(a.deliveryId)) continue;
      seenDeliveryIds.add(a.deliveryId);

      const driver = a.driver;
      if (!driver) continue;

      if (!teamMap.has(driver.id)) {
        teamMap.set(driver.id, {
          employeeId: driver.id,
          employeeCode: driver.employeeCode,
          employeeName: driver.fullName,
          totalDelivery: 0,
          totalTtd: 0,
        });
      }

      const teamData = teamMap.get(driver.id)!;
      teamData.totalDelivery += 1;

      // TTD Proof Check: Valid DeliveryProof record exists
      if (a.delivery.proof !== null) {
        teamData.totalTtd += 1;
      }
    }

    // Convert team map to array and compute pending & achievement
    const teams: TeamMonitoringSummaryDTO[] = Array.from(teamMap.values()).map((t) => {
      const totalPending = Math.max(0, t.totalDelivery - t.totalTtd);
      const achievement =
        t.totalDelivery > 0
          ? Number(((t.totalTtd / t.totalDelivery) * 100).toFixed(2))
          : 0;

      return {
        employeeId: t.employeeId,
        employeeCode: t.employeeCode,
        employeeName: t.employeeName,
        totalDelivery: t.totalDelivery,
        totalTtd: t.totalTtd,
        totalPending,
        achievement,
      };
    });

    // Default Sorting: Total Pending DESC
    teams.sort((a, b) => b.totalPending - a.totalPending || b.totalDelivery - a.totalDelivery);

    // Compute Overall Summary
    const overallTotalDelivery = teams.reduce((acc, t) => acc + t.totalDelivery, 0);
    const overallTotalTtd = teams.reduce((acc, t) => acc + t.totalTtd, 0);
    const overallTotalPending = Math.max(0, overallTotalDelivery - overallTotalTtd);
    const overallAchievement =
      overallTotalDelivery > 0
        ? Number(((overallTotalTtd / overallTotalDelivery) * 100).toFixed(2))
        : 0;

    return {
      success: true,
      dateStr,
      summary: {
        totalDelivery: overallTotalDelivery,
        totalTtd: overallTotalTtd,
        totalPending: overallTotalPending,
        achievement: overallAchievement,
      },
      teams,
    };
  } catch (err) {
    console.error('[Get Delivery Monitoring Service Error]', err);
    return {
      success: false,
      dateStr: filters.date || '',
      summary: { totalDelivery: 0, totalTtd: 0, totalPending: 0, achievement: 0 },
      teams: [],
      error: 'Data monitoring delivery gagal dimuat. Silakan coba kembali.',
    };
  }
}

/**
 * Service to query paginated detail delivery records for a specific driver team.
 */
export async function getDetailDeliveryMonitoringService(
  employeeId: string,
  dateStr?: string,
  statusFilter: 'ALL' | 'TTD' | 'PENDING' = 'ALL',
  page: number = 1,
  limit: number = 25
): Promise<DetailDeliveryResult> {
  try {
    const { dateStr: targetDate, startUtc, endUtc } = getAsiaJakartaDateBoundary(dateStr);

    const driver = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, employeeCode: true, fullName: true },
    });

    if (!driver) {
      return {
        success: false,
        employeeName: 'Unknown',
        employeeCode: '',
        dateStr: targetDate,
        summary: { totalDelivery: 0, totalTtd: 0, totalPending: 0 },
        pagination: { totalItems: 0, totalPages: 1, currentPage: 1, limit },
        deliveries: [],
        error: 'Team / Driver tidak ditemukan.',
      };
    }

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        driverId: employeeId,
        assignedAt: { lte: endUtc },
        OR: [{ unassignedAt: null }, { unassignedAt: { gte: startUtc } }],
        delivery: {
          status: { notIn: ['CANCELLED'] },
          manifest: { status: { notIn: ['VOID'] } },
        },
      },
      include: {
        vehicle: true,
        delivery: {
          include: {
            proof: true,
            manifest: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Deduplicate latest assignment per delivery
    const seenDeliveryIds = new Set<string>();
    const eligibleDeliveries: DetailDeliveryItemDTO[] = [];

    for (const a of assignments) {
      if (seenDeliveryIds.has(a.deliveryId)) continue;
      seenDeliveryIds.add(a.deliveryId);

      const hasProof = a.delivery.proof !== null;
      const ttdStatus: 'TTD' | 'PENDING' = hasProof ? 'TTD' : 'PENDING';

      if (statusFilter === 'TTD' && !hasProof) continue;
      if (statusFilter === 'PENDING' && hasProof) continue;

      eligibleDeliveries.push({
        id: a.delivery.id,
        manifestId: a.delivery.manifest.id,
        resiNumber: a.delivery.manifest.resiNumber,
        recipientName: a.delivery.manifest.recipientName,
        recipientPhone: a.delivery.manifest.recipientPhone,
        recipientProvinceArea: a.delivery.manifest.recipientProvinceArea,
        recipientAddress: a.delivery.manifest.recipientAddress,
        deliveryStatus: a.delivery.status,
        ttdStatus,
        ttdReceivedAt: a.delivery.proof?.receivedAt ? a.delivery.proof.receivedAt.toISOString() : null,
        signatureUrl: a.delivery.proof?.signatureUrl || null,
        driverName: driver.fullName,
        vehiclePlate: a.vehicle ? `${a.vehicle.plateNumber} — ${a.vehicle.nameType}` : null,
      });
    }

    // Total counts summary
    const totalDelivery = seenDeliveryIds.size;
    const totalTtd = assignments.filter((a) => a.delivery.proof !== null).length;
    const totalPending = Math.max(0, totalDelivery - totalTtd);

    const safePage = Math.max(1, page);
    const totalItems = eligibleDeliveries.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const skip = (safePage - 1) * limit;

    const paginatedDeliveries = eligibleDeliveries.slice(skip, skip + limit);

    return {
      success: true,
      employeeName: driver.fullName,
      employeeCode: driver.employeeCode,
      dateStr: targetDate,
      summary: {
        totalDelivery,
        totalTtd,
        totalPending,
      },
      pagination: {
        totalItems,
        totalPages,
        currentPage: safePage,
        limit,
      },
      deliveries: paginatedDeliveries,
    };
  } catch (err) {
    console.error('[Get Detail Delivery Monitoring Service Error]', err);
    return {
      success: false,
      employeeName: 'Unknown',
      employeeCode: '',
      dateStr: dateStr || '',
      summary: { totalDelivery: 0, totalTtd: 0, totalPending: 0 },
      pagination: { totalItems: 0, totalPages: 1, currentPage: 1, limit },
      deliveries: [],
      error: 'Detail data delivery gagal dimuat.',
    };
  }
}
