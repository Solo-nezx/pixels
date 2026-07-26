/**
 * Runs the exact query shapes the app uses against the live database.
 *
 * The admin SDK bypasses security rules but NOT index requirements, so a
 * missing composite index shows up here as a FAILED_PRECONDITION — the same
 * thing the browser hits, except in the browser it only lands in the console
 * and the panel silently renders empty.
 *
 *   node scripts/diagnose-queries.mjs <uid>
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account key path.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const uid = process.argv[2];
if (!uid) { console.error('Usage: node scripts/diagnose-queries.mjs <uid>'); process.exit(1); }

/** Run one query shape and report OK / the index that's missing. */
async function probe(label, build) {
  try {
    const snap = await build();
    console.log(`✅ ${label}\n     ${snap.size} document(s)`);
    return snap;
  } catch (e) {
    const msg = String(e.message || e);
    const link = msg.match(/https:\/\/\S+/)?.[0];
    console.log(`❌ ${label}\n     ${msg.split('.')[0]}`);
    if (link) console.log(`     create it: ${link}`);
    return null;
  }
}

console.log(`\n=== query shapes for ${uid} ===\n`);

const convs = await probe('conversations: array-contains + orderBy(updatedAtTs desc)', () =>
  db.collection('conversations')
    .where('participants', 'array-contains', uid)
    .orderBy('updatedAtTs', 'desc').limit(100).get());

await probe('notifications: where(userId) + orderBy(createdAtTs desc)', () =>
  db.collection('notifications')
    .where('userId', '==', uid)
    .orderBy('createdAtTs', 'desc').limit(50).get());

await probe('notifications: where(userId) + where(read == false)', () =>
  db.collection('notifications')
    .where('userId', '==', uid).where('read', '==', false).limit(300).get());

await probe('posts: where(authorId) — profile "Posts" tab', () =>
  db.collection('posts').where('authorId', '==', uid).limit(50).get());

await probe('collectionGroup(comments): where(authorId) + orderBy(createdAtTs desc) — "Replies" tab', () =>
  db.collectionGroup('comments')
    .where('authorId', '==', uid)
    .orderBy('createdAtTs', 'desc').limit(40).get());

await probe('feed: orderBy(createdAtTs desc)', () =>
  db.collection('posts').orderBy('createdAtTs', 'desc').limit(20).get());

// Message threads, if any exist.
console.log('\n=== threads ===');
if (convs && convs.size) {
  for (const d of convs.docs) {
    const c = d.data();
    const msgs = await d.ref.collection('messages').orderBy('createdAtTs', 'asc').limit(300).get();
    console.log(`  ${d.id}`);
    console.log(`    participants: ${JSON.stringify(c.participants)}`);
    console.log(`    meta keys   : ${Object.keys(c.participantsMeta || {}).join(', ') || '(none)'}`);
    console.log(`    unread      : ${JSON.stringify(c.unread || {})}`);
    console.log(`    messages    : ${msgs.size}`);
    msgs.docs.slice(-3).forEach((m) => {
      const v = m.data();
      console.log(`      ${v.senderId === uid ? 'me ' : 'them'}: ${String(v.text).slice(0, 60)}`);
    });
    // The id must equal the sorted participants, or rules will deny access.
    const expected = [...(c.participants || [])].sort().join('__');
    if (expected !== d.id) console.log(`    ⚠️  id mismatch — rules will deny. expected ${expected}`);
  }
} else {
  console.log('  (no threads for this user yet)');
}

// Every conversation in the project, to see whether anyone has messaged at all.
const all = await db.collection('conversations').limit(20).get();
console.log(`\nconversations in project: ${all.size}`);
all.docs.forEach((d) => console.log(`  ${d.id}`));

// A doc id that can't be split into two uids breaks the rules check.
const bad = all.docs.filter((d) => d.id.split('__').length !== 2);
if (bad.length) console.log(`⚠️  ${bad.length} thread id(s) not in "<uidA>__<uidB>" form`);

console.log(`\nusers in project: ${(await db.collection('users').select(FieldPath.documentId()).get()).size}\n`);
