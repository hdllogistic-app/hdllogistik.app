import { SessionPayload } from './session';
import { USER_ROLES } from './roles';

export interface DriverIsolationScope {
  employeeId: string;
}

/**
 * Asserts and extracts driver isolation scope from a session payload.
 * - For DRIVER role: validates employeeId is present and returns scope filter { employeeId }.
 * - For OWNER / ADMIN / OPS / FINANCE roles: returns null (broad system scope).
 * - Throws error if a DRIVER account lacks employee linkage.
 */
export function assertDriverIsolation(session: SessionPayload): DriverIsolationScope | null {
  if (session.role === USER_ROLES.DRIVER) {
    if (!session.employeeId) {
      throw new Error('Unauthorized: Driver account is not linked to an Employee record.');
    }
    return { employeeId: session.employeeId };
  }

  return null;
}
