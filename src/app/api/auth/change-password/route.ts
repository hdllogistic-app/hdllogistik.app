import { NextRequest, NextResponse } from 'next/server';
import { verifyCurrentUser } from '@/lib/auth/dal';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const currentUser = await verifyCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Semua field password wajib diisi.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password baru tidak cocok.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 12 karakter.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Akun user tidak ditemukan.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Password lama (saat ini) salah.' },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          metadataJson: JSON.stringify({
            loginId: user.loginId,
            action: 'CHANGE_OWN_PASSWORD',
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui. Gunakan password baru Anda saat login berikutnya.',
    });
  } catch (error) {
    console.error('POST /api/auth/change-password Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui password.' },
      { status: 500 }
    );
  }
}
