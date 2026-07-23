import { config, isDiscordConfigured, isSteamConfigured, workerEndpoint } from '../lib/config';
import { DiscordAuthResult, Game, SteamGame } from '../types';

/**
 * Discord sign-in via the Cloudflare Worker.
 *
 * Flow:
 *  1. Open a popup to Discord's OAuth authorize screen.
 *  2. Discord redirects the popup to the Worker's callback (which holds the
 *     client secret) — the Worker exchanges the code, reads the linked Steam
 *     account, pulls the player's games, and posts the result back here via
 *     window.postMessage.
 *  3. We resolve with that result. No tokens/PII ever touch a URL we read.
 */

const DISCORD_SCOPES = ['identify', 'email', 'connections'];

function randomState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function buildAuthorizeUrl(state: string): string {
  const redirectUri = workerEndpoint('/auth/discord/callback');
  const params = new URLSearchParams({
    client_id: config.discordClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DISCORD_SCOPES.join(' '),
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Opens a centered popup to `authUrl` and resolves with the payload the Worker
 * posts back under the given message `source`. Shared by Discord + Steam.
 */
function runPopupAuth(authUrl: string, source: string): Promise<DiscordAuthResult> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(authUrl, 'pixels-auth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    let settled = false;
    const workerOrigin = new URL(config.workerUrl).origin;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closeTimer);
    };

    const onMessage = (event: MessageEvent) => {
      // Only trust messages coming from our Worker origin.
      if (event.origin !== workerOrigin) return;
      const data = event.data;
      if (!data || data.source !== source) return;

      settled = true;
      cleanup();
      try { popup.close(); } catch { /* ignore */ }
      resolve(data.payload as DiscordAuthResult);
    };

    window.addEventListener('message', onMessage);

    // Detect the user closing the popup without finishing.
    const closeTimer = setInterval(() => {
      if (popup.closed && !settled) {
        cleanup();
        reject(new Error('popup_closed'));
      }
    }, 500);
  });
}

export function loginWithDiscord(): Promise<DiscordAuthResult> {
  if (!isDiscordConfigured()) return Promise.reject(new Error('discord_not_configured'));
  return runPopupAuth(buildAuthorizeUrl(randomState()), 'pixels-discord-auth');
}

/**
 * Direct Steam sign-in via Steam OpenID (through the Worker). Needs only the
 * Worker URL — the OpenID handshake requires no client secret. The Worker
 * verifies the assertion and returns the profile + Steam library.
 */
export function loginWithSteam(): Promise<DiscordAuthResult> {
  if (!isSteamConfigured()) return Promise.reject(new Error('steam_not_configured'));
  return runPopupAuth(workerEndpoint('/auth/steam/login'), 'pixels-steam-auth');
}

/** Convert a Steam-imported game into the app's Game shape. */
export function steamGameToGame(sg: SteamGame): Game {
  return {
    id: `steam_${sg.appId}`,
    title: sg.title,
    coverUrl: sg.coverUrl,
    bannerUrl: sg.bannerUrl,
    releaseYear: 0,
    developer: 'Steam',
    genres: [],
    platforms: ['PC'],
    averageRating: 0,
    ratingCount: 0,
    summary: '',
  };
}

/** Refresh a user's Steam games later (e.g. a "sync" button). */
export async function fetchSteamGames(steamId: string): Promise<SteamGame[]> {
  if (!config.workerUrl) return [];
  try {
    const res = await fetch(workerEndpoint('/steam/games'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.games as SteamGame[]) || [];
  } catch {
    return [];
  }
}

/** Verify a Turnstile token with the Worker. Returns true if allowed. */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!config.workerUrl) return true; // no backend configured → don't block
  try {
    const res = await fetch(workerEndpoint('/turnstile/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}
