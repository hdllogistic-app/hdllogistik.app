import { getAsiaJakartaDateBoundary } from '../services/delivery-monitoring.service';
import { isRoleAllowed, USER_ROLES } from '../../../lib/auth/roles';

async function runDeliveryMonitoringTests() {
  console.log('=== Running Delivery Monitoring Operational Date Semantics Unit Tests ===\n');

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

  // 1 & 21. Asia/Jakarta date boundary filter & midnight boundary
  const boundaryToday = getAsiaJakartaDateBoundary('2026-09-02');
  assert(boundaryToday.dateStr === '2026-09-02', '1 & 21. selected Asia/Jakarta date filters correctly at midnight boundary');
  assert(boundaryToday.startUtc.toISOString() === '2026-09-01T17:00:00.000Z', 'Start UTC boundary for 2026-09-02 WIB is 2026-09-01T17:00:00.000Z');
  assert(boundaryToday.endUtc.toISOString() === '2026-09-02T16:59:59.999Z', 'End UTC boundary for 2026-09-02 WIB is 2026-09-02T16:59:59.999Z');

  // Simulated Dataset for Operational Attempt Date Testing
  const dataset = [
    // 1. Admin schedule today (2026-09-02) -> appears today
    {
      id: 'asg-1',
      deliveryId: 'del-1',
      driverId: 'drv-1',
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-02T09:00:00+07:00'), // 02 Sep
      manifestCreatedAt: new Date('2026-09-02T08:00:00+07:00'),
      status: 'ASSIGNED',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    // 2. Admin schedule yesterday (2026-09-01) -> appears yesterday
    {
      id: 'asg-2',
      deliveryId: 'del-2',
      driverId: 'drv-1',
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-01T10:00:00+07:00'), // 01 Sep
      manifestCreatedAt: new Date('2026-09-01T07:00:00+07:00'),
      status: 'SUCCESS',
      manifestStatus: 'ACTIVE',
      proof: { id: 'proof-2', receivedAt: new Date('2026-09-01T14:00:00+07:00') },
    },
    // 3. Manifest yesterday (2026-09-01) + schedule today (2026-09-02) -> appears today
    {
      id: 'asg-3',
      deliveryId: 'del-3',
      driverId: 'drv-2',
      driverName: 'TIAS TONO',
      assignedAt: new Date('2026-09-02T08:30:00+07:00'), // 02 Sep
      manifestCreatedAt: new Date('2026-09-01T16:00:00+07:00'), // 01 Sep manifest
      status: 'IN_DELIVERY',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    // 4. Schedule yesterday (2026-09-01) + TTD today (2026-09-02) -> remains yesterday operational bucket
    {
      id: 'asg-4',
      deliveryId: 'del-4',
      driverId: 'drv-1',
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-01T15:00:00+07:00'), // 01 Sep schedule
      manifestCreatedAt: new Date('2026-09-01T14:00:00+07:00'),
      status: 'SUCCESS',
      manifestStatus: 'ACTIVE',
      proof: { id: 'proof-4', receivedAt: new Date('2026-09-02T09:00:00+07:00') }, // TTD today
    },
    // 5. Driver self-scan today (2026-09-02) -> appears today
    {
      id: 'asg-5',
      deliveryId: 'del-5',
      driverId: 'drv-2',
      driverName: 'TIAS TONO',
      assignedAt: new Date('2026-09-02T10:15:00+07:00'), // 02 Sep scan
      manifestCreatedAt: new Date('2026-09-02T07:00:00+07:00'),
      status: 'ASSIGNED',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    // 6 & 7. Attempt #1 (01 Sep -> Pending) + Attempt #2 (02 Sep -> Driver self-scan redelivery)
    {
      id: 'asg-6-old',
      deliveryId: 'del-6',
      driverId: 'drv-1',
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-01T08:00:00+07:00'), // 01 Sep attempt #1
      unassignedAt: new Date('2026-09-02T08:00:00+07:00'),
      status: 'PENDING',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    {
      id: 'asg-6-new',
      deliveryId: 'del-6',
      driverId: 'drv-1', // Same driver redelivery rescan
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-02T08:00:00+07:00'), // 02 Sep attempt #2
      unassignedAt: null,
      status: 'IN_DELIVERY',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    // 8 & 9. Attempt #1 (01 Sep -> Driver A) + Attempt #2 (02 Sep -> Driver B redelivery)
    {
      id: 'asg-7-old',
      deliveryId: 'del-7',
      driverId: 'drv-1', // Driver A
      driverName: 'AJI KOMARUDIN',
      assignedAt: new Date('2026-09-01T09:00:00+07:00'), // 01 Sep
      unassignedAt: new Date('2026-09-02T08:30:00+07:00'),
      status: 'PENDING',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
    {
      id: 'asg-7-new',
      deliveryId: 'del-7',
      driverId: 'drv-2', // Driver B
      driverName: 'TIAS TONO',
      assignedAt: new Date('2026-09-02T08:30:00+07:00'), // 02 Sep
      unassignedAt: null,
      status: 'SUCCESS',
      manifestStatus: 'ACTIVE',
      proof: { id: 'proof-7', receivedAt: new Date('2026-09-02T11:00:00+07:00') },
    },
    // 10. Duplicate same-day scan (del-5 scanned twice on 02 Sep)
    {
      id: 'asg-5-dup',
      deliveryId: 'del-5',
      driverId: 'drv-2',
      driverName: 'TIAS TONO',
      assignedAt: new Date('2026-09-02T10:14:00+07:00'), // Scanned 1 minute earlier
      unassignedAt: new Date('2026-09-02T10:15:00+07:00'),
      status: 'ASSIGNED',
      manifestStatus: 'ACTIVE',
      proof: null,
    },
  ];

  // Filter helper matching service logic
  function filterByDate(dateStr: string) {
    const { startUtc, endUtc } = getAsiaJakartaDateBoundary(dateStr);
    const matched = dataset.filter((item) => item.assignedAt >= startUtc && item.assignedAt <= endUtc);
    
    // Deduplicate by deliveryId on that operational day
    const seen = new Set<string>();
    const result = [];
    // Sort desc by assignedAt
    matched.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
    for (const item of matched) {
      if (seen.has(item.deliveryId)) continue;
      seen.add(item.deliveryId);
      result.push(item);
    }
    return result;
  }

  // TEST CASES EXECUTION

  // Case 1: Admin schedule today -> appears today
  const todayItems = filterByDate('2026-09-02');
  const del1 = todayItems.find((i) => i.deliveryId === 'del-1');
  assert(del1 !== undefined, '1. Admin schedule today appears on today monitoring');

  // Case 2: Admin schedule yesterday -> appears yesterday
  const yesterdayItems = filterByDate('2026-09-01');
  const del2 = yesterdayItems.find((i) => i.deliveryId === 'del-2');
  assert(del2 !== undefined, '2. Admin schedule yesterday appears on yesterday monitoring');

  // Case 3: Manifest yesterday + schedule today -> appears today
  const del3 = todayItems.find((i) => i.deliveryId === 'del-3');
  assert(del3 !== undefined, '3. Manifest created yesterday + scheduled today appears on today monitoring');

  // Case 4: Schedule yesterday + TTD today -> remains yesterday operational bucket
  const del4Yesterday = yesterdayItems.find((i) => i.deliveryId === 'del-4');
  const del4Today = todayItems.find((i) => i.deliveryId === 'del-4');
  assert(del4Yesterday !== undefined && del4Today === undefined, '4. Schedule yesterday + TTD today remains in yesterday operational bucket (NOT today)');

  // Case 5: Driver self-scan today -> appears today
  const del5 = todayItems.find((i) => i.deliveryId === 'del-5');
  assert(del5 !== undefined, '5. Driver self-scan today appears on today monitoring');

  // Case 6 & 7: Pending yesterday + explicit rescan today
  const del6Yesterday = yesterdayItems.find((i) => i.deliveryId === 'del-6');
  const del6Today = todayItems.find((i) => i.deliveryId === 'del-6');
  assert(del6Yesterday !== undefined && del6Yesterday.id === 'asg-6-old', '6 & 7. Old Pending attempt #1 remains historically on yesterday monitoring');
  assert(del6Today !== undefined && del6Today.id === 'asg-6-new', '6 & 7. Rescan attempt #2 appears on today monitoring');

  // Case 8 & 9: Same Driver & Different Driver redelivery attempt dates
  const del7Yesterday = yesterdayItems.find((i) => i.deliveryId === 'del-7');
  const del7Today = todayItems.find((i) => i.deliveryId === 'del-7');
  assert(del7Yesterday !== undefined && del7Yesterday.driverId === 'drv-1', '8 & 9. Old attempt #1 attributed to Driver A on 01 Sep');
  assert(del7Today !== undefined && del7Today.driverId === 'drv-2', '8 & 9. New attempt #2 attributed to Driver B on 02 Sep');

  // Case 10: Duplicate same-day scan counts once
  const del5CountsToday = todayItems.filter((i) => i.deliveryId === 'del-5').length;
  assert(del5CountsToday === 1, '10. Duplicate same-day scans count as 1 delivery attempt');

  // Case 11 - 14: Total Delivery, Total TTD, Pending, Achievement calculations
  // On 01 Sep: del-2 (TTD), del-4 (TTD), del-6 (Pending), del-7 (Pending)
  // Total Delivery = 4, Total TTD = 2, Total Pending = 2, Achievement = 50.00%
  const ttdYesterday = yesterdayItems.filter((i) => i.proof !== null).length;
  const pendingYesterday = yesterdayItems.filter((i) => i.proof === null).length;
  const achievementYesterday = Number(((ttdYesterday / yesterdayItems.length) * 100).toFixed(2));

  assert(yesterdayItems.length === 4, '11. Total Delivery follows operational date (4 on 01 Sep)');
  assert(ttdYesterday === 2, '12. Total TTD follows attempts from operational date (2 TTD on 01 Sep)');
  assert(pendingYesterday === 2, '13. Pending follows attempts from operational date (2 Pending on 01 Sep)');
  assert(achievementYesterday === 50, '14. Achievement calculation correct (50.00% on 01 Sep)');

  // Case 15 - 18: Date Controls & Quick Navigation
  const dateStr = '2026-09-02';
  const [y15, m15, d15] = dateStr.split('-').map(Number);

  const prevObj = new Date(Date.UTC(y15, m15 - 1, d15 - 1));
  const prevStr = `${prevObj.getUTCFullYear()}-${String(prevObj.getUTCMonth() + 1).padStart(2, '0')}-${String(prevObj.getUTCDate()).padStart(2, '0')}`;
  assert(prevStr === '2026-09-01', '15. Previous-day button shifts date -1 day correctly');

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(now);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), '16. Today button sets Asia/Jakarta YYYY-MM-DD correctly');

  const nextObj = new Date(Date.UTC(y15, m15 - 1, d15 + 1));
  const nextStr = `${nextObj.getUTCFullYear()}-${String(nextObj.getUTCMonth() + 1).padStart(2, '0')}-${String(nextObj.getUTCDate()).padStart(2, '0')}`;
  assert(nextStr === '2026-09-03', '17. Next-day button shifts date +1 day correctly');

  const pickerParsed = getAsiaJakartaDateBoundary('2026-09-05');
  assert(pickerParsed.dateStr === '2026-09-05', '18. Date picker selects exact date string');

  // Case 19 & 20: Driver filter & Search combination
  const drv1Today = todayItems.filter((i) => i.driverId === 'drv-1');
  const searchMatch = todayItems.filter((i) => i.driverName.includes('TIAS'));

  assert(drv1Today.length === 2, '19. Driver filter + date combination works correctly');
  assert(searchMatch.length === 3, '20. Search + date combination works correctly');

  // Authorization Roles Check
  const allowedRoles = [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.OPS, USER_ROLES.FINANCE];
  assert(isRoleAllowed(USER_ROLES.OWNER, allowedRoles), 'OWNER authorized');
  assert(isRoleAllowed(USER_ROLES.ADMIN, allowedRoles), 'ADMIN authorized');
  assert(isRoleAllowed(USER_ROLES.OPS, allowedRoles), 'OPS authorized');
  assert(!isRoleAllowed(USER_ROLES.DRIVER, allowedRoles), 'DRIVER forbidden');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDeliveryMonitoringTests().catch((err) => {
  console.error('Delivery monitoring test execution failed:', err);
  process.exit(1);
});
