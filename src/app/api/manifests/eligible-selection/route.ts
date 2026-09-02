import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { buildManifestWhereInput } from '@/modules/manifest/services/list-manifests.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
    ]);

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const area = searchParams.get('area') || 'ALL';
    const search = searchParams.get('search') || '';

    // Build base filter
    const baseWhere = buildManifestWhereInput({ startDate, endDate, area, search });

    // Combine with strict eligibility: DeliveryStatus.READY AND no active assignment
    const eligibleWhere = {
      ...baseWhere,
      delivery: {
        status: 'READY' as const,
        assignments: {
          none: {
            unassignedAt: null,
          },
        },
      },
    };

    const eligibleRecords = await prisma.manifest.findMany({
      where: eligibleWhere,
      select: {
        id: true,
        weightKg: true,
        totalShippingFee: true,
      },
    });

    const manifestIds = eligibleRecords.map((r) => r.id);
    const count = eligibleRecords.length;
    const totalWeight = eligibleRecords.reduce((sum, r) => sum + r.weightKg.toNumber(), 0);
    const totalShippingFee = eligibleRecords.reduce((sum, r) => sum + r.totalShippingFee.toNumber(), 0);

    return NextResponse.json({
      success: true,
      manifestIds,
      count,
      totalWeight,
      totalShippingFee,
    });
  } catch (error) {
    console.error('[Eligible Selection API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data seleksi manifest.' },
      { status: 500 }
    );
  }
}
