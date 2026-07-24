import { config, isSteamConfigured, workerEndpoint } from '../lib/config';
import { DiscordAuthResult, Game, SteamGame } from '../types';

/**
 * Steam sign-in via the built-in Netlify Function (steam-auth), which handles
 * the OpenID handshake server-side and posts the profile + library back.
 */

/**
 * Opens a centered popup to `authUrl` and resolves with the payload posted back
 * (via window.postMessage) under the given message `source`. Only messages from
 * `expectedOrigin` are trusted.
 */
function runPopupAuth(authUrl: string, source: string, expectedOrigin: string): Promise<DiscordAuthResult> {
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

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closeTimer);
    };

    const onMessage = (event: MessageEvent) => {
      // Only trust messages from our own origin (the Netlify Function).
      if (event.origin !== expectedOrigin) return;
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

/**
 * Sign in with Steam via OpenID. The Netlify Function verifies the assertion
 * server-side and returns the profile + Steam library (needs STEAM_API_KEY in
 * the Netlify environment).
 */
export function loginWithSteam(): Promise<DiscordAuthResult> {
  if (!isSteamConfigured()) return Promise.reject(new Error('steam_not_configured'));
  const origin = window.location.origin;
  return runPopupAuth(`${origin}/.netlify/functions/steam-auth`, 'pixels-steam-auth', origin);
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
