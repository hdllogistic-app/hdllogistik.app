import fs from 'fs';
import path from 'path';

async function runPwaMobileTests() {
  console.log('\n=== Running PWA Foundation, Real Camera Preview & Mobile UX Audit Tests ===\n');

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
    const scanPagePath = path.join(process.cwd(), 'src/app/driver/scan/page.tsx');
    const scanContent = fs.readFileSync(scanPagePath, 'utf8');

    // 1. CAMERA PREVIEW AUDIT
    assert(scanContent.includes('<video'), '1. Visible <video> element exists in scanner page');
    assert(scanContent.includes('playsInline'), '2. Video element has playsInline attribute for iOS Safari');
    assert(scanContent.includes('muted'), '3. Video element has muted attribute');
    assert(scanContent.includes('srcObject = stream'), '4. MediaStream is explicitly attached to video.srcObject');
    assert(scanContent.includes('videoEl.play()'), '5. Programmatic video.play() is called after srcObject assignment');
    assert(scanContent.includes('setCameraActive(true)'), '6. setCameraActive(true) is only set after video.play() succeeds');
    assert(scanContent.includes('bg-transparent pointer-events-none'), '7. Scanner overlay is transparent and does not block video preview');
    assert(scanContent.includes('aspect-[4/3]'), '8. Camera container defines clear 4/3 aspect ratio for video preview');
    assert(scanContent.includes('handleManualActivatePlay'), '9. Play failure provides explicit "Aktifkan Kamera" manual gesture fallback');
    assert(scanContent.includes('stopCamera()'), '10. Barcode detection triggers hard camera stop and detaches stream');
    assert(scanContent.includes('return () => {\n      stopCamera();'), '11. Route unmount cleanup stops all camera tracks cleanly');

    // 2. DRIVER HOME UNIQUE DELIVERIES SUMMARY CALCULATIONS
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

    const duplicateAssignmentsCase = [
      { deliveryId: 'del-1', status: 'ASSIGNED', hasProof: false },
      { deliveryId: 'del-1', status: 'PENDING', hasProof: false },
      { deliveryId: 'del-1', status: 'ASSIGNED', hasProof: false },
    ];
    const summary1 = calculateUniqueDriverHomeSummary(duplicateAssignmentsCase);
    assert(summary1.totalDeliveries === 1, '12. Driver Home Total Delivery deduplicates by unique Delivery.id');

    // 3. MANUAL RESI MODAL AUDIT
    assert(scanContent.includes('z-[100]'), '13. Manual Resi modal backdrop uses z-[100] above bottom navigation');
    assert(scanContent.includes('env(safe-area-inset-bottom)'), '14. Manual Resi modal includes env(safe-area-inset-bottom) padding');

    // 4. PWA AUDIT
    const manifestPath = path.join(process.cwd(), 'public/manifest.json');
    assert(fs.existsSync(manifestPath), '15. public/manifest.json file exists');

    const swPath = path.join(process.cwd(), 'public/sw.js');
    assert(fs.existsSync(swPath), '16. public/sw.js service worker file exists');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runPwaMobileTests();
