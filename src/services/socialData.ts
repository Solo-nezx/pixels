/**
 * Firestore-backed social data layer for Pixels.
 *
 * Everything that used to live in localStorage (posts, marketplace listings,
 * game logs, wishlist, follows) now persists to Cloud Firestore so it is shared
 * across devices and users — a real social network rather than a per-browser
 * demo.
 *
 * Collections:
 *   posts/{postId}                     — social feed (real-time)
 *   listings/{listingId}               — marketplace (real-time)
 *   users/{uid}                        — profile + wishlist[] + followingIds[]
 *   users/{uid}/gameLogs/{gameId}      — the user's logged games
 */
import {
  db,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
} from '../lib/firebase';
import {
  Post,
  MarketplaceListing,
  User,
  Game,
  Comment,
  UserGameLog,
  GameStatus,
} from '../types';
import { mockPosts, mockListings } from '../data/mockData';

/** Firestore rejects `undefined` values — strip them recursively. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/** Shape a raw Firestore post doc into the app's Post, resolving per-user flags. */
function toPost(id: string, data: any, myUid: string | null): Post {
  const likedBy: string[] = data.likedBy || [];
  const repostedBy: string[] = data.repostedBy || [];
  return {
    ...data,
    id,
    isLiked: myUid ? likedBy.includes(myUid) : false,
    isReposted: myUid ? repostedBy.includes(myUid) : false,
  } as Post;
}

/** Live-subscribe to the feed (newest first). Returns an unsubscribe fn. */
export function subscribePosts(
  myUid: string | null,
  cb: (posts: Post[]) => void,
  onError?: (e: unknown) => void,
  /** Grows as the reader scrolls, so a first visit only pays for one screenful. */
  pageSize = 20,
): () => void {
  const q = query(collection(db, 'posts'), orderBy('createdAtTs', 'desc'), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toPost(d.id, d.data(), myUid))),
    (err) => { console.error('posts subscription error:', err); onError?.(err); },
  );
}

export interface NewPostInput {
  author: User;
  content: string;
  createdAt: string;
  game?: Game;
  rating?: number;
  imageUrl?: string;
  images?: string[];
}

/** Create a post. Returns the new document id. */
export async function createPost(input: NewPostInput): Promise<string> {
  const payload = clean({
    author: input.author,
    authorId: input.author.id,
    content: input.content,
    createdAt: input.createdAt,
    createdAtTs: Date.now(),
    game: input.game,
    rating: input.rating,
    imageUrl: input.imageUrl,
    images: input.images,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    likedBy: [] as string[],
    repostedBy: [] as string[],
    comments: [] as Comment[],
  });
  const ref = await addDoc(collection(db, 'posts'), payload);
  return ref.id;
}

/** Edit a post's body. Rules restrict this to signed-in users; the UI to the author. */
export async function updatePostContent(postId: string, content: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), { content, editedAtTs: Date.now() });
}

/** Delete a post. Rules allow this only for the author. */
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function toggleLikePost(postId: string, currentlyLiked: boolean, uid: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    likedBy: currentlyLiked ? arrayRemove(uid) : arrayUnion(uid),
    likesCount: increment(currentlyLiked ? -1 : 1),
  });
}

export async function toggleRepostPost(postId: string, currentlyReposted: boolean, uid: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    repostedBy: currentlyReposted ? arrayRemove(uid) : arrayUnion(uid),
    repostsCount: increment(currentlyReposted ? -1 : 1),
  });
}

/**
 * Comments live in `posts/{id}/comments`, not inside the post document.
 * Embedding them hit Firestore's 1 MB document cap once a post also carried
 * inline base64 images — a popular post would silently stop accepting comments.
 */
export async function addCommentToPost(postId: string, comment: Comment): Promise<void> {
  const { id, ...rest } = comment;
  await addDoc(collection(db, 'posts', postId, 'comments'), clean({
    ...rest,
    authorId: comment.author.id,
    createdAtTs: Date.now(),
  }));
  // Keep the denormalised counter so the feed doesn't need a sub-read.
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
}

