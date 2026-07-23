/**
 * Central place to read runtime configuration from Vite env vars.
 * Every value is optional: when a key is missing the app degrades gracefully
 * (Discord/Steam/Turnstile features hide or fall back to a demo path) so the
 * site always runs. Fill these in via `.env` — see `.env.example`.
 */

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const config = {
  rawgApiKey: env.VITE_RAWG_API_KEY || '',
  discordClientId: env.VITE_DISCORD_CLIENT_ID || '',
  workerUrl: (env.VITE_WORKER_URL || '').replace(/\/$/, ''),
  turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY || '',
};

/** Discord sign-in is available once we know the client id and where to send the callback. */
export const isDiscordConfigured = (): boolean =>
  Boolean(config.discordClientId && config.workerUrl);

/** Direct Steam (OpenID) sign-in only needs the Worker — no client secret. */
export const isSteamConfigured = (): boolean => Boolean(config.workerUrl);

/** Turnstile bot-check is shown only when a site key is present. */
export const isTurnstileConfigured = (): boolean => Boolean(config.turnstileSiteKey);

export const workerEndpoint = (path: string): string =>
  `${config.workerUrl}${path.startsWith('/') ? path : `/${path}`}`;
