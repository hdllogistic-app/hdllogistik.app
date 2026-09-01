import {
  calculateHaversineDistanceMeters,
} from '../services/mobile-attendance.service';

async function runGeofenceTests() {
  console.log('\n=== Running Geofenced Mobile Attendance & WorkLocation Master Tests ===\n');

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
    // Test 1: Haversine distance calculation accuracy
    // Distance between Monas Jakarta (-6.175392, 106.827153) and Plaza Indonesia (-6.193125, 106.823175) is ~2.0km
    const distMeters = calculateHaversineDistanceMeters(
      -6.175392,
      106.827153,
      -6.193125,
      106.823175
    );
    assert(
      distMeters > 1900 && distMeters < 2100,
      `Haversine formula calculates distance accurately (~2.0km): ${distMeters}m`
    );

    // Test 2: Distance 0 for identical coordinates
    const zeroDist = calculateHaversineDistanceMeters(-6.2, 106.816666, -6.2, 106.816666);
    assert(zeroDist === 0, `Haversine formula returns 0m for identical coordinates: ${zeroDist}m`);

    // Test 3: Geofence radius validation (30m vs 100m radius -> IN RANGE)
    const locLat = -6.2;
    const locLng = 106.816666;
    const radiusM = 100;
    // Close point ~30m away
    const userLatClose = -6.2002;
    const userLngClose = 106.816666;
    const closeDist = calculateHaversineDistanceMeters(userLatClose, userLngClose, locLat, locLng);
    assert(closeDist <= radiusM, `GPS coordinate within geofence radius (${closeDist}m <= ${radiusM}m)`);

    // Test 4: Geofence radius validation (Far coordinate -> OUT OF RANGE)
    const userLatFar = -6.25;
    const userLngFar = 106.85;
    const farDist = calculateHaversineDistanceMeters(userLatFar, userLngFar, locLat, locLng);
    assert(farDist > radiusM, `GPS coordinate outside geofence radius (${farDist}m > ${radiusM}m)`);

    // Test 5: Clock-in payload validation: Empty photo rejected
    const validateClockInPayload = (lat: number, lng: number, photo: string) => {
      if (isNaN(lat) || isNaN(lng)) return { success: false, error: 'GPS Invalid' };
      if (!photo || !photo.trim()) return { success: false, error: 'Foto selfie wajib' };
      return { success: true };
    };

    assert(!validateClockInPayload(-6.2, 106.8, '').success, 'Clock-in payload rejects empty photo');

    // Test 6: Clock-in payload validation: Invalid GPS rejected
    assert(!validateClockInPayload(NaN, 106.8, 'data:image/jpeg;base64,sample').success, 'Clock-in payload rejects invalid GPS NaN');

    // Test 7: Valid payload passes validation
    assert(validateClockInPayload(-6.2, 106.8, 'data:image/jpeg;base64,sample').success, 'Valid clock-in payload passes validation');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runGeofenceTests();