/** Live comments for one post, oldest first. */
export function subscribeComments(
  postId: string,
  cb: (comments: Comment[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('createdAtTs', 'asc'),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as Comment))),
    (err) => { console.error('comments subscription error:', err); onError?.(err); },
  );
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Marketplace listings
// ---------------------------------------------------------------------------

export function subscribeListings(
  cb: (listings: MarketplaceListing[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(collection(db, 'listings'), orderBy('createdAtTs', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as MarketplaceListing))),
    (err) => { console.error('listings subscription error:', err); onError?.(err); },
  );
}

export async function createListing(
  listing: Omit<MarketplaceListing, 'id'> & { createdAtTs?: number },
): Promise<string> {
  const payload = clean({
    ...listing,
    sellerId: listing.seller.id,
    createdAtTs: listing.createdAtTs ?? Date.now(),
  });
  const ref = await addDoc(collection(db, 'listings'), payload);
  return ref.id;
}

// ---------------------------------------------------------------------------
// Per-user data: game logs (subcollection), wishlist & follows (array fields)
// ---------------------------------------------------------------------------

export interface UserData {
  gameLogs: UserGameLog[];
  wishlist: string[];
  followingIds: string[];
  blockedIds: string[];
  /** Users who blocked ME — their content is hidden from me too (mutual block). */
  blockedByIds: string[];
  /** When the member finished (or skipped) onboarding; 0 means never. */
  onboardedAtTs: number;
}

/** Remember that onboarding is done so it never nags again. */
export async function markOnboarded(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { onboardedAtTs: Date.now() });
  } catch (e) {
    console.warn('markOnboarded failed:', e);
  }
}

export async function fetchUserData(uid: string): Promise<UserData> {
  const [userSnap, logsSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDocs(collection(db, 'users', uid, 'gameLogs')),
  ]);
  const userData = userSnap.exists() ? (userSnap.data() as any) : {};
  return {
    gameLogs: logsSnap.docs.map((d) => d.data() as UserGameLog),
    wishlist: userData.wishlist || [],
    followingIds: userData.followingIds || [],
    blockedIds: userData.blockedIds || [],
    blockedByIds: userData.blockedByIds || [],
    onboardedAtTs: userData.onboardedAtTs || 0,
  };
}

/**
 * Record a block on both sides: `blockedIds` on my doc (so I stop seeing them)
 * and `blockedByIds` on theirs (so they stop seeing me). Security rules allow
 * the second write only for the caller's own uid.
 */
export async function setBlocked(uid: string, targetId: string, block: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    blockedIds: block ? arrayUnion(targetId) : arrayRemove(targetId),
  });
  try {
    await updateDoc(doc(db, 'users', targetId), {
      blockedByIds: block ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (e) {
    // Their doc may not exist yet — the one-sided block still applies.
    console.warn('blockedByIds mirror failed:', e);
  }
}

/** Register this device's push token on my own profile (one per device). */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  } catch (e) {
    console.warn('saveFcmToken failed:', e);
  }
}

/** Follower counter lives on the followed user's document. */
export async function bumpFollowerCount(targetId: string, delta: 1 | -1): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetId), { followersCount: increment(delta) });
  } catch (e) {
    console.warn('bumpFollowerCount failed:', e);
  }
}

/**
 * Has `targetId` blocked `myId`? Reads the target's public profile, so the
 * check costs one document read and needs no extra permissions — used to stop
 * a blocked user from opening or writing to a conversation.
 */
export async function hasBlockedMe(targetId: string, myId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', targetId));
    if (!snap.exists()) return false;
    const ids: string[] = (snap.data() as any).blockedIds || [];
    return ids.includes(myId);
  } catch {
    return false;
  }
}

export async function saveGameLog(uid: string, log: UserGameLog): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'gameLogs', log.gameId), clean(log));
}

export async function removeGameLog(uid: string, gameId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'gameLogs', gameId));
}

