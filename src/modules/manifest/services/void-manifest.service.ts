import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const voidManifestSchema = z.object({
  voidReason: z.string().trim().min(1, 'Alasan void wajib diisi').max(255, 'Alasan void maksimal 255 karakter'),
});

export type VoidManifestInput = z.infer<typeof voidManifestSchema>;

export interface VoidManifestResult {
  success: boolean;
  resiNumber?: string;
  error?: string;
}

export async function voidManifestService(
  manifestId: string,
  rawInput: VoidManifestInput,
  actorUserId: string
): Promise<VoidManifestResult> {
  const parseResult = voidManifestSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Alasan void tidak valid.',
    };
  }

  const { voidReason } = parseResult.data;

  try {
    const manifest = await prisma.manifest.findUnique({
      where: { id: manifestId },
      include: {
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
            },
          },
        },
        payment: {
          include: {
            transactions: {
              where: { status: 'POSTED' },
            },
          },
        },
        invoiceItems: true,
      },
    });

    if (!manifest) {
      return { success: false, error: 'Manifest tidak ditemukan.' };
    }

    if (manifest.status === 'VOID') {
      return { success: false, error: 'Manifest sudah dalam status VOID.' };
    }

    const deliveryStatus = manifest.delivery?.status || 'READY';

    if (deliveryStatus === 'IN_DELIVERY' || deliveryStatus === 'SUCCESS' || deliveryStatus === 'CANCELLED') {
      return {
        success: false,
        error: `Manifest dengan status ${deliveryStatus} tidak dapat di-void.`,
      };
    }

    // Financial Safety Guard: Check for posted payment transactions or invoice items
    const hasPostedPayment = manifest.payment?.transactions && manifest.payment.transactions.length > 0;
    const hasInvoiceItem = manifest.invoiceItems && manifest.invoiceItems.length > 0;

    if (hasPostedPayment || hasInvoiceItem) {
      return {
        success: false,
        error: 'Manifest sudah memiliki transaksi finansial. Selesaikan reversal/penyesuaian finansial terlebih dahulu sebelum melakukan void.',
      };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Close active assignment if ASSIGNED
      if (manifest.delivery && manifest.delivery.assignments.length > 0) {
        for (const assign of manifest.delivery.assignments) {
          await tx.deliveryAssignment.update({
            where: { id: assign.id },
            data: { unassignedAt: now },
          });
        }
      }

      // 2. Update Delivery status to CANCELLED and clear driverId
      if (manifest.delivery) {
        await tx.delivery.update({
          where: { id: manifest.delivery.id },
          data: {
            status: 'CANCELLED',
            driverId: null,
          },
        });
      }

      // 3. Update Manifest status to VOID
      await tx.manifest.update({
        where: { id: manifest.id },
        data: {
          status: 'VOID',
          voidReason,
          voidById: actorUserId,
          voidAt: now,
        },
      });

      // 4. Update ManifestPayment status to VOID
      if (manifest.payment) {
        await tx.manifestPayment.update({
          where: { id: manifest.payment.id },
          data: { status: 'VOID' },
        });
      }

      // 5. Create AuditLog VOID
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'VOID',
          entityType: 'MANIFEST',
          entityId: manifest.id,
          metadataJson: JSON.stringify({
            resiNumber: manifest.resiNumber,
            voidReason,
            previousStatus: deliveryStatus,
          }),
        },
      });
    });

    return {
      success: true,
      resiNumber: manifest.resiNumber,
    };
  } catch (err) {
    console.error('[Void Manifest Service Error]', err);
    return {
      success: false,
      error: 'Gagal melakukan void manifest.',
    };
  }
}
