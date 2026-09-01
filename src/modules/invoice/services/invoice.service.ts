import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from '@/modules/finance/services/operational-settlement.service';

export interface UnbilledResiFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceListFilters {
  startDate?: string;
  endDate?: string;
  statusFilter?: 'ALL' | 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  customerId?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface CreateInvoicePayload {
  customerId: string;
  manifestIds: string[];
  invoiceDate: string;
  dueDate: string;
  discount?: number;
  notes?: string;
}

export interface RecordInvoicePaymentPayload {
  invoiceId: string;
  amount: number;
  method: 'CASH' | 'TRANSFER';
  paidAt: string;
  referenceNumber?: string;
  notes?: string;
}

export async function getUnbilledResiService(filters: UnbilledResiFilters) {
  try {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
    const skip = (page - 1) * limit;

    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    // Filter condition for unbilled INVOICE manifests
    const whereCondition: Prisma.ManifestWhereInput = {
      billingMode: 'INVOICE',
      status: 'ACTIVE',
      date: { gte: startUtc, lte: endUtc },
      // Exclude manifests linked to an active (non-cancelled) InvoiceItem
      invoiceItems: {
        none: {
          invoice: {
            status: { not: 'CANCELLED' },
          },
        },
      },
    };

    if (filters.customerId && filters.customerId !== 'ALL') {
      whereCondition.customerId = filters.customerId;
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      whereCondition.OR = [
        { resiNumber: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Fetch total matching items & total aggregated shipping fee
    const totalMatching = await prisma.manifest.count({ where: whereCondition });
    const allMatchingManifests = await prisma.manifest.findMany({
      where: whereCondition,
      select: { totalShippingFee: true },
    });
    const totalShippingFeeSum = allMatchingManifests.reduce(
      (sum, m) => sum + m.totalShippingFee.toNumber(),
      0
    );

    // Fetch paginated items
    const manifests = await prisma.manifest.findMany({
      where: whereCondition,
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const items = manifests.map((m) => ({
      manifestId: m.id,
      resiNumber: m.resiNumber,
      date: m.date.toISOString().split('T')[0],
      senderName: m.senderName,
      recipientName: m.recipientName,
      recipientArea: m.recipientProvinceArea,
      weightKg: m.weightKg.toNumber(),
      koliCount: m.koliCount,
      totalShippingFee: m.totalShippingFee.toNumber(),
      paymentDeliveryMethod: m.paymentDeliveryMethod,
      customerId: m.customerId,
      customerName: m.customer?.name || m.senderName,
      customerCode: m.customer?.customerCode || null,
    }));

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        totalUnbilledResi: totalMatching,
        totalShippingFeeSum,
      },
      pagination: {
        page,
        limit,
        totalResi: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1,
      },
      items,
    };
  } catch (err) {
    console.error('[Get Unbilled Resi Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data resi unbilled.',
    };
  }
}

export async function getInvoiceListService(filters: InvoiceListFilters) {
  try {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
    const skip = (page - 1) * limit;

    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    const whereCondition: Prisma.InvoiceWhereInput = {
      invoiceDate: { gte: startUtc, lte: endUtc },
    };

    if (filters.statusFilter && filters.statusFilter !== 'ALL') {
      whereCondition.status = filters.statusFilter;
    }

    if (filters.customerId && filters.customerId !== 'ALL') {
      whereCondition.customerId = filters.customerId;
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      whereCondition.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Fetch all invoices matching filters for summary cards
    const allInvoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        payments: {
          where: { status: 'POSTED' },
          select: { amount: true },
        },
      },
    });

    let totalInvoiceCount = allInvoices.length;
    let issuedCount = 0;
    let partialCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;
    let totalInvoiceAmountSum = 0;
    let totalPaidAmountSum = 0;

    for (const inv of allInvoices) {
      const invTotal = inv.total.toNumber();
      const paidSum = inv.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

      totalInvoiceAmountSum += invTotal;
      totalPaidAmountSum += paidSum;

      if (inv.status === 'ISSUED') issuedCount++;
      else if (inv.status === 'PARTIAL') partialCount++;
      else if (inv.status === 'PAID') paidCount++;
      else if (inv.status === 'CANCELLED') cancelledCount++;
    }

    const totalOutstandingSum = Math.max(0, totalInvoiceAmountSum - totalPaidAmountSum);

    // Fetch paginated list
    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        customer: { select: { id: true, name: true, customerCode: true, email: true, phone: true } },
        items: { select: { id: true } },
        payments: {
          where: { status: 'POSTED' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const items = invoices.map((inv) => {
      const invTotal = inv.total.toNumber();
      const paidSum = inv.payments.reduce((sum: number, p: { amount: Prisma.Decimal }) => sum + p.amount.toNumber(), 0);
      const outstanding = Math.max(0, invTotal - paidSum);

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        customerId: inv.customerId,
        customerName: inv.customer.name,
        customerCode: inv.customer.customerCode,
        itemCount: inv.items.length,
        subtotal: inv.subtotal.toNumber(),
        discount: inv.discount.toNumber(),
        totalAmount: invTotal,
        paidAmount: paidSum,
        outstandingAmount: outstanding,
        status: inv.status,
        notes: inv.notes,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        totalInvoiceCount,
        issuedCount,
        partialCount,
        paidCount,
        cancelledCount,
        totalInvoiceAmountSum,
        totalPaidAmountSum,
        totalOutstandingSum,
      },
      pagination: {
        page,
        limit,
        totalInvoices: totalInvoiceCount,
        totalPages: Math.ceil(totalInvoiceCount / limit) || 1,
      },
      items,
    };
  } catch (err) {
    console.error('[Get Invoice List Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data daftar invoice.',
    };
  }
}

export async function createInvoiceService(payload: CreateInvoicePayload, userId: string) {
  try {
    if (!payload.manifestIds || payload.manifestIds.length === 0) {
      return { success: false, error: 'Pilih minimal 1 resi untuk dibuatkan invoice.' };
    }

    if (!payload.invoiceDate || !payload.dueDate) {
      return { success: false, error: 'Tanggal invoice dan tanggal jatuh tempo wajib diisi.' };
    }

    const discountAmt = payload.discount && payload.discount > 0 ? payload.discount : 0;

    // Atomic Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-query and lock all selected manifests
      const manifests = await tx.manifest.findMany({
        where: { id: { in: payload.manifestIds } },
        include: {
          customer: true,
          invoiceItems: {
            include: { invoice: { select: { status: true } } },
          },
        },
      });

      if (manifests.length !== payload.manifestIds.length) {
        throw new Error('Sebagian resi tidak ditemukan dalam sistem.');
      }

      // 2. Validate all manifests: billingMode == INVOICE and not VOID
      for (const m of manifests) {
        if (m.status === 'VOID') {
          throw new Error(`Resi ${m.resiNumber} berstatus VOID, pembuatan invoice dibatalkan.`);
        }
        if (m.billingMode !== 'INVOICE') {
          throw new Error(`Resi ${m.resiNumber} ber-billing mode DIRECT. Invoice hanya untuk resi INVOICE.`);
        }
        // Concurrency / Duplicate check
        const activeInvoiceItem = m.invoiceItems.find((ii) => ii.invoice.status !== 'CANCELLED');
        if (activeInvoiceItem) {
          throw new Error(`Resi ${m.resiNumber} sudah masuk ke invoice lain yang aktif. Muat ulang data.`);
        }
      }

      // 3. Same Billing Party Safety check
      const customerIds = new Set(manifests.map((m) => m.customerId).filter(Boolean));
      if (customerIds.size > 1) {
        throw new Error('Resi yang dipilih berasal dari customer berbeda. Buat invoice secara terpisah.');
      }

      const targetCustomerId = payload.customerId || Array.from(customerIds)[0];
      if (!targetCustomerId) {
        throw new Error('Customer penagihan tidak valid.');
      }

      // 4. Calculate Subtotal & Total
      const subtotalDec = manifests.reduce(
        (sum, m) => sum.add(m.totalShippingFee),
        new Prisma.Decimal(0)
      );
      const discountDec = new Prisma.Decimal(discountAmt);
      const totalDec = subtotalDec.sub(discountDec);

      if (totalDec.lt(0)) {
        throw new Error('Total invoice setelah diskon tidak boleh negatif.');
      }

      // 5. Generate Concurrency-Safe Invoice Number (INV-YYMM-XXXXX)
      const now = new Date();
      const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const yearStr = String(jkt.getFullYear()).slice(-2);
      const monthStr = String(jkt.getMonth() + 1).padStart(2, '0');
      const prefix = `INV-${yearStr}${monthStr}-`;

      const latestInvoice = await tx.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });

      let sequence = 1;
      if (latestInvoice) {
        const parts = latestInvoice.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }

      const invoiceNumber = `${prefix}${String(sequence).padStart(5, '0')}`;

      // 6. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: targetCustomerId,
          invoiceDate: new Date(payload.invoiceDate),
          dueDate: new Date(payload.dueDate),
          status: 'ISSUED',
          subtotal: subtotalDec,
          discount: discountDec,
          total: totalDec,
          notes: payload.notes || null,
        },
      });

