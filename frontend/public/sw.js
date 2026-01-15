/**
 * SL Enterprise - Service Worker
 * Gestisce notifiche push in background.
 */

// Versione cache
const CACHE_NAME = 'sl-enterprise-v1';

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker');
    event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    let data = {
        title: '💬 Nuovo messaggio',
        body: 'Hai ricevuto un nuovo messaggio',
        icon: '/logo192.png',
        badge: '/logo192.png',
        url: '/chat',
        tag: 'chat-notification'
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo192.png',
        badge: data.badge || '/logo192.png',
        tag: data.tag,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/chat',
            timestamp: data.timestamp
        },
        actions: [
            {
                action: 'open',
                title: 'Apri',
                icon: '/logo192.png'
            },
            {
                action: 'dismiss',
                title: 'Chiudi'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    const url = event.notification.data?.url || '/chat';

    if (event.action === 'dismiss') {
        return;
    }

    // Apri o focus sulla tab
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Cerca tab già aperta
                for (const client of clientList) {
                    if (client.url.includes('/chat') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Apri nuova tab
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
});
