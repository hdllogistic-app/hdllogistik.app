import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma/client';

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  role: UserRole;
  employeeId: string | null;
  employeeName: string;
}

export type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; error: string };

/**
 * Authenticates a user by loginId and plaintext password.
 * - Uses bcrypt to compare password hashes safely.
 * - Enforces User and Employee active status checks.
 * - Returns generic error message on invalid credentials to prevent username enumeration.
 */
export async function authenticateUser(
  rawLoginId: string,
  passwordInput: string
): Promise<AuthResult> {
  const loginId = rawLoginId?.trim();

  if (!loginId || !passwordInput) {
    return {
      success: false,
      error: 'Login ID atau password tidak valid.',
    };
  }

  const user = await prisma.user.findUnique({
    where: { loginId },
    include: {
      employee: true,
    },
  });

  if (!user) {
    return {
      success: false,
      error: 'Login ID atau password tidak valid.',
    };
  }

  // Check User active status
  if (!user.active) {
    return {
      success: false,
      error: 'Akun Anda tidak aktif. Silakan hubungi Administrator.',
    };
  }

  // Check Employee active status if linked
  if (user.employee && !user.employee.active) {
    return {
      success: false,
      error: 'Akun Karyawan Anda tidak aktif. Silakan hubungi Administrator.',
    };
  }

  // Compare bcrypt password hash
  const isPasswordValid = await bcrypt.compare(passwordInput, user.passwordHash);

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Login ID atau password tidak valid.',
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      employeeId: user.employeeId,
      employeeName: user.employee?.fullName || user.name,
    },
  };
}
