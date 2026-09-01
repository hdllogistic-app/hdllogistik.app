import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getPaymentListService,
  createInitialAdjustmentService,
} from '@/modules/payment/services/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const statusFilter = (searchParams.get('statusFilter') as any) || undefined;
    const serviceFilter = (searchParams.get('serviceFilter') as any) || undefined;
    const settlementFilter = (searchParams.get('settlementFilter') as any) || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;

    const result = await getPaymentListService({
      startDate,
      endDate,
      statusFilter,
      serviceFilter,
      settlementFilter,
      searchQuery,
      page,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/payment Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data payment resi.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (user.role === 'OPS' || user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const manifestId = formData.get('manifestId') as string;
    const newPaymentDeliveryMethod = formData.get('newPaymentDeliveryMethod') as 'DFOD' | 'COD';
    const newShippingFee = parseFloat(formData.get('newShippingFee') as string);
    const newCodAmount = formData.get('newCodAmount')
      ? parseFloat(formData.get('newCodAmount') as string)
      : undefined;
    const settlementMethod = formData.get('settlementMethod') as 'CASH' | 'TRANSFER';
    const reason = (formData.get('reason') as string) || 'Adjustment Pembayaran awal';

    const file = formData.get('proofFile') as File | null;
    let proofFileBuffer: Buffer | undefined = undefined;
    let proofFileName: string | undefined = undefined;
    let proofMimeType: string | undefined = undefined;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      proofFileBuffer = Buffer.from(arrayBuffer);
      proofFileName = file.name;
      proofMimeType = file.type;
    }

    const result = await createInitialAdjustmentService(
      {
        manifestId,
        newPaymentDeliveryMethod,
        newShippingFee,
        newCodAmount,
        settlementMethod,
        reason,
        proofFileBuffer,
        proofFileName,
        proofMimeType,
      },
      user.userId
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/finance/payment Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses adjustment pembayaran.' },
      { status: 500 }
    );
  }
}
