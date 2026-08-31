import { z } from 'zod';
import { Prisma, EmployeeDivision } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export const ALLOWED_TEAM_DIVISIONS = ['DRIVER', 'HELPER', 'ADMIN'] as const;

export const createTeamMemberSchema = z.object({
  employeeCode: z.string().trim().min(1, 'Kode Team wajib diisi.'),
  fullName: z.string().trim().min(1, 'Nama wajib diisi.'),
  division: z.enum(ALLOWED_TEAM_DIVISIONS, {
    message: 'Divisi harus salah satu dari: DRIVER, HELPER, ADMIN.',
  }),
  phone: z.string().trim().min(1, 'Nomor HP wajib diisi.'),
  joinDate: z.string().min(1, 'Tanggal bergabung wajib diisi.'),
  dailySalaryRate: z
    .number({ message: 'Gaji harian harus berupa angka.' })
    .min(0, 'Gaji harian tidak boleh negatif.')
    .default(0),
});

export const updateTeamMemberSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama wajib diisi.').optional(),
  division: z
    .enum(ALLOWED_TEAM_DIVISIONS, {
      message: 'Divisi harus salah satu dari: DRIVER, HELPER, ADMIN.',
    })
    .optional(),
  phone: z.string().trim().min(1, 'Nomor HP wajib diisi.').optional(),
  joinDate: z.string().optional(),
  dailySalaryRate: z
    .number({ message: 'Gaji harian harus berupa angka.' })
    .min(0, 'Gaji harian tidak boleh negatif.')
    .optional(),
  active: z.boolean().optional(),
});

export interface ListTeamFilters {
  search?: string;
  division?: string;
  status?: string;
}

export async function listTeamMembersService(filters: ListTeamFilters) {
  try {
    const allowedDivisions: EmployeeDivision[] = ['DRIVER', 'HELPER', 'ADMIN'];
    const where: Prisma.EmployeeWhereInput = {
      division: { in: allowedDivisions },
    };

    if (filters.division && filters.division !== 'ALL') {
      if (ALLOWED_TEAM_DIVISIONS.includes(filters.division as any)) {
        where.division = filters.division as EmployeeDivision;
      }
    }

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

    // Summary counts scoped ONLY to Team divisions (DRIVER, HELPER, ADMIN)
    const teamWhere: Prisma.EmployeeWhereInput = {
      division: { in: allowedDivisions },
    };

    const totalCount = await prisma.employee.count({ where: teamWhere });
    const activeCount = await prisma.employee.count({
      where: { ...teamWhere, active: true },
    });
    const inactiveCount = totalCount - activeCount;

    const driverCount = await prisma.employee.count({
      where: { division: 'DRIVER' },
    });
    const helperCount = await prisma.employee.count({
      where: { division: 'HELPER' },
    });
    const adminCount = await prisma.employee.count({
      where: { division: 'ADMIN' },
    });

    const records = await prisma.employee.findMany({
      where,
      orderBy: [{ division: 'asc' }, { fullName: 'asc' }],
    });

    const members = records.map((m) => ({
      id: m.id,
      employeeCode: m.employeeCode,
      fullName: m.fullName,
      phone: m.phone,
      division: m.division,
      dailySalaryRate: m.dailySalaryRate.toNumber(),
      joinDate: m.joinDate,
      active: m.active,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return {
      success: true,
      summary: {
        totalCount,
        activeCount,
        inactiveCount,
        driverCount,
        helperCount,
        adminCount,
      },
      members,
    };
  } catch (err) {
    console.error('[List Team Members Error]', err);
    return {
      success: false,
      summary: {
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        driverCount: 0,
        helperCount: 0,
        adminCount: 0,
      },
      members: [],
      error: 'Gagal mengambil data team.',
    };
  }
}

export async function createTeamMemberService(
  rawInput: z.infer<typeof createTeamMemberSchema>,
  actorUserId: string
) {
  const parseResult = createTeamMemberSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data team tidak valid.',
    };
  }

  const {
    employeeCode: rawCode,
    fullName: rawName,
    division,
    phone,
    joinDate,
    dailySalaryRate,
  } = parseResult.data;

  const employeeCode = rawCode.trim().replace(/\s+/g, ' ').toUpperCase();
  const fullName = rawName.trim();

  try {
    // Unique Check for employeeCode
    const existing = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (existing) {
      return {
        success: false,
        error: `Kode Team ${employeeCode} sudah terdaftar.`,
      };
    }

    const newMember = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        phone: phone.trim(),
        division: division as EmployeeDivision,
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
        entityId: newMember.id,
        metadataJson: JSON.stringify({
          employeeCode,
          fullName,
          division: newMember.division,
          active: true,
        }),
      },
    });

    return {
      success: true,
      member: {
        id: newMember.id,
        employeeCode: newMember.employeeCode,
        fullName: newMember.fullName,
        phone: newMember.phone,
        division: newMember.division,
        dailySalaryRate: newMember.dailySalaryRate.toNumber(),
        joinDate: newMember.joinDate,
        active: newMember.active,
      },
    };
  } catch (err) {
    console.error('[Create Team Member Error]', err);
    return {
      success: false,
      error: 'Gagal menambahkan anggota team.',
    };
  }
}

