import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getJakartaDateInfo, generateNextResiNumber } from '../utils/resi-generator';

export const createManifestSchema = z
  .object({
    customerId: z.string().optional().nullable(),
    senderName: z.string().trim().min(1, 'Nama pengirim wajib diisi').max(100),
    senderPhone: z.string().trim().min(8, 'Nomor HP pengirim minimal 8 karakter').max(20),
    senderAddress: z.string().trim().min(3, 'Alamat pengirim wajib diisi').max(255),
    recipientName: z.string().trim().min(1, 'Nama penerima wajib diisi').max(100),
    recipientPhone: z.string().trim().min(8, 'Nomor HP penerima minimal 8 karakter').max(20),
    recipientProvinceArea: z.string().trim().min(1, 'Area / Wilayah tujuan wajib diisi').max(100),
    recipientAddress: z.string().trim().min(3, 'Alamat penerima wajib diisi').max(255),
    shareLocationUrl: z.string().trim().optional().nullable(),
    itemName: z.string().trim().min(1, 'Nama barang wajib diisi').max(100),
    weightKg: z.number().positive('Berat barang harus lebih besar dari 0'),
    koliCount: z.number().int().min(1, 'Jumlah koli minimal 1'),
    shippingRatePerKg: z.number().min(0, 'Ongkos kirim per kg tidak boleh negatif'),
    billingMode: z.enum(['DIRECT', 'INVOICE']),
    paymentDeliveryMethod: z.enum(['CASH', 'DFOD', 'COD']),
    codAmount: z.number().min(0, 'Nilai COD tidak boleh negatif').optional().default(0),
    notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.paymentDeliveryMethod === 'COD') {
        return (data.codAmount || 0) > 0;
      }
      return true;
    },
    {
      message: 'Nominal COD / Tagihan Penerima wajib diisi dan harus lebih besar dari 0 untuk metode COD.',
      path: ['codAmount'],
    }
  );

export type CreateManifestInput = z.infer<typeof createManifestSchema>;

export interface CreateManifestResult {
  success: boolean;
  manifest?: {
    id: string;
    resiNumber: string;
    date: Date;
    billingMode: string;
    paymentDeliveryMethod: string;
    senderName: string;
    recipientName: string;
    totalShippingFee: number;
    codAmount: number;
    totalRecipientBill: number;
    createdAt: Date;
  };
  error?: string;
}

const MAX_RESI_RETRY = 5;

/**
 * Domain Service for Creating a Logistics Manifest (V1.3 Revision).
 * - Enforces paymentDeliveryMethod enum ('CASH', 'DFOD', 'COD').
 * - Backend recalculates totalShippingFee and normalizes totalRecipientBill & codAmount:
 *   - CASH: codAmount = 0, totalRecipientBill = 0
 *   - DFOD: codAmount = 0, totalRecipientBill = totalShippingFee
 *   - COD: codAmount = manual input (> 0), totalRecipientBill = codAmount
 * - Executes concurrency-safe resi generation with targeted retry on resiNumber P2002.
 * - Atomically inserts Manifest, Delivery (READY), ManifestPayment (UNPAID), and AuditLog (CREATE).
 */
