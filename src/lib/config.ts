/**
 * Central place to read runtime configuration from Vite env vars.
 * Every value is optional: when a key is missing the app degrades gracefully
 * (Discord/Steam/Turnstile features hide or fall back to a demo path) so the
 * site always runs. Fill these in via `.env` — see `.env.example`.
 */

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const config = {
  rawgApiKey: env.VITE_RAWG_API_KEY || '',
  workerUrl: (env.VITE_WORKER_URL || '').replace(/\/$/, ''),
  turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY || '',
  // Steam sign-in is served by the built-in Netlify Function (steam-auth);
  // enable the button with VITE_ENABLE_STEAM_LOGIN=1 (needs STEAM_API_KEY set
  // in the Netlify environment).
  enableSteamLogin: env.VITE_ENABLE_STEAM_LOGIN === '1',
};

/** Steam (OpenID) sign-in via the built-in Netlify Function. */
export const isSteamConfigured = (): boolean => config.enableSteamLogin;

/** Turnstile bot-check is shown only when a site key is present. */
export const isTurnstileConfigured = (): boolean => Boolean(config.turnstileSiteKey);

export const workerEndpoint = (path: string): string =>
  `${config.workerUrl}${path.startsWith('/') ? path : `/${path}`}`;
