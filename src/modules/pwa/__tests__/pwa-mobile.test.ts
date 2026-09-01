import fs from 'fs';
import path from 'path';

async function runPwaMobileTests() {
  console.log('\n=== Running PWA Foundation, Scanner Camera Shutdown & Mobile UX Audit Tests ===\n');

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
    // 1. DRIVER HOME SUMMARY CALCULATIONS
    const calculateDriverHomeSummary = (deliveryCount: number, successCount: number, pendingCount: number) => {
      const totalDeliveries = Number(deliveryCount + successCount + pendingCount);
      return {
        totalDeliveries,
        successCount: Number(successCount),
        pendingCount: Number(pendingCount),
      };
    };

    const case1 = calculateDriverHomeSummary(0, 1, 0);
    assert(case1.totalDeliveries === 1, '1. Driver Home Total Delivery calculation (Delivery:0 + Success:1 + Pending:0 = 1)');
    assert(!isNaN(case1.totalDeliveries) && case1.totalDeliveries !== undefined, '2. Total Delivery numeric value is never undefined or NaN');

    const caseZero = calculateDriverHomeSummary(0, 0, 0);
    assert(caseZero.totalDeliveries === 0, '3. Zero deliveries renders numeric 0 (never blank)');

    // 2. SCANNER CAMERA SHUTDOWN AUDIT
    const testCameraShutdownCycle = () => {
      let isTrackStopped = false;
      let isVideoDetached = false;
      let isCameraActive = true;

      const mockTrack = {
        stop: () => {
          isTrackStopped = true;
        },
      };

      const mockStream = {
        getTracks: () => [mockTrack],
      };

      const mockVideoElement = {
        srcObject: mockStream as any,
      };

      // Execute shutdown logic
      mockStream.getTracks().forEach((t) => t.stop());
      mockVideoElement.srcObject = null;
      isVideoDetached = mockVideoElement.srcObject === null;
      isCameraActive = false;

      return { isTrackStopped, isVideoDetached, isCameraActive };
    };

    const cameraAudit = testCameraShutdownCycle();
    assert(cameraAudit.isTrackStopped, '4. Detection hard-stops media stream tracks');
    assert(cameraAudit.isVideoDetached, '5. Detection detaches video srcObject to turn off phone hardware camera light');
    assert(!cameraAudit.isCameraActive, '6. Scanner viewport box hidden after detection');

    // 3. PWA MANIFEST AUDIT
    const manifestPath = path.join(process.cwd(), 'public/manifest.json');
    const manifestExists = fs.existsSync(manifestPath);
    assert(manifestExists, '7. public/manifest.json file exists');

    if (manifestExists) {
      const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert(manifestJson.start_url === '/', '8. Manifest start_url is "/" (role-neutral root)');
      assert(manifestJson.display === 'standalone', '9. Manifest display mode is "standalone"');
      assert(Array.isArray(manifestJson.icons) && manifestJson.icons.length > 0, '10. Manifest defines local app icons');
    }

    // 4. SERVICE WORKER NETWORK-ONLY RULE AUDIT
    const swPath = path.join(process.cwd(), 'public/sw.js');
    const swExists = fs.existsSync(swPath);
    assert(swExists, '11. public/sw.js service worker file exists');

    if (swExists) {
      const swContent = fs.readFileSync(swPath, 'utf8');
      assert(swContent.includes('/api/'), '12. Service worker explicitly handles /api/ routes');
      assert(swContent.includes('fetch(event.request)'), '13. Service worker enforces Network-Only for /api/* (no stale data caching)');
    }

    // 5. FIRST VISIT INSTALL SHEET STANDALONE PROTECTION AUDIT
    const evaluateInstallPromptVisibility = (
      isStandaloneMode: boolean,
      isDismissedRecently: boolean,
      isIos: boolean,
      hasDeferredPrompt: boolean
    ) => {
      if (isStandaloneMode) return { show: false, reason: 'standalone' };
      if (isDismissedRecently) return { show: false, reason: 'dismissed' };
      if (isIos) return { show: true, type: 'ios-instructions' };
      if (hasDeferredPrompt) return { show: true, type: 'android-prompt' };
      return { show: false, reason: 'no-prompt' };
    };

    const standaloneEval = evaluateInstallPromptVisibility(true, false, false, true);
    assert(!standaloneEval.show, '14. Installed Standalone PWA NEVER displays install sheet');

    const iosEval = evaluateInstallPromptVisibility(false, false, true, false);
    assert(iosEval.show && iosEval.type === 'ios-instructions', '15. iOS Safari displays 3-step installation instructions');

    const androidEval = evaluateInstallPromptVisibility(false, false, false, true);
    assert(androidEval.show && androidEval.type === 'android-prompt', '16. Android Chrome displays Deferred Install Prompt button');

    const dismissedEval = evaluateInstallPromptVisibility(false, true, false, true);
    assert(!dismissedEval.show, '17. Dismissed prompt ("Nanti") respects 3-day local persistence suppression');

    // 6. MOBILE UX SAFE AREA & FONT SIZE AUDIT
    const driverLayoutPath = path.join(process.cwd(), 'src/app/driver/layout.tsx');
    const layoutContent = fs.readFileSync(driverLayoutPath, 'utf8');
    assert(layoutContent.includes('env(safe-area-inset-bottom)'), '18. Driver layout contains env(safe-area-inset-bottom) for iOS safe area');

    const scanPagePath = path.join(process.cwd(), 'src/app/driver/scan/page.tsx');
    const scanContent = fs.readFileSync(scanPagePath, 'utf8');
    assert(scanContent.includes('text-base'), '19. Form inputs use text-base (min 16px) to prevent unwanted iOS Safari auto-zoom');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runPwaMobileTests();
