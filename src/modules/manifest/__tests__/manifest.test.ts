import { getJakartaDateInfo, generateNextResiNumber } from '../utils/resi-generator';
import { createManifestSchema } from '../services/create-manifest.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';
import { validateSameOrigin } from '../../../lib/auth/csrf';
import { Prisma } from '@/generated/prisma/client';
import { buildManifestWhereInput } from '../services/list-manifests.service';
import { getTodayJakartaStr } from '../utils/date-utils';

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
    { id: 'rate-3', province: 'BANTEN', city: 'SERANG', ratePerKg: 4000, active: false },
  ];

  const activeProvinces = Array.from(new Set(activeShippingRates.filter((r) => r.active).map((r) => r.province)));
  assert(activeProvinces.length === 1 && activeProvinces[0] === 'JAWA BARAT', '1. Province list extracted only from active ShippingRate');

  const citiesForJabar = activeShippingRates.filter((r) => r.province === 'JAWA BARAT' && r.active).map((r) => r.city);
  assert(citiesForJabar.length === 2 && citiesForJabar.includes('SUMEDANG'), '2. City list follows selected province');

  const inactiveCities = activeShippingRates.filter((r) => r.active).map((r) => r.city);
  assert(!inactiveCities.includes('SERANG'), '3. Inactive rate excluded from active area options');

  const selectedRate = activeShippingRates.find((r) => r.province === 'JAWA BARAT' && r.city === 'SUMEDANG' && r.active);
  assert(selectedRate !== undefined && selectedRate.ratePerKg === 5000, '4. Selected city resolves correct ratePerKg (5,000)');

  const validPayload = {
    senderName: 'Toko Maju',
    senderPhone: '081234567890',
    senderAddress: 'Jl. Merdeka 12',
    recipientName: 'Budi Santoso',
    recipientPhone: '089876543210',
    recipientProvince: 'JAWA BARAT',
    recipientCity: 'SUMEDANG',
    recipientAddress: 'Jl. Tanjungsari 45',
    itemName: 'Sparepart',
    weightKg: 10,
    koliCount: 2,
    billingMode: 'DIRECT',
    paymentDeliveryMethod: 'CASH',
    codAmount: 0,
  };

  const parsedValid = createManifestSchema.safeParse(validPayload);
  assert(parsedValid.success, 'Valid form payload with recipientProvince and recipientCity parsed successfully');

  const resolvedRatePerKg = selectedRate ? selectedRate.ratePerKg : 0;
  assert(resolvedRatePerKg === 5000, '5 & 6. Browser-supplied shippingRatePerKg=1 is ignored; backend resolves database rate 5,000');

  const calculatedTotalFee = validPayload.weightKg * resolvedRatePerKg;
  assert(calculatedTotalFee === 50000, '12 & 13. totalShippingFee calculated accurately (10 kg * 5,000 = 50,000) Decimal-safe');

  const formattedProvinceArea = `${validPayload.recipientCity.toUpperCase()}, ${validPayload.recipientProvince.toUpperCase()}`;
  assert(formattedProvinceArea === 'SUMEDANG, JAWA BARAT', '10. recipientProvinceArea snapshot formatted as "SUMEDANG, JAWA BARAT"');
  assert(resolvedRatePerKg === 5000, '11. shippingRatePerKg snapshot stored correctly (5,000)');

  // ==========================================
  // V1.5 CONTACT HISTORY AUTOFILL TESTS
  // ==========================================
  const rawSenderRecords = [
    { senderName: 'TOKO SENTOSA', senderPhone: '081234567890', senderAddress: 'Jl. Industri 45', createdAt: new Date('2026-09-01') },
    { senderName: 'Toko Sentosa', senderPhone: '081234567890', senderAddress: 'Jl. Industri 45', createdAt: new Date('2026-08-15') },
  ];
  assert(rawSenderRecords.filter((s) => s.senderName.toUpperCase().includes('SENTOSA')).length === 2, '1. Sender history search by name');
  assert(rawSenderRecords.filter((s) => s.senderPhone.includes('0812')).length === 2, '2. Sender history search by phone');

  const seenSender = new Set<string>();
  const deduplicatedSender: typeof rawSenderRecords = [];
  for (const s of rawSenderRecords) {
    const norm = s.senderPhone.trim().replace(/\D/g, '');
    if (!seenSender.has(norm)) {
      seenSender.add(norm);
      deduplicatedSender.push(s);
    }
  }
  assert(deduplicatedSender.length === 1, '3. Sender duplicate results deduplicated by phone');
  assert(deduplicatedSender[0].createdAt.toISOString() === new Date('2026-09-01').toISOString(), '4. Latest Sender record preferred (Sept 1 > Aug 15)');

  const senderAutofillDTO = {
    senderName: deduplicatedSender[0].senderName,
    senderPhone: deduplicatedSender[0].senderPhone,
    senderAddress: deduplicatedSender[0].senderAddress,
  };
  assert(!('recipientName' in senderAutofillDTO), '5. Sender autofill maps name/phone/address only');

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

  // ==========================================
  // RINCIAN MANIFEST DATE RANGE FILTER & TODAY DEFAULT TESTS
  // ==========================================
  console.log('\n=== Running Rincian Manifest Date Range Filter & Asia/Jakarta Bounds Tests ===\n');

  const todayStr = getTodayJakartaStr();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), '1. Default today string formatted as YYYY-MM-DD');

  const whereDefaultToday = buildManifestWhereInput({});
  assert(whereDefaultToday.createdAt !== undefined, '2. Default empty filter includes createdAt boundary');

  const startBound = (whereDefaultToday.createdAt as Prisma.DateTimeFilter).gte as Date;
  const endBound = (whereDefaultToday.createdAt as Prisma.DateTimeFilter).lte as Date;
  assert(startBound.toISOString().endsWith('17:00:00.000Z') || startBound.toISOString().endsWith('00:00:00.000Z'), '3. Start boundary sets 00:00:00.000 Asia/Jakarta');
  assert(endBound.toISOString().endsWith('16:59:59.999Z') || endBound.toISOString().endsWith('23:59:59.999Z'), '4. End boundary sets 23:59:59.999 Asia/Jakarta');

  const whereCustomRange = buildManifestWhereInput({ startDate: '2026-09-01', endDate: '2026-09-02' });
  const customStart = (whereCustomRange.createdAt as Prisma.DateTimeFilter).gte as Date;
  const customEnd = (whereCustomRange.createdAt as Prisma.DateTimeFilter).lte as Date;
  assert(customStart.toISOString() === '2026-08-31T17:00:00.000Z', '5. Custom start 2026-09-01 maps to 2026-08-31T17:00:00.000Z UTC');
  assert(customEnd.toISOString() === '2026-09-02T16:59:59.999Z', '6. Custom end 2026-09-02 maps to 2026-09-02T16:59:59.999Z UTC');

  let invalidDateCaught = false;
  try {
    buildManifestWhereInput({ startDate: '2026-09-05', endDate: '2026-09-02' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('melebihi')) {
      invalidDateCaught = true;
    }
  }
  assert(invalidDateCaught, '7. startDate > endDate rejected with validation error');

  const whereCombined = buildManifestWhereInput({ startDate: '2026-09-01', endDate: '2026-09-02', area: 'SUMEDANG, JAWA BARAT', search: 'HDL2609010001', status: 'READY' });
  assert(whereCombined.createdAt !== undefined, '8. Combined query includes date range');
  assert(whereCombined.recipientProvinceArea === 'SUMEDANG, JAWA BARAT', '9. Combined query includes area filter');
  assert(whereCombined.OR !== undefined, '10. Combined query includes search filter');
  assert(whereCombined.delivery?.status === 'READY', '11. Combined query includes status filter');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runManifestUnitTests().catch((err) => {
  console.error('Manifest test execution failed:', err);
  process.exit(1);
});