export async function updateTeamMemberService(
  id: string,
  rawInput: z.infer<typeof updateTeamMemberSchema>,
  actorUserId: string
) {
  const parseResult = updateTeamMemberSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data update team tidak valid.',
    };
  }

  const { fullName, division, phone, joinDate, dailySalaryRate, active } = parseResult.data;

  try {
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: 'Data anggota team tidak ditemukan.' };
    }

    // Safety check for active DeliveryAssignment
    const isChangingAwayFromDriver =
      existing.division === 'DRIVER' && division !== undefined && division !== 'DRIVER';
    const isDeactivatingDriver =
      existing.division === 'DRIVER' && active === false;

    if (isChangingAwayFromDriver || isDeactivatingDriver) {
      const activeAssignment = await prisma.deliveryAssignment.findFirst({
        where: {
          driverId: id,
          unassignedAt: null,
        },
      });

      if (activeAssignment) {
        if (isChangingAwayFromDriver) {
          return {
            success: false,
            error: 'Team masih memiliki penugasan delivery aktif. Selesaikan penugasan sebelum mengubah divisi.',
          };
        }
        if (isDeactivatingDriver) {
          return {
            success: false,
            error: 'Team masih memiliki penugasan delivery aktif. Selesaikan penugasan sebelum menonaktifkan team.',
          };
        }
      }
    }

    const updateData: Prisma.EmployeeUpdateInput = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (division !== undefined) updateData.division = division as EmployeeDivision;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (joinDate !== undefined) updateData.joinDate = new Date(joinDate);
    if (dailySalaryRate !== undefined)
      updateData.dailySalaryRate = new Prisma.Decimal(dailySalaryRate);
    if (active !== undefined) updateData.active = active;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    // AuditLog UPDATE
    const auditMetadata: Record<string, any> = {
      employeeCode: updated.employeeCode,
      fullName: updated.fullName,
      division: updated.division,
      active: updated.active,
    };

    if (division !== undefined && division !== existing.division) {
      auditMetadata.previousDivision = existing.division;
      auditMetadata.newDivision = updated.division;
    }

    if (active !== undefined && active !== existing.active) {
      auditMetadata.previousActive = existing.active;
      auditMetadata.newActive = updated.active;
    }

    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'UPDATE',
        entityType: 'EMPLOYEE',
        entityId: updated.id,
        metadataJson: JSON.stringify(auditMetadata),
      },
    });

    return {
      success: true,
      member: {
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
    console.error('[Update Team Member Error]', err);
    return {
      success: false,
      error: 'Gagal memperbarui data anggota team.',
    };
  }
}
