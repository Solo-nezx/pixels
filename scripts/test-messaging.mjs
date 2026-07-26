/**
 * End-to-end check of the direct-message path against the live database.
 *
 * Writes a thread + message exactly the way the client does, reads it back with
 * the client's query shapes (which is what the missing index broke), verifies
 * the unread counter and the id/rules invariant, then deletes everything it
 * created. Nothing it writes survives a successful run.
 *
 *   node scripts/test-messaging.mjs <uidA> <uidB>
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS first.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const a = process.argv[2] || 'test_alice';
const b = process.argv[3] || 'test_bob';
const convId = [a, b].sort().join('__');   // must match src/services/messaging.ts

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? `\n     ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log(`\n=== messaging round-trip: ${a} ↔ ${b} ===\n`);

const convRef = db.doc(`conversations/${convId}`);
const preexisting = (await convRef.get()).exists;
if (preexisting) {
  console.log('⚠️  a thread already exists for this pair — aborting so real data is left alone.');
  process.exit(1);
}

// 1. Create the thread the way ensureConversation() does.
await convRef.set({
  participants: [a, b],
  participantsMeta: {
    [a]: { id: a, name: 'Alice', username: 'alice', avatar: 'a.png' },
    [b]: { id: b, name: 'Bob', username: 'bob', avatar: 'b.png' },
  },
  updatedAtTs: Date.now(),
  unread: { [a]: 0, [b]: 0 },
});
check('thread created', (await convRef.get()).exists);

// 2. Send a message the way sendMessage() does.
const body = 'ping from test-messaging';
const msgRef = await convRef.collection('messages').add({
  senderId: a, text: body, createdAtTs: Date.now(),
});
await convRef.update({
  lastMessage: { text: body, senderId: a, createdAtTs: Date.now() },
  updatedAtTs: Date.now(),
  [`unread.${b}`]: FieldValue.increment(1),
});

// 3. Read it back with the client's queries — the part the index broke.
try {
  const list = await db.collection('conversations')
    .where('participants', 'array-contains', b)
    .orderBy('updatedAtTs', 'desc').limit(100).get();
  check("recipient's thread list query", list.docs.some((d) => d.id === convId),
    `${list.size} thread(s) returned`);
} catch (e) {
  check("recipient's thread list query", false, String(e.message).split('.')[0]);
}

const msgs = await convRef.collection('messages').orderBy('createdAtTs', 'asc').limit(300).get();
check('message readable in thread', msgs.size === 1 && msgs.docs[0].data().text === body);

const conv = (await convRef.get()).data();
check('unread incremented for the recipient only',
  conv.unread[b] === 1 && conv.unread[a] === 0, `unread = ${JSON.stringify(conv.unread)}`);
check('lastMessage preview stored', conv.lastMessage?.text === body);

// 4. The rules prove membership from the doc id, so it must stay in sync.
check('doc id matches sorted participants (rules invariant)',
  [...conv.participants].sort().join('__') === convId);

// 5. markConversationRead()
await convRef.update({ [`unread.${b}`]: 0 });
check('marking read clears the counter', (await convRef.get()).data().unread[b] === 0);

// Clean up everything this script created.
await msgRef.delete();
await convRef.delete();
check('test data removed', !(await convRef.get()).exists);

console.log(`\n${failures ? `${failures} FAILURE(S)` : 'messaging works end to end'}\n`);
process.exit(failures ? 1 : 0);
