import { prisma } from '@/lib/prisma';
import { Prisma, EmployeeDivision, AttendanceStatus } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from './operational-settlement.service';

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  division?: string;
  search?: string;
  status?: string;
}

export interface AttendanceItemDTO {
  id: string;
  date: string;
  employeeCode: string;
  employeeName: string;
  division: string;
  status: AttendanceStatus;
  clockIn: string | null;
  clockOut: string | null;
  dailySalaryRate: number;
  earnedAmount: number;
  notes: string | null;
}

export interface PerTeamAttendanceSummaryDTO {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  division: string;
  eligibleDaysCount: number;
  dailySalaryRate: number;
  totalGrossSalary: number;
  outstandingCashAdvance: number;
  netPreviewSalary: number;
}

export async function getAttendanceService(filters: AttendanceFilters) {
  try {
    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    const where: Prisma.AttendanceWhereInput = {
      date: { gte: startUtc, lte: endUtc },
      ...(filters.status && filters.status !== 'ALL'
        ? { status: filters.status as AttendanceStatus }
        : {}),
      employee: {
        ...(filters.division && filters.division !== 'ALL'
          ? { division: filters.division as EmployeeDivision }
          : {}),
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search.trim(), mode: 'insensitive' } },
                { employeeCode: { contains: filters.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: true,
        salaryEntry: true,
      },
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
    });

    // Overview Stats
    const totalTeamCount = await prisma.employee.count({
      where: { active: true },
    });
    const presentCount = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const otherStatusCount = attendances.length - presentCount;

    // Map detail DTOs
    const detailList: AttendanceItemDTO[] = attendances.map((a) => {
      const dailyRate = a.employee.dailySalaryRate.toNumber();
      // Earned amount: From linked SalaryEntry or calculated from dailySalaryRate if PRESENT/LATE
      const earned = a.salaryEntry
        ? a.salaryEntry.amount.toNumber()
        : a.status === 'PRESENT' || a.status === 'LATE'
        ? dailyRate
        : 0;

      return {
        id: a.id,
        date: a.date.toISOString().split('T')[0],
        employeeCode: a.employee.employeeCode,
        employeeName: a.employee.fullName,
        division: a.employee.division,
        status: a.status,
        clockIn: a.clockIn ? a.clockIn.toISOString() : null,
        clockOut: a.clockOut ? a.clockOut.toISOString() : null,
        dailySalaryRate: dailyRate,
        earnedAmount: earned,
        notes: a.notes,
      };
    });

    const totalEarnedPeriodDec = detailList.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.earnedAmount)),
      new Prisma.Decimal(0)
    );

    // Grouping by Team / Employee for Per-Team Summary & CashAdvance Balance
    const teamMap = new Map<
      string,
      {
        employeeId: string;
        employeeCode: string;
        employeeName: string;
        division: string;
        dailySalaryRate: number;
        eligibleDaysCount: number;
        totalGrossSalary: Prisma.Decimal;
      }
    >();

    for (const a of attendances) {
      const emp = a.employee;
      if (!teamMap.has(emp.id)) {
        teamMap.set(emp.id, {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          division: emp.division,
          dailySalaryRate: emp.dailySalaryRate.toNumber(),
          eligibleDaysCount: 0,
          totalGrossSalary: new Prisma.Decimal(0),
        });
      }

      const team = teamMap.get(emp.id)!;
      if (a.status === 'PRESENT' || a.status === 'LATE') {
        team.eligibleDaysCount += 1;
      }
      const earned = a.salaryEntry
        ? a.salaryEntry.amount
        : a.status === 'PRESENT' || a.status === 'LATE'
        ? emp.dailySalaryRate
        : new Prisma.Decimal(0);

      team.totalGrossSalary = team.totalGrossSalary.add(earned);
    }

    // Query outstanding CashAdvance balance per team
    const employeeIds = Array.from(teamMap.keys());
    const cashAdvanceTx = await prisma.cashAdvanceTransaction.findMany({
      where: {
        employeeId: { in: employeeIds },
      },
      select: {
        employeeId: true,
        type: true,
        amount: true,
      },
    });

    const caBalanceMap = new Map<string, Prisma.Decimal>();
    for (const tx of cashAdvanceTx) {
      const current = caBalanceMap.get(tx.employeeId) || new Prisma.Decimal(0);
      if (tx.type === 'DISBURSEMENT') {
        caBalanceMap.set(tx.employeeId, current.add(tx.amount));
      } else if (tx.type === 'REPAYMENT') {
        caBalanceMap.set(tx.employeeId, current.sub(tx.amount));
      }
    }

    const teamSummaries: PerTeamAttendanceSummaryDTO[] = Array.from(teamMap.values()).map(
      (t) => {
        const caBalDec = caBalanceMap.get(t.employeeId) || new Prisma.Decimal(0);
        const outstandingCA = Math.max(0, caBalDec.toNumber());
        const grossNum = t.totalGrossSalary.toNumber();
        const netPreview = Math.max(0, grossNum - outstandingCA);

        return {
          employeeId: t.employeeId,
          employeeCode: t.employeeCode,
          employeeName: t.employeeName,
          division: t.division,
          eligibleDaysCount: t.eligibleDaysCount,
          dailySalaryRate: t.dailySalaryRate,
          totalGrossSalary: grossNum,
          outstandingCashAdvance: outstandingCA,
          netPreviewSalary: netPreview,
        };
      }
    );

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        totalTeam: totalTeamCount,
        presentCount,
        otherStatusCount,
        totalEarnedPeriod: totalEarnedPeriodDec.toNumber(),
      },
      teamSummaries,
      attendances: detailList,
    };
  } catch (err) {
    console.error('[Get Attendance Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data absensi team.',
    };
  }
}
