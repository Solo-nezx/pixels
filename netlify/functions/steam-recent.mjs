/**
 * Recently played Steam games for one public profile.
 *
 *   GET /.netlify/functions/steam-recent?steamid=7656119...
 *
 * Used to keep the profile's "Playing" shelf honest without asking the member
 * to re-log anything: Steam already knows what they launched this fortnight.
 * Only the app's own key touches Steam — the client never sees it.
 */
const STEAM_KEY = process.env.STEAM_API_KEY || process.env.STEAM_WEB_API_KEY || '';

const cover = (appId) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
const banner = (appId) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    // A fortnight's playtime doesn't change minute to minute.
    'Cache-Control': 'public, max-age=900',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

export async function handler(event) {
  const steamId = (event.queryStringParameters?.steamid || '').trim();
  if (!/^\d{17}$/.test(steamId)) return json(400, { error: 'bad_steamid' });
  if (!STEAM_KEY) return json(200, { games: [], reason: 'not_configured' });

  const count = Math.min(Number(event.queryStringParameters?.count) || 5, 20);

  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_KEY}&steamid=${steamId}&count=${count}&format=json`,
    );
    if (!res.ok) return json(200, { games: [], reason: `steam_${res.status}` });

    const data = await res.json();
    const games = (data?.response?.games || [])
      // Steam's ordering isn't guaranteed; most-played-this-fortnight first is
      // the closest public proxy for "what they're playing right now".
      .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0))
      .slice(0, count)
      .map((g) => ({
        appId: g.appid,
        title: g.name || `App ${g.appid}`,
        coverUrl: cover(g.appid),
        bannerUrl: banner(g.appid),
        hoursPlayed: Math.round((g.playtime_forever || 0) / 60),
        recentHours: Math.round(((g.playtime_2weeks || 0) / 60) * 10) / 10,
        recent: true,
      }));

    return json(200, { games });
  } catch (e) {
    console.error('steam-recent failed:', e);
    return json(200, { games: [], reason: 'fetch_failed' });
  }
}
