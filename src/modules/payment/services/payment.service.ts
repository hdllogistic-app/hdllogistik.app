import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getAsiaJakartaRangeBoundary } from '@/modules/finance/services/operational-settlement.service';
import { uploadProofToR2, validateProofFile, generateProofObjectKey } from '@/lib/storage/r2';

export interface PaymentListFilters {
  startDate?: string;
  endDate?: string;
  statusFilter?: 'ALL' | 'UNADJUSTED' | 'ADJUSTED';
  serviceFilter?: 'ALL' | 'DFOD' | 'COD';
  settlementFilter?: 'ALL' | 'CASH' | 'TRANSFER';
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface PaymentListItemDTO {
  manifestId: string;
  paymentId: string;
  resiNumber: string;
  date: string;
  senderName: string;
  recipientName: string;
  area: string;
  weightKg: number;
  billingMode: string;
  paymentDeliveryMethod: string;
  shippingFee: number;
  codAmount: number;
  totalRecipientBill: number;
  paymentStatus: string;
  adjustmentStatus: 'UNADJUSTED' | 'SUCCESS_ADJUSTMENT';
  latestSettlementMethod: string | null;
  latestAdjustedAt: string | null;
  latestAdjustedByName: string | null;
  latestAdjustmentId: string | null;
  transferProofObjectKey: string | null;
}

export interface CreateAdjustmentPayload {
  manifestId: string;
  newPaymentDeliveryMethod: 'DFOD' | 'COD';
  newShippingFee: number;
  newCodAmount?: number;
  settlementMethod: 'CASH' | 'TRANSFER';
  reason: string;
  proofFileBuffer?: Buffer;
  proofFileName?: string;
  proofMimeType?: string;
}

export interface EditAdjustmentPayload {
  adjustmentId: string;
  newPaymentDeliveryMethod: 'DFOD' | 'COD';
  newShippingFee: number;
  newCodAmount?: number;
  settlementMethod: 'CASH' | 'TRANSFER';
  reason: string;
  proofFileBuffer?: Buffer;
  proofFileName?: string;
  proofMimeType?: string;
}

export async function getPaymentListService(filters: PaymentListFilters) {
  try {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
    const skip = (page - 1) * limit;

    const { sDate, eDate, startUtc, endUtc } = getAsiaJakartaRangeBoundary(
      filters.startDate,
      filters.endDate
    );

    // Build base filter
    const whereCondition: Prisma.ManifestWhereInput = {
      date: { gte: startUtc, lte: endUtc },
      status: { not: 'VOID' },
    };

    if (filters.serviceFilter && filters.serviceFilter !== 'ALL') {
      whereCondition.paymentDeliveryMethod = filters.serviceFilter;
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      whereCondition.OR = [
        { resiNumber: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Fetch all matching manifests for aggregate calculations
    const manifests = await prisma.manifest.findMany({
      where: whereCondition,
      include: {
        payment: {
          include: {
            adjustments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { correctedBy: { select: { name: true } } },
            },
            transactions: {
              where: { status: 'POSTED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map all items & calculate status
    const allItems: PaymentListItemDTO[] = manifests.map((m) => {
      const latestAdj = m.payment?.adjustments[0] || null;
      const latestTx = m.payment?.transactions[0] || null;
      const isAdjusted = latestAdj !== null;

      return {
        manifestId: m.id,
        paymentId: m.payment?.id || '',
        resiNumber: m.resiNumber,
        date: m.date.toISOString().split('T')[0],
        senderName: m.senderName,
        recipientName: m.recipientName,
        area: m.recipientProvinceArea,
        weightKg: m.weightKg.toNumber(),
        billingMode: m.billingMode,
        paymentDeliveryMethod: m.paymentDeliveryMethod,
        shippingFee: m.totalShippingFee.toNumber(),
        codAmount: m.codAmount.toNumber(),
        totalRecipientBill: m.totalRecipientBill.toNumber(),
        paymentStatus: m.payment?.status || 'UNPAID',
        adjustmentStatus: isAdjusted ? 'SUCCESS_ADJUSTMENT' : 'UNADJUSTED',
        latestSettlementMethod: latestAdj?.settlementMethod || latestTx?.method || null,
        latestAdjustedAt: latestAdj ? latestAdj.createdAt.toISOString() : null,
        latestAdjustedByName: latestAdj?.correctedBy.name || null,
        latestAdjustmentId: latestAdj?.id || null,
        transferProofObjectKey: latestAdj?.transferProofObjectKey || null,
      };
    });

    // Apply Client-level status & settlement filters for accuracy
    let filteredItems = allItems;
    if (filters.statusFilter && filters.statusFilter !== 'ALL') {
      filteredItems = filteredItems.filter((i) => i.adjustmentStatus === filters.statusFilter);
    }
    if (filters.settlementFilter && filters.settlementFilter !== 'ALL') {
      filteredItems = filteredItems.filter(
        (i) => i.latestSettlementMethod === filters.settlementFilter
      );
    }

    // Aggregates over filtered items
    const totalResi = filteredItems.length;
    const unadjustedCount = filteredItems.filter((i) => i.adjustmentStatus === 'UNADJUSTED').length;
    const adjustedCount = filteredItems.filter((i) => i.adjustmentStatus === 'SUCCESS_ADJUSTMENT').length;

    let totalSettledRevenue = 0;
    let cashRevenue = 0;
    let transferRevenue = 0;

    for (const item of filteredItems) {
      if (item.adjustmentStatus === 'SUCCESS_ADJUSTMENT' && item.billingMode === 'DIRECT') {
        totalSettledRevenue += item.shippingFee;
        if (item.latestSettlementMethod === 'CASH') cashRevenue += item.shippingFee;
        if (item.latestSettlementMethod === 'TRANSFER') transferRevenue += item.shippingFee;
      }
    }

    // Paginate
    const paginatedItems = filteredItems.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalResi / limit) || 1;

    return {
      success: true,
      startDate: sDate,
      endDate: eDate,
      summary: {
        totalResi,
        unadjustedCount,
        adjustedCount,
        totalSettledRevenue,
        cashRevenue,
        transferRevenue,
      },
      pagination: {
        page,
        limit,
        totalResi,
        totalPages,
      },
      items: paginatedItems,
    };
  } catch (err) {
    console.error('[Get Payment List Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil data payment resi.',
    };
  }
}

export async function createInitialAdjustmentService(
  payload: CreateAdjustmentPayload,
  userId: string
) {
  try {
    // 1. Re-query target Manifest & ManifestPayment
    const manifest = await prisma.manifest.findUnique({
      where: { id: payload.manifestId },
      include: {
        payment: {
          include: {
            adjustments: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!manifest || !manifest.payment) {
      return { success: false, error: 'Manifest atau record pembayaran tidak ditemukan.' };
    }

    if (manifest.status === 'VOID') {
      return { success: false, error: 'Manifest sudah VOID, adjustment pembayaran ditolak.' };
    }

    if (manifest.billingMode !== 'DIRECT') {
      return {
        success: false,
        error: 'Payment Adjustment V1 hanya berlaku untuk manifest DIRECT. Resi INVOICE di-settle melalui Invoicing.',
      };
    }

    if (manifest.payment.adjustments.length > 0) {
      return {
        success: false,
        error: 'Resi ini sudah pernah di-adjustment. Gunakan fitur "Edit Adjustment" untuk melakukan koreksi.',
      };
    }

    // Validate inputs
    if (payload.newShippingFee < 0) {
      return { success: false, error: 'Nominal revisi ongkir tidak boleh negatif.' };
    }

    const newCodAmt = payload.newPaymentDeliveryMethod === 'COD' ? payload.newCodAmount || 0 : 0;
    if (payload.newPaymentDeliveryMethod === 'COD' && newCodAmt < 0) {
      return { success: false, error: 'Nominal COD tidak boleh negatif.' };
    }

    const previousShippingFee = manifest.totalShippingFee;
    const previousCodAmount = manifest.codAmount;
    const previousDeliveryMethod = manifest.paymentDeliveryMethod;
    const previousExpected = manifest.payment.expectedAmount;

    const newShippingFeeDec = new Prisma.Decimal(payload.newShippingFee);
    const newCodAmountDec = new Prisma.Decimal(newCodAmt);
    const newTotalRecipientBillDec =
      payload.newPaymentDeliveryMethod === 'COD' ? newCodAmountDec : newShippingFeeDec;

    // Handle Transfer Proof Upload to R2 (if present)
    let proofObjectKey: string | null = null;
    if (payload.settlementMethod === 'TRANSFER' && payload.proofFileBuffer && payload.proofMimeType) {
      const val = validateProofFile(payload.proofMimeType, payload.proofFileBuffer.length);
      if (!val.valid) {
        return { success: false, error: val.error };
      }

      const tempId = crypto.randomUUID();
      const generatedKey = generateProofObjectKey(tempId, payload.proofFileName || 'proof.png');
      const uploadRes = await uploadProofToR2(generatedKey, payload.proofFileBuffer, payload.proofMimeType);

      if (!uploadRes.success) {
        return { success: false, error: uploadRes.error };
      }

      proofObjectKey = generatedKey;
    }

    // Execute Atomic Financial Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Update Manifest current state
      await tx.manifest.update({
        where: { id: manifest.id },
        data: {
          paymentDeliveryMethod: payload.newPaymentDeliveryMethod,
          totalShippingFee: newShippingFeeDec,
          codAmount: newCodAmountDec,
          totalRecipientBill: newTotalRecipientBillDec,
        },
      });

      // b. Update ManifestPayment status & expectedAmount
      const updatedPayment = await tx.manifestPayment.update({
        where: { id: manifest.payment!.id },
        data: {
          expectedAmount: newTotalRecipientBillDec,
          paidAmount: newTotalRecipientBillDec,
          balanceDue: new Prisma.Decimal(0),
          status: 'PAID',
        },
      });

      // c. Create ManifestPaymentAdjustment audit record
      const adjustment = await tx.manifestPaymentAdjustment.create({
        data: {
          paymentId: manifest.payment!.id,
          originalExpected: previousExpected,
          correctedExpected: newTotalRecipientBillDec,
          adjustmentAmount: newTotalRecipientBillDec.sub(previousExpected),
          previousPaymentDeliveryMethod: previousDeliveryMethod,
          newPaymentDeliveryMethod: payload.newPaymentDeliveryMethod,
          previousShippingFee,
          newShippingFee: newShippingFeeDec,
          previousCodAmount,
          newCodAmount: newCodAmountDec,
          settlementMethod: payload.settlementMethod,
          transferProofObjectKey: proofObjectKey,
          reason: payload.reason,
          correctedById: userId,
        },
      });

      // d. Create POSTED ManifestPaymentTransaction for realized HDL Logistik shipping revenue
      const paymentTx = await tx.manifestPaymentTransaction.create({
        data: {
          paymentId: manifest.payment!.id,
          amount: newShippingFeeDec, // Realized HDL Revenue
          method: payload.settlementMethod,
          status: 'POSTED',
          paidAt: new Date(),
          receivedById: userId,
          notes: `Adjustment Pembayaran Resi ${manifest.resiNumber}`,
        },
      });

      // e. AuditLog
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'ManifestPaymentAdjustment',
          entityId: adjustment.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            resiNumber: manifest.resiNumber,
            previousDeliveryMethod,
            newDeliveryMethod: payload.newPaymentDeliveryMethod,
            previousShippingFee: previousShippingFee.toNumber(),
            newShippingFee: payload.newShippingFee,
            settlementMethod: payload.settlementMethod,
            proofObjectKey,
          }),
        },
      });

      return { adjustment, paymentTx, updatedPayment };
    });

    return {
      success: true,
      adjustmentId: result.adjustment.id,
      message: 'Adjustment pembayaran berhasil diproses.',
    };
  } catch (err: any) {
    console.error('[Create Initial Adjustment Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memproses adjustment pembayaran.',
    };
  }
}

export async function editAdjustmentService(payload: EditAdjustmentPayload, userId: string) {
  try {
    // 1. Re-query existing Adjustment & ManifestPayment
    const existingAdjustment = await prisma.manifestPaymentAdjustment.findUnique({
      where: { id: payload.adjustmentId },
      include: {
        payment: {
          include: {
            manifest: true,
            transactions: { where: { status: 'POSTED' }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!existingAdjustment || !existingAdjustment.payment) {
      return { success: false, error: 'Record adjustment pembayaran tidak ditemukan.' };
    }

    const manifest = existingAdjustment.payment.manifest;
    if (manifest.status === 'VOID') {
      return { success: false, error: 'Manifest sudah VOID, koreksi adjustment ditolak.' };
    }

    if (manifest.billingMode !== 'DIRECT') {
      return { success: false, error: 'Adjustment hanya berlaku untuk manifest DIRECT.' };
    }

    // Check No-Op
    const sameService = existingAdjustment.newPaymentDeliveryMethod === payload.newPaymentDeliveryMethod;
    const sameFee = existingAdjustment.newShippingFee?.toNumber() === payload.newShippingFee;
    const sameCod = (existingAdjustment.newCodAmount?.toNumber() || 0) === (payload.newCodAmount || 0);
    const sameSettlement = existingAdjustment.settlementMethod === payload.settlementMethod;
    const sameProof = !payload.proofFileBuffer; // If no new proof uploaded

    if (sameService && sameFee && sameCod && sameSettlement && sameProof) {
      return { success: false, error: 'Tidak ada perubahan adjustment.' };
    }

    const newCodAmt = payload.newPaymentDeliveryMethod === 'COD' ? payload.newCodAmount || 0 : 0;
    const newShippingFeeDec = new Prisma.Decimal(payload.newShippingFee);
    const newCodAmountDec = new Prisma.Decimal(newCodAmt);
    const newTotalRecipientBillDec =
      payload.newPaymentDeliveryMethod === 'COD' ? newCodAmountDec : newShippingFeeDec;

    // Handle Transfer Proof Upload for replacement (if new file uploaded)
    let proofObjectKey = existingAdjustment.transferProofObjectKey;
    if (payload.settlementMethod === 'TRANSFER' && payload.proofFileBuffer && payload.proofMimeType) {
      const val = validateProofFile(payload.proofMimeType, payload.proofFileBuffer.length);
      if (!val.valid) {
        return { success: false, error: val.error };
      }

      const tempId = crypto.randomUUID();
      const generatedKey = generateProofObjectKey(tempId, payload.proofFileName || 'proof.png');
      const uploadRes = await uploadProofToR2(generatedKey, payload.proofFileBuffer, payload.proofMimeType);

      if (!uploadRes.success) {
        return { success: false, error: uploadRes.error };
      }

      proofObjectKey = generatedKey;
    }

    // Execute Non-Destructive Atomic Financial Correction
    const result = await prisma.$transaction(async (tx) => {
      // a. Mark old POSTED transaction as VOID
      const oldPostedTx = existingAdjustment.payment.transactions[0];
      if (oldPostedTx) {
        await tx.manifestPaymentTransaction.update({
          where: { id: oldPostedTx.id },
          data: {
            status: 'VOID',
            voidReason: `Koreksi Edit Adjustment Pembayaran (${payload.reason})`,
            voidedById: userId,
            voidedAt: new Date(),
          },
        });
      }

      // b. Update Manifest current snapshot
      await tx.manifest.update({
        where: { id: manifest.id },
        data: {
          paymentDeliveryMethod: payload.newPaymentDeliveryMethod,
          totalShippingFee: newShippingFeeDec,
          codAmount: newCodAmountDec,
          totalRecipientBill: newTotalRecipientBillDec,
        },
      });

      // c. Update ManifestPayment expected & balance
      await tx.manifestPayment.update({
        where: { id: existingAdjustment.paymentId },
        data: {
          expectedAmount: newTotalRecipientBillDec,
          paidAmount: newTotalRecipientBillDec,
          balanceDue: new Prisma.Decimal(0),
          status: 'PAID',
        },
      });

      // d. Create NEW ManifestPaymentAdjustment record (preserving old adjustment record untouched!)
      const newAdjustment = await tx.manifestPaymentAdjustment.create({
        data: {
          paymentId: existingAdjustment.paymentId,
          originalExpected: existingAdjustment.correctedExpected,
          correctedExpected: newTotalRecipientBillDec,
          adjustmentAmount: newTotalRecipientBillDec.sub(existingAdjustment.correctedExpected),
          previousPaymentDeliveryMethod: existingAdjustment.newPaymentDeliveryMethod,
          newPaymentDeliveryMethod: payload.newPaymentDeliveryMethod,
          previousShippingFee: existingAdjustment.newShippingFee,
          newShippingFee: newShippingFeeDec,
          previousCodAmount: existingAdjustment.newCodAmount,
          newCodAmount: newCodAmountDec,
          settlementMethod: payload.settlementMethod,
          transferProofObjectKey: proofObjectKey,
          reason: payload.reason,
          correctedById: userId,
        },
      });

      // e. Create replacement POSTED transaction with updated HDL shipping revenue
      const newPaymentTx = await tx.manifestPaymentTransaction.create({
        data: {
          paymentId: existingAdjustment.paymentId,
          amount: newShippingFeeDec,
          method: payload.settlementMethod,
          status: 'POSTED',
          paidAt: new Date(),
          receivedById: userId,
          notes: `Koreksi Adjustment Pembayaran Resi ${manifest.resiNumber}`,
        },
      });

      // f. AuditLog
      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'ManifestPaymentAdjustment',
          entityId: newAdjustment.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            resiNumber: manifest.resiNumber,
            oldAdjustmentId: existingAdjustment.id,
            newAdjustmentId: newAdjustment.id,
            previousShippingFee: existingAdjustment.newShippingFee?.toNumber(),
            newShippingFee: payload.newShippingFee,
            settlementMethod: payload.settlementMethod,
          }),
        },
      });

      return { newAdjustment, newPaymentTx };
    });

    return {
      success: true,
      adjustmentId: result.newAdjustment.id,
      message: 'Koreksi adjustment pembayaran berhasil disimpan.',
    };
  } catch (err: any) {
    console.error('[Edit Adjustment Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal menyimpan koreksi adjustment.',
    };
  }
}

export async function getAdjustmentHistoryTimelineService(manifestId: string) {
  try {
    const manifest = await prisma.manifest.findUnique({
      where: { id: manifestId },
      include: {
        payment: {
          include: {
            adjustments: {
              orderBy: { createdAt: 'asc' },
              include: { correctedBy: { select: { name: true, role: true } } },
            },
            transactions: {
              orderBy: { createdAt: 'asc' },
              include: {
                receivedBy: { select: { name: true } },
                voidedBy: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!manifest) {
      return { success: false, error: 'Manifest tidak ditemukan.' };
    }

    return {
      success: true,
      manifest: {
        id: manifest.id,
        resiNumber: manifest.resiNumber,
        billingMode: manifest.billingMode,
        initialDeliveryMethod: manifest.paymentDeliveryMethod,
        initialShippingFee: manifest.totalShippingFee.toNumber(),
        initialCodAmount: manifest.codAmount.toNumber(),
      },
      adjustments: manifest.payment?.adjustments.map((a) => ({
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        correctedByName: a.correctedBy.name,
        correctedByRole: a.correctedBy.role,
        previousDeliveryMethod: a.previousPaymentDeliveryMethod,
        newDeliveryMethod: a.newPaymentDeliveryMethod,
        previousShippingFee: a.previousShippingFee?.toNumber() ?? null,
        newShippingFee: a.newShippingFee?.toNumber() ?? null,
        previousCodAmount: a.previousCodAmount?.toNumber() ?? null,
        newCodAmount: a.newCodAmount?.toNumber() ?? null,
        settlementMethod: a.settlementMethod,
        transferProofObjectKey: a.transferProofObjectKey,
        reason: a.reason,
      })) || [],
      transactions: manifest.payment?.transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toNumber(),
        method: t.method,
        status: t.status,
        paidAt: t.paidAt.toISOString(),
        receivedByName: t.receivedBy?.name || null,
        voidReason: t.voidReason,
        voidedAt: t.voidedAt?.toISOString() || null,
        voidedByName: t.voidedBy?.name || null,
      })) || [],
    };
  } catch (err) {
    console.error('[Get Adjustment History Service Error]', err);
    return {
      success: false,
      error: 'Gagal mengambil riwayat adjustment.',
    };
  }
}
