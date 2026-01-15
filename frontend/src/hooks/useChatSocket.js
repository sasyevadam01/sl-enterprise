/**
 * SL Enterprise - Chat WebSocket Hook
 * Gestisce connessione WebSocket per messaggi real-time.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = window.location.protocol === 'https:'
    ? `wss://${window.location.host}/api/chat/ws`
    : `ws://${window.location.host}/api/chat/ws`;

export function useChatSocket(userId, onMessage, onTyping) {
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeoutRef = useRef(null);
    const activeConversationRef = useRef(null);

    // Connessione WebSocket
    const connect = useCallback(() => {
        if (!userId) return;

        try {
            const ws = new WebSocket(`${WS_URL}/${userId}`);

            ws.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);

                // Rejoin conversazione attiva se presente
                if (activeConversationRef.current) {
                    ws.send(JSON.stringify({
                        type: 'join',
                        conversation_id: activeConversationRef.current
                    }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'new_message' && onMessage) {
                        onMessage(data.message);
                    } else if (data.type === 'typing' && onTyping) {
                        onTyping(data);
                    } else if (data.type === 'message_deleted' && onMessage) {
                        onMessage({ ...data, deleted: true });
                    }
                } catch (e) {
                    console.error('[WS] Error parsing message:', e);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                setIsConnected(false);

                // Auto-reconnect dopo 3 secondi
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[WS] Attempting reconnect...');
                    connect();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };

            wsRef.current = ws;
        } catch (e) {
            console.error('[WS] Connection error:', e);
        }
    }, [userId, onMessage, onTyping]);

    // Disconnessione
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Join conversazione
    const joinConversation = useCallback((conversationId) => {
        activeConversationRef.current = conversationId;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'join',
                conversation_id: conversationId
            }));
        }
    }, []);

    // Leave conversazione
    const leaveConversation = useCallback((conversationId) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'leave',
                conversation_id: conversationId
            }));
        }
        if (activeConversationRef.current === conversationId) {
            activeConversationRef.current = null;
        }
    }, []);

    // Invia typing indicator
    const sendTyping = useCallback((conversationId, isTyping) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                conversation_id: conversationId,
                is_typing: isTyping
            }));
        }
    }, []);

    // Connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        joinConversation,
        leaveConversation,
        sendTyping,
        reconnect: connect
    };
}

export default useChatSocket;
