import { describe, it, expect } from 'vitest';
import { rankSearchResults } from '../rawg';
import { conversationId, toParticipantMeta } from '../messaging';
import { dataUrlBytes } from '../../lib/imageUpload';
import {
  countRatedOrReviewed, profileCollections, sanitizeHandle, syncPlayingFromSteam,
} from '../../utils/statUtils';
import { Game, User, UserGameLog } from '../../types';

const game = (title: string, ratingCount: number): Game => ({
  id: `g_${title}`,
  title,
  coverUrl: '',
  releaseYear: 2020,
  developer: 'Dev',
  genres: [],
  platforms: [],
  averageRating: 0,
  ratingCount,
  summary: '',
});

describe('rankSearchResults', () => {
  it('pushes no-signal entries below real titles while keeping relevance order', () => {
    const results = rankSearchResults([
      game('Elden Ring Test', 0),
      game('Elden Ring', 1483),
      game('Elden Ring GB', 2),
      game('Elden Ring: Shadow of the Erdtree', 120),
    ]);
    expect(results.map((g) => g.title)).toEqual([
      'Elden Ring',
      'Elden Ring: Shadow of the Erdtree',
      'Elden Ring Test',
      'Elden Ring GB',
    ]);
  });

  it('preserves the API ordering among equally popular titles', () => {
    const results = rankSearchResults([game('B', 500), game('A', 400), game('C', 300)]);
    expect(results.map((g) => g.title)).toEqual(['B', 'A', 'C']);
  });

  it('does not reorder when every result is obscure', () => {
    const results = rankSearchResults([game('X', 1), game('Y', 0)]);
    expect(results.map((g) => g.title)).toEqual(['X', 'Y']);
  });

  it('never drops results', () => {
    const input = [game('A', 0), game('B', 99), game('C', 5)];
    expect(rankSearchResults(input)).toHaveLength(input.length);
  });
});

describe('conversationId', () => {
  it('is stable regardless of argument order', () => {
    expect(conversationId('bob', 'alice')).toBe(conversationId('alice', 'bob'));
  });

  it('encodes both uids so membership is provable from the id', () => {
    const id = conversationId('alice', 'bob');
    expect(id.split('__')).toEqual(['alice', 'bob']);
  });

  it('distinguishes different pairs', () => {
    expect(conversationId('a', 'b')).not.toBe(conversationId('a', 'c'));
  });
});

describe('toParticipantMeta', () => {
  it('keeps only the fields a conversation list needs', () => {
    const user = {
      id: 'u1', name: 'Ahmed', username: 'ahmed', avatar: 'a.png',
      banner: 'b.png', bio: 'secret bio', verified: true,
      followersCount: 5, followingCount: 2, likesReceivedCount: 1,
      hoursPlayed: 10, gamesLoggedCount: 3, reviewsWrittenCount: 0,
    } as User;
    expect(toParticipantMeta(user)).toEqual({
      id: 'u1', name: 'Ahmed', username: 'ahmed', avatar: 'a.png',
    });
  });
});

describe('dataUrlBytes', () => {
  it('approximates the decoded size of a data URL', () => {
    // "AAAA" base64 decodes to 3 bytes.
    expect(dataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3);
  });

  it('returns 0 for a plain URL', () => {
    expect(dataUrlBytes('https://example.com/a.jpg')).toBe(0);
  });

  it('scales roughly 3/4 of the payload length', () => {
    const payload = 'A'.repeat(4000);
    expect(dataUrlBytes(`data:image/jpeg;base64,${payload}`)).toBe(3000);
  });
});

/**
 * Mirrors the "hidden users" rule in AppContext: content from anyone I blocked
 * or who blocked me must not appear.
 */
