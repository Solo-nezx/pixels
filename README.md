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
- **Cloud-backed & shared** — posts, marketplace listings, game logs, wishlist,
  and follows persist to **Cloud Firestore** and are shared across devices/users
  in real time.
- **Auth** — Firebase (Google + email), an optional **Steam** sign-in (via a
  Cloudflare Worker), and an optional **Cloudflare Turnstile** bot-check.
- **Steam import** — signing in with Steam imports the games you own/play.
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

### Environment keys (frontend — all public, all optional)

| Variable | What it enables |
|---|---|
| `VITE_RAWG_API_KEY` | Live game browsing/search (free at rawg.io/apidocs) |
| `VITE_ENABLE_STEAM_LOGIN` | Set to `1` to show the "Continue with Steam" button |
| `VITE_TURNSTILE_SITE_KEY` | Shows the Cloudflare Turnstile bot-check |

Steam sign-in is served by the built-in **Netlify Function** `steam-auth`, which
needs a server-side `STEAM_API_KEY` (from https://steamcommunity.com/dev/apikey)
set in the Netlify environment — never in the frontend.

## Architecture

```
Browser (Vite + React 19 + Tailwind v4)
  |-- Firebase Auth                       (Google / email accounts)
  |-- Cloud Firestore                     (profiles, posts, listings, logs, wishlist, follows)
  |-- RAWG API                            (game catalogue, direct from browser)
  '-- Netlify Functions (netlify/functions)
        |-- steam-trending  (real "most played" + live player counts, keyless)
        '-- steam-auth      (Steam OpenID sign-in + library import, needs STEAM_API_KEY)
```

## Data model (Firestore)

```
users/{uid}                    profile + wishlist[] + followingIds[]
users/{uid}/gameLogs/{gameId}  the user's logged games
posts/{postId}                 social feed (real-time)
listings/{listingId}           marketplace (real-time)
```

Security rules live in [`firestore.rules`](firestore.rules): everything is
publicly readable; writes are restricted to the owner (posts also allow any
signed-in user to toggle likes/reposts/comments). A fresh, empty database is
seeded once from the bundled demo content so the feed looks alive on first run.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | `tsc --noEmit` type-check |

## Deploy (Firebase Hosting)

The project is wired for Firebase Hosting ([`firebase.json`](firebase.json),
[`.firebaserc`](.firebaserc) → project `secure-bazaar-77c1c`).

```bash
npm run build                         # produce dist/
firebase login                        # one-time, interactive
firebase deploy --only hosting,firestore   # ship the app + security rules
```

> **Before auth works in production**, enable the sign-in providers in the
> Firebase Console → Authentication → Sign-in method: **Google** and
> **Email/Password** (Email/Password is currently disabled on the project).

- **Worker (optional, for Steam):** `cd worker && npm run deploy` (see its README),
  then set `VITE_WORKER_URL` and rebuild.

---

_Originally scaffolded in Google AI Studio; extended with a Firestore-backed
social/marketplace backend, Steam import, a dedicated wishlist, shared-game
friend suggestions, and a design pass._
