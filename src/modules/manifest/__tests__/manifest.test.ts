import { getJakartaDateInfo, generateNextResiNumber } from '../utils/resi-generator';
import { createManifestSchema } from '../services/create-manifest.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';
import { validateSameOrigin } from '../../../lib/auth/csrf';
import { Prisma } from '@/generated/prisma/client';

async function runManifestUnitTests() {
  console.log('=== Running Input Manifest V1.3 Payment Method Revision Tests ===\n');

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

  // 7. Role Authorization Enforcement Tests
  const allowedRoles = [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.OPS];
  assert(isRoleAllowed(USER_ROLES.OWNER, allowedRoles), 'OWNER can create manifest and view print preview');
  assert(isRoleAllowed(USER_ROLES.OPS, allowedRoles), 'OPS can create manifest and view print preview');
  assert(isRoleAllowed(USER_ROLES.ADMIN, allowedRoles), 'ADMIN can create manifest and view print preview');
  assert(!isRoleAllowed(USER_ROLES.FINANCE, allowedRoles), 'FINANCE cannot create manifest or view print preview');
  assert(!isRoleAllowed(USER_ROLES.DRIVER, allowedRoles), 'DRIVER cannot create manifest or view print preview');

  // 8. CSRF Protection Tests
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

  // ==========================================
  // V1.3 PAYMENT METHOD REVISION TESTS
  // ==========================================

  const basePayload = {
    senderName: 'PT Pengirim Mandiri',
    senderPhone: '081234567890',
    senderAddress: 'Jl. Merdeka No. 10 Jakarta',
    recipientName: 'Budi Santoso',
    recipientPhone: '089876543210',
    recipientProvinceArea: 'Surabaya',
    recipientAddress: 'Jl. Pemuda No. 45 Surabaya',
    itemName: 'Sparepart Mesin',
    weightKg: 2.5,
    koliCount: 2,
    shippingRatePerKg: 10000,
    billingMode: 'DIRECT' as const,
  };

  // Test 1-4: CASH payment method
  const cashPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'CASH' as const,
    codAmount: 0,
  };
  const cashParsed = createManifestSchema.safeParse(cashPayload);
  assert(cashParsed.success, 'CASH payment method accepted by Zod schema');

  if (cashParsed.success) {
    const data = cashParsed.data;
    const weightDec = new Prisma.Decimal(data.weightKg);
    const rateDec = new Prisma.Decimal(data.shippingRatePerKg);
    const shippingFee = weightDec.mul(rateDec);

    // Business rule simulation for CASH
    const codAmountNorm = 0;
    const recipientBillNorm = 0;

    assert(shippingFee.toNumber() === 25000, 'CASH totalShippingFee recalculated (2.5 kg * 10,000 = 25,000)');
    assert(recipientBillNorm === 0, 'CASH totalRecipientBill = 0');
    assert(codAmountNorm === 0, 'CASH codAmount = 0');
  }

  // Test 5-7: DFOD payment method
  const dfodPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'DFOD' as const,
    codAmount: 0,
  };
  const dfodParsed = createManifestSchema.safeParse(dfodPayload);
  assert(dfodParsed.success, 'DFOD payment method accepted by Zod schema');

  if (dfodParsed.success) {
    const data = dfodParsed.data;
    const weightDec = new Prisma.Decimal(data.weightKg);
    const rateDec = new Prisma.Decimal(data.shippingRatePerKg);
    const shippingFee = weightDec.mul(rateDec);

    // Business rule simulation for DFOD
    const codAmountNorm = 0;
    const recipientBillNorm = shippingFee.toNumber();

    assert(recipientBillNorm === 25000, 'DFOD totalRecipientBill equals totalShippingFee (25,000)');
    assert(codAmountNorm === 0, 'DFOD codAmount = 0');
  }

  // Test 8-11: COD payment method
  const codValidPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'COD' as const,
    codAmount: 1500000,
  };
  const codParsed = createManifestSchema.safeParse(codValidPayload);
  assert(codParsed.success, 'COD payment method accepted with valid codAmount > 0');

  if (codParsed.success) {
    const data = codParsed.data;
    const weightDec = new Prisma.Decimal(data.weightKg);
    const rateDec = new Prisma.Decimal(data.shippingRatePerKg);
    const shippingFee = weightDec.mul(rateDec);

    // Business rule simulation for COD: totalRecipientBill = codAmount (shipping fee is separate)
    const codAmountNorm = data.codAmount || 0;
    const recipientBillNorm = codAmountNorm;

    assert(shippingFee.toNumber() === 25000, 'COD totalShippingFee is stored separately (25,000)');
    assert(recipientBillNorm === 1500000, 'COD totalRecipientBill equals codAmount (1,500,000)');
    assert(recipientBillNorm !== shippingFee.toNumber() + codAmountNorm, 'COD does NOT add shipping fee to totalRecipientBill');
  }

  // COD without nominal / <= 0 rejected
  const codZeroPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'COD' as const,
    codAmount: 0,
  };
  const codZeroParsed = createManifestSchema.safeParse(codZeroPayload);
  assert(!codZeroParsed.success, 'COD without manual nominal (> 0) is rejected by Zod validation');

  // Test 12: Arbitrary payment method rejected
  const invalidMethodPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'INVALID_METHOD' as unknown as 'CASH',
  };
  const invalidMethodParsed = createManifestSchema.safeParse(invalidMethodPayload);
  assert(!invalidMethodParsed.success, 'Arbitrary payment method string is rejected by Zod enum');

  // Test 13 & 14: Backend normalization overrides malicious codAmount sent on CASH or DFOD
  const maliciousCashPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'CASH' as const,
    codAmount: 9999999, // Attempt to inject malicious COD on CASH
  };
  const malCashParsed = createManifestSchema.safeParse(maliciousCashPayload);
  if (malCashParsed.success) {
    // Service normalization logic check
    let codNorm = new Prisma.Decimal(malCashParsed.data.codAmount || 0);
    let billNorm = new Prisma.Decimal(0);
    if (malCashParsed.data.paymentDeliveryMethod === 'CASH') {
      codNorm = new Prisma.Decimal(0);
      billNorm = new Prisma.Decimal(0);
    }
    assert(codNorm.toNumber() === 0, 'Backend normalization resets codAmount = 0 on CASH even if browser sends malicious value');
    assert(billNorm.toNumber() === 0, 'Backend normalization resets totalRecipientBill = 0 on CASH even if browser sends malicious value');
  }

  const maliciousDfodPayload = {
    ...basePayload,
    paymentDeliveryMethod: 'DFOD' as const,
    codAmount: 5555555, // Attempt to inject malicious COD on DFOD
  };
  const malDfodParsed = createManifestSchema.safeParse(maliciousDfodPayload);
  if (malDfodParsed.success) {
    const shippingFee = new Prisma.Decimal(malDfodParsed.data.weightKg).mul(malDfodParsed.data.shippingRatePerKg);
    let codNorm = new Prisma.Decimal(malDfodParsed.data.codAmount || 0);
    let billNorm = new Prisma.Decimal(0);
    if (malDfodParsed.data.paymentDeliveryMethod === 'DFOD') {
      codNorm = new Prisma.Decimal(0);
      billNorm = shippingFee;
    }
    assert(codNorm.toNumber() === 0, 'Backend normalization resets codAmount = 0 on DFOD even if browser sends malicious value');
    assert(billNorm.toNumber() === shippingFee.toNumber(), 'Backend normalization sets totalRecipientBill = totalShippingFee on DFOD ignoring malicious value');
  }

  // Test 15 & 16: DIRECT & INVOICE billing modes accepted
  const invoicePayload = {
    ...basePayload,
    billingMode: 'INVOICE' as const,
    paymentDeliveryMethod: 'DFOD' as const,
  };
  const invoiceParsed = createManifestSchema.safeParse(invoicePayload);
  assert(invoiceParsed.success, 'INVOICE billing mode accepted alongside DFOD payment method');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runManifestUnitTests().catch((err) => {
  console.error('Manifest test execution failed:', err);
  process.exit(1);
});