/** Bulk-save game logs (used by the Steam import). */
export async function saveGameLogs(uid: string, logs: UserGameLog[]): Promise<void> {
  if (!logs.length) return;
  const batch = writeBatch(db);
  for (const log of logs) {
    batch.set(doc(db, 'users', uid, 'gameLogs', log.gameId), clean(log));
  }
  await batch.commit();
}

export async function setWishlistItem(uid: string, gameId: string, add: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    wishlist: add ? arrayUnion(gameId) : arrayRemove(gameId),
  });
}

/** Deterministic id so a follow can't be recorded twice. */
const followId = (followerId: string, followedId: string) => `${followerId}__${followedId}`;

/**
 * Record a follow as its own document as well as on my `followingIds` array.
 *
 * The document is the source of truth: follower counts are COUNTED from
 * `follows` (see `countFollowers`) instead of trusting an incrementable field,
 * which a determined user could inflate by repeating a +1 write.
 */
export async function setFollow(uid: string, targetId: string, follow: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    followingIds: follow ? arrayUnion(targetId) : arrayRemove(targetId),
  });

  const ref = doc(db, 'follows', followId(uid, targetId));
  try {
    if (follow) {
      await setDoc(ref, { followerId: uid, followedId: targetId, createdAtTs: Date.now() });
    } else {
      await deleteDoc(ref);
    }
  } catch (e) {
    console.warn('follow document write failed:', e);
  }
}

/**
 * Real follower count, aggregated server-side (one read regardless of size).
 * Returns null when the query fails so callers can fall back to the stored field.
 */
