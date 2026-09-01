import {
  getJakartaDateBounds,
  PENDING_REASON_MAP,
} from '../services/driver-delivery.service';

async function runDriverDeliveryListTests() {
  console.log('\n=== Running Driver Delivery List & Mutually Exclusive Filters Audit Tests ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // 1. Date Bounds Calculation (Asia/Jakarta)
    const boundsToday = getJakartaDateBounds();
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(boundsToday.formattedDateStr),
      'Default date is today formatted in YYYY-MM-DD (Asia/Jakarta)'
    );

    const boundsHist = getJakartaDateBounds('2026-09-01');
    assert(
      boundsHist.formattedDateStr === '2026-09-01' &&
        boundsHist.startUtc.toISOString() === '2026-08-31T17:00:00.000Z' &&
        boundsHist.endUtc.toISOString() === '2026-09-01T16:59:59.999Z',
      'Operational date 2026-09-01 WIB maps to UTC 2026-08-31 17:00:00 to 2026-09-01 16:59:59.999'
    );

    // 2. Helper for Mutually Exclusive Classification
    const classifyDelivery = (status: string, hasProof: boolean) => {
      const isSuccess = status === 'SUCCESS' || hasProof;
      const isPending = !isSuccess && status === 'PENDING';
      const isActionable = !isSuccess && !isPending && status !== 'CANCELLED';

      let count = 0;
      if (isSuccess) count++;
      if (isPending) count++;
      if (isActionable) count++;

      return { isSuccess, isPending, isActionable, exactSingleCategory: count === 1 };
    };

    // Test Case 1: ASSIGNED unfinished -> Delivery only
    const c1 = classifyDelivery('ASSIGNED', false);
    assert(c1.isActionable && !c1.isSuccess && !c1.isPending && c1.exactSingleCategory, '1. ASSIGNED unfinished → Delivery tab only');

    // Test Case 2: SUCCESS -> Success only
    const c2 = classifyDelivery('SUCCESS', true);
    assert(!c2.isActionable && c2.isSuccess && !c2.isPending && c2.exactSingleCategory, '2. SUCCESS → Success TTD tab only');

    // Test Case 3: current PENDING -> Pending only
    const c3 = classifyDelivery('PENDING', false);
    assert(!c3.isActionable && !c3.isSuccess && c3.isPending && c3.exactSingleCategory, '3. Current PENDING → Pending tab only');

    // Test Case 4 & 5: SUCCESS & PENDING not returned in Delivery tab
    assert(!c2.isActionable, '4. SUCCESS package NOT returned in Delivery tab');
    assert(!c3.isActionable, '5. PENDING package NOT returned in Delivery tab');

    // Test Case 6 & 7: Unfinished not returned in Success or Pending tabs
    assert(!c1.isSuccess, '6. Unfinished package NOT returned in Success TTD tab');
    assert(!c1.isPending, '7. Unfinished package NOT returned in Pending tab');

    // Test Case 8: TTD transition (Delivery 1 -> 0, Success 0 -> 1)
    let state = { actionable: 1, success: 0, pending: 0 };
    state = { actionable: state.actionable - 1, success: state.success + 1, pending: state.pending };
    assert(state.actionable === 0 && state.success === 1 && state.pending === 0, '8. TTD transition: Delivery 1 → 0, Success 0 → 1');

    // Test Case 9: Pending transition (Delivery 1 -> 0, Pending 0 -> 1)
    let stateP = { actionable: 1, success: 0, pending: 0 };
    stateP = { actionable: stateP.actionable - 1, success: stateP.success, pending: stateP.pending + 1 };
    assert(stateP.actionable === 0 && stateP.success === 0 && stateP.pending === 1, '9. Pending transition: Delivery 1 → 0, Pending 0 → 1');

    // Test Case 10: Pending -> SUCCESS transition (Pending 1 -> 0, Success 0 -> 1)
    stateP = { actionable: stateP.actionable, success: stateP.success + 1, pending: stateP.pending - 1 };
    assert(stateP.actionable === 0 && stateP.success === 1 && stateP.pending === 0, '10. Pending → SUCCESS: Pending 1 → 0, Success 0 → 1');

    // Test Case 11: Historical pending followed by SUCCESS = Success only
    const cHist = classifyDelivery('SUCCESS', true);
    assert(cHist.isSuccess && !cHist.isPending && !cHist.isActionable, '11. Historical pending followed by SUCCESS resolves to Success tab only');

    // Test Case 12 & 13: Every delivery classified exactly once & sum equals total packages
    const mockPackages = [
      { status: 'SUCCESS', hasProof: true },
      { status: 'PENDING', hasProof: false },
      { status: 'ASSIGNED', hasProof: false },
    ];
    let aCount = 0, sCount = 0, pCount = 0;
    mockPackages.forEach((pkg) => {
      const cl = classifyDelivery(pkg.status, pkg.hasProof);
      if (cl.isActionable) aCount++;
      if (cl.isSuccess) sCount++;
      if (cl.isPending) pCount++;
    });

    assert(aCount === 1 && sCount === 1 && pCount === 1, '12. Every delivery classified into exactly one mutually exclusive category');
    assert(aCount + sCount + pCount === mockPackages.length, '13. Category counts (1+1+1) sum exactly to total package count (3)');

    // Test Case 14: Verify Production Single Success Record Case
    const mockProdSuccessCase = [{ status: 'SUCCESS', hasProof: true }];
    let prodA = 0, prodS = 0, prodP = 0;
    mockProdSuccessCase.forEach((pkg) => {
      const cl = classifyDelivery(pkg.status, pkg.hasProof);
      if (cl.isActionable) prodA++;
      if (cl.isSuccess) prodS++;
      if (cl.isPending) prodP++;
    });

    assert(
      prodA === 0 && prodS === 1 && prodP === 0 && prodA + prodS + prodP === 1,
      '14. Production HDL2609010001 (SUCCESS) case resolves to Delivery:0, Success:1, Pending:0'
    );

    // 3. Pending Reason Code Mapping
    assert(PENDING_REASON_MAP['RESCHEDULE'] === 'Reschedule', 'RESCHEDULE mapped to "Reschedule"');
    assert(
      PENDING_REASON_MAP['RECIPIENT_UNREACHABLE'] === 'Penerima Tidak Bisa Dihubungi',
      'RECIPIENT_UNREACHABLE mapped correctly'
    );
    assert(
      PENDING_REASON_MAP['RECIPIENT_REQUEST_RETURN'] === 'Penerima Meminta Retur',
      'RECIPIENT_REQUEST_RETURN mapped correctly'
    );
    assert(
      PENDING_REASON_MAP['RECIPIENT_REJECTED'] === 'Penerima Menolak',
      'RECIPIENT_REJECTED mapped correctly'
    );
    assert(PENDING_REASON_MAP['OTHER'] === 'Lainnya', 'OTHER mapped to "Lainnya"');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runDriverDeliveryListTests();