      // 7. Create InvoiceItems (Snapshotting Manifest Data)
      for (const m of manifests) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            manifestId: m.id,
            description: `Resi ${m.resiNumber} - ${m.senderName} ke ${m.recipientName} (${m.recipientProvinceArea}, ${m.weightKg.toNumber()} kg)`,
            qty: 1,
            unitPrice: m.totalShippingFee,
            amount: m.totalShippingFee,
          },
        });
      }

      // 8. AuditLog
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            customerId: targetCustomerId,
            itemCount: manifests.length,
            totalAmount: totalDec.toNumber(),
          }),
        },
      });

      return invoice;
    });

    return {
      success: true,
      invoiceId: result.id,
      invoiceNumber: result.invoiceNumber,
      message: `Berhasil membuat invoice ${result.invoiceNumber}.`,
    };
  } catch (err: any) {
    console.error('[Create Invoice Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal membuat invoice penagihan.',
    };
  }
}

export async function getInvoiceDetailService(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            manifest: {
              select: {
                resiNumber: true,
                date: true,
                senderName: true,
                recipientName: true,
                recipientProvinceArea: true,
                weightKg: true,
                koliCount: true,
                totalShippingFee: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          include: {
            receivedBy: { select: { name: true } },
            voidedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice tidak ditemukan.' };
    }

    const postedPayments = invoice.payments.filter((p) => p.status === 'POSTED');
    const totalPaid = postedPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const invTotal = invoice.total.toNumber();
    const outstanding = Math.max(0, invTotal - totalPaid);

    return {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        status: invoice.status,
        subtotal: invoice.subtotal.toNumber(),
        discount: invoice.discount.toNumber(),
        total: invTotal,
        paidAmount: totalPaid,
        outstandingAmount: outstanding,
        notes: invoice.notes,
        customer: {
          id: invoice.customer.id,
          name: invoice.customer.name,
          code: invoice.customer.customerCode,
          phone: invoice.customer.phone,
          email: invoice.customer.email,
          address: invoice.customer.address,
        },
        items: invoice.items.map((item, idx) => ({
          id: item.id,
          no: idx + 1,
          manifestId: item.manifestId,
          resiNumber: item.manifest?.resiNumber || '-',
          date: item.manifest?.date.toISOString().split('T')[0] || '-',
          description: item.description,
          senderName: item.manifest?.senderName || '-',
          recipientName: item.manifest?.recipientName || '-',
          area: item.manifest?.recipientProvinceArea || '-',
          weightKg: item.manifest?.weightKg.toNumber() || 0,
          koliCount: item.manifest?.koliCount || 0,
          unitPrice: item.unitPrice.toNumber(),
          qty: item.qty,
          amount: item.amount.toNumber(),
        })),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toNumber(),
          method: p.method,
          status: p.status,
          paidAt: p.paidAt.toISOString(),
          receivedByName: p.receivedBy?.name || null,
          referenceNumber: p.referenceNumber,
          notes: p.notes,
          voidReason: p.voidReason,
          voidedAt: p.voidedAt?.toISOString() || null,
          voidedByName: p.voidedBy?.name || null,
        })),
      },
    };
  } catch (err) {
    console.error('[Get Invoice Detail Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil detail invoice.',
    };
  }
}

