import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export const updateManifestSchema = z.object({
  senderName: z.string().trim().min(1, 'Nama pengirim wajib diisi').max(100).optional(),
  senderPhone: z.string().trim().min(8, 'Nomor HP pengirim minimal 8 karakter').max(20).optional(),
  senderAddress: z.string().trim().min(3, 'Alamat pengirim wajib diisi').max(255).optional(),
  recipientName: z.string().trim().min(1, 'Nama penerima wajib diisi').max(100).optional(),
  recipientPhone: z.string().trim().min(8, 'Nomor HP penerima minimal 8 karakter').max(20).optional(),
  recipientProvince: z.string().trim().min(1, 'Provinsi tujuan wajib diisi').optional(),
  recipientCity: z.string().trim().min(1, 'Kota / Kabupaten tujuan wajib diisi').optional(),
  recipientAddress: z.string().trim().min(3, 'Alamat penerima wajib diisi').max(255).optional(),
  shareLocationUrl: z.string().trim().optional().nullable(),
  itemName: z.string().trim().min(1, 'Nama barang wajib diisi').max(100).optional(),
  weightKg: z.number().positive('Berat barang harus lebih besar dari 0').optional(),
  koliCount: z.number().int().min(1, 'Jumlah koli minimal 1').optional(),
  billingMode: z.enum(['DIRECT', 'INVOICE']).optional(),
  paymentDeliveryMethod: z.enum(['CASH', 'DFOD', 'COD']).optional(),
  codAmount: z.number().min(0, 'Nilai COD tidak boleh negatif').optional(),
  notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
});

export type UpdateManifestInput = z.infer<typeof updateManifestSchema>;

export interface UpdateManifestResult {
  success: boolean;
  manifest?: {
    id: string;
    resiNumber: string;
    recipientProvinceArea: string;
    totalShippingFee: number;
    totalRecipientBill: number;
  };
  error?: string;
}

