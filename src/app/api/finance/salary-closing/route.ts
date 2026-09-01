import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { executeSalaryClosingService } from '@/modules/finance/services/salary-closing.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (user.role === 'OPS' || user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden: Role OPS & DRIVER ditolak dari aksi salary closing.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await executeSalaryClosingService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/finance/salary-closing Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses salary closing.' },
      { status: 500 }
    );
  }
}
