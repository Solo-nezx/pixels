/**
 * Netlify Function: real "most played" games from the official Steam Web API,
 * with current + peak concurrent player counts (the same data SteamDB surfaces).
 *
 * Runs server-side so it isn't blocked by CORS, and needs no API key.
 * Endpoint (from the frontend): /.netlify/functions/steam-trending
 */

// Warm-instance cache so we don't hammer Steam on every request.
let cache = { ts: 0, games: [] };
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOP_N = 18;

const coverUrl = (appid) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
const bannerUrl = (appid) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

async function fetchAppDetails(appid) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const entry = json?.[appid];
    return entry && entry.success ? entry.data : null;
  } catch {
    return null;
  }
}

async function fetchCurrentPlayers(appid) {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
    );
    if (!res.ok) return 0;
    const json = await res.json();
    return json?.response?.player_count ?? 0;
  } catch {
    return 0;
  }
}

function toGame(rank, info, currentPlayers) {
  const appid = rank.appid;
  let releaseYear = 0;
  let developer = 'Steam';
  let genres = [];
  let summary = '';
  let metascore;

  if (info) {
    developer = (info.developers && info.developers[0]) || info.publishers?.[0] || developer;
    genres = (info.genres || []).map((g) => g.description).filter(Boolean);
    summary = info.short_description || '';
    metascore = info.metacritic?.score;
    const yr = parseInt(String(info.release_date?.date || '').slice(-4), 10);
    if (!Number.isNaN(yr)) releaseYear = yr;
  }

  const peak = rank.peak_in_game ?? 0;

  return {
    id: `steam_${appid}`,
    title: info?.name || `App ${appid}`,
    coverUrl: coverUrl(appid),
    bannerUrl: bannerUrl(appid),
    releaseYear,
    developer,
    genres: genres.length ? genres : ['Steam'],
    platforms: ['PC'],
    averageRating: metascore ? Number((metascore / 20).toFixed(1)) : 0,
    ratingCount: 0,
    summary,
    metascore,
    // Live concurrent players (falls back to the 24h peak if the live call fails).
    playerCount: currentPlayers || peak,
    peakPlayers: peak,
  };
}

export async function handler() {
  const now = Date.now();
  if (cache.games.length && now - cache.ts < TTL_MS) {
    return ok(cache.games);
  }

  try {
    const res = await fetch(
      'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/',
    );
    if (!res.ok) throw new Error(`Steam charts HTTP ${res.status}`);
    const data = await res.json();
    const ranks = (data?.response?.ranks || []).slice(0, TOP_N);
    if (!ranks.length) throw new Error('No ranks returned');

    // Resolve names/details + live player counts in parallel; tolerate failures.
    const [details, players] = await Promise.all([
      Promise.allSettled(ranks.map((r) => fetchAppDetails(r.appid))),
      Promise.allSettled(ranks.map((r) => fetchCurrentPlayers(r.appid))),
    ]);
    const games = ranks.map((r, i) =>
      toGame(
        r,
        details[i].status === 'fulfilled' ? details[i].value : null,
        players[i].status === 'fulfilled' ? players[i].value : 0,
      ),
    );

    cache = { ts: now, games };
    return ok(games);
  } catch (e) {
    // If we have anything cached, serve it stale rather than failing.
    if (cache.games.length) return ok(cache.games);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(e), games: [] }),
    };
  }
}

function ok(games) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ games }),
  };
}