describe('mutual block filtering', () => {
  const hidden = (blockedIds: string[], blockedByIds: string[]) =>
    Array.from(new Set([...blockedIds, ...blockedByIds]));

  const visible = <T extends { author: { id: string } }>(items: T[], hiddenIds: string[]) =>
    items.filter((i) => !hiddenIds.includes(i.author.id));

  const posts = [
    { id: 'p1', author: { id: 'friend' } },
    { id: 'p2', author: { id: 'blocked-by-me' } },
    { id: 'p3', author: { id: 'blocked-me' } },
  ];

  it('hides users I blocked', () => {
    const ids = hidden(['blocked-by-me'], []);
    expect(visible(posts, ids).map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('hides users who blocked me', () => {
    const ids = hidden([], ['blocked-me']);
    expect(visible(posts, ids).map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('hides both directions at once and de-duplicates', () => {
    const ids = hidden(['blocked-by-me', 'x'], ['blocked-me', 'x']);
    expect(ids.filter((i) => i === 'x')).toHaveLength(1);
    expect(visible(posts, ids).map((p) => p.id)).toEqual(['p1']);
  });

  it('leaves the feed untouched when nothing is blocked', () => {
    expect(visible(posts, hidden([], []))).toHaveLength(3);
  });
});

/** Mirrors the Firestore prefix-range trick used by searchUsers. */
describe('username prefix search range', () => {
  const HIGH = '';
  const docs = ['ahmad', 'ahmed', 'alex vance', 'kratos', 'sarah'];
  const match = (q: string) => docs.filter((d) => d >= q && d <= q + HIGH);

  it('matches every document starting with the query', () => {
    expect(match('ah')).toEqual(['ahmad', 'ahmed']);
  });

  it('matches a single prefix hit', () => {
    expect(match('kra')).toEqual(['kratos']);
  });

  it('returns nothing for an unmatched prefix', () => {
    expect(match('zz')).toEqual([]);
  });

  it('would return nothing without the high sentinel (regression guard)', () => {
    const broken = docs.filter((d) => d >= 'ah' && d <= 'ah');
    expect(broken).toEqual([]);
  });
});

describe('rated-or-reviewed stat', () => {
  const log = (over: Partial<UserGameLog>): UserGameLog => ({
    gameId: 'g', rating: 0, hoursPlayed: 0, status: 'playing', loggedAt: 'now', ...over,
  });

  it('counts a star rating', () => {
    expect(countRatedOrReviewed([log({ rating: 4 })])).toBe(1);
  });

  it('counts a written review with no stars', () => {
    expect(countRatedOrReviewed([log({ reviewText: 'great' })])).toBe(1);
  });

  it('counts a rated AND reviewed game only once', () => {
    expect(countRatedOrReviewed([log({ rating: 5, reviewText: 'great' })])).toBe(1);
  });

  it('ignores an untouched log', () => {
    expect(countRatedOrReviewed([log({})])).toBe(0);
  });

  it('ignores whitespace-only review text', () => {
    expect(countRatedOrReviewed([log({ reviewText: '   ' })])).toBe(0);
  });

  it('sums across a mixed library', () => {
    expect(countRatedOrReviewed([
      log({ rating: 3 }), log({ reviewText: 'ok' }), log({ rating: 5, reviewText: 'x' }), log({}),
    ])).toBe(3);
  });
});

describe('handle sanitising', () => {
  it('strips a leading @', () => {
    expect(sanitizeHandle('@nezo')).toBe('nezo');
  });

  it('strips repeated @s and trims', () => {
    expect(sanitizeHandle('  @@nezo ')).toBe('nezo');
  });

  it('replaces spaces with underscores so links stay valid', () => {
    expect(sanitizeHandle('cool gamer 99')).toBe('cool_gamer_99');
  });

  it('lowercases, matching the searchUsername mirror', () => {
    expect(sanitizeHandle('NeZo')).toBe('nezo');
  });

  it('leaves an already-clean handle untouched', () => {
    expect(sanitizeHandle('nezo.99')).toBe('nezo.99');
  });
});

describe('profile collections belong to the profile owner', () => {
  const mine = { logs: ['my-game'], wishlist: ['my-wish'] };
  const theirs = { logs: ['their-game'], wishlist: ['their-wish'] };

  it('shows my own data on my page', () => {
    expect(profileCollections(true, mine, null)).toEqual(mine);
  });

  it('shows their data on their page — never mine', () => {
    expect(profileCollections(false, mine, theirs)).toEqual(theirs);
  });

  it('renders empty while their data is loading, not my library', () => {
    expect(profileCollections(false, mine, null)).toEqual({ logs: [], wishlist: [] });
  });

  it('respects a genuinely empty library instead of falling back', () => {
    const empty = { logs: [], wishlist: [] };
    expect(profileCollections(false, mine, empty)).toEqual(empty);
  });
});

describe('Steam "currently playing" sync', () => {
  const log = (over: Partial<UserGameLog>): UserGameLog => ({
    gameId: 'steam_1', rating: 0, hoursPlayed: 0, status: 'completed', loggedAt: 'x', ...over,
  });
  const recent = (appId: number, hoursPlayed = 0) => ({ appId, hoursPlayed });

  it('promotes a recently played game to Playing', () => {
    const [changed] = syncPlayingFromSteam([log({ gameId: 'steam_1' })], [recent(1)]);
    expect(changed.status).toBe('playing');
    expect(changed.autoPlaying).toBe(true);
  });

  it('demotes a game it promoted once it drops out of the recent list', () => {
    const logs = [log({ gameId: 'steam_9', status: 'playing', autoPlaying: true })];
    const [changed] = syncPlayingFromSteam(logs, [recent(1)]);
    expect(changed.status).toBe('completed');
    expect(changed.autoPlaying).toBe(false);
  });

  it('never overrides a status the member set by hand', () => {
    const logs = [log({ gameId: 'steam_9', status: 'playing' })]; // no autoPlaying flag
    expect(syncPlayingFromSteam(logs, [recent(1)])).toEqual([]);
  });

  it('leaves other hand-picked statuses alone', () => {
    const logs = [log({ gameId: 'steam_9', status: 'backlog' })];
    expect(syncPlayingFromSteam(logs, [recent(1)])).toEqual([]);
  });

  it('keeps rating, review and favourite while promoting', () => {
    const logs = [log({ gameId: 'steam_1', rating: 5, reviewText: 'great', isFavorite: true })];
    const [changed] = syncPlayingFromSteam(logs, [recent(1)]);
    expect(changed).toMatchObject({ rating: 5, reviewText: 'great', isFavorite: true, status: 'playing' });
  });

  it('refreshes hours upward from Steam but never downward', () => {
    const logs = [log({ gameId: 'steam_1', hoursPlayed: 40 })];
    expect(syncPlayingFromSteam(logs, [recent(1, 55)])[0].hoursPlayed).toBe(55);
    expect(syncPlayingFromSteam(logs, [recent(1, 10)])[0].hoursPlayed).toBe(40);
  });

  it('returns nothing when the library already matches — no pointless write', () => {
    const logs = [
      log({ gameId: 'steam_1', status: 'playing', autoPlaying: true, hoursPlayed: 12 }),
      log({ gameId: 'steam_2', status: 'completed' }),
    ];
    expect(syncPlayingFromSteam(logs, [recent(1, 12)])).toEqual([]);
  });

  it('ignores recent games that are not in the library', () => {
    expect(syncPlayingFromSteam([log({ gameId: 'steam_1' })], [recent(1), recent(777)])).toHaveLength(1);
  });
});
