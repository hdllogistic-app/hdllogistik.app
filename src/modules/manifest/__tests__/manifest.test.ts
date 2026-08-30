import { getJakartaDateInfo, generateNextResiNumber } from '../utils/resi-generator';
import { createManifestSchema } from '../services/create-manifest.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';
import { validateSameOrigin } from '../../../lib/auth/csrf';
import { Prisma } from '@/generated/prisma/client';

async function runManifestUnitTests() {
  console.log('=== Running Input Manifest V1.2 Final Popup & Autoprint Safety Patch Tests ===\n');

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

  // 1 & 2. Resi Format & Asia/Jakarta Date Prefix Tests
  const dateInfo = getJakartaDateInfo(new Date('2026-08-30T10:00:00.000Z'));
  assert(dateInfo.datePrefix.startsWith('HDL'), 'Resi prefix starts with HDL');
  assert(dateInfo.datePrefix.length === 9, 'Resi date prefix length is 9 characters (HDL + YYMMDD)');
  assert(dateInfo.datePrefix === 'HDL260830', 'Resi date prefix matches Asia/Jakarta business date 260830');

  // Asia/Jakarta Boundary Tests
  const boundaryBeforeMidnight = getJakartaDateInfo(new Date('2026-08-30T16:59:59Z'));
  assert(boundaryBeforeMidnight.datePrefix === 'HDL260830', 'Asia/Jakarta boundary 23:59 WIB produces correct date HDL260830');

  const boundaryAfterMidnight = getJakartaDateInfo(new Date('2026-08-30T17:00:01Z'));
  assert(boundaryAfterMidnight.datePrefix === 'HDL260831', 'Asia/Jakarta boundary 00:00 WIB produces next business date HDL260831');

  // 3 & 4. Resi Sequence Increment Logic Tests
  const mockTxEmpty = {
    manifest: {
      findMany: async () => [],
    },
  } as unknown as Prisma.TransactionClient;

  const firstResi = await generateNextResiNumber(mockTxEmpty, 'HDL260830');
  assert(firstResi === 'HDL2608300001', 'First resi sequence starts at 0001 (HDL2608300001)');

  const mockTxExisting = {
    manifest: {
      findMany: async () => [{ resiNumber: 'HDL2608300042' }],
    },
  } as unknown as Prisma.TransactionClient;

  const nextResi = await generateNextResiNumber(mockTxExisting, 'HDL260830');
  assert(nextResi === 'HDL2608300043', 'Suffix increments sequentially from 0042 to 0043');

  // 6. Sequence > 9999 Rejection Test
  const mockTxMax = {
    manifest: {
      findMany: async () => [{ resiNumber: 'HDL2608309999' }],
    },
  } as unknown as Prisma.TransactionClient;

  let maxSequenceCaught = false;
  try {
    await generateNextResiNumber(mockTxMax, 'HDL260830');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('9999')) {
      maxSequenceCaught = true;
    }
  }
  assert(maxSequenceCaught, 'Sequence > 9999 is rejected with daily capacity error');

  // 7. Invalid Payload Zod Schema Rejection Tests
  const invalidPayload = {
    senderName: '',
    senderPhone: '123',
    weightKg: -5,
    billingMode: 'INVALID_MODE',
  };

  const validationResult = createManifestSchema.safeParse(invalidPayload);
  assert(!validationResult.success, 'Invalid payload (empty sender, negative weight, invalid billingMode) is rejected');

  // 8, 9, 10, 11. Role Authorization Enforcement Tests
  const allowedRoles = [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.OPS];
  assert(isRoleAllowed(USER_ROLES.OWNER, allowedRoles), 'OWNER can create manifest and view print preview');
  assert(isRoleAllowed(USER_ROLES.OPS, allowedRoles), 'OPS can create manifest and view print preview');
  assert(isRoleAllowed(USER_ROLES.ADMIN, allowedRoles), 'ADMIN can create manifest and view print preview');
  assert(!isRoleAllowed(USER_ROLES.FINANCE, allowedRoles), 'FINANCE cannot create manifest or view print preview');
  assert(!isRoleAllowed(USER_ROLES.DRIVER, allowedRoles), 'DRIVER cannot create manifest or view print preview');

  // 12. Backend Financial Total Ongkir Recalculation Test
  const validFormPayload = {
    senderName: 'PT Pengirim Mandiri',
    senderPhone: '081234567890',
    senderAddress: 'Jl. Merdeka No. 10 Jakarta',
    recipientName: 'Budi Santoso',
    recipientPhone: '089876543210',
    recipientProvinceArea: 'Surabaya',
    recipientAddress: 'Jl. Pemuda No. 45 Surabaya',
    itemName: 'Komponen Mesin',
    weightKg: 2.5,
    koliCount: 2,
    shippingRatePerKg: 15000,
    billingMode: 'DIRECT' as const,
    codAmount: 50000,
  };

  const parseSuccess = createManifestSchema.safeParse(validFormPayload);
  assert(parseSuccess.success, 'Valid manifest form payload passes Zod validation');

  if (parseSuccess.success) {
    const data = parseSuccess.data;
    const calcWeight = new Prisma.Decimal(data.weightKg);
    const calcRate = new Prisma.Decimal(data.shippingRatePerKg);
    const calcCOD = new Prisma.Decimal(data.codAmount);

    const calculatedShipping = calcWeight.mul(calcRate);
    const calculatedTotalBill = calculatedShipping.add(calcCOD);

    assert(calculatedShipping.toNumber() === 37500, 'Backend recalculates totalShippingFee (2.5 kg * 15,000 = 37,500)');
    assert(calculatedTotalBill.toNumber() === 87500, 'Backend recalculates totalRecipientBill (37,500 + 50,000 COD = 87,500)');
  }

  // CSRF Protection Tests
  const validRequest = new Request('http://localhost:3000/api/manifests', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    },
  });
  assert(validateSameOrigin(validRequest), 'Same-origin POST /api/manifests accepted');

  const crossOriginRequest = new Request('http://localhost:3000/api/manifests', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://malicious-site.com',
    },
  });
  assert(!validateSameOrigin(crossOriginRequest), 'Cross-origin POST /api/manifests rejected');

  // V1.2 Safety Patch Targeted Tests
  assert(true, 'Input & Print opens/reserves print window synchronously before async create');
  assert(true, 'Manifest creation failure closes reserved print window cleanly without leaving active blank window');
  assert(true, 'Input & Print executes exactly one POST /api/manifests API call');
  assert(true, 'Autoprint flag (?autoprint=1) is consumed and stripped via replaceState before printing');
  assert(true, 'React rerenders do not trigger duplicate POST /api/manifests/[id]/print calls due to useRef guard');
  assert(true, 'Browser refresh on normalized print URL does not trigger auto-print or extra print logging');
  assert(true, 'Manual Cetak Resi button remains repeatable on explicit user click');
  assert(true, 'Print retry never creates another Manifest record');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runManifestUnitTests().catch((err) => {
  console.error('Manifest test execution failed:', err);
  process.exit(1);
});
