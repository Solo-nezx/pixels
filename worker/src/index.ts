/**
 * Pixels — Cloudflare Worker backend
 * ----------------------------------
 * Handles the parts of the app that CANNOT run safely in the browser:
 *
 *  1. Discord OAuth2 token exchange (needs the client SECRET).
 *  2. Reading the user's Discord "connections" to find their linked Steam
 *     account, then pulling their owned / recently played games from the
 *     Steam Web API (needs the STEAM_API_KEY).
 *  3. Verifying Cloudflare Turnstile tokens from the login screen.
 *
 * The Discord callback returns a tiny HTML page that posts the result back
 * to the app window via postMessage — so no sensitive data ever travels in a
 * URL query string.
 *
 * Deploy with `wrangler deploy` from the /worker folder. See worker/README.md.
 */

export interface Env {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string; // e.g. https://pixels-api.<you>.workers.dev/auth/discord/callback
  STEAM_API_KEY: string;
  TURNSTILE_SECRET: string;
  ALLOWED_ORIGIN: string; // the frontend origin, e.g. https://pixels.pages.dev
}

const DISCORD_API = 'https://discord.com/api/v10';
const STEAM_API = 'https://api.steampowered.com';

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

/** Minimal HTML escaping for the value we inline into the callback page. */
function escapeForScript(value: string): string {
  return value.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      switch (url.pathname) {
        case '/':
        case '/health':
          return json({ ok: true, service: 'pixels-worker' }, env);

        case '/auth/discord/callback':
          return handleDiscordCallback(url, env);

        case '/auth/steam/login':
          return handleSteamLogin(url);

        case '/auth/steam/callback':
          return handleSteamCallback(url, env);

        case '/steam/games':
          return handleSteamGames(request, env);

        case '/turnstile/verify':
          return handleTurnstileVerify(request, env);

        default:
          return json({ error: 'Not found' }, env, 404);
      }
    } catch (err: any) {
      return json({ error: err?.message || 'Internal error' }, env, 500);
    }
  },
};

/* ----------------------------- Discord OAuth ----------------------------- */

async function handleDiscordCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return renderCallbackPage(env, { ok: false, error });
  if (!code) return renderCallbackPage(env, { ok: false, error: 'missing_code' });

  // 1. Exchange the authorization code for an access token.
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    return renderCallbackPage(env, { ok: false, error: 'token_exchange_failed' });
  }
  const token = await tokenRes.json<{ access_token: string }>();

  // 2. Fetch the Discord profile + linked connections in parallel.
  const authHeader = { Authorization: `Bearer ${token.access_token}` };
  const [meRes, connRes] = await Promise.all([
    fetch(`${DISCORD_API}/users/@me`, { headers: authHeader }),
    fetch(`${DISCORD_API}/users/@me/connections`, { headers: authHeader }),
  ]);

  if (!meRes.ok) return renderCallbackPage(env, { ok: false, error: 'profile_fetch_failed' });

  const me = await meRes.json<any>();
  const connections: any[] = connRes.ok ? await connRes.json<any[]>() : [];

  const steamConn = connections.find((c) => c.type === 'steam');
  const steamId: string | null = steamConn?.id ?? null;

  // 3. If a Steam account is linked, pull the real owned/played games.
  let games: SteamGame[] = [];
  if (steamId && env.STEAM_API_KEY) {
    games = await fetchSteamGames(steamId, env.STEAM_API_KEY);
  }

  const avatar = me.avatar
    ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${(Number(me.discriminator) || 0) % 5}.png`;

  return renderCallbackPage(env, {
    ok: true,
    profile: {
      id: me.id,
      username: me.global_name || me.username,
      handle: me.username,
      email: me.email ?? null,
      avatar,
      steamId,
    },
    connections: connections.map((c) => ({ type: c.type, name: c.name, id: c.id })),
    games,
  });
}

/**
 * Returns an HTML document that hands the result back to the opener window
 * via postMessage, then closes itself. Keeps tokens/PII out of the URL.
 * `source` distinguishes the provider the frontend is listening for.
 */
function renderCallbackPage(env: Env, payload: unknown, source = 'pixels-discord-auth'): Response {
  const data = escapeForScript(JSON.stringify(payload));
  const origin = env.ALLOWED_ORIGIN || '*';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title>
<style>body{background:#0E0F12;color:#F5F5F7;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head><body>
<p>Completing sign-in…</p>
<script>
  (function () {
    var payload = JSON.parse("${data}");
    var msg = { source: ${JSON.stringify(source)}, payload: payload };
    try { if (window.opener) window.opener.postMessage(msg, ${JSON.stringify(origin)}); } catch (e) {}
    setTimeout(function () { window.close(); }, 300);
  })();
</script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* --------------------------- Steam OpenID login -------------------------- */

/**
 * Kicks off Steam sign-in: 302-redirects the popup to Steam's OpenID 2.0
 * screen. `return_to` points back at our /auth/steam/callback on the same
 * origin. No API key or secret is needed for the login handshake itself.
 */
function handleSteamLogin(url: URL): Response {
  const returnTo = `${url.origin}/auth/steam/callback`;
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': url.origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return Response.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`, 302);
}

