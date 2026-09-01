import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma/client';
import bcrypt from 'bcryptjs';

export interface AccountListFilters {
  searchQuery?: string;
  statusFilter?: 'ALL' | 'UNLINKED' | 'ACTIVE' | 'INACTIVE';
  roleFilter?: 'ALL' | 'DRIVER' | 'ADMIN';
}

export interface CreateAccountPayload {
  employeeId: string;
  loginId: string;
  password: string;
}

export async function getAccountsService(filters?: AccountListFilters) {
  try {
    const whereEmployee: any = {};

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      whereEmployee.OR = [
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { user: { loginId: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        user: {
          select: {
            id: true,
            loginId: true,
            role: true,
            active: true,
            createdAt: true,
          },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    let items = employees.map((emp) => {
      let accountStatus: 'BELUM PUNYA AKUN' | 'AKTIF' | 'NONAKTIF' = 'BELUM PUNYA AKUN';
      if (emp.user) {
        accountStatus = emp.user.active ? 'AKTIF' : 'NONAKTIF';
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        division: emp.division,
        employeeActive: emp.active,
        userId: emp.user?.id || null,
        loginId: emp.user?.loginId || null,
        role: emp.user?.role || null,
        userActive: emp.user ? emp.user.active : null,
        accountStatus,
      };
    });

    // Apply status filter
    if (filters?.statusFilter && filters.statusFilter !== 'ALL') {
      if (filters.statusFilter === 'UNLINKED') {
        items = items.filter((i) => i.accountStatus === 'BELUM PUNYA AKUN');
      } else if (filters.statusFilter === 'ACTIVE') {
        items = items.filter((i) => i.accountStatus === 'AKTIF');
      } else if (filters.statusFilter === 'INACTIVE') {
        items = items.filter((i) => i.accountStatus === 'NONAKTIF');
      }
    }

    // Apply role filter
    if (filters?.roleFilter && filters.roleFilter !== 'ALL') {
      items = items.filter((i) => i.role === filters.roleFilter);
    }

    return {
      success: true,
      accounts: items,
    };
  } catch (err) {
    console.error('[Get Accounts Service Error]', err);
    return { success: false, error: 'Gagal mengambil data akun team.' };
  }
}

export async function createAccountService(
  payload: CreateAccountPayload,
  actorRole: string,
  actorUserId: string
) {
  try {
    if (!payload.employeeId) {
      return { success: false, error: 'Pilih Employee/Anggota Team.' };
    }
    if (!payload.loginId || !payload.loginId.trim()) {
      return { success: false, error: 'Login ID wajib diisi.' };
    }
    if (!payload.password || payload.password.length < 12) {
      return { success: false, error: 'Password minimal 12 karakter.' };
    }

    const loginIdClean = payload.loginId.trim().toLowerCase();

    // 1. Re-query Employee
    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
      include: { user: true },
    });

    if (!employee) {
      return { success: false, error: 'Data Employee tidak ditemukan.' };
    }

    if (employee.user) {
      return {
        success: false,
        error: `Employee ${employee.fullName} (${employee.employeeCode}) sudah memiliki akun login (${employee.user.loginId}).`,
      };
    }

    // 2. Derive User Role safely from Employee Division
    let derivedRole: UserRole;
    if (employee.division === 'DRIVER') {
      derivedRole = 'DRIVER';
    } else if (employee.division === 'ADMIN') {
      derivedRole = 'ADMIN';
    } else if (employee.division === 'HELPER') {
      derivedRole = 'HELPER';
    } else {
      return {
        success: false,
        error: `Divisi ${employee.division} belum mendukung pembuatan akun login pada V1.`,
      };
    }

    // 3. Authorization Check: ADMIN cannot create ADMIN account
    if (actorRole === 'ADMIN' && derivedRole === 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Admin tidak memiliki akses untuk membuat akun Admin baru. Hanya Owner yang diizinkan.',
      };
    }

    // 4. Check Unique loginId
    const existingUser = await prisma.user.findUnique({
      where: { loginId: loginIdClean },
    });

    if (existingUser) {
      return {
        success: false,
        error: `Login ID "${loginIdClean}" sudah digunakan oleh akun lain.`,
      };
    }

    // 5. Hash Password server-side
    const passwordHash = await bcrypt.hash(payload.password, 10);

    // 6. Create User & AuditLog
    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          loginId: loginIdClean,
          name: employee.fullName,
          passwordHash,
          role: derivedRole,
          employeeId: employee.id,
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'User',
          entityId: u.id,
          actorId: actorUserId,
          metadataJson: JSON.stringify({
            loginId: u.loginId,
            role: u.role,
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
          }),
        },
      });

      return u;
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        loginId: newUser.loginId,
        role: newUser.role,
      },
      message: `Berhasil membuat akun ${newUser.role} untuk ${employee.fullName} (${newUser.loginId}).`,
    };
  } catch (err: any) {
    console.error('[Create Account Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal membuat akun login baru.',
    };
  }
}

export async function toggleAccountStatusService(
  targetUserId: string,
  active: boolean,
  actorRole: string,
  actorUserId: string
) {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: 'Akun user tidak ditemukan.' };
    }

    // Protection: OWNER cannot be deactivated
    if (targetUser.role === 'OWNER') {
      return { success: false, error: 'Akun OWNER dilindungi dan tidak dapat dinonaktifkan.' };
    }

    // Protection: ADMIN cannot deactivate another ADMIN
    if (actorRole === 'ADMIN' && targetUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Admin hanya dapat mengelola status akun Driver.',
      };
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: targetUserId },
        data: { active },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'User',
          entityId: u.id,
          actorId: actorUserId,
          metadataJson: JSON.stringify({
            loginId: u.loginId,
            action: active ? 'ACTIVATE_ACCOUNT' : 'DEACTIVATE_ACCOUNT',
          }),
        },
      });

      return u;
    });

    return {
      success: true,
      message: `Status akun ${updatedUser.loginId} berhasil diubah menjadi ${updatedUser.active ? 'AKTIF' : 'NONAKTIF'}.`,
    };
  } catch (err: any) {
    console.error('[Toggle Account Status Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal mengubah status akun.',
    };
  }
}

export async function resetPasswordService(
  targetUserId: string,
  newPassword: string,
  actorRole: string,
  actorUserId: string
) {
  try {
    if (!newPassword || newPassword.length < 12) {
      return { success: false, error: 'Password baru minimal 12 karakter.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: 'Akun user tidak ditemukan.' };
    }

    // Protection: OWNER password cannot be reset from Account Settings
    if (targetUser.role === 'OWNER') {
      return { success: false, error: 'Akun OWNER dilindungi. Reset password hanya dapat dilakukan via profil sendiri.' };
    }

    // Protection: ADMIN cannot reset ADMIN password
    if (actorRole === 'ADMIN' && targetUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Admin hanya dapat mereset password akun Driver.',
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'User',
          entityId: targetUserId,
          actorId: actorUserId,
          metadataJson: JSON.stringify({
            loginId: targetUser.loginId,
            action: 'PASSWORD_RESET',
          }),
        },
      });
    });

    return {
      success: true,
      message: `Password akun ${targetUser.loginId} berhasil di-reset.`,
    };
  } catch (err: any) {
    console.error('[Reset Password Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal mereset password akun.',
    };
  }
}
