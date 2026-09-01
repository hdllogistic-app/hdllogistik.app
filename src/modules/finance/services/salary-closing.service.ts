import { prisma } from '@/lib/prisma';
import { Prisma, PaymentMethod } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from './operational-settlement.service';

export interface SalaryClosingPreviewDTO {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  division: string;
  phone: string | null;
  salaryEntriesCount: number;
  salaryEntryIds: string[];
  grossSalary: number;
  outstandingCashAdvance: number;
  cashAdvanceDeduction: number;
  netSalary: number;
  alreadyClosed: boolean;
}

export interface ExecuteSalaryClosingDTO {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  employeeIds?: string[]; // Selected team members (if empty, closes all eligible)
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export async function previewSalaryClosingService(
  startDateStr: string,
  endDateStr: string,
  selectedEmployeeId?: string
) {
  try {
    if (!startDateStr || !endDateStr) {
      return { success: false, error: 'Tanggal awal dan tanggal akhir wajib diisi.' };
    }

    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      startDateStr,
      endDateStr
    );

    if (endUtc.getTime() < startUtc.getTime()) {
      return { success: false, error: 'Tanggal akhir tidak boleh lebih awal dari tanggal awal.' };
    }

    // Query APPROVED SalaryEntries for period
    const salaryEntries = await prisma.salaryEntry.findMany({
      where: {
        date: { gte: startUtc, lte: endUtc },
        status: 'APPROVED',
        ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
      },
      include: {
        employee: true,
        payoutItem: true,
      },
      orderBy: { date: 'asc' },
    });

    // Query all active employees
    const employees = await prisma.employee.findMany({
      where: {
        active: true,
        ...(selectedEmployeeId ? { id: selectedEmployeeId } : {}),
      },
      orderBy: { fullName: 'asc' },
    });

    // Query outstanding CashAdvance balance per employee
    const caTransactions = await prisma.cashAdvanceTransaction.findMany({
      select: { employeeId: true, type: true, amount: true },
    });

    const caBalanceMap = new Map<string, Prisma.Decimal>();
    for (const tx of caTransactions) {
      const curr = caBalanceMap.get(tx.employeeId) || new Prisma.Decimal(0);
      if (tx.type === 'DISBURSEMENT') {
        caBalanceMap.set(tx.employeeId, curr.add(tx.amount));
      } else if (tx.type === 'REPAYMENT') {
        caBalanceMap.set(tx.employeeId, curr.sub(tx.amount));
      }
    }

    // Group SalaryEntries by Employee
    const empEntryMap = new Map<
      string,
      {
        entries: typeof salaryEntries;
        gross: Prisma.Decimal;
      }
    >();

    for (const entry of salaryEntries) {
      if (!empEntryMap.has(entry.employeeId)) {
        empEntryMap.set(entry.employeeId, {
          entries: [],
          gross: new Prisma.Decimal(0),
        });
      }

      const item = empEntryMap.get(entry.employeeId)!;
      item.entries.push(entry);
      item.gross = item.gross.add(entry.amount);
    }

    const previewList: SalaryClosingPreviewDTO[] = [];

    for (const emp of employees) {
      const data = empEntryMap.get(emp.id);
      if (!data || data.entries.length === 0) continue;

      const unclosedEntries = data.entries.filter((e) => e.payoutItem === null);
      const isAlreadyClosed = unclosedEntries.length === 0;

      const grossDec = data.entries.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));
      const caBalDec = caBalanceMap.get(emp.id) || new Prisma.Decimal(0);
      const outstandingCA = Math.max(0, caBalDec.toNumber());
      const grossNum = grossDec.toNumber();

      // Deduct up to gross salary or up to outstanding CA
      const caDeductionNum = Math.min(grossNum, outstandingCA);
      const netSalaryNum = Math.max(0, grossNum - caDeductionNum);

      previewList.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        division: emp.division,
        phone: emp.phone,
        salaryEntriesCount: unclosedEntries.length,
        salaryEntryIds: unclosedEntries.map((e) => e.id),
        grossSalary: grossNum,
        outstandingCashAdvance: outstandingCA,
        cashAdvanceDeduction: caDeductionNum,
        netSalary: netSalaryNum,
        alreadyClosed: isAlreadyClosed,
      });
    }

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      preview: previewList,
    };
  } catch (err) {
    console.error('[Preview Salary Closing Error]', err);
    return { success: false, error: 'Gagal memuat preview salary closing.' };
  }
}

