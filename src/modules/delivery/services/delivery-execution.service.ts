import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import {
  generateDeliveryProofObjectKey,
  uploadDeliveryProofToR2,
  validateProofFile,
  isR2DeliveryConfigured,
  getPresignedDeliveryProofUrl,
} from '@/lib/storage/r2';
import {
  normalizeIndonesianPhone,
  formatWhatsAppUrl,
  sanitizeLocationUrl,
} from '../utils/delivery-utils';

export { normalizeIndonesianPhone, formatWhatsAppUrl, sanitizeLocationUrl };

export interface ProcessTtdPayload {
  deliveryId: string;
  actualRecipientName: string;
  photoBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  latitude?: number;
  longitude?: number;
}

export async function processDeliveryTtdService(
  driverEmployeeId: string,
  payload: ProcessTtdPayload
) {
  try {
    const { deliveryId, actualRecipientName, photoBuffer, mimeType, originalFilename, latitude, longitude } = payload;

    // 1. Validate Input
    if (!deliveryId) {
      return { success: false, error: 'ID Pengiriman wajib diisi.' };
    }
    const recipientClean = actualRecipientName ? actualRecipientName.trim() : '';
    if (!recipientClean) {
      return { success: false, error: 'Nama Penerima Aktual wajib diisi.' };
    }
    if (recipientClean.length > 100) {
      return { success: false, error: 'Nama Penerima terlalu panjang (maksimal 100 karakter).' };
    }

    // 2. Validate File Format & Size
    const fileCheck = validateProofFile(mimeType, photoBuffer.length);
    if (!fileCheck.valid) {
      return { success: false, error: fileCheck.error || 'File foto bukti tidak valid.' };
    }

    // 3. Re-query Delivery & Check Ownership
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        manifest: { select: { resiNumber: true, recipientName: true } },
        assignments: { where: { unassignedAt: null }, orderBy: { assignedAt: 'desc' }, take: 1 },
        proof: true,
      },
    });

    if (!delivery) {
      return { success: false, error: 'Data pengiriman tidak ditemukan.' };
    }

    // Strict Driver Ownership Check
    const activeAssign = delivery.assignments[0];
    const isAssignedDriver = delivery.driverId === driverEmployeeId || (activeAssign && activeAssign.driverId === driverEmployeeId);

    if (!isAssignedDriver) {
      return { success: false, error: 'Tugas pengiriman ini tidak ditugaskan kepada Anda.' };
    }

    // Concurrency / Eligible Status Check
    if (delivery.status === 'SUCCESS' || delivery.proof) {
      return {
        success: false,
        error: 'Tanda terima untuk resi ini sudah diproses. Muat ulang data.',
      };
    }

    if (delivery.status !== 'ASSIGNED' && delivery.status !== 'IN_DELIVERY') {
      return {
        success: false,
        error: `Status pengiriman saat ini (${delivery.status}) tidak dapat diproses tanda terima.`,
      };
    }

    // 4. Verify R2 Delivery Bucket Storage
    if (!isR2DeliveryConfigured()) {
      return {
        success: false,
        error: 'DELIVERY PROOF R2 CONFIGURATION REQUIRED: Infrastruktur Cloudflare R2 untuk bukti serah terima (hdl-logistik-delivery-proofs) belum dikonfigurasi di environment produksi.',
        r2Unconfigured: true,
      };
    }

    // 5. Upload Object to R2
    const objectKey = generateDeliveryProofObjectKey(driverEmployeeId, deliveryId, originalFilename);
    const uploadResult = await uploadDeliveryProofToR2(objectKey, photoBuffer, mimeType);

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || 'Gagal mengunggah foto bukti ke Cloudflare R2.' };
    }

    // 6. Database Transaction (Atomic Status Transition & Proof Creation)
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // Conditional update for double-tap concurrency protection
      const updatedDelivery = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          status: { in: ['ASSIGNED', 'IN_DELIVERY'] },
        },
        data: {
          status: 'SUCCESS',
        },
      });

      if (updatedDelivery.count === 0) {
        throw new Error('Tanda terima untuk resi ini sudah diproses oleh permintaan lain.');
      }

      const proof = await tx.deliveryProof.create({
        data: {
          deliveryId,
          actualRecipientName: recipientClean,
          receivedAt: now,
          photoUrl: objectKey,
          latitude: new Prisma.Decimal((latitude || 0).toFixed(8)),
          longitude: new Prisma.Decimal((longitude || 0).toFixed(8)),
          driverId: driverEmployeeId,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          status: 'SUCCESS',
          notes: `Serah terima paket berhasil kepada: ${recipientClean}`,
        },
      });

      return proof;
    });

    return {
      success: true,
      deliveryId,
      status: 'SUCCESS',
      actualRecipientName: result.actualRecipientName,
      receivedAt: result.receivedAt.toISOString(),
      message: `Tanda Terima Resi ${delivery.manifest.resiNumber} Berhasil Diproses!`,
    };
  } catch (err: any) {
    console.error('[Process Delivery TTD Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memproses Tanda Terima Pengiriman.',
    };
  }
}

export async function getDeliveryProofSignedUrlService(
  driverEmployeeId: string,
  userRole: string,
  deliveryId: string
) {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { proof: true },
    });

    if (!delivery || !delivery.proof) {
      return { success: false, error: 'Bukti serah terima tidak ditemukan.' };
    }

    // Driver ownership check (unless Admin/Owner/Ops/Finance)
    const isAuthorizedRole = ['OWNER', 'ADMIN', 'OPS', 'FINANCE'].includes(userRole);
    if (!isAuthorizedRole && delivery.driverId !== driverEmployeeId) {
      return { success: false, error: 'Anda tidak memiliki akses ke foto bukti pengiriman ini.' };
    }

    const objectKey = delivery.proof.photoUrl;
    const presigned = await getPresignedDeliveryProofUrl(objectKey, 600);

    if (!presigned.success || !presigned.url) {
      return { success: false, error: presigned.error || 'Gagal membuat signed URL foto bukti.' };
    }

    return {
      success: true,
      url: presigned.url,
      actualRecipientName: delivery.proof.actualRecipientName,
      receivedAt: delivery.proof.receivedAt.toISOString(),
    };
  } catch (err) {
    console.error('[Get Delivery Proof Signed URL Error]', err);
    return { success: false, error: 'Gagal mengambil foto bukti pengiriman.' };
  }
}
