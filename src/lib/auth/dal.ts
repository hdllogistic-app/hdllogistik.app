import { getSession } from './session';
import { isRoleAllowed, UserRoleType } from './roles';
import { prisma } from '@/lib/prisma';

export interface CurrentUserDTO {
  userId: string;
  loginId: string;
  role: UserRoleType;
  employeeId: string | null;
  employeeName: string;
}

export interface DriverAccessScope {
  userId: string;
  employeeId: string | null;
  isOwnerOverride: boolean;
}

/**
 * Server-only Data Access Layer (DAL) helper.
 * Verifies signed session token AND audits current database status (User.active & Employee.active).
 * Always returns current role and employeeId directly from PostgreSQL database.
 */
export async function verifyCurrentUser(): Promise<CurrentUserDTO | null> {
  const session = await getSession();
  if (!session?.userId) {
    return null;
  }

  // Audit against live database state
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: true },
  });

  // Verify User existence and active status
  if (!user || !user.active) {
    return null;
  }

  // Verify linked Employee active status if applicable
  if (user.employee && !user.employee.active) {
    return null;
  }

  return {
    userId: user.id,
    loginId: user.loginId,
    role: user.role as UserRoleType,
    employeeId: user.employeeId,
    employeeName: user.employee?.fullName || user.name,
  };
}

/**
 * Requires an authenticated user with valid database active status.
 * Throws Unauthorized Error if missing or inactive.
 */
export async function requireAuthenticatedUser(): Promise<CurrentUserDTO> {
  const user = await verifyCurrentUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }
  return user;
}

/**
 * Requires an authenticated user with one of the allowed database roles.
 * Throws Forbidden Error if role is not permitted.
 */
export async function requireRole(allowedRoles: UserRoleType[]): Promise<CurrentUserDTO> {
  const user = await requireAuthenticatedUser();
  if (!isRoleAllowed(user.role, allowedRoles)) {
    throw new Error('Forbidden: Insufficient role permissions.');
  }
  return user;
}

/**
 * Requires a valid DRIVER account (or OWNER for admin/testing access).
 * Guarantees that DRIVER access uses current database employeeId.
 */
export async function requireDriver(): Promise<DriverAccessScope> {
  const user = await requireAuthenticatedUser();

  if (user.role === 'DRIVER') {
    if (!user.employeeId) {
      throw new Error('Forbidden: Driver account is not linked to an active Employee record.');
    }
    return {
      userId: user.userId,
      employeeId: user.employeeId,
      isOwnerOverride: false,
    };
  }

  if (user.role === 'OWNER') {
    return {
      userId: user.userId,
      employeeId: user.employeeId,
      isOwnerOverride: true,
    };
  }

  throw new Error('Forbidden: Driver access required.');
}
