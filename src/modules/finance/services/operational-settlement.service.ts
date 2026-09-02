import { prisma } from '@/lib/prisma';
import { Prisma, OperationalExpenseCategory, OperationalExpenseStatus } from '@/generated/prisma/client';
import { createCashAdvanceDisbursementService, getCashAdvanceLedgerService } from './cash-advance.service';

export interface CreateExpenseDTO {
  date: string; // YYYY-MM-DD
  category: OperationalExpenseCategory | 'KASBON';
  amount: number;
  description: string;
  vehicleId?: string | null;
  employeeId?: string | null;
  receiptPhotoUrl?: string | null;
}

export interface EditExpenseDTO {
  date?: string;
  category?: OperationalExpenseCategory | 'KASBON';
  amount?: number;
  description?: string;
  vehicleId?: string | null;
  employeeId?: string | null;
  receiptPhotoUrl?: string | null;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
  search?: string;
}

/**
 * Gets Asia/Jakarta date range boundary (UTC).
 */
export function getAsiaJakartaRangeBoundary(startDateStr?: string, endDateStr?: string) {
  let sDate = startDateStr;
  let eDate = endDateStr;

  if (!sDate || !/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
    const now = new Date();
    const jakartaDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    sDate = jakartaDate.toISOString().split('T')[0];
  }

  if (!eDate || !/^\d{4}-\d{2}-\d{2}$/.test(eDate)) {
    eDate = sDate;
  }

  const startUtc = new Date(`${sDate}T00:00:00.000+07:00`);
  const endUtc = new Date(`${eDate}T23:59:59.999+07:00`);

  return { sDate, eDate, startUtc, endUtc };
}