export async function countFollowers(userId: string): Promise<number | null> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, 'follows'), where('followedId', '==', userId)),
    );
    return snap.data().count;
  } catch (e) {
    console.warn('countFollowers failed:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// One-time seeding — populates an empty database with the bundled demo content
// so a fresh deployment looks alive. Idempotent: uses the mock ids as document
// ids and only runs when the collection is empty.
// ---------------------------------------------------------------------------

let seedAttempted = false;

/**
 * Demo content is no longer planted automatically: once real members joined,
 * unowned mock posts read as fake and nobody can moderate them. Flip this to
 * true only for a fresh throwaway environment.
 */
const SEEDING_ENABLED = false;

/** Ids of the bundled demo documents, so a moderator can clear them out. */
export const seededPostIds = (): string[] => mockPosts.map((p) => p.id);
export const seededListingIds = (): string[] => mockListings.map((l) => l.id);

/** Moderator-only cleanup of the originally seeded demo posts and listings. */
export async function deleteSeededContent(): Promise<{ posts: number; listings: number }> {
  let posts = 0;
  let listings = 0;
  for (const id of seededPostIds()) {
    try { await deleteDoc(doc(db, 'posts', id)); posts++; } catch { /* already gone */ }
  }
  for (const id of seededListingIds()) {
    try { await deleteDoc(doc(db, 'listings', id)); listings++; } catch { /* already gone */ }
  }
  return { posts, listings };
}

export async function seedIfEmpty(): Promise<void> {
  if (!SEEDING_ENABLED || seedAttempted) return;
  seedAttempted = true;
  try {
    const postsCol = collection(db, 'posts');
    const listingsCol = collection(db, 'listings');
    const [postsSnap, listingsSnap] = await Promise.all([
      getDocs(query(postsCol, limit(1))),
      getDocs(query(listingsCol, limit(1))),
    ]);

    const base = Date.now();

    if (postsSnap.empty) {
      const batch = writeBatch(db);
      mockPosts.forEach((p, i) => {
        const { id, ...rest } = p;
        batch.set(doc(db, 'posts', id), clean({
          ...rest,
          authorId: p.author.id,
          createdAtTs: base - i * 60000,
          likedBy: [],
          repostedBy: [],
          comments: p.comments || [],
          likesCount: p.likesCount ?? 0,
          commentsCount: p.commentsCount ?? 0,
          repostsCount: p.repostsCount ?? 0,
        }));
      });
      await batch.commit();
    }

    if (listingsSnap.empty) {
      const batch = writeBatch(db);
      mockListings.forEach((l, i) => {
        const { id, ...rest } = l;
        batch.set(doc(db, 'listings', id), clean({ ...rest, sellerId: l.seller.id, createdAtTs: base - i * 60000 }));
      });
      await batch.commit();
    }
  } catch (e) {
    // Best-effort: if rules block seeding (e.g. production with a populated DB)
    // just carry on — the feed simply shows whatever already exists.
    console.warn('Seed skipped:', e);
  }
}

/**
 * Search members by display name or @username.
 *
 * Firestore has no substring search, so profiles carry a lowercased
 * `searchName`/`searchUsername` and we use a prefix range query
 * (`>= q` and `<= q + `). Two queries are merged and de-duplicated.
 */
export async function searchUsers(rawQuery: string, max = 12): Promise<User[]> {
  const q = rawQuery.trim().toLowerCase().replace(/^@/, '');
  if (q.length < 2) return [];

  const range = (field: string) => query(
    collection(db, 'users'),
    orderBy(field),
    where(field, '>=', q),
    where(field, '<=', `${q}`),
    limit(max),
  );

  try {
    const [byName, byUsername] = await Promise.all([
      getDocs(range('searchName')).catch(() => null),
      getDocs(range('searchUsername')).catch(() => null),
    ]);

    const found = new Map<string, User>();
    for (const snap of [byName, byUsername]) {
      snap?.docs.forEach((d) => {
        const data = d.data() as User;
        if (data?.id) found.set(data.id, data);
      });
    }
    return Array.from(found.values()).slice(0, max);
  } catch (e) {
    console.warn('searchUsers failed:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reports — write-only from the client; you review them in the Firebase console.
// ---------------------------------------------------------------------------

export type ReportTargetType = 'post' | 'user' | 'listing';
export type ReportReason = 'spam' | 'harassment' | 'hate' | 'nsfw' | 'scam' | 'other';

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  /** Denormalised so a deleted target still leaves a reviewable record. */
  targetOwnerId?: string;
  targetPreview?: string;
  reason: ReportReason;
  details?: string;
  reporterId: string;
}): Promise<void> {
  await addDoc(collection(db, 'reports'), clean({
    ...input,
    status: 'open',
    createdAtTs: Date.now(),
  }));
}

export interface ReportRecord {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  targetPreview?: string;
  reason: ReportReason;
  details?: string;
  reporterId: string;
  status: 'open' | 'resolved';
  createdAtTs: number;
}

/** True when the signed-in user has an `admins/<uid>` document. */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/** Moderator-only: live queue of reports, newest first. */
export function subscribeReports(
  cb: (reports: ReportRecord[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(collection(db, 'reports'), orderBy('createdAtTs', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as ReportRecord))),
    (err) => { console.error('reports subscription error:', err); onError?.(err); },
  );
}

export async function resolveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), { status: 'resolved', resolvedAtTs: Date.now() });
}

/** Moderator-only: remove offending content (rules also allow the author). */
export async function moderatorDeletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

/** Fetch one post by id — used when opening a shared post link. */
export async function fetchPostById(postId: string, myUid: string | null): Promise<Post | null> {
  try {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) return null;
    return toPost(snap.id, snap.data(), myUid);
  } catch (e) {
    console.warn('fetchPostById failed:', e);
    return null;
  }
}

export interface AuthoredStats {
  /** Posts this user has written. */
  posts: number;
  /** Likes across all of them — the real total, not just the loaded page. */
  likes: number;
  /** Posts that carry a game + rating, i.e. actual reviews. */
  reviews: number;
}

/**
 * Aggregate a user's post stats with one query.
 *
 * Reading these off the loaded feed page under-counts, and keeping an
 * incrementable counter on the profile would be forgeable (the same reason
 * follower counts moved to the `follows` collection), so they're counted here.
 */
