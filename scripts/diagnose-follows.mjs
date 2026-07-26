/**
 * Diagnostic: the profile says "Following 1" but the list is empty — where did
 * the follow actually land?
 *
 *   node scripts/diagnose-follows.mjs steam_76561199509903396
 *
 * The counter reads `users/<uid>.followingIds`; the LIST reads the `follows`
 * collection and then loads each followed profile. A mismatch tells us which
 * of those three steps failed.
 */
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) { console.error('usage: node scripts/diagnose-follows.mjs <uid>'); process.exit(1); }

if (!getApps().length) {
  initializeApp({
    credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? applicationDefault()
      : cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
  });
}
const db = getFirestore();

const userSnap = await db.doc(`users/${uid}`).get();
const followingIds = userSnap.exists ? (userSnap.data().followingIds || []) : [];

console.log(`\n1) users/${uid}.followingIds  (drives the counter)`);
console.log('   ', followingIds.length ? followingIds : '(empty)');

const mine = await db.collection('follows').where('followerId', '==', uid).get();
console.log(`\n2) follows where followerId == ${uid}  (drives the list)`);
if (mine.empty) {
  console.log('    (none) — the follow document was never created');
} else {
  mine.forEach((d) => console.log('   ', d.id, '->', d.data().followedId));
}

const all = await db.collection('follows').limit(20).get();
console.log(`\n3) follows collection total (sample): ${all.size}`);
all.forEach((d) => console.log('   ', d.id));

console.log('\n4) do the followed profiles exist?');
for (const id of followingIds) {
  const snap = await db.doc(`users/${id}`).get();
  console.log(`    users/${id}:`, snap.exists ? `EXISTS (${snap.data().name})` : 'MISSING — cannot be listed');
}
console.log('');
