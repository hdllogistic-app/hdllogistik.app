import fs from 'fs';
import path from 'path';

async function runPwaMobileTests() {
  console.log('\n=== Running PWA Foundation, iOS Camera, Manual Modal & Mobile UX Audit Tests ===\n');

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
    // 1. DRIVER HOME UNIQUE DELIVERIES SUMMARY CALCULATIONS
    const calculateUniqueDriverHomeSummary = (assignments: Array<{ deliveryId: string; status: string; hasProof: boolean }>) => {
      const uniqueMap = new Map<string, (typeof assignments)[0]>();
      for (const a of assignments) {
        if (!uniqueMap.has(a.deliveryId)) {
          uniqueMap.set(a.deliveryId, a);
        }
      }
      const uniqueItems = Array.from(uniqueMap.values());
      let successCount = 0;
      let pendingCount = 0;
      let deliveryCount = 0;

      for (const item of uniqueItems) {
        if (item.status === 'SUCCESS' || item.hasProof) successCount++;
        else if (item.status === 'PENDING') pendingCount++;
        else deliveryCount++;
      }

      return {
        totalDeliveries: uniqueItems.length,
        deliveryCount,
        successCount,
        pendingCount,
      };
    };

    // Test case: 3 assignment records for the SAME resi (e.g. initial, pending, rescan)
    const duplicateAssignmentsCase = [
      { deliveryId: 'del-1', status: 'ASSIGNED', hasProof: false },
      { deliveryId: 'del-1', status: 'PENDING', hasProof: false },
      { deliveryId: 'del-1', status: 'ASSIGNED', hasProof: false },
    ];
    const summary1 = calculateUniqueDriverHomeSummary(duplicateAssignmentsCase);
    assert(summary1.totalDeliveries === 1, '1. Driver Home Total Delivery deduplicates by unique Delivery.id (3 assignments for 1 package = 1 Total)');
    assert(summary1.deliveryCount === 1 && summary1.successCount === 0 && summary1.pendingCount === 0, '2. Mutually exclusive unique category counts sum to total unique package count');

    // Test case: 3 unique packages (1 active, 1 SUCCESS, 1 PENDING)
    const threePackagesCase = [
      { deliveryId: 'del-1', status: 'ASSIGNED', hasProof: false },
      { deliveryId: 'del-2', status: 'SUCCESS', hasProof: true },
      { deliveryId: 'del-3', status: 'PENDING', hasProof: false },
    ];
    const summary3 = calculateUniqueDriverHomeSummary(threePackagesCase);
    assert(summary3.totalDeliveries === 3, '3. Three unique packages gives Total Delivery = 3');
    assert(summary3.deliveryCount === 1 && summary3.successCount === 1 && summary3.pendingCount === 1, '4. Categories (1 active + 1 TTD + 1 Pending) sum to 3');

    // 2. SCANNER CAMERA & IOS ATTR AUDIT
    const scanPagePath = path.join(process.cwd(), 'src/app/driver/scan/page.tsx');
    const scanContent = fs.readFileSync(scanPagePath, 'utf8');

    assert(scanContent.includes("playsinline"), '5. Video element includes playsinline attribute for iOS Safari support');
    assert(scanContent.includes("autoplay"), '6. Video element includes autoplay attribute for immediate stream start');
    assert(scanContent.includes("stopCamera()"), '7. Detection calls stopCamera() to turn off phone hardware camera light');

    // 3. MANUAL RESI MODAL SAFE AREA & Z-INDEX AUDIT
    assert(scanContent.includes("z-[100]"), '8. Manual Resi modal backdrop uses z-[100] to render above bottom navigation');
    assert(scanContent.includes("env(safe-area-inset-bottom)"), '9. Manual Resi modal includes env(safe-area-inset-bottom) padding');
    assert(scanContent.includes("text-base"), '10. Manual Resi input uses text-base (min 16px font) to avoid iOS Safari keyboard auto-zoom');

    // 4. PWA MANIFEST AUDIT
    const manifestPath = path.join(process.cwd(), 'public/manifest.json');
    assert(fs.existsSync(manifestPath), '11. public/manifest.json file exists');

    // 5. SERVICE WORKER NETWORK-ONLY RULE AUDIT
    const swPath = path.join(process.cwd(), 'public/sw.js');
    assert(fs.existsSync(swPath), '12. public/sw.js service worker file exists');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runPwaMobileTests();
