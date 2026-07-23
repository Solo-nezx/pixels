# Pixels API — Cloudflare Worker

This Worker is the small backend the browser can't safely be:

| Endpoint | Purpose |
|---|---|
| `GET /auth/discord/callback` | Exchanges the Discord OAuth code (needs the client **secret**), reads the user's linked **Steam** account, and pulls their real owned/recently-played games. Returns an HTML page that `postMessage`s the result back to the app. |
| `POST /steam/games` | Body `{ "steamId": "…" }` → refreshes a user's Steam games. |
| `POST /turnstile/verify` | Body `{ "token": "…" }` → verifies a Cloudflare Turnstile token. |

## 1. Install & log in

```bash
cd worker
npm install
npx wrangler login
```

## 2. Create a Discord application

1. https://discord.com/developers/applications → **New Application**.
2. **OAuth2 → General**: copy the **Client ID** and **Client Secret**.
3. **OAuth2 → Redirects**: add your Worker callback URL exactly, e.g.
   `https://pixels-api.<your-subdomain>.workers.dev/auth/discord/callback`
   (and `http://localhost:8787/auth/discord/callback` for local dev).
4. Scopes used by the app: `identify`, `email`, `connections`.

## 3. Get a Steam Web API key

https://steamcommunity.com/dev/apikey — this powers importing the games a
player owns/has played. The player's Steam profile game details must be
**public** for games to come back.

## 4. Create a Turnstile widget

Cloudflare dashboard → **Turnstile** → add a site. Copy the **Site Key**
(goes in the frontend `.env`) and the **Secret Key** (goes here).

## 5. Configure

Edit `wrangler.toml` `[vars]`:

```toml
ALLOWED_ORIGIN = "https://your-frontend-origin"          # must match where the app is served
DISCORD_REDIRECT_URI = "https://pixels-api.<you>.workers.dev/auth/discord/callback"
DISCORD_CLIENT_ID = "your-discord-client-id"
```

Set the secrets (these are never committed):

```bash
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put STEAM_API_KEY
npx wrangler secret put TURNSTILE_SECRET
```

## 6. Run / deploy

```bash
npm run dev      # local at http://localhost:8787
npm run deploy   # publishes to Cloudflare
```

Then point the frontend at it via `VITE_WORKER_URL` (see the root `.env.example`).

> **Reality check on Discord:** Discord's API has **no** endpoint for a user's
> game-play history and **no** endpoint for their friends list. This Worker gets
> "games played" only by reading the user's *linked Steam account* and querying
> Steam. Friend suggestions in Pixels are computed from games players have in
> common inside the app.