export async function executeSalaryClosingService(
  dto: ExecuteSalaryClosingDTO,
  userId: string
) {
  try {
    const { startDate, endDate, employeeIds, paymentMethod = 'TRANSFER', notes } = dto;

    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      startDate,
      endDate
    );

    if (endUtc.getTime() < startUtc.getTime()) {
      return { success: false, error: 'Tanggal akhir tidak boleh lebih awal dari tanggal awal.' };
    }

    // Atomic transaction for Salary Closing
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch eligible APPROVED & UNCLOSED SalaryEntries
      const entries = await tx.salaryEntry.findMany({
        where: {
          date: { gte: startUtc, lte: endUtc },
          status: 'APPROVED',
          payoutItem: null, // Double payment protection!
          ...(employeeIds && employeeIds.length > 0
            ? { employeeId: { in: employeeIds } }
            : {}),
        },
        include: {
          employee: true,
        },
        orderBy: { date: 'asc' },
      });

      if (entries.length === 0) {
        throw new Error('Sebagian data gaji sudah masuk closing lain atau tidak ada entry gaji yang eligible.');
      }

      // Group entries per employee
      const empMap = new Map<string, typeof entries>();
      for (const e of entries) {
        if (!empMap.has(e.employeeId)) empMap.set(e.employeeId, []);
        empMap.get(e.employeeId)!.push(e);
      }

      const createdPayouts: any[] = [];
      const timestamp = Date.now().toString().slice(-6);

      let idx = 1;
      for (const [empId, empEntries] of empMap.entries()) {
        const emp = empEntries[0].employee;

        // Calculate Gross Salary from entries
        const grossDec = empEntries.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

        // Calculate Outstanding CashAdvance for Employee
        const caTxList = await tx.cashAdvanceTransaction.findMany({
          where: { employeeId: empId },
        });

        const caBalDec = caTxList.reduce((sum, t) => {
          if (t.type === 'DISBURSEMENT') return sum.add(t.amount);
          if (t.type === 'REPAYMENT') return sum.sub(t.amount);
          return sum;
        }, new Prisma.Decimal(0));

        const outstandingCA = Math.max(0, caBalDec.toNumber());
        const grossNum = grossDec.toNumber();
        const caDeductionNum = Math.min(grossNum, outstandingCA);
        const netSalaryNum = Math.max(0, grossNum - caDeductionNum);

        const payoutNumber = `PAY-${sDate.replace(/-/g, '').slice(2)}-${emp.employeeCode}-${timestamp}${idx++}`;

        // Create SalaryPayout
        const payout = await tx.salaryPayout.create({
          data: {
            payoutNumber,
            employeeId: empId,
            periodStart: startUtc,
            periodEnd: endUtc,
            grossAmount: grossDec,
            cashAdvanceDeduction: new Prisma.Decimal(caDeductionNum),
            otherDeduction: new Prisma.Decimal(0),
            netAmount: new Prisma.Decimal(netSalaryNum),
            paymentMethod,
            status: 'PAID',
            paidAt: new Date(),
            processedById: userId,
            notes: notes || null,
          },
        });

        // Create SalaryPayoutItems linking payout to salary entries
        for (const entry of empEntries) {
          await tx.salaryPayoutItem.create({
            data: {
              payoutId: payout.id,
              salaryEntryId: entry.id,
              amount: entry.amount,
            },
          });
        }

        // Record CashAdvance repayment ledger if deduction applied
        if (caDeductionNum > 0) {
          await tx.cashAdvanceTransaction.create({
            data: {
              employeeId: empId,
              type: 'REPAYMENT',
              repaymentSource: 'SALARY_DEDUCTION',
              amount: new Prisma.Decimal(caDeductionNum),
              date: new Date(),
              description: `Potongan gaji otomatis periode ${sDate} s/d ${eDate}`,
              salaryPayoutId: payout.id,
              createdById: userId,
            },
          });
        }

        // AuditLog
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'CREATE',
            entityType: 'SALARY_PAYOUT',
            entityId: payout.id,
            metadataJson: JSON.stringify({
              payoutNumber,
              employeeId: empId,
              grossAmount: grossNum,
              netAmount: netSalaryNum,
            }),
          },
        });

        createdPayouts.push(payout);
      }

      return createdPayouts;
    });

    return {
      success: true,
      count: result.length,
      payouts: result,
    };
  } catch (err: any) {
    console.error('[Execute Salary Closing Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memproses salary closing.',
    };
  }
}

export async function getSalaryClosingHistoryService() {
  try {
    const payouts = await prisma.salaryPayout.findMany({
      include: {
        employee: true,
        processedBy: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      success: true,
      payouts: payouts.map((p) => ({
        id: p.id,
        payoutNumber: p.payoutNumber,
        employeeName: p.employee.fullName,
        employeeCode: p.employee.employeeCode,
        division: p.employee.division,
        phone: p.employee.phone,
        periodStart: p.periodStart.toISOString().split('T')[0],
        periodEnd: p.periodEnd.toISOString().split('T')[0],
        itemCount: p.items.length,
        grossAmount: p.grossAmount.toNumber(),
        cashAdvanceDeduction: p.cashAdvanceDeduction.toNumber(),
        netAmount: p.netAmount.toNumber(),
        status: p.status,
        processedByName: p.processedBy.name,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error('[Get Salary Closing History Error]', err);
    return { success: false, error: 'Gagal mengambil riwayat salary closing.' };
  }
}

export async function getSalarySlipSnapshotService(payoutId: string) {
  try {
    const payout = await prisma.salaryPayout.findUnique({
      where: { id: payoutId },
      include: {
        employee: true,
        processedBy: true,
        items: {
          include: {
            salaryEntry: true,
          },
        },
      },
    });

    if (!payout) {
      return { success: false, error: 'Slip gaji tidak ditemukan.' };
    }

    return {
      success: true,
      slip: {
        payoutId: payout.id,
        payoutNumber: payout.payoutNumber,
        employeeName: payout.employee.fullName,
        employeeCode: payout.employee.employeeCode,
        division: payout.employee.division,
        phone: payout.employee.phone,
        periodStart: payout.periodStart.toISOString().split('T')[0],
        periodEnd: payout.periodEnd.toISOString().split('T')[0],
        entriesCount: payout.items.length,
        grossAmount: payout.grossAmount.toNumber(),
        cashAdvanceDeduction: payout.cashAdvanceDeduction.toNumber(),
        netAmount: payout.netAmount.toNumber(),
        paymentMethod: payout.paymentMethod,
        processedByName: payout.processedBy.name,
        createdAt: payout.createdAt.toISOString(),
        entries: payout.items.map((i) => ({
          date: i.salaryEntry.date.toISOString().split('T')[0],
          amount: i.amount.toNumber(),
          rate: i.salaryEntry.dailyRateApplied.toNumber(),
        })),
      },
    };
  } catch (err) {
    console.error('[Get Salary Slip Snapshot Error]', err);
    return { success: false, error: 'Gagal memuat rincian slip gaji.' };
  }
}
