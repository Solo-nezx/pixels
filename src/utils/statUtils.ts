import { UserGameLog } from '../types';

/**
 * How many games the player has put an opinion on.
 *
 * A star rating counts, and so does a written review — but a log carrying both
 * is one opinion, not two, so this counts logs rather than summing the signals.
 */
export function countRatedOrReviewed(logs: UserGameLog[]): number {
  return logs.filter((log) => (log.rating || 0) > 0 || !!log.reviewText?.trim()).length;
}

/**
 * Normalise a typed @handle: strip leading @s, collapse spaces to underscores
 * and lowercase it. Handles appear in profile links and mentions, so they must
 * be predictable rather than whatever was pasted in.
 */
export function sanitizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '_').toLowerCase();
}

/**
 * Pick whose collections a profile page should render.
 *
 * Kept as a function with its own tests because getting it wrong is silent:
 * the page still renders, it just shows the viewer's library under someone
 * else's name. `null` for `other` means "still loading", which must render as
 * empty rather than falling back to the viewer's data.
 */
export function profileCollections<L, W>(
  isSelf: boolean,
  mine: { logs: L[]; wishlist: W[] },
  other: { logs: L[]; wishlist: W[] } | null,
): { logs: L[]; wishlist: W[] } {
  if (isSelf) return mine;
  return other ?? { logs: [], wishlist: [] };
}

/** Minimal shape the "currently playing" sync needs from a Steam game. */
export interface RecentGame {
  appId: number;
  hoursPlayed: number;
}

/**
 * Reconcile a game log against the games Steam says were played most recently.
 *
 * Promotes each recent title to `playing` and demotes the ones that fell out of
 * the list — but only those this sync promoted itself (`autoPlaying`), so a
 * status the member set by hand survives. Ratings, reviews and favourites are
 * never touched; play hours refresh from Steam because it knows better.
 *
 * Returns only the entries that actually changed, so callers can skip the write
 * entirely on the common no-op run.
 */
export function syncPlayingFromSteam(
  logs: UserGameLog[],
  recent: RecentGame[],
): UserGameLog[] {
  const recentById = new Map(recent.map((g) => [`steam_${g.appId}`, g]));
  const changed: UserGameLog[] = [];

  for (const log of logs) {
    const hit = recentById.get(log.gameId);

    if (hit) {
      const hours = Math.max(log.hoursPlayed || 0, hit.hoursPlayed || 0);
      if (log.status !== 'playing' || log.hoursPlayed !== hours || !log.autoPlaying) {
        changed.push({ ...log, status: 'playing', hoursPlayed: hours, autoPlaying: true });
      }
      continue;
    }

    // Dropped out of the recent list — undo only our own promotion.
    if (log.autoPlaying && log.status === 'playing') {
      changed.push({ ...log, status: 'completed', autoPlaying: false });
    }
  }

  return changed;
}
