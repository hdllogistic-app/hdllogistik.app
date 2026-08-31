import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export const createDriverSchema = z.object({
  employeeCode: z.string().trim().min(1, 'Kode driver wajib diisi.'),
  fullName: z.string().trim().min(1, 'Nama driver wajib diisi.'),
  phone: z.string().trim().min(1, 'Nomor HP wajib diisi.'),
  joinDate: z.string().min(1, 'Tanggal bergabung wajib diisi.'),
  dailySalaryRate: z.number({ message: 'Gaji harian harus berupa angka.' }).min(0, 'Gaji harian tidak boleh negatif.').default(0),
});

export const updateDriverSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama driver wajib diisi.').optional(),
  phone: z.string().trim().min(1, 'Nomor HP wajib diisi.').optional(),
  joinDate: z.string().optional(),
  dailySalaryRate: z.number().min(0, 'Gaji harian tidak boleh negatif.').optional(),
  active: z.boolean().optional(),
});

export interface ListDriversFilters {
  search?: string;
  status?: string;
}

export async function listDriversService(filters: ListDriversFilters) {
  try {
    const where: Prisma.EmployeeWhereInput = {
      division: 'DRIVER',
    };

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.status && filters.status !== 'ALL') {
      where.active = filters.status === 'ACTIVE';
    }

    const totalCount = await prisma.employee.count({ where: { division: 'DRIVER' } });
    const activeCount = await prisma.employee.count({ where: { division: 'DRIVER', active: true } });
    const inactiveCount = totalCount - activeCount;

    const records = await prisma.employee.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });

    const drivers = records.map((d) => ({
      id: d.id,
      employeeCode: d.employeeCode,
      fullName: d.fullName,
      phone: d.phone,
      division: d.division,
      dailySalaryRate: d.dailySalaryRate.toNumber(),
      joinDate: d.joinDate,
      active: d.active,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return {
      success: true,
      summary: {
        totalCount,
        activeCount,
        inactiveCount,
      },
      drivers,
    };
  } catch (err) {
    console.error('[List Drivers Error]', err);
    return {
      success: false,
      summary: { totalCount: 0, activeCount: 0, inactiveCount: 0 },
      drivers: [],
      error: 'Gagal mengambil data driver.',
    };
  }
}

export async function createDriverService(
  rawInput: z.infer<typeof createDriverSchema>,
  actorUserId: string
) {
  const parseResult = createDriverSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data driver tidak valid.',
    };
  }

  const { employeeCode: rawCode, fullName: rawName, phone, joinDate, dailySalaryRate } = parseResult.data;
  const employeeCode = rawCode.trim().toUpperCase();
  const fullName = rawName.trim();

  try {
    // Unique Check for employeeCode
    const existing = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (existing) {
      return {
        success: false,
        error: `Kode driver ${employeeCode} sudah terdaftar.`,
      };
    }

    const newDriver = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        phone,
        division: 'DRIVER', // FORCED DIVISION
        dailySalaryRate: new Prisma.Decimal(dailySalaryRate || 0),
        joinDate: new Date(joinDate),
        active: true,
      },
    });

    // AuditLog CREATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'CREATE',
        entityType: 'EMPLOYEE',
        entityId: newDriver.id,
        metadataJson: JSON.stringify({
          employeeCode,
          fullName,
          division: 'DRIVER',
          active: true,
        }),
      },
    });

    return {
      success: true,
      driver: {
        id: newDriver.id,
        employeeCode: newDriver.employeeCode,
        fullName: newDriver.fullName,
        phone: newDriver.phone,
        division: newDriver.division,
        dailySalaryRate: newDriver.dailySalaryRate.toNumber(),
        joinDate: newDriver.joinDate,
        active: newDriver.active,
      },
    };
  } catch (err) {
    console.error('[Create Driver Error]', err);
    return {
      success: false,
      error: 'Gagal menambahkan data driver.',
    };
  }
}

export async function updateDriverService(
  id: string,
  rawInput: z.infer<typeof updateDriverSchema>,
  actorUserId: string
) {
  const parseResult = updateDriverSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data update driver tidak valid.',
    };
  }

  const { fullName, phone, joinDate, dailySalaryRate, active } = parseResult.data;

  try {
    const existing = await prisma.employee.findFirst({
      where: { id, division: 'DRIVER' },
    });

    if (!existing) {
      return { success: false, error: 'Data driver tidak ditemukan.' };
    }

    const updateData: Prisma.EmployeeUpdateInput = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (joinDate !== undefined) updateData.joinDate = new Date(joinDate);
    if (dailySalaryRate !== undefined) updateData.dailySalaryRate = new Prisma.Decimal(dailySalaryRate);
    if (active !== undefined) updateData.active = active;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    // AuditLog UPDATE
    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'UPDATE',
        entityType: 'EMPLOYEE',
        entityId: updated.id,
        metadataJson: JSON.stringify({
          employeeCode: updated.employeeCode,
          fullName: updated.fullName,
          active: updated.active,
        }),
      },
    });

    return {
      success: true,
      driver: {
        id: updated.id,
        employeeCode: updated.employeeCode,
        fullName: updated.fullName,
        phone: updated.phone,
        division: updated.division,
        dailySalaryRate: updated.dailySalaryRate.toNumber(),
        joinDate: updated.joinDate,
        active: updated.active,
      },
    };
  } catch (err) {
    console.error('[Update Driver Error]', err);
    return {
      success: false,
      error: 'Gagal memperbarui data driver.',
    };
  }
}
