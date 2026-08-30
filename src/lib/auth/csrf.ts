/**
 * Validates Same-Origin header policy for custom Auth API Route Handlers.
 * Prevents Cross-Site Request Forgery (CSRF) by rejecting requests originating from external domains.
 */
export function validateSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

  if (!host) {
    return false;
  }

  const sourceHeader = origin || referer;
  if (!sourceHeader) {
    // In production browsers, state-changing POST requests include Origin/Referer
    // In strict non-browser API clients without Origin, allow if no cross-origin header is present
    return true;
  }

  try {
    const sourceUrl = new URL(sourceHeader);
    const sourceHost = sourceUrl.host;

    return sourceHost.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
