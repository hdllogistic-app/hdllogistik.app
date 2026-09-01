import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { editAdjustmentService } from '@/modules/payment/services/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ adjustmentId: string }> }
) {
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
    const { adjustmentId } = await params;
    const formData = await request.formData();
    const newPaymentDeliveryMethod = formData.get('newPaymentDeliveryMethod') as 'DFOD' | 'COD';
    const newShippingFee = parseFloat(formData.get('newShippingFee') as string);
    const newCodAmount = formData.get('newCodAmount')
      ? parseFloat(formData.get('newCodAmount') as string)
      : undefined;
    const settlementMethod = formData.get('settlementMethod') as 'CASH' | 'TRANSFER';
    const reason = (formData.get('reason') as string) || 'Koreksi Edit Adjustment';

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

    const result = await editAdjustmentService(
      {
        adjustmentId,
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
    console.error('POST /api/finance/payment/adjustments/[adjustmentId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengedit adjustment pembayaran.' },
      { status: 500 }
    );
  }
}
