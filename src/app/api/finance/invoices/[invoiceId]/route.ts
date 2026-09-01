import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getInvoiceDetailService,
  voidInvoiceService,
} from '@/modules/invoice/services/invoice.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const { invoiceId } = await params;
    const result = await getInvoiceDetailService(invoiceId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/invoices/[invoiceId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail invoice.' },
      { status: 500 }
    );
  }
}

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

    if (body.action === 'VOID') {
      const result = await voidInvoiceService(invoiceId, body.reason || 'Pembatalan invoice', user.userId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/finance/invoices/[invoiceId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses aksi invoice.' },
      { status: 500 }
    );
  }
}
