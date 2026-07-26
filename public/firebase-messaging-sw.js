/* Firebase Cloud Messaging service worker.
 *
 * Handles pushes while the site is closed or in the background. It must live at
 * the site root (`/firebase-messaging-sw.js`) and cannot import the app bundle,
 * so the Firebase config is repeated here. Every value below is public.
 */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCeAbxDCnbDjEuKJPp47trNXjOcqzdgYaU',
  authDomain: 'pixels-c10b3.firebaseapp.com',
  projectId: 'pixels-c10b3',
  storageBucket: 'pixels-c10b3.firebasestorage.app',
  messagingSenderId: '129700431837',
  appId: '1:129700431837:web:a3ada62ccdfc391563d834',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Pixels', {
    body: body || '',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: payload.data?.tag || 'pixels',
  });
});

// Focus an open tab (or open one) when the notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
