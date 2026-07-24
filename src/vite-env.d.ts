/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** RAWG video-game database key (https://rawg.io/apidocs) — powers live game browsing/search. */
  readonly VITE_RAWG_API_KEY?: string;
  /** Base URL of the deployed Cloudflare Worker (optional; enables Steam sign-in). */
  readonly VITE_WORKER_URL?: string;
  /** Cloudflare Turnstile site key (public) for the login bot-check. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
