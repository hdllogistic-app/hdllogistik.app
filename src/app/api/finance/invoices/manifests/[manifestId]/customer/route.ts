import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { linkManifestCustomerService } from '@/modules/invoice/services/invoice.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ manifestId: string }> }
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
    const { manifestId } = await params;
    const body = await request.json();

    if (!body.customerId) {
      return NextResponse.json(
        { success: false, error: 'Pilih Customer penagihan yang valid.' },
        { status: 400 }
      );
    }

    const result = await linkManifestCustomerService(manifestId, body.customerId, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PATCH /api/finance/invoices/manifests/[manifestId]/customer Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghubungkan resi ke customer penagihan.' },
      { status: 500 }
    );
  }
}
