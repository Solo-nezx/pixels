/**
 * Web push (Firebase Cloud Messaging) wiring.
 *
 * The VAPID public key is a build-time env var; the device token is stored on
 * the user's own Firestore document so the send-push function can target them.
 * Everything degrades quietly: unsupported browsers, denied permission or a
 * missing key simply mean no push, never a broken app.
 */
import { app } from './firebase';

/**
 * `firebase/messaging` is ~40 kB and only needed once a user opts into push,
 * so it is imported on demand rather than shipped in the main bundle.
 */
const messagingModule = () => import('firebase/messaging');

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
export const vapidKey: string = env.VITE_FIREBASE_VAPID_KEY || '';

/** True when this browser can receive web push and we have a key configured. */
export async function pushAvailable(): Promise<boolean> {
  if (!vapidKey) return false;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return false;
  try {
    const { isSupported } = await messagingModule();
    return await isSupported();
  } catch {
    return false;
  }
}

export const pushPermission = (): NotificationPermission | 'unsupported' =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

/**
 * Ask for permission and return this device's FCM token.
 * Returns null when unavailable, denied, or registration fails.
 */
export async function enablePush(): Promise<string | null> {
  if (!(await pushAvailable())) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const { getMessaging, getToken } = await messagingModule();
    const token = await getToken(getMessaging(app), {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (e) {
    console.warn('enablePush failed:', e);
    return null;
  }
}

/**
 * Show foreground messages (FCM doesn't display those itself).
 * Returns an unsubscribe function, or a no-op when push isn't available.
 */
export async function listenForegroundPush(
  onPush: (title: string, body: string) => void,
): Promise<() => void> {
  if (!(await pushAvailable())) return () => {};
  try {
    const { getMessaging, onMessage } = await messagingModule();
    return onMessage(getMessaging(app), (payload) => {
      const { title, body } = payload.notification || {};
      onPush(title || 'Pixels', body || '');
    });
  } catch (e) {
    console.warn('listenForegroundPush failed:', e);
    return () => {};
  }
}
