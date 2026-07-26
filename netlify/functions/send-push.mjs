/**
 * Netlify Function: send a web push to one user's registered devices.
 *
 * The client can't send FCM messages itself (that needs privileged credentials),
 * so it POSTs here and this function fans out with the Admin SDK.
 *
 * Required env var (Netlify → Site configuration → Environment variables):
 *   FIREBASE_SERVICE_ACCOUNT = the full service-account JSON, on one line
 *     (Firebase Console → Project settings → Service accounts → Generate new
 *      private key). Keep it secret — it is never exposed to the browser.
 *
 * Auth: the caller MUST send `Authorization: Bearer <Firebase ID token>`. The
 * token is verified, and a push is only allowed to someone the caller already
 * shares a conversation with — so this endpoint can't be used to spam anyone.
 *
 * Body: { recipientId, title, body, url?, tag? }
 */
// firebase-admin v13+ only exposes the modular entry points; the old
// `admin.apps` / `admin.credential` namespace no longer exists.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function initAdmin() {
  const existing = getApps();
  if (existing.length) return existing[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('service_account_missing');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const { recipientId, title, body, url, tag } = input;
  if (!recipientId || !title) return json(400, { error: 'missing_fields' });

  try {
    initAdmin();
  } catch (e) {
    // Not usable yet. Report *why* (message only, never the credential) so a
    // malformed service account can be told apart from a missing one.
    const reason = e?.message === 'service_account_missing' ? 'missing' : `init_failed: ${e?.message}`;
    return json(200, { sent: 0, skipped: 'not_configured', reason });
  }

  // --- Authenticate the caller -------------------------------------------
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return json(401, { error: 'missing_token' });

  let senderId;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    senderId = decoded.uid;
  } catch {
    return json(401, { error: 'invalid_token' });
  }

  if (senderId === recipientId) return json(400, { error: 'self_push' });

  // Only allow pushing to someone we already share a conversation with.
  // The id encodes both uids, so this is a single document read.
  const convId = [senderId, recipientId].sort().join('__');
  try {
    const convo = await getFirestore().doc(`conversations/${convId}`).get();
    if (!convo.exists) return json(403, { error: 'no_conversation' });
  } catch {
    return json(403, { error: 'no_conversation' });
  }

  try {
    const snap = await getFirestore().doc(`users/${recipientId}`).get();
    const tokens = (snap.exists && snap.data().fcmTokens) || [];
    if (!tokens.length) return json(200, { sent: 0, skipped: 'no_tokens' });

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body: body || '' },
      data: { url: url || '/', tag: tag || 'pixels' },
      webpush: {
        fcmOptions: { link: url || '/' },
      },
    });

    // Drop tokens FCM tells us are dead, so the list doesn't grow stale.
    const dead = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code || '';
      if (!r.success && (code.includes('registration-token-not-registered') || code.includes('invalid-argument'))) {
        dead.push(tokens[i]);
      }
    });
    if (dead.length) {
      await getFirestore().doc(`users/${recipientId}`).update({
        fcmTokens: FieldValue.arrayRemove(...dead),
      }).catch(() => {});
    }

    return json(200, { sent: res.successCount, failed: res.failureCount, pruned: dead.length });
  } catch (e) {
    console.error('send-push failed:', e);
    return json(500, { error: String(e?.message || e) });
  }
}
