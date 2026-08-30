import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getRoleDefaultRedirect, USER_ROLES } from '@/lib/auth/roles';

/**
 * Next.js 16 Proxy Convention for Optimistic Route Protection and Initial Role Redirects.
 * Final authorization of sensitive data & actions is enforced server-side via src/lib/auth/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static files, internal Next.js routes, and public health checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Read and verify session token optimistically
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // Handle Login Page access
  if (pathname === '/login') {
    if (isAuthenticated && session) {
      const defaultRedirect = getRoleDefaultRedirect(session.role);
      return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }
    return NextResponse.next();
  }

  // Allow Auth API routes to process their own requests
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // All other application routes require authentication
  if (!isAuthenticated || !session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Optimistic Role-Based Route Navigation
  const { role } = session;

  // Admin Area (Root `/`)
  if (pathname === '/') {
    if (role === USER_ROLES.OPS) {
      return NextResponse.redirect(new URL('/ops', request.url));
    }
    if (role === USER_ROLES.DRIVER) {
      return NextResponse.redirect(new URL('/driver', request.url));
    }
    return NextResponse.next();
  }

  // OPS Area (`/ops`)
  if (pathname.startsWith('/ops')) {
    if (role === USER_ROLES.DRIVER) {
      return NextResponse.redirect(new URL('/driver', request.url));
    }
    if (role === USER_ROLES.FINANCE) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Driver Area (`/driver`)
  if (pathname.startsWith('/driver')) {
    if (
      role === USER_ROLES.ADMIN ||
      role === USER_ROLES.FINANCE ||
      role === USER_ROLES.OPS
    ) {
      return NextResponse.redirect(new URL(getRoleDefaultRedirect(role), request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
