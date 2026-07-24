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
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
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
): () => void {
  const q = query(collection(db, 'posts'), orderBy('createdAtTs', 'desc'), limit(200));
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
  videos?: string[];
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
    videos: input.videos,
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

export async function addCommentToPost(postId: string, comment: Comment): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    comments: arrayUnion(clean(comment)),
    commentsCount: increment(1),
  });
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
  };
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

export async function setFollow(uid: string, targetId: string, follow: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    followingIds: follow ? arrayUnion(targetId) : arrayRemove(targetId),
  });
}

// ---------------------------------------------------------------------------
// One-time seeding — populates an empty database with the bundled demo content
// so a fresh deployment looks alive. Idempotent: uses the mock ids as document
// ids and only runs when the collection is empty.
// ---------------------------------------------------------------------------

let seedAttempted = false;

export async function seedIfEmpty(): Promise<void> {
  if (seedAttempted) return;
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
    if (Object.keys(patch).length) await updateDoc(ref, patch);
  } catch (e) {
    console.warn('ensureUserArrays skipped:', e);
  }
}
