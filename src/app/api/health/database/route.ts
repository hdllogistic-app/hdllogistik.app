import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database connection health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'unavailable',
      },
      { status: 503 }
    );
  }
}