export async function fetchAuthoredStats(uid: string): Promise<AuthoredStats> {
  const empty: AuthoredStats = { posts: 0, likes: 0, reviews: 0 };
  if (!uid) return empty;
  try {
    const snap = await getDocs(query(
      collection(db, 'posts'),
      where('authorId', '==', uid),
      limit(500),
    ));
    return snap.docs.reduce<AuthoredStats>((acc, d) => {
      const p = d.data() as Post & { rating?: number };
      acc.posts += 1;
      acc.likes += p.likesCount || 0;
      if (p.game && typeof p.rating === 'number' && p.rating > 0) acc.reviews += 1;
      return acc;
    }, { ...empty });
  } catch (e) {
    console.warn('fetchAuthoredStats failed:', e);
    return empty;
  }
}

/** Everything one member posted, newest first — the profile's "Posts" tab. */
export async function fetchUserPosts(uid: string, max = 50): Promise<Post[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'posts'),
      where('authorId', '==', uid),
      orderBy('createdAtTs', 'desc'),
      limit(max),
    ));
    return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as Post));
  } catch (e) {
    console.warn('fetchUserPosts failed:', e);
    return [];
  }
}

/** One reply plus the post it belongs to, so the tab can show context. */
export interface ReplyWithContext {
  comment: Comment;
  postId: string;
  /** The parent post, when it still exists (a deleted post leaves the reply orphaned). */
  post: Post | null;
}

/**
 * Every comment a member wrote, across all posts — the profile's "Replies" tab.
 *
 * Comments are a subcollection, so this needs a collection-group query: one
 * index (`comments.authorId` + `createdAtTs`, COLLECTION_GROUP scope) and the
 * `/{path=**}/comments/{id}` read rule, since the nested rule doesn't apply.
 */
export async function fetchUserReplies(uid: string, max = 40): Promise<ReplyWithContext[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(
      collectionGroup(db, 'comments'),
      where('authorId', '==', uid),
      orderBy('createdAtTs', 'desc'),
      limit(max),
    ));

    const rows = snap.docs.map((d) => ({
      comment: { ...(d.data() as object), id: d.id } as Comment,
      // posts/{postId}/comments/{commentId} — two levels up is the post.
      postId: d.ref.parent.parent?.id || '',
    }));

    // One read per distinct parent post, not per reply.
    const posts = new Map<string, Post | null>();
    await Promise.all(Array.from(new Set(rows.map((r) => r.postId))).filter(Boolean).map(
      async (id) => { posts.set(id, await fetchPostById(id, null)); },
    ));

    return rows.map((r) => ({ ...r, post: posts.get(r.postId) ?? null }));
  } catch (e) {
    console.warn('fetchUserReplies failed:', e);
    return [];
  }
}

/** What another member's profile page shows: their library and their wishlist. */
export interface PublicProfileData {
  gameLogs: UserGameLog[];
  wishlist: string[];
}

/**
 * Load the collections a visitor sees on someone else's profile.
 *
 * The profile page used to render `userGames`/`wishlist` from context no matter
 * whose page it was, so every visitor saw their own library under a stranger's
 * name. Both are publicly readable, so a visitor can fetch the real ones.
 */
export async function fetchPublicProfileData(uid: string): Promise<PublicProfileData> {
  if (!uid) return { gameLogs: [], wishlist: [] };
  try {
    const [userSnap, logsSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(collection(db, 'users', uid, 'gameLogs'), limit(300))),
    ]);
    const data = userSnap.exists() ? (userSnap.data() as any) : {};
    return {
      gameLogs: logsSnap.docs.map((d) => d.data() as UserGameLog),
      wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
    };
  } catch (e) {
    console.warn('fetchPublicProfileData failed:', e);
    return { gameLogs: [], wishlist: [] };
  }
}

/** Another member's public game log — used for "games in common". */
export async function fetchUserGameLogs(uid: string, max = 300): Promise<UserGameLog[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'gameLogs'), limit(max)));
    return snap.docs.map((d) => d.data() as UserGameLog);
  } catch (e) {
    console.warn('fetchUserGameLogs failed:', e);
    return [];
  }
}

