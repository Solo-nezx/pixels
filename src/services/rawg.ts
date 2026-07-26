import { Game } from '../types';
import { fetchPopularGamesFromApi, fetchGameDetailsFromApi, searchGamesFromApi } from './gameApiService';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * Gets the RAWG API Key from environment variables.
 */
export function getRawgApiKey(): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (metaEnv && metaEnv.VITE_RAWG_API_KEY) {
    return metaEnv.VITE_RAWG_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_RAWG_API_KEY) {
    return process.env.VITE_RAWG_API_KEY;
  }
  return '';
}

/**
 * Helper to strip HTML formatting from descriptions.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Transforms RAWG API game data into application's Game interface.
 */
export function transformRawgGame(item: any): Game {
  const id = `rawg_${item.id}`;
  const title = item.name || 'Untitled Game';
  const coverUrl = item.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
  const bannerUrl = item.background_image_additional || item.background_image || coverUrl;

  let releaseYear = 2024;
  if (item.released) {
    const year = parseInt(item.released.split('-')[0], 10);
    if (!isNaN(year)) releaseYear = year;
  }

  const developer = item.developers && item.developers.length > 0
    ? item.developers[0].name
    : (item.publishers && item.publishers.length > 0 ? item.publishers[0].name : 'Game Studio');

  const genres = item.genres ? item.genres.map((g: any) => g.name) : ['Action'];
  const platforms = item.platforms ? item.platforms.map((p: any) => p.platform?.name || p.name).filter(Boolean) : ['PC', 'PlayStation 5', 'Xbox Series X'];

  const averageRating = item.rating ? parseFloat(item.rating.toFixed(1)) : 4.5;
  const ratingCount = item.ratings_count || item.added || 100;
  const metascore = item.metacritic || Math.floor(averageRating * 20);

  const summary = stripHtml(item.description_raw || item.description || `Experience ${title}, an immersive ${genres.join('/')} title.`);

  return {
    id,
    title,
    coverUrl,
    bannerUrl,
    releaseYear,
    developer,
    genres,
    platforms,
    averageRating,
    ratingCount,
    summary,
    metascore,
  };
}

/**
 * Fetches trending/popular games from RAWG API.
 * Falls back gracefully if no API key is provided or request fails.
 */
export async function fetchTrendingGames(pageSize: number = 20): Promise<Game[]> {
  const apiKey = getRawgApiKey();

  if (apiKey) {
    try {
      const url = `${RAWG_BASE_URL}/games?key=${apiKey}&ordering=-added&page_size=${pageSize}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          return data.results.map(transformRawgGame);
        }
      }
    } catch (err) {
      console.warn('RAWG API error in fetchTrendingGames, using fallback:', err);
    }
  }

  // Fallback if key missing or failed
  return fetchPopularGamesFromApi(pageSize);
}

/**
 * Fetches detailed information for a single game by ID from RAWG API.
 * Supports rawg_ or numeric game IDs, and falls back to gameApiService if needed.
 */
export async function fetchGameDetails(gameId: string | number): Promise<Game | null> {
  const apiKey = getRawgApiKey();
  const rawId = String(gameId).replace('rawg_', '');

  if (apiKey && rawId) {
    try {
      const url = `${RAWG_BASE_URL}/games/${rawId}?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          return transformRawgGame(data);
        }
      }
    } catch (err) {
      console.warn(`RAWG API error in fetchGameDetails for ${gameId}:`, err);
    }
  }

  // Fallback to existing game detail API
  return fetchGameDetailsFromApi(String(gameId));
}

/** Below this many ratings/adds an entry is usually a fan mod, port test or demo. */
const MIN_POPULARITY_SIGNAL = 10;

/**
 * RAWG's relevance order is good, so keep it — but push no-signal entries
 * ("Elden Ring Test", "Elden Ring GB", …) below the real titles. Sorting purely
 * by title match is worse: it promotes obscure exact-name clones over the game
 * everyone means.
 */
export function rankSearchResults(games: Game[]): Game[] {
  const known = games.filter((g) => (g.ratingCount || 0) >= MIN_POPULARITY_SIGNAL);
  const obscure = games.filter((g) => (g.ratingCount || 0) < MIN_POPULARITY_SIGNAL);
  return [...known, ...obscure];
}

/**
 * Searches for games on the RAWG API by query string.
 * Falls back gracefully if no API key is provided or request fails.
 */
export async function searchGames(query: string, pageSize: number = 20): Promise<Game[]> {
  if (!query.trim()) return fetchTrendingGames(pageSize);

  const apiKey = getRawgApiKey();

  if (apiKey) {
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      // `search_precise` trims the fuzziest noise; ranking below does the rest.
      const url = `${RAWG_BASE_URL}/games?key=${apiKey}&search=${encodedQuery}&search_precise=true&page_size=${pageSize}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          return rankSearchResults(data.results.map(transformRawgGame));
        }
      }
    } catch (err) {
      console.warn(`RAWG API error searching for "${query}":`, err);
    }
  }

  // Fallback search
  return searchGamesFromApi(query, pageSize);
}
