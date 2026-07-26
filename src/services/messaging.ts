/**
 * Firestore-backed direct messages and notifications.
 *
 * Collections:
 *   conversations/{convId}                  — 1:1 thread metadata (participants, last message, unread)
 *   conversations/{convId}/messages/{msgId} — the messages themselves
 *   notifications/{notifId}                 — per-recipient activity feed
 *
 * `convId` is derived from the two uids (sorted, joined by `__`) so opening a
 * chat twice can never create a duplicate thread, and security rules can check
 * membership from the id alone without an extra document read.
 */
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  getDocs,
  increment,
  writeBatch,
  auth as firebaseAuth,
} from '../lib/firebase';
import {
  Conversation,
  Message,
  ParticipantMeta,
  AppNotification,
  NotificationType,
  User,
} from '../types';

/** Firestore rejects `undefined` — strip it. */
const clean = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;

export const conversationId = (a: string, b: string): string => [a, b].sort().join('__');

export const toParticipantMeta = (u: User | ParticipantMeta): ParticipantMeta => ({
  id: u.id,
  name: u.name,
  username: u.username,
  avatar: u.avatar,
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/** Live list of the user's threads, most recently active first. */
export function subscribeConversations(
  uid: string,
  cb: (conversations: Conversation[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
    orderBy('updatedAtTs', 'desc'),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as Conversation))),
    (err) => { console.error('conversations subscription error:', err); onError?.(err); },
  );
}

/** Live messages for one thread, oldest first. */
export function subscribeMessages(
  convId: string,
  cb: (messages: Message[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAtTs', 'asc'),
    limit(300),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as Message))),
    (err) => { console.error('messages subscription error:', err); onError?.(err); },
  );
}

/** Create the thread if it doesn't exist yet; returns its id. */
export async function ensureConversation(me: User, other: ParticipantMeta): Promise<string> {
  const id = conversationId(me.id, other.id);
  const ref = doc(db, 'conversations', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, clean({
      participants: [me.id, other.id],
      participantsMeta: {
        [me.id]: toParticipantMeta(me),
        [other.id]: toParticipantMeta(other),
      },
      updatedAtTs: Date.now(),
      unread: { [me.id]: 0, [other.id]: 0 },
    }));
  }
  return id;
}

/** Send a message and bump the thread's last-message / unread counters. */
export async function sendMessage(
  convId: string,
  sender: User,
  recipientId: string,
  text: string,
): Promise<void> {
  const body = text.trim();
  if (!body) return;
  const createdAtTs = Date.now();

  await addDoc(collection(db, 'conversations', convId, 'messages'), clean({
    senderId: sender.id,
    text: body,
    createdAtTs,
  }));

  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: { text: body.slice(0, 140), senderId: sender.id, createdAtTs },
    updatedAtTs: createdAtTs,
    [`unread.${recipientId}`]: increment(1),
  });

  // Best-effort: tell the recipient about it (in-app + web push).
  await createNotification({
    userId: recipientId,
    type: 'message',
    actor: toParticipantMeta(sender),
    text: body.slice(0, 90),
  }).catch(() => {});

  sendPush(recipientId, sender.name, body.slice(0, 120), '/');
}

/**
 * Ask the Netlify function to push a notification to a user's devices.
 * Entirely best-effort: a missing service account or offline function must
 * never affect the message that was already delivered.
 */
export async function sendPush(recipientId: string, title: string, body: string, url = '/'): Promise<void> {
  try {
    // The function verifies this token and refuses to push to strangers.
    const idToken = await firebaseAuth.currentUser?.getIdToken();
    if (!idToken) return;

    await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ recipientId, title, body, url, tag: `dm-${recipientId}` }),
      keepalive: true,
    });
  } catch {
    /* best-effort only — the message itself is already delivered */
  }
}

/** Clear the viewer's unread counter for a thread. */
export async function markConversationRead(convId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', convId), { [`unread.${uid}`]: 0 });
  } catch (e) {
    console.warn('markConversationRead failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NewNotification {
  userId: string;
  type: NotificationType;
  actor: ParticipantMeta;
  postId?: string;
  text?: string;
}

/** Fire-and-forget: never let a failed notification break the action itself. */
export async function createNotification(input: NewNotification): Promise<void> {
  // Don't notify yourself.
  if (input.userId === input.actor.id) return;
  try {
    await addDoc(collection(db, 'notifications'), clean({
      ...input,
      createdAtTs: Date.now(),
      read: false,
    }));
  } catch (e) {
    console.warn('createNotification failed:', e);
  }
}

export function subscribeNotifications(
  uid: string,
  cb: (items: AppNotification[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAtTs', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as AppNotification))),
    (err) => { console.error('notifications subscription error:', err); onError?.(err); },
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (e) {
    console.warn('markNotificationRead failed:', e);
  }
}

/** Mark every unread notification for this user as read. */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  try {
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('read', '==', false),
      limit(300),
    ));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (e) {
    console.warn('markAllNotificationsRead failed:', e);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (e) {
    console.warn('deleteNotification failed:', e);
  }
}
