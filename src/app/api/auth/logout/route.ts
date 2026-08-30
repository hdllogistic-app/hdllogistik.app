import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';
import { validateSameOrigin } from '@/lib/auth/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // CSRF Protection: Validate same-origin request
    if (!validateSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-origin request rejected.' },
        { status: 403 }
      );
    }

    await destroySession();
    return NextResponse.json({
      success: true,
      redirectTo: '/login',
    });
  } catch (error) {
    console.error('[Logout API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan logout.' },
      { status: 500 }
    );
  }
}