export async function createManifestService(
  rawInput: CreateManifestInput,
  actorUserId: string
): Promise<CreateManifestResult> {
  const parseResult = createManifestSchema.safeParse(rawInput);

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Data form tidak valid.';
    return {
      success: false,
      error: firstError,
    };
  }

  const data = parseResult.data;

  // Decimal-safe backend financial calculations
  const weightDecimal = new Prisma.Decimal(data.weightKg);
  const rateDecimal = new Prisma.Decimal(data.shippingRatePerKg);
  const totalShippingFee = weightDecimal.mul(rateDecimal);

  let codDecimal = new Prisma.Decimal(0);
  let totalRecipientBill = new Prisma.Decimal(0);

  // Business logic rules for Payment Methods V1.3
  switch (data.paymentDeliveryMethod) {
    case 'CASH':
      codDecimal = new Prisma.Decimal(0);
      totalRecipientBill = new Prisma.Decimal(0);
      break;
    case 'DFOD':
      codDecimal = new Prisma.Decimal(0);
      totalRecipientBill = totalShippingFee;
      break;
    case 'COD':
      codDecimal = new Prisma.Decimal(data.codAmount || 0);
      totalRecipientBill = codDecimal;
      break;
  }

  const { datePrefix, businessDate } = getJakartaDateInfo();

  for (let attempt = 1; attempt <= MAX_RESI_RETRY; attempt++) {
    try {
      const createdRecord = await prisma.$transaction(async (tx) => {
        // 1. Generate next concurrency-safe resi number
        const resiNumber = await generateNextResiNumber(tx, datePrefix);

        // 2. Create Manifest record
        const manifest = await tx.manifest.create({
          data: {
            resiNumber,
            date: businessDate,
            billingMode: data.billingMode,
            customerId: data.customerId || null,
            senderName: data.senderName,
            senderPhone: data.senderPhone,
            senderAddress: data.senderAddress,
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            recipientProvinceArea: data.recipientProvinceArea,
            recipientAddress: data.recipientAddress,
            shareLocationUrl: data.shareLocationUrl || null,
            itemName: data.itemName,
            weightKg: weightDecimal,
            koliCount: data.koliCount,
            shippingRatePerKg: rateDecimal,
            totalShippingFee,
            paymentDeliveryMethod: data.paymentDeliveryMethod,
            codAmount: codDecimal,
            totalRecipientBill,
            notes: data.notes || null,
            status: 'ACTIVE',
          },
        });

        // 3. Create initial Delivery record (Status: READY, No Driver Assigned)
        await tx.delivery.create({
          data: {
            manifestId: manifest.id,
            status: 'READY',
          },
        });

        // 4. Create initial ManifestPayment record (Status: UNPAID, Zero Paid Amount)
        await tx.manifestPayment.create({
          data: {
            manifestId: manifest.id,
            expectedAmount: totalRecipientBill,
            paidAmount: new Prisma.Decimal(0),
            balanceDue: totalRecipientBill,
            status: 'UNPAID',
          },
        });

        // 5. Create AuditLog entry
        await tx.auditLog.create({
          data: {
            actorId: actorUserId,
            action: 'CREATE',
            entityType: 'MANIFEST',
            entityId: manifest.id,
            metadataJson: JSON.stringify({
              resiNumber: manifest.resiNumber,
              billingMode: manifest.billingMode,
              paymentDeliveryMethod: manifest.paymentDeliveryMethod,
              totalRecipientBill: totalRecipientBill.toNumber(),
            }),
          },
        });

        return manifest;
      });

      return {
        success: true,
        manifest: {
          id: createdRecord.id,
          resiNumber: createdRecord.resiNumber,
          date: createdRecord.date,
          billingMode: createdRecord.billingMode,
          paymentDeliveryMethod: createdRecord.paymentDeliveryMethod,
          senderName: createdRecord.senderName,
          recipientName: createdRecord.recipientName,
          totalShippingFee: createdRecord.totalShippingFee.toNumber(),
          codAmount: createdRecord.codAmount.toNumber(),
          totalRecipientBill: createdRecord.totalRecipientBill.toNumber(),
          createdAt: createdRecord.createdAt,
        },
      };
    } catch (err: unknown) {
      // Precise P2002 check: Retry ONLY if unique constraint violation is specifically on resiNumber
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const targets = err.meta?.target;
        const isResiCollision =
          Array.isArray(targets)
            ? targets.includes('resiNumber') || targets.includes('resi_number')
            : typeof targets === 'string'
            ? targets.includes('resiNumber') || targets.includes('resi_number')
            : false;

        if (isResiCollision && attempt < MAX_RESI_RETRY) {
          console.warn(`[Resi Collision Retry] Attempt ${attempt} failed for ${datePrefix}. Retrying...`);
          continue;
        }
      }

      console.error('[Create Manifest Error]', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Gagal menyimpan manifest. Silakan coba lagi.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  return {
    success: false,
    error: 'Terjadi bentrokan resi berulang. Silakan coba simpan kembali.',
  };
}