export async function recordInvoicePaymentService(
  payload: RecordInvoicePaymentPayload,
  userId: string
) {
  try {
    if (payload.amount <= 0) {
      return { success: false, error: 'Nominal pembayaran harus lebih dari 0.' };
    }

    // Atomic Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock Invoice & existing POSTED payments
      const invoice = await tx.invoice.findUnique({
        where: { id: payload.invoiceId },
        include: {
          payments: { where: { status: 'POSTED' }, select: { amount: true } },
        },
      });

      if (!invoice) {
        throw new Error('Invoice tidak ditemukan.');
      }

      if (invoice.status === 'CANCELLED') {
        throw new Error('Invoice sudah dibatalkan (CANCELLED). Pembayaran ditolak.');
      }

      const invTotal = invoice.total.toNumber();
      const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const outstanding = Math.max(0, invTotal - currentPaid);

      if (outstanding <= 0) {
        throw new Error('Invoice ini sudah lunas (PAID). Tidak ada sisa tagihan.');
      }

      if (payload.amount > outstanding) {
        throw new Error(`Nominal pembayaran (Rp ${payload.amount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${outstanding.toLocaleString('id-ID')}).`);
      }

      const paymentAmountDec = new Prisma.Decimal(payload.amount);
      const newTotalPaid = currentPaid + payload.amount;

      // 2. Create InvoicePayment record (POSTED)
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount: paymentAmountDec,
          method: payload.method,
          status: 'POSTED',
          paidAt: new Date(payload.paidAt),
          receivedById: userId,
          referenceNumber: payload.referenceNumber || null,
          notes: payload.notes || null,
        },
      });

      // 3. Update Invoice status
      const newStatus = newTotalPaid >= invTotal ? 'PAID' : 'PARTIAL';
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      // 4. AuditLog
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'InvoicePayment',
          entityId: payment.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            paymentAmount: payload.amount,
            method: payload.method,
            newStatus,
          }),
        },
      });

      return { payment, newStatus, newTotalPaid };
    });

    return {
      success: true,
      paymentId: result.payment.id,
      newStatus: result.newStatus,
      message: `Pembayaran sebesar Rp ${payload.amount.toLocaleString('id-ID')} berhasil dicatat. Status invoice: ${result.newStatus}.`,
    };
  } catch (err: any) {
    console.error('[Record Invoice Payment Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal mencatat pembayaran invoice.',
    };
  }
}

