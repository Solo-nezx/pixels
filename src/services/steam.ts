import { Game } from '../types';

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