export async function updateManifestService(
  id: string,
  rawInput: UpdateManifestInput,
  actorUserId: string
): Promise<UpdateManifestResult> {
  const parseResult = updateManifestSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Data update manifest tidak valid.',
    };
  }

  const data = parseResult.data;

  try {
    const existing = await prisma.manifest.findUnique({
      where: { id },
      include: {
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
            },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: 'Manifest tidak ditemukan.' };
    }

    if (existing.status === 'VOID') {
      return { success: false, error: 'Manifest yang sudah di-void tidak dapat di-edit.' };
    }

    const deliveryStatus = existing.delivery?.status || 'READY';

    if (deliveryStatus === 'IN_DELIVERY' || deliveryStatus === 'SUCCESS' || deliveryStatus === 'CANCELLED') {
      return { success: false, error: `Manifest berstatus ${deliveryStatus} tidak dapat di-edit.` };
    }

    // Check if Area is being changed on an ASSIGNED manifest with active assignment
    const isChangingProvince =
      data.recipientProvince !== undefined &&
      data.recipientProvince.trim().toUpperCase() !==
        (existing.recipientProvinceArea.split(',')[1] || '').trim().toUpperCase();

    const isChangingCity =
      data.recipientCity !== undefined &&
      data.recipientCity.trim().toUpperCase() !==
        (existing.recipientProvinceArea.split(',')[0] || '').trim().toUpperCase();

    const isChangingArea = isChangingProvince || isChangingCity;

    if (deliveryStatus === 'ASSIGNED' && isChangingArea && existing.delivery?.assignments && existing.delivery.assignments.length > 0) {
      return {
        success: false,
        error: 'Manifest sudah memiliki penjadwalan aktif. Ubah penjadwalan atau batalkan penugasan terlebih dahulu sebelum mengganti Area Tujuan.',
      };
    }

    // Determine target area
    let province = (existing.recipientProvinceArea.split(',')[1] || '').trim().toUpperCase();
    let city = (existing.recipientProvinceArea.split(',')[0] || '').trim().toUpperCase();

    if (data.recipientProvince) {
      province = data.recipientProvince.trim().replace(/\s+/g, ' ').toUpperCase();
    }
    if (data.recipientCity) {
      city = data.recipientCity.trim().replace(/\s+/g, ' ').toUpperCase();
    }

    // Query ShippingRate master if area or weight is updated
    let rateDecimal = existing.shippingRatePerKg;
    if (isChangingArea) {
      const rateRecord = await prisma.shippingRate.findFirst({
        where: {
          province,
          city,
          active: true,
        },
      });

      if (!rateRecord) {
        return {
          success: false,
          error: `Tarif ongkir untuk area ${city}, ${province} tidak tersedia atau tidak aktif.`,
        };
      }
      rateDecimal = rateRecord.ratePerKg;
    }

    const weightDecimal = data.weightKg !== undefined ? new Prisma.Decimal(data.weightKg) : existing.weightKg;
    const totalShippingFee = weightDecimal.mul(rateDecimal);
    const recipientProvinceArea = `${city}, ${province}`;

    const paymentMethod = data.paymentDeliveryMethod || (existing.paymentDeliveryMethod as 'CASH' | 'DFOD' | 'COD');
    let codDecimal = data.codAmount !== undefined ? new Prisma.Decimal(data.codAmount) : existing.codAmount;
    let totalRecipientBill = new Prisma.Decimal(0);

    switch (paymentMethod) {
      case 'CASH':
        codDecimal = new Prisma.Decimal(0);
        totalRecipientBill = new Prisma.Decimal(0);
        break;
      case 'DFOD':
        codDecimal = new Prisma.Decimal(0);
        totalRecipientBill = totalShippingFee;
        break;
      case 'COD':
        totalRecipientBill = codDecimal;
        break;
    }

    const updateData: Prisma.ManifestUpdateInput = {
      recipientProvinceArea,
      shippingRatePerKg: rateDecimal,
      totalShippingFee,
      paymentDeliveryMethod: paymentMethod,
      codAmount: codDecimal,
      totalRecipientBill,
      weightKg: weightDecimal,
    };

    if (data.senderName !== undefined) updateData.senderName = data.senderName;
    if (data.senderPhone !== undefined) updateData.senderPhone = data.senderPhone;
    if (data.senderAddress !== undefined) updateData.senderAddress = data.senderAddress;
    if (data.recipientName !== undefined) updateData.recipientName = data.recipientName;
    if (data.recipientPhone !== undefined) updateData.recipientPhone = data.recipientPhone;
    if (data.recipientAddress !== undefined) updateData.recipientAddress = data.recipientAddress;
    if (data.shareLocationUrl !== undefined) updateData.shareLocationUrl = data.shareLocationUrl;
    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.koliCount !== undefined) updateData.koliCount = data.koliCount;
    if (data.billingMode !== undefined) updateData.billingMode = data.billingMode;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.$transaction(async (tx) => {
      const manifestRec = await tx.manifest.update({
        where: { id },
        data: updateData,
      });

      // Update ManifestPayment expected amount
      await tx.manifestPayment.updateMany({
        where: { manifestId: id },
        data: {
          expectedAmount: totalRecipientBill,
          balanceDue: totalRecipientBill,
        },
      });

      // AuditLog UPDATE
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'UPDATE',
          entityType: 'MANIFEST',
          entityId: id,
          metadataJson: JSON.stringify({
            resiNumber: manifestRec.resiNumber,
            updatedFields: Object.keys(data),
            recipientProvinceArea,
            totalShippingFee: totalShippingFee.toNumber(),
            totalRecipientBill: totalRecipientBill.toNumber(),
          }),
        },
      });

      return manifestRec;
    });

    return {
      success: true,
      manifest: {
        id: updated.id,
        resiNumber: updated.resiNumber,
        recipientProvinceArea: updated.recipientProvinceArea,
        totalShippingFee: updated.totalShippingFee.toNumber(),
        totalRecipientBill: updated.totalRecipientBill.toNumber(),
      },
    };
  } catch (err) {
    console.error('[Update Manifest Error]', err);
    return {
      success: false,
      error: 'Gagal memperbarui data manifest.',
    };
  }
}
