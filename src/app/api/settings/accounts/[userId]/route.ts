import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  toggleAccountStatusService,
  resetPasswordService,
} from '@/modules/settings/services/account.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const result = await toggleAccountStatusService(
      userId,
      body.active,
      user.role,
      user.userId
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/settings/accounts/[userId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah status akun.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const body = await request.json();

    if (body.action === 'RESET_PASSWORD') {
      const result = await resetPasswordService(
        userId,
        body.newPassword,
        user.role,
        user.userId
      );

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/settings/accounts/[userId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset password.' },
      { status: 500 }
    );
  }
}