/** Load the profiles behind a list of uids (chunked — `in` accepts 30 at a time). */
export async function fetchUsersByIds(ids: string[]): Promise<User[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (!unique.length) return [];
  const out: User[] = [];
  try {
    for (let i = 0; i < unique.length; i += 30) {
      const batch = unique.slice(i, i + 30);
      const snap = await getDocs(query(collection(db, 'users'), where('id', 'in', batch)));
      snap.docs.forEach((d) => out.push(d.data() as User));
    }
  } catch (e) {
    console.warn('fetchUsersByIds failed:', e);
  }
  return out;
}

/** Who follows this user (from the authoritative `follows` collection). */
export async function fetchFollowerIds(userId: string, max = 100): Promise<string[]> {
  try {
    const snap = await getDocs(query(
      collection(db, 'follows'),
      where('followedId', '==', userId),
      limit(max),
    ));
    return snap.docs.map((d) => (d.data() as { followerId: string }).followerId);
  } catch (e) {
    console.warn('fetchFollowerIds failed:', e);
    return [];
  }
}

/** Who this user follows. */
export async function fetchFollowingIds(userId: string, max = 100): Promise<string[]> {
  try {
    const snap = await getDocs(query(
      collection(db, 'follows'),
      where('followerId', '==', userId),
      limit(max),
    ));
    return snap.docs.map((d) => (d.data() as { followedId: string }).followedId);
  } catch (e) {
    console.warn('fetchFollowingIds failed:', e);
    return [];
  }
}

/**
 * A pool of real members to draw friend suggestions from.
 * Newest first when profiles carry `createdAtTs`, with a plain fetch as the
 * fallback for older documents that predate that field.
 */
export async function fetchMemberPool(max = 40): Promise<User[]> {
  const read = async (q: ReturnType<typeof query>) => {
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as User).filter((u) => !!u?.id);
  };
  try {
    return await read(query(collection(db, 'users'), orderBy('createdAtTs', 'desc'), limit(max)));
  } catch {
    try {
      return await read(query(collection(db, 'users'), limit(max)));
    } catch (e) {
      console.warn('fetchMemberPool failed:', e);
      return [];
    }
  }
}

/** The profile fields a member is allowed to edit about themselves. */
export type EditableProfile = Partial<Pick<User, 'name' | 'username' | 'bio' | 'avatar' | 'banner'>>;

/**
 * Persist profile edits to Firestore.
 *
 * Editing used to only touch local state, so a renamed member kept their old
 * name everywhere other people looked — and stayed unfindable, because search
 * matches the lowercase `searchName`/`searchUsername` mirrors. Those are kept
 * in step here.
 */
export async function saveProfileFields(uid: string, fields: EditableProfile): Promise<void> {
  if (!uid) return;
  const patch: Record<string, unknown> = clean({ ...fields });
  if (fields.name !== undefined) patch.searchName = fields.name.toLowerCase();
  if (fields.username !== undefined) patch.searchUsername = fields.username.toLowerCase();
  if (!Object.keys(patch).length) return;
  await setDoc(doc(db, 'users', uid), patch, { merge: true });
}

/** Ensure a user doc has the array fields the app now expects. */
export async function ensureUserArrays(uid: string): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as any;
    const patch: Record<string, unknown> = {};
    if (!Array.isArray(data.wishlist)) patch.wishlist = [];
    if (!Array.isArray(data.followingIds)) patch.followingIds = [];
    if (!Array.isArray(data.blockedIds)) patch.blockedIds = [];
    if (!Array.isArray(data.blockedByIds)) patch.blockedByIds = [];
    // Lowercased mirrors that make the profile findable by search.
    const wantName = (data.name || '').toLowerCase();
    const wantUsername = (data.username || '').toLowerCase();
    if (data.searchName !== wantName) patch.searchName = wantName;
    if (data.searchUsername !== wantUsername) patch.searchUsername = wantUsername;
    if (Object.keys(patch).length) await updateDoc(ref, patch);
  } catch (e) {
    console.warn('ensureUserArrays skipped:', e);
  }
}
