import { NextResponse } from 'next/server';
import { authenticateUser } from '@/modules/authentication/services/auth.service';
import { createSession } from '@/lib/auth/session';
import { getRoleDefaultRedirect } from '@/lib/auth/roles';
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

    const body = await request.json();
    const { loginId, password } = body || {};

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, error: 'Login ID dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const authResult = await authenticateUser(loginId, password);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Create signed HTTP-Only session cookie
    await createSession({
      userId: user.id,
      loginId: user.loginId,
      role: user.role,
      employeeId: user.employeeId,
      employeeName: user.employeeName,
    });

    const redirectTo = getRoleDefaultRedirect(user.role);

    return NextResponse.json({
      success: true,
      redirectTo,
    });
  } catch (error) {
    console.error('[Login API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
