import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from './operational-settlement.service';

export interface KasbonEmployeeDTO {
  id: string;
  employeeCode: string;
  fullName: string;
  division: string;
  phone: string | null;
  outstandingKasbon: number;
}

export interface CreateCashAdvanceDTO {
  employeeId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
}

export interface CashAdvanceLedgerItemDTO {
  id: string;
  date: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  division: string;
  type: 'DISBURSEMENT' | 'REPAYMENT';
  repaymentSource: 'CASH' | 'SALARY_DEDUCTION' | 'OTHER' | null;
  amount: number;
  description: string;
  createdByName: string;
  createdAt: string;
}

/**
 * Returns active DRIVER and HELPER employees with their current outstanding Kasbon balance.
 */
export async function getEligibleKasbonEmployeesService(): Promise<{
  success: boolean;
  employees?: KasbonEmployeeDTO[];
  error?: string;
}> {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        active: true,
        division: { in: ['DRIVER', 'HELPER'] },
      },
      orderBy: { fullName: 'asc' },
    });

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

    const result: KasbonEmployeeDTO[] = employees.map((emp) => {
      const balDec = caBalanceMap.get(emp.id) || new Prisma.Decimal(0);
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        division: emp.division,
        phone: emp.phone,
        outstandingKasbon: Math.max(0, balDec.toNumber()),
      };
    });

    return { success: true, employees: result };
  } catch (err) {
    console.error('[Get Eligible Kasbon Employees Error]', err);
    return { success: false, error: 'Gagal mengambil data karyawan kasbon.' };
  }
}

/**
 * Creates a new Kasbon disbursement (cash out to employee) in CashAdvanceTransaction ledger.
 */
export async function createCashAdvanceDisbursementService(
  dto: CreateCashAdvanceDTO,
  userId: string
) {
  try {
    if (!dto.employeeId) {
      return { success: false, error: 'Karyawan penerima kasbon wajib dipilih.' };
    }

    if (!dto.amount || dto.amount <= 0) {
      return { success: false, error: 'Nominal kasbon harus lebih dari Rp 0.' };
    }

    if (!dto.date || !/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      return { success: false, error: 'Format tanggal kasbon tidak valid (YYYY-MM-DD).' };
    }

    // Backend re-queries Employee to ensure active DRIVER or HELPER
    const employee = await prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee || !employee.active) {
      return { success: false, error: 'Karyawan tidak ditemukan atau sudah tidak aktif.' };
    }

    if (employee.division !== 'DRIVER' && employee.division !== 'HELPER') {
      return { success: false, error: 'Kasbon hanya diperuntukkan bagi divisi DRIVER dan HELPER.' };
    }

    const startDbDate = new Date(`${dto.date}T00:00:00.000Z`);

    const result = await prisma.$transaction(async (tx) => {
      const caTx = await tx.cashAdvanceTransaction.create({
        data: {
          employeeId: employee.id,
          type: 'DISBURSEMENT',
          amount: new Prisma.Decimal(dto.amount),
          date: startDbDate,
          description: dto.description?.trim() || `Kasbon ${employee.fullName} (${employee.division})`,
          createdById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CREATE',
          entityType: 'CASH_ADVANCE',
          entityId: caTx.id,
          metadataJson: JSON.stringify({
            employeeId: employee.id,
            employeeName: employee.fullName,
            division: employee.division,
            amount: dto.amount,
            date: dto.date,
          }),
        },
      });

      return caTx;
    });

    return {
      success: true,
      transactionId: result.id,
      message: `Kasbon sebesar Rp ${dto.amount.toLocaleString('id-ID')} untuk ${employee.fullName} berhasil disimpan.`,
    };
  } catch (err) {
    console.error('[Create Cash Advance Disbursement Error]', err);
    return { success: false, error: 'Gagal menyimpan kasbon karyawan.' };
  }
}

/**
 * Queries Kasbon transactions ledger filtered by date range and search.
 */
export async function getCashAdvanceLedgerService(
  startDateStr?: string,
  endDateStr?: string,
  searchQuery?: string
): Promise<{
  success: boolean;
  transactions?: CashAdvanceLedgerItemDTO[];
  error?: string;
}> {
  try {
    const { sDate, eDate } = getAsiaJakartaRangeBoundary(startDateStr, endDateStr);
    const startDbDate = new Date(`${sDate}T00:00:00.000Z`);
    const endDbDate = new Date(`${eDate}T00:00:00.000Z`);

    const txs = await prisma.cashAdvanceTransaction.findMany({
      where: {
        date: { gte: startDbDate, lte: endDbDate },
        ...(searchQuery && searchQuery.trim()
          ? {
              OR: [
                { employee: { fullName: { contains: searchQuery.trim(), mode: 'insensitive' } } },
                { employee: { employeeCode: { contains: searchQuery.trim(), mode: 'insensitive' } } },
                { description: { contains: searchQuery.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        employee: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: CashAdvanceLedgerItemDTO[] = txs.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      employeeId: t.employeeId,
      employeeCode: t.employee.employeeCode,
      employeeName: t.employee.fullName,
      division: t.employee.division,
      type: t.type,
      repaymentSource: t.repaymentSource,
      amount: t.amount.toNumber(),
      description: t.description,
      createdByName: t.createdBy.name,
      createdAt: t.createdAt.toISOString(),
    }));

    return { success: true, transactions: items };
  } catch (err) {
    console.error('[Get Cash Advance Ledger Error]', err);
    return { success: false, error: 'Gagal mengambil data riwayat kasbon.' };
  }
}
