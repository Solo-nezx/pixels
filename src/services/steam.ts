import { Game, SteamGame } from '../types';

/**
 * Fetches the real "most played on Steam" list (with live player counts) from
 * our Netlify Function proxy. Returns [] when the function is unavailable
 * (e.g. local `vite dev` without Netlify) so callers can fall back to RAWG.
 */
export async function fetchSteamTrending(): Promise<Game[]> {
  try {
    const res = await fetch('/.netlify/functions/steam-trending');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.games) ? (data.games as Game[]) : [];
  } catch {
    return [];
  }
}

/** The five games Steam says this profile played most recently. */
export async function fetchSteamRecent(steamId: string, count = 5): Promise<SteamGame[]> {
  if (!/^\d{17}$/.test(steamId)) return [];
  try {
    const res = await fetch(
      `/.netlify/functions/steam-recent?steamid=${steamId}&count=${count}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.games) ? (data.games as SteamGame[]) : [];
  } catch {
    return [];
  }
}
