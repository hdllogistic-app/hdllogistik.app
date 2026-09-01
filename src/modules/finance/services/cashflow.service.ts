import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from './operational-settlement.service';

export interface CashflowFilters {
  startDate?: string;
  endDate?: string;
}

export interface CategoryBreakdownItem {
  category: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export async function getCashflowService(filters: CashflowFilters) {
  try {
    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    // 1. REALIZED DIRECT REVENUE: ManifestPaymentTransaction (POSTED)
    const directTransactions = await prisma.manifestPaymentTransaction.findMany({
      where: {
        status: 'POSTED',
        paidAt: { gte: startUtc, lte: endUtc },
      },
      select: { amount: true },
    });

    const directRevenueDec = directTransactions.reduce(
      (sum, t) => sum.add(t.amount),
      new Prisma.Decimal(0)
    );

    // 2. REALIZED INVOICE REVENUE: InvoicePayment (POSTED)
    const invoicePayments = await prisma.invoicePayment.findMany({
      where: {
        status: 'POSTED',
        paidAt: { gte: startUtc, lte: endUtc },
      },
      select: { amount: true },
    });

    const invoiceRevenueDec = invoicePayments.reduce(
      (sum, p) => sum.add(p.amount),
      new Prisma.Decimal(0)
    );

    // Total Omzet / Revenue (Realized Cash Only)
    const totalRevenueDec = directRevenueDec.add(invoiceRevenueDec);

    // 3. OPERATIONAL EXPENSES: OperationalExpense (ACTIVE)
    const activeExpenses = await prisma.operationalExpense.findMany({
      where: {
        status: 'ACTIVE',
        date: { gte: startUtc, lte: endUtc },
      },
      select: { category: true, amount: true },
    });

    const totalOperationalExpenseDec = activeExpenses.reduce(
      (sum, e) => sum.add(e.amount),
      new Prisma.Decimal(0)
    );

    // 4. SALARY EXPENSES: SalaryEntry (APPROVED)
    const approvedSalaryEntries = await prisma.salaryEntry.findMany({
      where: {
        status: 'APPROVED',
        date: { gte: startUtc, lte: endUtc },
      },
      select: { amount: true },
    });

    const totalSalaryExpenseDec = approvedSalaryEntries.reduce(
      (sum, s) => sum.add(s.amount),
      new Prisma.Decimal(0)
    );

    // 5. OPERATING PROFIT / LOSS = Revenue - Operational - Salary
    const totalExpensesDec = totalOperationalExpenseDec.add(totalSalaryExpenseDec);
    const operatingProfitDec = totalRevenueDec.sub(totalExpensesDec);

    // 6. NET CASH MOVEMENT (Real Inflow - Real Outflow, excluding non-cash SALARY_DEDUCTION)
    // Inflow: Realized Direct + Realized Invoice + CashAdvance Repayment (CASH/OTHER)
    const cashAdvanceRepayments = await prisma.cashAdvanceTransaction.findMany({
      where: {
        type: 'REPAYMENT',
        repaymentSource: { in: ['CASH', 'OTHER'] },
        date: { gte: startUtc, lte: endUtc },
      },
      select: { amount: true },
    });
    const cashRepaymentsDec = cashAdvanceRepayments.reduce(
      (sum, c) => sum.add(c.amount),
      new Prisma.Decimal(0)
    );

    const totalCashInflowDec = totalRevenueDec.add(cashRepaymentsDec);

    // Outflow: Operational Expenses + Paid Salary Payouts + CashAdvance Disbursements
    const paidSalaryPayouts = await prisma.salaryPayout.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: startUtc, lte: endUtc },
      },
      select: { netAmount: true },
    });
    const paidSalaryDec = paidSalaryPayouts.reduce(
      (sum, p) => sum.add(p.netAmount),
      new Prisma.Decimal(0)
    );

    const cashAdvanceDisbursements = await prisma.cashAdvanceTransaction.findMany({
      where: {
        type: 'DISBURSEMENT',
        date: { gte: startUtc, lte: endUtc },
      },
      select: { amount: true },
    });
    const disbursementsDec = cashAdvanceDisbursements.reduce(
      (sum, d) => sum.add(d.amount),
      new Prisma.Decimal(0)
    );

    const totalCashOutflowDec = totalOperationalExpenseDec
      .add(paidSalaryDec)
      .add(disbursementsDec);

    const netCashMovementDec = totalCashInflowDec.sub(totalCashOutflowDec);

    // 7. EXPENSE CATEGORY RANKING
    const catMap = new Map<string, Prisma.Decimal>();
    for (const e of activeExpenses) {
      const current = catMap.get(e.category) || new Prisma.Decimal(0);
      catMap.set(e.category, current.add(e.amount));
    }

    const totalOpAmt = totalOperationalExpenseDec.toNumber();
    const categoryBreakdown: CategoryBreakdownItem[] = Array.from(catMap.entries())
      .map(([cat, amt]) => {
        const amtNum = amt.toNumber();
        return {
          category: cat,
          categoryName: formatCategoryName(cat),
          amount: amtNum,
          percentage: totalOpAmt > 0 ? Number(((amtNum / totalOpAmt) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        revenue: totalRevenueDec.toNumber(),
        directRevenue: directRevenueDec.toNumber(),
        invoiceRevenue: invoiceRevenueDec.toNumber(),
        operationalExpense: totalOperationalExpenseDec.toNumber(),
        salaryExpense: totalSalaryExpenseDec.toNumber(),
        operatingProfit: operatingProfitDec.toNumber(),
        isProfit: operatingProfitDec.gte(0),
        netCashMovement: netCashMovementDec.toNumber(),
      },
      categoryBreakdown,
    };
  } catch (err) {
    console.error('[Get Cashflow Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data cashflow & keuangan.',
    };
  }
}

function formatCategoryName(cat: string): string {
  switch (cat) {
    case 'BBM':
      return 'Bahan Bakar (BBM)';
    case 'E_TOLL':
      return 'E-Toll & Tol';
    case 'PARKING':
      return 'Parkir & Retribusi';
    case 'VEHICLE_SERVICE':
      return 'Servis & Perawatan Kendaraan';
    case 'MEAL':
      return 'Uang Makan / Konsumsi';
    case 'RENT':
      return 'Sewa Gudang / Operasional';
    case 'UTILITY':
      return 'Listrik & Internet (Utility)';
    default:
      return 'Operasional Lainnya';
  }
}
