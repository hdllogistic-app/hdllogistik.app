import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SenderHistoryDTO {
  name: string;
  phone: string;
  address: string;
  lastUsedAt: string;
}

export interface RecipientHistoryDTO {
  name: string;
  phone: string;
  address: string;
  recipientProvinceArea: string;
  shareLocationUrl: string | null;
  lastUsedAt: string;
}

/**
 * GET /api/manifests/history/contacts?type=sender|recipient&q=search_term
 * Returns deduplicated historical contact suggestions from recent Manifest records.
 * Allowed roles: OWNER, ADMIN, OPS.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
    ]);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sender';
    const q = (searchParams.get('q') || '').trim();

    const maxResults = q.length >= 2 ? 8 : 5;

    if (type === 'sender') {
      const whereInput: any = {};
      if (q.length >= 2) {
        whereInput.OR = [
          { senderName: { contains: q, mode: 'insensitive' } },
          { senderPhone: { contains: q, mode: 'insensitive' } },
        ];
      }

      const records = await prisma.manifest.findMany({
        where: whereInput,
        select: {
          senderName: true,
          senderPhone: true,
          senderAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Server-side deduplication by normalized phone or name+address
      const seen = new Set<string>();
      const suggestions: SenderHistoryDTO[] = [];

      for (const r of records) {
        const normPhone = r.senderPhone.trim().replace(/\D/g, '');
        const normKey = normPhone.length >= 8 ? normPhone : `${r.senderName.trim().toUpperCase()}|${r.senderAddress.trim().toUpperCase()}`;

        if (!seen.has(normKey)) {
          seen.add(normKey);
          suggestions.push({
            name: r.senderName,
            phone: r.senderPhone,
            address: r.senderAddress,
            lastUsedAt: r.createdAt.toISOString(),
          });

          if (suggestions.length >= maxResults) break;
        }
      }

      return NextResponse.json({ success: true, type: 'sender', suggestions });
    } else {
      const whereInput: any = {};
      if (q.length >= 2) {
        whereInput.OR = [
          { recipientName: { contains: q, mode: 'insensitive' } },
          { recipientPhone: { contains: q, mode: 'insensitive' } },
        ];
      }

      const records = await prisma.manifest.findMany({
        where: whereInput,
        select: {
          recipientName: true,
          recipientPhone: true,
          recipientAddress: true,
          recipientProvinceArea: true,
          shareLocationUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Server-side deduplication by normalized phone or name+address
      const seen = new Set<string>();
      const suggestions: RecipientHistoryDTO[] = [];

      for (const r of records) {
        const normPhone = r.recipientPhone.trim().replace(/\D/g, '');
        const normKey = normPhone.length >= 8 ? normPhone : `${r.recipientName.trim().toUpperCase()}|${r.recipientAddress.trim().toUpperCase()}`;

        if (!seen.has(normKey)) {
          seen.add(normKey);
          suggestions.push({
            name: r.recipientName,
            phone: r.recipientPhone,
            address: r.recipientAddress,
            recipientProvinceArea: r.recipientProvinceArea,
            shareLocationUrl: r.shareLocationUrl,
            lastUsedAt: r.createdAt.toISOString(),
          });

          if (suggestions.length >= maxResults) break;
        }
      }

      return NextResponse.json({ success: true, type: 'recipient', suggestions });
    }
  } catch (error) {
    console.error('[Contact History Search API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data riwayat kontak.' },
      { status: 500 }
    );
  }
}
