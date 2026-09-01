import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { recordInvoicePaymentService } from '@/modules/invoice/services/invoice.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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
    const { invoiceId } = await params;
    const body = await request.json();

    const result = await recordInvoicePaymentService(
      {
        invoiceId,
        amount: parseFloat(body.amount),
        method: body.method,
        paidAt: body.paidAt,
        referenceNumber: body.referenceNumber,
        notes: body.notes,
      },
      user.userId
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/finance/invoices/[invoiceId]/payments Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencatat pembayaran invoice.' },
      { status: 500 }
    );
  }
}
