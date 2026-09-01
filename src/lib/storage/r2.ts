import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    return null; // R2 environment variables not fully configured
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, endpoint };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config) return null;

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function validateProofFile(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Unggah file gambar JPEG, PNG, atau WEBP.',
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Ukuran file terlalu besar. Maksimum ukuran bukti transfer adalah 5 MB.',
    };
  }

  return { valid: true };
}

export function generateProofObjectKey(adjustmentId: string, originalFilename: string): string {
  const now = new Date();
  const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = jkt.getFullYear();
  const month = String(jkt.getMonth() + 1).padStart(2, '0');
  
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'png';
  const randomUuid = crypto.randomUUID();

  return `payment-proofs/${year}/${month}/${adjustmentId}/${randomUuid}.${ext}`;
}

export async function uploadProofToR2(
  objectKey: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config) {
    return {
      success: false,
      error: 'Infrastruktur Cloudflare R2 belum dikonfigurasi di environment produksi.',
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
    });

    await client.send(command);
    return { success: true };
  } catch (err: any) {
    console.error('[R2 Upload Error]', err);
    return {
      success: false,
      error: `Gagal mengunggah bukti transfer ke R2: ${err.message || 'Kesalahan koneksi'}`,
    };
  }
}

export async function getPresignedProofUrl(
  objectKey: string,
  expiresInSeconds: number = 300
): Promise<{ success: boolean; url?: string; error?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config) {
    return {
      success: false,
      error: 'Infrastruktur Cloudflare R2 belum dikonfigurasi.',
    };
  }

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return { success: true, url };
  } catch (err: any) {
    console.error('[R2 Presigned URL Error]', err);
    return {
      success: false,
      error: `Gagal membuat signed URL bukti transfer: ${err.message || 'Kesalahan koneksi'}`,
    };
  }
}
