import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { UserRoleType } from '@/lib/auth/roles';

export interface SessionPayload {
  userId: string;
  loginId: string;
  role: UserRoleType;
  employeeId: string | null;
  employeeName: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export const SESSION_COOKIE_NAME = 'hdl_session';
export const SESSION_ISSUER = 'hdl-logistik';
export const SESSION_AUDIENCE = 'hdl-logistik-web';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'hdl-logistik-v2-dev-secret-key-must-be-32-chars-long';
  
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('Security Failure: AUTH_SECRET must be at least 32 characters long in production.');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Creates and signs a cryptographic JWS session token using HS256.
 * Claims include: iss (hdl-logistik), aud (hdl-logistik-web), iat, exp (24h).
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({
    userId: payload.userId,
    loginId: payload.loginId,
    role: payload.role,
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

/**
 * Verifies a JWS session token against secret key, HS256 algorithm, issuer, and audience.
 * Returns decoded SessionPayload if valid; null if signature, issuer, audience, or expiration fails.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    return {
      userId: payload.userId as string,
      loginId: payload.loginId as string,
      role: payload.role as UserRoleType,
      employeeId: (payload.employeeId as string | null) ?? null,
      employeeName: payload.employeeName as string,
      iat: payload.iat,
      exp: payload.exp,
      iss: payload.iss,
      aud: typeof payload.aud === 'string' ? payload.aud : payload.aud?.[0],
    };
  } catch {
    return null;
  }
}

/**
 * Creates an HTTP-Only, Secure, SameSite=Lax session cookie containing the signed JWS token.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

/**
 * Retrieves and verifies the current session token from HTTP cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Destroys the current HTTP session cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
