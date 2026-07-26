/**
 * One-off diagnostic: why does a profile's "Reviews Written" stay at zero?
 * Prints what the app counts as a review, straight from Firestore.
 *
 *   node scripts/diagnose-stats.mjs steam_76561199509903396
 */
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) { console.error('usage: node scripts/diagnose-stats.mjs <uid>'); process.exit(1); }

if (!getApps().length) {
  initializeApp({
    credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? applicationDefault()
      : cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
  });
}
const db = getFirestore();

const userSnap = await db.doc(`users/${uid}`).get();
if (!userSnap.exists) { console.error(`No user document at users/${uid}`); process.exit(1); }
const user = userSnap.data();

console.log(`\n=== users/${uid} ===`);
console.log('name              :', user.name);
console.log('stored reviews    :', user.reviewsWrittenCount);
console.log('stored gamesLogged:', user.gamesLoggedCount);
console.log('createdAtTs       :', user.createdAtTs ? new Date(user.createdAtTs).toISOString() : '(missing)');

const posts = await db.collection('posts').where('authorId', '==', uid).get();
let rated = 0;
let withGame = 0;
let likes = 0;
posts.forEach((d) => {
  const p = d.data();
  likes += p.likesCount || 0;
  if (p.game) withGame++;
  if (p.game && typeof p.rating === 'number' && p.rating > 0) rated++;
});

console.log(`\n=== posts authored (${posts.size}) ===`);
console.log('with a game attached      :', withGame);
console.log('with game AND rating > 0  :', rated, ' <-- counted as reviews');
console.log('total likes received      :', likes);

const logs = await db.collection(`users/${uid}/gameLogs`).get();
let withReviewText = 0;
let ratedLogs = 0;
let opinions = 0;
let withSnapshot = 0;
logs.forEach((d) => {
  const l = d.data();
  const hasText = !!(l.reviewText && String(l.reviewText).trim());
  const hasStars = (l.rating || 0) > 0;
  if (hasText) withReviewText++;
  if (hasStars) ratedLogs++;
  // Stars or text count, but a log with both is one opinion.
  if (hasText || hasStars) opinions++;
  if (l.game) withSnapshot++;
});

console.log(`\n=== game logs (${logs.size}) ===`);
console.log('with reviewText   :', withReviewText);
console.log('rated (>0)        :', ratedLogs);
console.log('rated OR reviewed :', opinions, ' <-- counted (both = 1)');
console.log('with game snapshot:', withSnapshot, `of ${logs.size}`);

console.log(`\n=> App shows "Rated & Reviewed" = ${rated} + ${opinions} = ${rated + opinions}\n`);
