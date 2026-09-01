import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { updateCustomerService } from '@/modules/settings/services/customer.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateCustomerService(id, body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/settings/customers/[id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data customer.' },
      { status: 500 }
    );
  }
}