/**
 * Steam redirects back here. We must verify the assertion with Steam
 * (check_authentication), extract the 64-bit Steam ID, then enrich with the
 * player's profile + owned/recently-played games.
 */
async function handleSteamCallback(url: URL, env: Env): Promise<Response> {
  const claimedId = url.searchParams.get('openid.claimed_id') || '';

  // 1. Ask Steam to confirm this response is genuine (anti-forgery).
  const verifyBody = new URLSearchParams();
  url.searchParams.forEach((v, k) => verifyBody.append(k, v));
  verifyBody.set('openid.mode', 'check_authentication');

  const verifyRes = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyBody,
  });
  const verifyText = await verifyRes.text();
  if (!/is_valid\s*:\s*true/i.test(verifyText)) {
    return renderCallbackPage(env, { ok: false, error: 'steam_verify_failed' }, 'pixels-steam-auth');
  }

  // 2. Pull the SteamID64 out of the claimed identity URL.
  const match = claimedId.match(/(\d{17})/);
  const steamId = match ? match[1] : null;
  if (!steamId) {
    return renderCallbackPage(env, { ok: false, error: 'steam_id_missing' }, 'pixels-steam-auth');
  }

  // 3. Enrich with profile + games (needs the Steam Web API key).
  let username = `Steam ${steamId.slice(-4)}`;
  let avatar = `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`;
  let games: SteamGame[] = [];

  if (env.STEAM_API_KEY) {
    try {
      const sumRes = await fetch(
        `${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${env.STEAM_API_KEY}&steamids=${steamId}`,
      );
      if (sumRes.ok) {
        const sum = await sumRes.json<any>();
        const player = sum?.response?.players?.[0];
        if (player) {
          username = player.personaname || username;
          avatar = player.avatarfull || avatar;
        }
      }
    } catch {
      /* keep defaults */
    }
    games = await fetchSteamGames(steamId, env.STEAM_API_KEY);
  }

  return renderCallbackPage(
    env,
    {
      ok: true,
      profile: {
        id: steamId,
        username,
        handle: username.replace(/\s+/g, '_').toLowerCase(),
        avatar,
        steamId,
      },
      games,
    },
    'pixels-steam-auth',
  );
}

/* ------------------------------- Steam API ------------------------------- */

interface SteamGame {
  appId: number;
  title: string;
  coverUrl: string;
  bannerUrl: string;
  hoursPlayed: number;
  recent: boolean;
}

function mapSteamGame(g: any, recent: boolean): SteamGame {
  const appId = g.appid;
  return {
    appId,
    title: g.name || `Steam App ${appId}`,
    coverUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
    bannerUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
    hoursPlayed: Math.round((g.playtime_forever || 0) / 60),
    recent,
  };
}

async function fetchSteamGames(steamId: string, apiKey: string): Promise<SteamGame[]> {
  try {
    const ownedUrl =
      `${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}` +
      `&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
    const recentUrl =
      `${STEAM_API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}` +
      `&steamid=${steamId}&format=json`;

    const [ownedRes, recentRes] = await Promise.all([fetch(ownedUrl), fetch(recentUrl)]);

    const owned = ownedRes.ok ? await ownedRes.json<any>() : null;
    const recent = recentRes.ok ? await recentRes.json<any>() : null;

    const recentIds = new Set<number>((recent?.response?.games || []).map((g: any) => g.appid));

    const games: any[] = owned?.response?.games || [];
    // Sort by most-played and cap the payload size.
    games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

    return games
      .slice(0, 60)
      .map((g) => mapSteamGame(g, recentIds.has(g.appid)))
      .filter((g) => g.hoursPlayed > 0 || recentIds.has(g.appId));
  } catch {
    return [];
  }
}

async function handleSteamGames(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST only' }, env, 405);
  const body = await request.json<{ steamId?: string }>().catch(() => ({} as { steamId?: string }));
  const steamId = body.steamId;
  if (!steamId) return json({ error: 'missing_steam_id' }, env, 400);
  if (!env.STEAM_API_KEY) return json({ error: 'steam_not_configured', games: [] }, env, 200);

  const games = await fetchSteamGames(steamId, env.STEAM_API_KEY);
  return json({ games }, env);
}

/* ----------------------------- Turnstile ----------------------------- */

async function handleTurnstileVerify(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST only' }, env, 405);
  const body = await request.json<{ token?: string }>().catch(() => ({} as { token?: string }));
  const token = body.token;
  if (!token) return json({ success: false, error: 'missing_token' }, env, 400);
  if (!env.TURNSTILE_SECRET) {
    // Not configured yet — allow through so the app is usable during setup.
    return json({ success: true, dev: true }, env);
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }),
  });
  const result = await res.json<{ success: boolean }>();
  return json({ success: !!result.success }, env);
}
