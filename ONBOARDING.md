# Pixels — Onboarding / Handoff

Continue-from-anywhere guide for the **Pixels** gamer social network.

## What it is
Mobile-first, bilingual (EN/العربية, full RTL) social network for gamers:
social feed, game logging & reviews, marketplace (buy/sell/trade), a dedicated
**Wishlist**, and **friend suggestions based on games in common**.

Stack: Vite + React 19 + Tailwind v4 + Firebase. A Cloudflare Worker is the
backend for Discord/Steam auth + Turnstile.

## Live deployment
| Piece | URL / location |
|---|---|
| Frontend (Cloudflare Pages, project `pixels`) | https://www.pixelg.net (also https://pixels-dc2.pages.dev) |
| Backend (Cloudflare Worker `pixels-api`) | https://api.pixelg.net |
| Cloudflare account | awammx3@gmail.com · id `eec4b70b18779a93d8f260ea4a88c1c6` |
| Zone | `pixelg.net` (active) |

## Auth & data
- **Firebase**: Google + email/password (config in `firebase-applet-config.json`, public).
- **Discord** OAuth → imports games from the user's *linked Steam* account.
- **Steam** direct sign-in via Steam OpenID 2.0 → imports the Steam library.
- **Cloudflare Turnstile** bot-check on the login screen.
- Live game data is **RAWG-first** (`src/services/rawg.ts`), falling back to a
  Steam app-id list then bundled mock data.

### Keys
- Frontend public keys live in `.env` (not committed) — copy from `.env.example`,
  which already contains the public values (RAWG key, Discord client id,
  `VITE_WORKER_URL=https://api.pixelg.net`, Turnstile site key).
- Worker **secrets** are stored in Cloudflare (NOT in files), already set:
  `DISCORD_CLIENT_SECRET`, `STEAM_API_KEY`, `TURNSTILE_SECRET`.

## Run locally
```bash
npm install
cp .env.example .env      # public keys already filled in the example
npm run dev               # http://localhost:3000
```
Worker: `cd worker && npm install && npx wrangler dev` (needs `wrangler login`).

## Deploy
```bash
# frontend
npx vite build
npx wrangler pages deploy dist --project-name=pixels --branch=main --commit-dirty=true
# worker
cd worker && npx wrangler deploy
```
> VITE_* keys are baked at build time — rebuild + redeploy Pages after changing them.

## Status / what's left
- ✅ Everything built, deployed, and typechecks. `www.pixelg.net` serves 200.
- ✅ Worker secrets set; Turnstile hostnames + Discord redirect reported done.
- ⬜ **Apex redirect** `pixelg.net` → `www.pixelg.net` (dashboard → Rules →
  Redirect Rules; dynamic 301 to `concat("https://www.pixelg.net", http.request.uri.path)`).
  A proxied A record `@ → 192.0.2.1` placeholder already exists for it.
- ⬜ Manual end-to-end login test (Discord/Steam) on the live domain. Steam
  profile must be **public** for games to import.

## Honest limits (don't promise these)
- Discord has **no API** for game-play history (only via linked Steam) and
  **no API** for a friends list. Friend suggestions = games in common
  (`suggestedFriends` in `src/context/AppContext.tsx`).
- Steam `appdetails` is CORS-blocked in-browser — that's why game data is
  RAWG-first and Steam goes through the Worker.

## Map of the code
- `src/context/AppContext.tsx` — global state, auth, games, wishlist, friend suggestions.
- `src/services/rawg.ts` / `gameApiService.ts` — live game data + fallbacks.
- `src/services/discordAuth.ts` — Discord + Steam popup auth flows.
- `src/lib/config.ts` — reads env; feature flags degrade gracefully.
- `src/components/` — UI (AuthModal, WishlistScreen, SuggestedFriends, etc.).
- `worker/src/index.ts` — Cloudflare Worker (Discord/Steam OAuth + Turnstile).
