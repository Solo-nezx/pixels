# Pixels — Social Network for Gamers

A mobile-first, bilingual (English / العربية) social network for gamers:
log & review games, post to a social feed, buy/sell/trade gear in a
marketplace, keep a wishlist, and connect with players who play what you play.

## Features

- **Social feed** — posts, ratings, likes, comments, reposts.
- **Game logging & reviews** — Letterboxd-style poster grid with star ratings.
- **Marketplace** — buy, sell, and trade games, hardware, and collectibles.
- **Wishlist** — a dedicated screen for games you want next.
- **Real game data** — live from the [RAWG](https://rawg.io/apidocs) database
  (with a curated Steam list and bundled mock data as automatic fallbacks).
- **Auth** — Firebase (Google + email), **Discord** (via a Cloudflare Worker),
  and a **Cloudflare Turnstile** bot-check on the login screen.
- **Discord → Steam import** — signing in with Discord reads your *linked Steam
  account* and imports the games you own/play.
- **Friend suggestions** — surfaces gamers who share the most games with you.
- **Badges & milestones, dark/light theme, full RTL Arabic.**

## Quick start

```bash
npm install
cp .env.example .env      # fill in your keys (all optional to run)
npm run dev               # http://localhost:3000
```

The app runs with **no keys** (game data falls back to mock, Discord/Turnstile
hide themselves). Add keys to `.env` to light up the real integrations.

### Environment keys (frontend — all public)

| Variable | What it enables |
|---|---|
| `VITE_RAWG_API_KEY` | Live game browsing/search (free at rawg.io/apidocs) |
| `VITE_DISCORD_CLIENT_ID` | The Discord sign-in button |
| `VITE_WORKER_URL` | Points the app at your Cloudflare Worker |
| `VITE_TURNSTILE_SITE_KEY` | Shows the Cloudflare Turnstile bot-check |

Secrets (Discord client secret, Steam Web API key, Turnstile secret) live in the
**Cloudflare Worker**, never in the frontend — see [`worker/README.md`](worker/README.md).

## Architecture

```
Browser (Vite + React 19 + Tailwind v4)
  |-- Firebase Auth + Firestore    (Google / email accounts + profiles)
  |-- RAWG API                     (live game catalogue, direct from browser)
  '-- Cloudflare Worker (worker/)  (the parts that need a server)
        |-- Discord OAuth token exchange (holds the client secret)
        |-- Steam Web API game import     (holds the Steam key)
        '-- Turnstile verification        (holds the Turnstile secret)
```

## Honest limits of the Discord integration

Discord's public API intentionally does **not** expose:

- **A user's game-play history / library.** Pixels gets "games played" only by
  reading the user's *linked Steam account* (Discord `connections` scope) and
  querying the Steam Web API. The player's Steam game details must be public.
- **A user's friends list.** There is no scope for it. So friend suggestions in
  Pixels are computed from **games players have in common**, not Discord friends.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | `tsc --noEmit` type-check |

## Deploy

- **Frontend:** any static host. Cloudflare Pages pairs naturally with the Worker.
- **Worker:** `cd worker && npm run deploy` (see its README).

---

_Originally scaffolded in Google AI Studio; extended with Discord/Steam/Cloudflare
integrations, a dedicated wishlist, shared-game friend suggestions, and a design pass._
