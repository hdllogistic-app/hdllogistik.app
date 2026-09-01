export type UserRoleType = 'OWNER' | 'ADMIN' | 'OPS' | 'FINANCE' | 'DRIVER' | 'HELPER';

export const USER_ROLES = {
  OWNER: 'OWNER' as UserRoleType,
  ADMIN: 'ADMIN' as UserRoleType,
  OPS: 'OPS' as UserRoleType,
  FINANCE: 'FINANCE' as UserRoleType,
  DRIVER: 'DRIVER' as UserRoleType,
  HELPER: 'HELPER' as UserRoleType,
};

/**
 * Returns the default home path for a given user role upon login or root access.
 */
export function getRoleDefaultRedirect(role: string): string {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'FINANCE':
      return '/';
    case 'OPS':
      return '/ops';
    case 'DRIVER':
      return '/driver';
    case 'HELPER':
      return '/helper';
    default:
      return '/login';
  }
}

/**
 * Validates if a user role is permitted to access a specific route section.
 * Note: OWNER role possesses administrative access to all interfaces.
 */
export function isRoleAllowed(role: string, allowedRoles: string[]): boolean {
  if (role === 'OWNER') {
    return true;
  }
  return allowedRoles.includes(role);
}
