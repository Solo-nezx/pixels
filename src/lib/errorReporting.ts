/**
 * Lightweight crash reporting.
 *
 * Catches uncaught errors and unhandled promise rejections and forwards them to
 * a collector. Deliberately dependency-free: Sentry's SDK is ~30 kB and this
 * app's whole point is a small bundle. Set `VITE_ERROR_ENDPOINT` to any URL that
 * accepts JSON (a Sentry "store" endpoint, a Netlify function, a webhook…);
 * leave it unset and reporting stays inert apart from console logging.
 */
const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const ENDPOINT = env.VITE_ERROR_ENDPOINT || '';
const RELEASE = env.VITE_RELEASE || 'dev';

/** Don't spam the collector if something errors in a loop. */
const MAX_REPORTS_PER_SESSION = 20;
let sent = 0;
let installed = false;

interface ReportPayload {
  message: string;
  stack?: string;
  kind: 'error' | 'unhandledrejection' | 'manual';
  url: string;
  userAgent: string;
  release: string;
  at: string;
  userId?: string;
}

let currentUserId: string | undefined;

/** Attach the signed-in user so reports can be grouped by account. */
export const setErrorUser = (userId?: string): void => { currentUserId = userId; };

function post(payload: ReportPayload): void {
  if (!ENDPOINT || sent >= MAX_REPORTS_PER_SESSION) return;
  sent++;
  try {
    const body = JSON.stringify(payload);
    // sendBeacon survives page unload, which is exactly when crashes happen.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let reporting throw */
  }
}

function build(kind: ReportPayload['kind'], message: string, stack?: string): ReportPayload {
  return {
    kind,
    message: message.slice(0, 500),
    stack: stack?.slice(0, 4000),
    url: location.href,
    userAgent: navigator.userAgent,
    release: RELEASE,
    at: new Date().toISOString(),
    userId: currentUserId,
  };
}

/** Report something we caught ourselves. */
export function reportError(error: unknown, context?: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = context ? `${context}: ${err.message}` : err.message;
  console.error('[reported]', message, err);
  post(build('manual', message, err.stack));
}

/** Install the global handlers. Safe to call more than once. */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    post(build('error', event.message || 'Unknown error', event.error?.stack));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    post(build('unhandledrejection', message, reason instanceof Error ? reason.stack : undefined));
  });
}
