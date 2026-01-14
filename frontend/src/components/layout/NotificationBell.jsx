/**
 * SL Enterprise - Notification Bell Component
 * Icona campanella con badge e dropdown notifiche
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi, chatApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../ui/CustomUI';

export default function NotificationBell() {
    const { user } = useAuth();
    const { showConfirm } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const prevConversationsRef = useRef({}); // Traccia lo stato precedente per i Toast
    const isFirstLoadRef = useRef(true); // Evita toast al primo caricamento
    const { toast } = useUI();

    // Determine destination based on role
    const viewAllLink = ['coordinator', 'operator', 'production_manager'].includes(user?.role)
        ? '/hr/tasks'
        : '/hr/approvals';

    // Sound Logic
    const [lastPlayedRequest, setLastPlayedRequest] = useState(0);

    const playElegantSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Elegant "Ding"
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.8);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    // Fetch unread count and play sound if increased
    useEffect(() => {
        const fetchCount = async () => {
            try {
                // Sequential fetch to avoid DB locking issues
                let notifData = { unread_count: 0 };
                let chatData = { total_unread: 0, conversations: [] };

                try {
                    notifData = await notificationsApi.getUnreadCount();
                } catch (e) {
                    console.error("Notif count fetch failed", e);
                }

                try {
                    chatData = await chatApi.getNotificationsSummary();
                } catch (e) {
                    console.error("Chat summary fetch failed - Keeping previous state or 0", e);
                }

                const notifCount = notifData.unread_count || 0;
                const chatCount = chatData.total_unread || 0;
                console.log("🔔 BELL DEBUG:", { notifCount, chatCount, notifData, chatData }); // DEBUG LOG

                const newTotal = notifCount + chatCount;

                // Toast Logic per Chat
                const currentConvs = {};
                (chatData.conversations || []).forEach(c => {
                    currentConvs[c.conversation_id] = c.unread_count;
                });

                if (!isFirstLoadRef.current) {
                    (chatData.conversations || []).forEach(conv => {
                        const prevCount = prevConversationsRef.current[conv.conversation_id] || 0;
                        if (conv.unread_count > prevCount) {
                            // Nuovo messaggio in questa chat!
                            toast.info(`Nuovo messaggio da ${conv.name}`);
                        }
                    });

                    if (newTotal > unreadCount) {
                        playElegantSound();
                    }
                } else {
                    isFirstLoadRef.current = false;
                }

                // Aggiorna Refs
                prevConversationsRef.current = currentConvs;
                setUnreadCount(newTotal);
            } catch (error) {
                console.error('Error fetching notification count:', error);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 5000); // Back to 5s to save calls
        return () => clearInterval(interval);
    }, [unreadCount]);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            const fetchNotifications = async () => {
                setLoading(true);
                try {
                    // Fetch Chat Notifications
                    const chatSummary = await chatApi.getNotificationsSummary();

                    // Fetch System Notifications
                    const notifList = await notificationsApi.getNotifications({ limit: 10 });

                    // Convert chat summary to notification format
                    const chatNotifs = (chatSummary.conversations || []).map(conv => ({
                        id: `chat-${conv.conversation_id}`,
                        title: `💬 Messaggio da ${conv.name}`,
                        message: `Hai ${conv.unread_count} messaggi non letti${conv.is_group ? ' nel gruppo' : ''}`,
                        created_at: conv.last_message_at || new Date().toISOString(),
                        is_read: false,
                        link_url: `/chat?conv=${conv.conversation_id}`,
                        notif_type: 'chat',
                        is_chat: true // Flag to handle click differently if needed
                    }));

                    setNotifications([...chatNotifs, ...notifList]);
                } catch (error) {
                    console.error('Error fetching notifications:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleClearRead = async () => {
        try {
            await notificationsApi.clearRead();
            // Remove read notifications from local state
            setNotifications(prev => prev.filter(n => !n.is_read));
        } catch (error) {
            console.error('Error clearing read notifications:', error);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ora';
        if (diffMins < 60) return `${diffMins}m fa`;
        if (diffHours < 24) return `${diffHours}h fa`;
        if (diffDays < 7) return `${diffDays}g fa`;
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'approval_req': return '📋';
            case 'alert': return '⚠️';
            case 'expiry': return '⏰';
            case 'priority': return '🚨';
            case 'info': return 'ℹ️';
            case 'chat': return '💬';
            default: return '🔔';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-white/10">
                        <h3 className="font-semibold text-white">Notifiche</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                Segna tutte lette
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">
                                <span className="text-3xl block mb-2">🔔</span>
                                Nessuna notifica
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <Link
                                    key={notif.id}
                                    to={(!notif.link_url || notif.link_url === '/tasks') ? viewAllLink : notif.link_url}
                                    onClick={() => {
                                        if (!notif.is_read && !notif.is_chat) handleMarkAsRead(notif.id);
                                        setIsOpen(false);
                                    }}
                                    className={`block px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition ${notif.notif_type === 'priority' ? 'bg-red-500/10 border-l-4 border-l-red-500' :
                                        notif.notif_type === 'chat' ? 'bg-blue-600/10 border-l-4 border-l-blue-500' :
                                            (!notif.is_read ? 'bg-blue-500/5' : '')
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">{getNotifIcon(notif.notif_type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium break-words ${!notif.is_read ? 'text-white' : 'text-gray-300'
                                                    }`}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-xs text-gray-500 whitespace-nowrap pt-0.5">
                                                    {formatTime(notif.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 break-words whitespace-pre-wrap mt-1">
                                                {notif.message}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-slate-700/50 border-t border-white/10 flex items-center justify-between">
                            <Link
                                to={viewAllLink}
                                className="text-sm text-blue-400 hover:text-blue-300"
                                onClick={() => setIsOpen(false)}
                            >
                                Vedi tutte →
                            </Link>

                            <div className="flex gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            const confirm = await showConfirm({
                                                title: 'Elimina Tutte le Notifiche',
                                                message: 'Sei sicuro di voler eliminare definitivamente TUTTE le notifiche?',
                                                type: 'danger',
                                                confirmText: 'Sì, Elimina Tutto'
                                            });

                                            if (confirm) {
                                                try {
                                                    await notificationsApi.deleteAll();
                                                    setNotifications([]);
                                                    setUnreadCount(0);
                                                } catch (error) {
                                                    console.error('Error deleting all notifications:', error);
                                                }
                                            }
                                        }}
                                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 font-semibold"
                                    >
                                        🗑️ Elimina Tutto
                                    </button>
                                )}
                                {notifications.some(n => n.is_read) && (
                                    <button
                                        onClick={handleClearRead}
                                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                                    >
                                        🧹 Pulisci Lette
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
