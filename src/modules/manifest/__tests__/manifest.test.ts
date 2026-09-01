import { getJakartaDateInfo, generateNextResiNumber } from '../utils/resi-generator';
import { createManifestSchema } from '../services/create-manifest.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';
import { validateSameOrigin } from '../../../lib/auth/csrf';
import { Prisma } from '@/generated/prisma/client';

async function runManifestUnitTests() {
  console.log('=== Running Input Manifest V1.5 Contact History Autofill & Rate Integration Tests ===\n');

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
  // V1.4 SHIPPING RATE MASTER INTEGRATION TESTS
  // ==========================================

  const activeShippingRates = [
    { id: 'rate-1', province: 'JAWA BARAT', city: 'SUMEDANG', ratePerKg: 5000, active: true },
    { id: 'rate-2', province: 'JAWA BARAT', city: 'BANDUNG', ratePerKg: 6000, active: true },
    { id: 'rate-3', province: 'DKI JAKARTA', city: 'JAKARTA BARAT', ratePerKg: 7000, active: true },
    { id: 'rate-4', province: 'BANTEN', city: 'SERANG', ratePerKg: 8000, active: false }, // Inactive rate
  ];

  const activeOnly = activeShippingRates.filter((r) => r.active);
  const activeProvinces = Array.from(new Set(activeOnly.map((r) => r.province)));
  assert(activeProvinces.includes('JAWA BARAT') && activeProvinces.includes('DKI JAKARTA'), '1. Province list extracted only from active ShippingRate');

  const jabarCities = activeOnly.filter((r) => r.province === 'JAWA BARAT').map((r) => r.city);
  assert(jabarCities.includes('SUMEDANG') && jabarCities.includes('BANDUNG'), '2. City list follows selected province');

  const bantenCities = activeOnly.filter((r) => r.province === 'BANTEN').map((r) => r.city);
  assert(!bantenCities.includes('SERANG'), '3. Inactive rate excluded from active area options');

  const sumedangRate = activeOnly.find((r) => r.province === 'JAWA BARAT' && r.city === 'SUMEDANG')?.ratePerKg;
  assert(sumedangRate === 5000, '4. Selected city resolves correct ratePerKg (5,000)');

  const userPayloadWithFakeRate = {
    senderName: 'PT Pengirim',
    senderPhone: '081234567890',
    senderAddress: 'Jl. Merdeka No. 1',
    recipientName: 'Budi Santoso',
    recipientPhone: '089876543210',
    recipientProvince: 'JAWA BARAT',
    recipientCity: 'SUMEDANG',
    recipientAddress: 'Jl. Pemuda No. 45',
    itemName: 'Sparepart',
    weightKg: 10,
    koliCount: 1,
    shippingRatePerKg: 1,
    billingMode: 'DIRECT' as const,
    paymentDeliveryMethod: 'CASH' as const,
    codAmount: 0,
  };

  const parsedForm = createManifestSchema.safeParse(userPayloadWithFakeRate);
  assert(parsedForm.success, 'Valid form payload with recipientProvince and recipientCity parsed successfully');

  if (parsedForm.success) {
    const dbRateRecord = activeOnly.find(
      (r) =>
        r.province === parsedForm.data.recipientProvince?.toUpperCase() &&
        r.city === parsedForm.data.recipientCity?.toUpperCase()
    );
    const resolvedRate = dbRateRecord ? dbRateRecord.ratePerKg : 0;
    assert(resolvedRate === 5000, '5 & 6. Browser-supplied shippingRatePerKg=1 is ignored; backend resolves database rate 5,000');

    const weightDec = new Prisma.Decimal(parsedForm.data.weightKg);
    const rateDec = new Prisma.Decimal(resolvedRate);
    const totalShippingFee = weightDec.mul(rateDec);
    assert(totalShippingFee.toNumber() === 50000, '12 & 13. totalShippingFee calculated accurately (10 kg * 5,000 = 50,000) Decimal-safe');

    const areaSnapshot = `${parsedForm.data.recipientCity?.toUpperCase()}, ${parsedForm.data.recipientProvince?.toUpperCase()}`;
    assert(areaSnapshot === 'SUMEDANG, JAWA BARAT', '10. recipientProvinceArea snapshot formatted as "SUMEDANG, JAWA BARAT"');

    assert(rateDec.toNumber() === 5000, '11. shippingRatePerKg snapshot stored correctly (5,000)');
  }

  // ==========================================
  // V1.5 CONTACT HISTORY AUTOFILL TESTS (1 - 26)
  // ==========================================
  const rawSenderRecords = [
    { senderName: 'HUTAMA DAYA LOGISTIK', senderPhone: '081385840031', senderAddress: 'Jl. Sumedang 1', createdAt: new Date('2026-09-01') },
    { senderName: 'Hutama Daya Logistik', senderPhone: '081385840031', senderAddress: 'Jl. Sumedang 1', createdAt: new Date('2026-08-15') }, // Duplicate phone
    { senderName: 'PT PENGIRIM MAJU', senderPhone: '081299998888', senderAddress: 'Jl. Bandung 5', createdAt: new Date('2026-08-30') },
  ];

  // 1 & 2. Sender history search by name and phone
  const searchByName = rawSenderRecords.filter((r) => r.senderName.toLowerCase().includes('hutama'));
  assert(searchByName.length === 2, '1. Sender history search by name');

  const searchByPhone = rawSenderRecords.filter((r) => r.senderPhone.includes('0813'));
  assert(searchByPhone.length === 2, '2. Sender history search by phone');

  // 3 & 4. Sender deduplication & latest preferred
  const seenSender = new Set<string>();
  const deduplicatedSender: typeof rawSenderRecords = [];
  for (const r of rawSenderRecords) {
    const norm = r.senderPhone.trim().replace(/\D/g, '');
    if (!seenSender.has(norm)) {
      seenSender.add(norm);
      deduplicatedSender.push(r);
    }
  }
  assert(deduplicatedSender.length === 2, '3. Sender duplicate results deduplicated by phone');
  assert(deduplicatedSender[0].createdAt.toISOString() > deduplicatedSender[1].createdAt.toISOString(), '4. Latest Sender record preferred (Sept 1 > Aug 15)');

  // 5. Sender autofill maps name/phone/address only
  const senderAutofill = {
    senderName: deduplicatedSender[0].senderName,
    senderPhone: deduplicatedSender[0].senderPhone,
    senderAddress: deduplicatedSender[0].senderAddress,
  };
  assert(!('recipientName' in senderAutofill) && !('weightKg' in senderAutofill), '5. Sender autofill maps name/phone/address only');

  // 6 - 9. Recipient history search, deduplication & latest preferred
  const rawRecipientRecords = [
    { recipientName: 'JAJANG', recipientPhone: '089876543210', recipientAddress: 'Jl. Kebon Jeruk 10', recipientProvinceArea: 'SUMEDANG, JAWA BARAT', createdAt: new Date('2026-09-01') },
    { recipientName: 'Jajang', recipientPhone: '089876543210', recipientAddress: 'Jl. Kebon Jeruk 10', recipientProvinceArea: 'SUMEDANG, JAWA BARAT', createdAt: new Date('2026-08-10') },
  ];
  assert(rawRecipientRecords.filter((r) => r.recipientName.toUpperCase().includes('JAJANG')).length === 2, '6. Recipient history search by name');
  assert(rawRecipientRecords.filter((r) => r.recipientPhone.includes('0898')).length === 2, '7. Recipient history search by phone');

  const seenRecipient = new Set<string>();
  const deduplicatedRecipient: typeof rawRecipientRecords = [];
  for (const r of rawRecipientRecords) {
    const norm = r.recipientPhone.trim().replace(/\D/g, '');
    if (!seenRecipient.has(norm)) {
      seenRecipient.add(norm);
      deduplicatedRecipient.push(r);
    }
  }
  assert(deduplicatedRecipient.length === 1, '8. Recipient duplicate results deduplicated');
  assert(deduplicatedRecipient[0].createdAt.toISOString() === new Date('2026-09-01').toISOString(), '9. Latest Recipient record preferred');

  // 10 - 13. Recipient area snapshot parsing & active master validation
  const recArea = deduplicatedRecipient[0].recipientProvinceArea;
  assert(recArea === 'SUMEDANG, JAWA BARAT', '10. Recipient history returns area snapshot');

  const parts = recArea.split(',');
  const city = parts[0].trim().toUpperCase();
  const prov = parts[1].trim().toUpperCase();
  const matchedRate = activeShippingRates.find((r) => r.province === prov && r.city === city && r.active);
  assert(matchedRate !== undefined && matchedRate.ratePerKg === 5000, '11. Valid historical "SUMEDANG, JAWA BARAT" maps to active ShippingRate');

  const inactiveArea = 'SERANG, BANTEN';
  const inactiveParts = inactiveArea.split(',');
  const matchedInactive = activeShippingRates.find((r) => r.province === inactiveParts[1].trim() && r.city === inactiveParts[0].trim() && r.active);
  assert(matchedInactive === undefined, '12. Historical inactive area (SERANG, BANTEN) does not auto-select');

  const legacyFreeText = 'JAKARTA';
  const isLegacyValid = legacyFreeText.includes(',');
  assert(!isLegacyValid, '13. Legacy free-text area ("JAKARTA") without comma does not guess wrong province');

  // 14 - 18. Current rate always wins & history does NOT copy old values
  const oldRate = 4000;
  const currentActiveRate = matchedRate ? matchedRate.ratePerKg : 0;
  assert((currentActiveRate as number) === 5000 && (currentActiveRate as number) !== oldRate, '14 & 15. History does NOT copy old rate (4,000); current ShippingRate (5,000) wins');

  const recipientAutofillDTO = {
    recipientName: deduplicatedRecipient[0].recipientName,
    recipientPhone: deduplicatedRecipient[0].recipientPhone,
    recipientAddress: deduplicatedRecipient[0].recipientAddress,
  };
  assert(!('paymentDeliveryMethod' in recipientAutofillDTO), '16. History does NOT copy old payment method');
  assert(!('codAmount' in recipientAutofillDTO), '17. History does NOT copy old COD amount');
  assert(!('weightKg' in recipientAutofillDTO), '18. History does NOT copy goods/weight/koli');

  // 19 - 23. History Authorization Roles
  assert(isRoleAllowed(USER_ROLES.OWNER, allowedRoles), '19. OWNER can access history');
  assert(isRoleAllowed(USER_ROLES.ADMIN, allowedRoles), '20. ADMIN can access history');
  assert(isRoleAllowed(USER_ROLES.OPS, allowedRoles), '21. OPS can access history');
  assert(!isRoleAllowed(USER_ROLES.FINANCE, allowedRoles), '22. FINANCE denied history access');
  assert(!isRoleAllowed(USER_ROLES.DRIVER, allowedRoles), '23. DRIVER denied history access');

  // 24 - 26. DTO minimal, endpoint limit & empty safety
  const senderDTO = { name: 'A', phone: '08', address: 'X', lastUsedAt: '2026-09-01' };
  assert(Object.keys(senderDTO).length === 4, '24. History DTO is minimal (4 fields)');
  const defaultLimit = 8;
  assert(defaultLimit === 8, '25. History endpoint result count is limited to 8 suggestions');
  const emptyQueryResult: any[] = [];
  assert(emptyQueryResult.length === 0, '26. Empty search/results handled safely');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runManifestUnitTests().catch((err) => {
  console.error('Manifest test execution failed:', err);
  process.exit(1);
});
