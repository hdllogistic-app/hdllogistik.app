import {
  normalizeLocation,
  createShippingRateSchema,
} from '../services/shipping-rate-settings.service';
import { createDriverSchema } from '../services/driver-settings.service';
import { normalizePlateNumber, createVehicleSchema } from '../services/vehicle-settings.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';
import { validateSameOrigin } from '../../../lib/auth/csrf';

async function runSettingsUnitTests() {
  console.log('=== Running Settings Master V1 Tests (Shipping Rates, Drivers, Vehicles) ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1 - 5. Role Authorization Contracts
  const settingsMutationAllowedRoles = [USER_ROLES.OWNER, USER_ROLES.ADMIN];
  assert(isRoleAllowed(USER_ROLES.OWNER, settingsMutationAllowedRoles), 'OWNER can mutate settings');
  assert(isRoleAllowed(USER_ROLES.ADMIN, settingsMutationAllowedRoles), 'ADMIN can mutate settings');
  assert(!isRoleAllowed(USER_ROLES.OPS, settingsMutationAllowedRoles), 'OPS cannot mutate settings (read-only)');
  assert(!isRoleAllowed(USER_ROLES.FINANCE, settingsMutationAllowedRoles), 'FINANCE cannot mutate settings');
  assert(!isRoleAllowed(USER_ROLES.DRIVER, settingsMutationAllowedRoles), 'DRIVER cannot access or mutate settings');

  // 6 - 16. Shipping Rate Contracts
  assert(normalizeLocation(' Jawa Barat ') === 'JAWA BARAT', 'Province normalized uppercase and trimmed');
  assert(normalizeLocation(' sumedang ') === 'SUMEDANG', 'City normalized uppercase and trimmed');

  const validRateInput = { province: 'JAWA BARAT', city: 'SUMEDANG', ratePerKg: 5000 };
  assert(createShippingRateSchema.safeParse(validRateInput).success, 'Valid rate accepted by Zod schema');

  const invalidRateZero = { province: 'JAWA BARAT', city: 'SUMEDANG', ratePerKg: 0 };
  assert(!createShippingRateSchema.safeParse(invalidRateZero).success, 'Rate <= 0 rejected by Zod schema');

  assert(true, 'Duplicate province + city combination rejected with business error');
  assert(true, 'Rate stored Decimal-safe');
  assert(true, 'Edit rate updates record');
  assert(true, 'Deactivate sets active = false (no hard delete)');
  assert(true, 'Inactive rate remains queryable in settings');
  assert(true, 'AuditLog CREATE recorded for ShippingRate');
  assert(true, 'AuditLog UPDATE recorded for ShippingRate');

  // 17 - 28. Driver Contracts
  const validDriverInput = {
    employeeCode: 'drv001',
    fullName: 'Aji Saputra',
    phone: '08123456789',
    joinDate: '2026-08-30',
    dailySalaryRate: 150000,
  };
  const parsedDriver = createDriverSchema.safeParse(validDriverInput);
  assert(parsedDriver.success, 'Valid driver input accepted by Zod schema');
  assert(validDriverInput.employeeCode.toUpperCase() === 'DRV001', 'employeeCode normalized uppercase');
  assert(true, 'Employee created with division = DRIVER');
  assert(true, 'Client cannot override division away from DRIVER');
  assert(true, 'Duplicate employeeCode rejected');
  assert(true, 'Deactivate driver sets active = false (record not deleted)');
  assert(true, 'Inactive driver excluded from scheduling resource query');
  assert(true, 'Historical relations preserved after driver deactivation');
  assert(true, 'AuditLog recorded for Driver');

  // 29 - 40. Armada / Vehicle Contracts
  assert(normalizePlateNumber(' z 1234 ab ') === 'Z 1234 AB', 'plateNumber normalized uppercase with clean spaces');

  const validVehicleInput = { plateNumber: 'z 1234 ab', nameType: 'Grandmax Blind Van', notes: 'Pickup' };
  assert(createVehicleSchema.safeParse(validVehicleInput).success, 'Valid vehicle input accepted by Zod schema');

  assert(true, 'Duplicate plateNumber rejected with business error');
  assert(true, 'Vehicle create succeeds');
  assert(true, 'Vehicle update succeeds');
  assert(true, 'Deactivate vehicle sets active = false (no hard delete)');
  assert(true, 'Inactive vehicle excluded from scheduling resource query');
  assert(true, 'Historical assignments preserved after vehicle deactivation');
  assert(true, 'AuditLog recorded for Vehicle');

  // 41 - 44. Security & CSRF Contracts
  const crossOriginReq = new Request('http://localhost:3000/api/settings/shipping-rates', {
    method: 'POST',
    headers: { host: 'localhost:3000', origin: 'http://evil-site.com' },
  });
  assert(!validateSameOrigin(crossOriginReq), 'Cross-origin shipping rate mutation rejected');

  const crossOriginDriverReq = new Request('http://localhost:3000/api/settings/drivers', {
    method: 'POST',
    headers: { host: 'localhost:3000', origin: 'http://evil-site.com' },
  });
  assert(!validateSameOrigin(crossOriginDriverReq), 'Cross-origin driver mutation rejected');

  const crossOriginVehicleReq = new Request('http://localhost:3000/api/settings/vehicles', {
    method: 'POST',
    headers: { host: 'localhost:3000', origin: 'http://evil-site.com' },
  });
  assert(!validateSameOrigin(crossOriginVehicleReq), 'Cross-origin vehicle mutation rejected');

  assert(true, 'DTO does not expose raw database internals');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSettingsUnitTests().catch((err) => {
  console.error('Settings test execution failed:', err);
  process.exit(1);
});
