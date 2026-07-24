/**
 * Netlify Function: Sign in with Steam (OpenID 2.0) + import the player's
 * library — replaces the old Cloudflare Worker flow, no CORS issues, no key
 * in the frontend.
 *
 * Flow (all in one function, distinguished by query params):
 *   1. GET /.netlify/functions/steam-auth
 *        -> 302 redirect to Steam's OpenID login page.
 *   2. Steam redirects back here with ?openid.mode=id_res&...
 *        -> we verify the assertion with Steam, extract the SteamID64,
 *           fetch the profile + owned games (needs STEAM_API_KEY), then
 *           return a tiny HTML page that postMessages the result to the
 *           opener window and closes itself.
 *
 * Env var required (set in Netlify → Site settings → Environment variables):
 *   STEAM_API_KEY  — from https://steamcommunity.com/dev/apikey
 */

const STEAM_OPENID = 'https://steamcommunity.com/openid/login';
const cover = (appid) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
const banner = (appid) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

function baseUrl(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['host'];
  return `${proto}://${host}`;
}

function redirectToSteam(event) {
  const base = baseUrl(event);
  const returnTo = `${base}/.netlify/functions/steam-auth`;
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': base,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return { statusCode: 302, headers: { Location: `${STEAM_OPENID}?${params.toString()}` }, body: '' };
}

async function verifyAssertion(query) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith('openid.')) body.set(k, v);
  }
  body.set('openid.mode', 'check_authentication');
  const res = await fetch(STEAM_OPENID, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  return /is_valid\s*:\s*true/i.test(text);
}

function steamIdFromClaimed(claimedId) {
  const m = /https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)/.exec(claimedId || '');
  return m ? m[1] : null;
}

async function fetchProfile(apiKey, steamId) {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`,
    );
    const json = await res.json();
    return json?.response?.players?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchOwnedGames(apiKey, steamId) {
  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`,
    );
    const json = await res.json();
    const games = json?.response?.games || [];
    // Most-played first, cap to keep the payload reasonable.
    return games
      .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
      .slice(0, 40)
      .map((g) => ({
        appId: g.appid,
        title: g.name || `App ${g.appid}`,
        coverUrl: cover(g.appid),
        bannerUrl: banner(g.appid),
        hoursPlayed: Math.round((g.playtime_forever || 0) / 60),
        recent: (g.playtime_2weeks || 0) > 0,
      }));
  } catch {
    return [];
  }
}

function resultPage(base, payload) {
  const json = JSON.stringify(payload);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html><html><head><meta charset="utf-8"><title>Steam sign-in</title></head>
<body style="background:#0E0F12;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p>Signing you in…</p>
<script>
(function(){
  var payload = ${json};
  try { if (window.opener) window.opener.postMessage({ source: 'pixels-steam-auth', payload: payload }, ${JSON.stringify(base)}); } catch (e) {}
  setTimeout(function(){ window.close(); }, 300);
})();
</script>
</body></html>`,
  };
}

export async function handler(event) {
  const base = baseUrl(event);
  const query = event.queryStringParameters || {};

  // Step 1: no OpenID response yet → send the user to Steam.
  if (query['openid.mode'] !== 'id_res') {
    return redirectToSteam(event);
  }

  // Step 2: Steam redirected back — verify and build the result.
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return resultPage(base, { ok: false, error: 'steam_api_key_missing' });
  }

  const valid = await verifyAssertion(query);
  const steamId = steamIdFromClaimed(query['openid.claimed_id']);
  if (!valid || !steamId) {
    return resultPage(base, { ok: false, error: 'verification_failed' });
  }

  const [profile, games] = await Promise.all([
    fetchProfile(apiKey, steamId),
    fetchOwnedGames(apiKey, steamId),
  ]);

  const payload = {
    ok: true,
    profile: {
      id: steamId,
      username: profile?.personaname || `Gamer ${steamId.slice(-4)}`,
      handle: profile?.personaname ? profile.personaname.replace(/\s+/g, '_').toLowerCase() : `steam_${steamId.slice(-6)}`,
      email: null,
      avatar: profile?.avatarfull || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
      steamId,
    },
    games,
  };

  return resultPage(base, payload);
}