export async function getOperationalExpensesService(filters: ExpenseFilters) {
  try {
    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    // If filter is explicitly KASBON, query CashAdvanceTransaction ledger
    if (filters.category === 'KASBON') {
      const ledger = await getCashAdvanceLedgerService(sDate, eDate, filters.search);
      const txs = ledger.transactions || [];

      const totalAmount = txs.reduce((sum, t) => sum + (t.type === 'DISBURSEMENT' ? t.amount : 0), 0);

      return {
        success: true,
        startDate: sDate,
        endDate: eDate,
        summary: {
          totalAmount,
          transactionCount: txs.length,
          topCategory: 'Kasbon Karyawan',
          topCategoryAmount: totalAmount,
          dailyAverage: Number(totalAmount.toFixed(2)),
        },
        expenses: txs.map((t) => ({
          id: t.id,
          date: t.date,
          category: 'KASBON' as any,
          amount: t.amount,
          status: 'ACTIVE',
          description: `${t.type === 'DISBURSEMENT' ? '[KASBON]' : '[POTONGAN]'} ${t.description}`,
          vehiclePlate: null,
          employeeName: `${t.employeeName} (${t.division})`,
          createdByName: t.createdByName,
          voidReason: null,
          voidedAt: null,
          createdAt: t.createdAt,
          type: t.type,
          repaymentSource: t.repaymentSource,
        })),
      };
    }

    const where: Prisma.OperationalExpenseWhereInput = {
      date: { gte: startUtc, lte: endUtc },
      ...(filters.category && filters.category !== 'ALL' && filters.category !== 'KASBON'
        ? { category: filters.category as OperationalExpenseCategory }
        : {}),
      ...(filters.status && filters.status !== 'ALL'
        ? { status: filters.status as OperationalExpenseStatus }
        : {}),
      ...(filters.search
        ? {
            description: { contains: filters.search.trim(), mode: 'insensitive' },
          }
        : {}),
    };

    const expenses = await prisma.operationalExpense.findMany({
      where,
      include: {
        vehicle: true,
        employee: true,
        createdBy: true,
        voidedBy: true,
      },
      orderBy: { date: 'desc' },
    });

    // Summary calculations (Active only)
    const activeExpenses = expenses.filter((e) => e.status === 'ACTIVE');
    const totalAmountDec = activeExpenses.reduce(
      (sum, e) => sum.add(e.amount),
      new Prisma.Decimal(0)
    );
    const transactionCount = activeExpenses.length;

    // Category breakdown
    const catMap = new Map<string, Prisma.Decimal>();
    for (const e of activeExpenses) {
      const current = catMap.get(e.category) || new Prisma.Decimal(0);
      catMap.set(e.category, current.add(e.amount));
    }

    let topCategory = '-';
    let topCategoryAmount = 0;

    for (const [cat, amt] of catMap.entries()) {
      if (amt.toNumber() > topCategoryAmount) {
        topCategoryAmount = amt.toNumber();
        topCategory = cat;
      }
    }

    // Days count for daily average
    const diffMs = Math.max(86400000, endUtc.getTime() - startUtc.getTime());
    const daysCount = Math.max(1, Math.ceil(diffMs / 86400000));
    const dailyAverage = totalAmountDec.toNumber() / daysCount;

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        totalAmount: totalAmountDec.toNumber(),
        transactionCount,
        topCategory,
        topCategoryAmount,
        dailyAverage: Number(dailyAverage.toFixed(2)),
      },
      expenses: expenses.map((e) => ({
        id: e.id,
        date: e.date.toISOString().split('T')[0],
        category: e.category,
        amount: e.amount.toNumber(),
        status: e.status,
        description: e.description,
        vehiclePlate: e.vehicle ? e.vehicle.plateNumber : null,
        employeeName: e.employee ? e.employee.fullName : null,
        createdByName: e.createdBy.name,
        voidReason: e.voidReason,
        voidedAt: e.voidedAt ? e.voidedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error('[Get Operational Expenses Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data pengeluaran operasional.',
    };
  }
}

export async function createOperationalExpenseService(
  dto: CreateExpenseDTO,
  userId: string
) {
  try {
    // If category is KASBON, route to CashAdvanceTransaction ledger
    if (dto.category === 'KASBON') {
      if (!dto.employeeId) {
        return { success: false, error: 'Karyawan penerima kasbon wajib dipilih.' };
      }
      return await createCashAdvanceDisbursementService(
        {
          employeeId: dto.employeeId,
          amount: dto.amount,
          date: dto.date,
          description: dto.description,
        },
        userId
      );
    }

    if (!dto.description || !dto.description.trim()) {
      return { success: false, error: 'Keterangan pengeluaran wajib diisi.' };
    }

    if (dto.amount <= 0) {
      return { success: false, error: 'Nominal pengeluaran harus lebih besar dari 0.' };
    }

    const dateUtc = new Date(`${dto.date}T12:00:00.000+07:00`);

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.operationalExpense.create({
        data: {
          date: dateUtc,
          category: dto.category as OperationalExpenseCategory,
          amount: new Prisma.Decimal(dto.amount),
          description: dto.description.trim(),
          vehicleId: dto.vehicleId || null,
          employeeId: dto.employeeId || null,
          receiptPhotoUrl: dto.receiptPhotoUrl || null,
          createdById: userId,
          status: 'ACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CREATE',
          entityType: 'OPERATIONAL_EXPENSE',
          entityId: created.id,
          metadataJson: JSON.stringify({
            category: dto.category,
            amount: dto.amount,
            description: dto.description,
          }),
        },
      });

      return created;
    });

    return { success: true, expense };
  } catch (err) {
    console.error('[Create Operational Expense Error]', err);
    return { success: false, error: 'Gagal menyimpan pengeluaran operasional.' };
  }
}

export async function voidOperationalExpenseService(
  expenseId: string,
  voidReason: string,
  userId: string
) {
  try {
    if (!voidReason || !voidReason.trim()) {
      return { success: false, error: 'Alasan void wajib diisi.' };
    }

    const expense = await prisma.operationalExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return { success: false, error: 'Data pengeluaran operasional tidak ditemukan.' };
    }

    if (expense.status === 'VOID') {
      return { success: false, error: 'Data pengeluaran operasional sudah berstatus VOID.' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.operationalExpense.update({
        where: { id: expenseId },
        data: {
          status: 'VOID',
          voidReason: voidReason.trim(),
          voidedAt: new Date(),
          voidedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'VOID',
          entityType: 'OPERATIONAL_EXPENSE',
          entityId: expenseId,
          metadataJson: JSON.stringify({
            voidReason: voidReason.trim(),
            amount: expense.amount.toNumber(),
          }),
        },
      });

      return res;
    });

    return { success: true, expense: updated };
  } catch (err) {
    console.error('[Void Operational Expense Error]', err);
    return { success: false, error: 'Gagal membatalkan pengeluaran operasional.' };
  }
}
