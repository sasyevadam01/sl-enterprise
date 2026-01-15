/**
 * SL Enterprise - Push Notifications Hook
 * Gestisce registrazione e permessi per notifiche push.
 */
import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '../api/client';

// Converte chiave base64 VAPID in Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState('default');
    const [loading, setLoading] = useState(false);

    // Check support
    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    // Check existing subscription
    const checkSubscription = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('[Push] Error checking subscription:', error);
        }
    }, []);

    // Register service worker
    const registerServiceWorker = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[Push] Service Worker registered:', registration.scope);
            return registration;
        } catch (error) {
            console.error('[Push] Service Worker registration failed:', error);
            throw error;
        }
    }, []);

    // Request permission and subscribe
    const subscribe = useCallback(async () => {
        if (!isSupported) {
            console.warn('[Push] Push notifications not supported');
            return false;
        }

        setLoading(true);

        try {
            // Request permission
            const notifPermission = await Notification.requestPermission();
            setPermission(notifPermission);

            if (notifPermission !== 'granted') {
                console.warn('[Push] Permission denied');
                return false;
            }

            // Register service worker
            const registration = await registerServiceWorker();

            // Get VAPID key from server
            const { publicKey } = await chatApi.getVapidKey();

            if (!publicKey) {
                console.error('[Push] No VAPID key from server');
                return false;
            }

            // Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Send to server
            const json = subscription.toJSON();
            await chatApi.subscribePush({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                user_agent: navigator.userAgent
            });

            setIsSubscribed(true);
            console.log('[Push] Subscribed successfully');
            return true;

        } catch (error) {
            console.error('[Push] Subscription failed:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [isSupported, registerServiceWorker]);

    // Unsubscribe
    const unsubscribe = useCallback(async () => {
        setLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                await chatApi.unsubscribePush(subscription.endpoint);
            }

            setIsSubscribed(false);
            console.log('[Push] Unsubscribed');
            return true;

        } catch (error) {
            console.error('[Push] Unsubscribe failed:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        isSupported,
        isSubscribed,
        permission,
        loading,
        subscribe,
        unsubscribe,
        checkSubscription
    };
}

export default usePushNotifications;