export async function voidInvoiceService(invoiceId: string, reason: string, userId: string) {
  try {
    if (!reason.trim()) {
      return { success: false, error: 'Alasan pembatalan invoice wajib diisi.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: { where: { status: 'POSTED' } },
        },
      });

      if (!invoice) {
        throw new Error('Invoice tidak ditemukan.');
      }

      if (invoice.payments.length > 0) {
        throw new Error('Invoice yang sudah memiliki pembayaran POSTED tidak dapat dibatalkan langsung. Batalkan transaksi pembayaran terlebih dahulu.');
      }

      // Mark Invoice as CANCELLED (releases all linked resi for re-invoicing)
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          notes: invoice.notes ? `${invoice.notes} | VOID: ${reason}` : `VOID: ${reason}`,
        },
      });

      // AuditLog
      await tx.auditLog.create({
        data: {
          action: 'VOID',
          entityType: 'Invoice',
          entityId: invoiceId,
          actorId: userId,
          metadataJson: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            reason,
          }),
        },
      });

      return updatedInvoice;
    });

    return {
      success: true,
      message: `Invoice ${result.invoiceNumber} berhasil dibatalkan (CANCELLED). Resi siap di-invoice ulang.`,
    };
  } catch (err: any) {
    console.error('[Void Invoice Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal membatalkan invoice.',
    };
  }
}
