/**
 * SL Enterprise - Chat Page
 * Messaggistica interna tipo WhatsApp
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { chatApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../components/ui/CustomUI';
import useChatSocket from '../hooks/useChatSocket';
import usePushNotifications from '../hooks/usePushNotifications';

// Imported Components
import MessageBubble from '../components/chat/MessageBubble';
import ConversationList from '../components/chat/ConversationList';
import GroupInfoModal from '../components/chat/GroupInfoModal';
import NewChatModal from '../components/chat/NewChatModal';
import ConfirmationModal from '../components/chat/ConfirmationModal';

// Formatta data messaggio (Helpers)
const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Oggi';
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri';
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

// Pagina principale
export default function ChatPage() {
    const { user } = useAuth();
    const { toast } = useUI();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [uploading, setUploading] = useState(false);

    // EXTRAS STATES
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionIndex, setMentionIndex] = useState(-1);

    const [contacts, setContacts] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [typingUser, setTypingUser] = useState(null);

    // Confirmation State
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDanger: false,
        confirmText: "Conferma"
    });

    const isAdmin = ['super_admin', 'admin'].includes(user?.role);

    // Push Notifications
    const {
        isSupported: pushSupported,
        isSubscribed: pushSubscribed,
        subscribe: subscribePush,
        permission: pushPermission
    } = usePushNotifications();

    // WebSocket Handlers
    const handleSocketMessage = useCallback((msg) => {
        // Handle Delete via WS
        if (msg.type === 'message_deleted') {
            setMessages(prev => prev.map(m =>
                m.id === msg.message_id ? { ...m, deleted_at: new Date().toISOString() } : m
            ));
            return;
        }

        // Se è per la conversazione corrente
        if (activeConv && msg.conversation_id === activeConv.id) {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

            // Marca come letto subito
            chatApi.markAsRead(activeConv.id);
        }

        // Ricarica sempre lista per aggiornare snippet
        loadConversations();
    }, [activeConv, loadConversations]);

    const handleSocketTyping = useCallback((data) => {
        if (activeConv && data.conversation_id === activeConv.id && data.is_typing) {
            setTypingUser(data.user_name);
            setTimeout(() => setTypingUser(null), 3000);
        }
    }, [activeConv]);

    // WebSocket Hook
    const { isConnected, sendTyping } = useChatSocket(user?.id, handleSocketMessage, handleSocketTyping);

    // Carica conversazioni
    const loadConversations = useCallback(async () => {
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carica messaggi
    const loadMessages = useCallback(async (convId) => {
        try {
            const data = await chatApi.getMessages(convId, { limit: 50 });
            setMessages(data);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }, []);

    // Carica contatti
    const loadContacts = useCallback(async () => {
        try {
            const data = await chatApi.getContacts();
            setContacts(data);
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }, []);

    // Init
    useEffect(() => {
        loadConversations();
        loadContacts();
    }, [loadConversations, loadContacts]);

    // Polling messaggi (ogni 3 sec)
    useEffect(() => {
        if (!activeConv) return;
        const interval = setInterval(() => {
            loadMessages(activeConv.id);
        }, 3000);
        return () => clearInterval(interval);
    }, [activeConv, loadMessages]);

    // Polling conversazioni
    useEffect(() => {
        const interval = setInterval(() => {
            loadConversations();
        }, 5000);
        return () => clearInterval(interval);
    }, [loadConversations]);

    // Seleziona conversazione
    const handleSelectConv = (conv) => {
        setActiveConv(conv);
        loadMessages(conv.id);
        setShowGroupInfo(false);
    };

    // File Selection
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    // Invia messaggio
    const handleSend = async () => {
        if ((!newMessage.trim() && !attachment) || !activeConv) return;

        setUploading(true);
        try {
            let attachmentUrl = null;
            let msgType = 'text';

            if (attachment) {
                const uploadRes = await chatApi.uploadAttachment(attachment);
                attachmentUrl = uploadRes.url;
                msgType = attachment.type.startsWith('image/') ? 'image' : 'file';
            }

            await chatApi.sendMessage(activeConv.id, {
                content: newMessage.trim(),
                attachment_url: attachmentUrl,
                message_type: msgType
            });

            setNewMessage('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            loadMessages(activeConv.id);
            loadConversations();
        } catch (error) {
            const msg = error.response?.data?.detail || 'Errore invio messaggio';
            toast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    // Elimina messaggio
    const handleDelete = async (msgId) => {
        try {
            await chatApi.deleteMessage(msgId);
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m
            ));
            toast.success('Messaggio eliminato');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore eliminazione');
        }
    };

    // Trigger Ban Confirmation
    const confirmBanUser = (userId) => {
        setConfirmation({
            isOpen: true,
            title: "Timeout Utente",
            message: "Sei sicuro di voler silenziare questo utente per 1 minuto?",
            isDanger: true,
            confirmText: "Silenzia",
            onConfirm: () => executeBanUser(userId)
        });
    };

    // Execute Ban
    const executeBanUser = async (userId) => {
        try {
            await chatApi.timeoutUser(activeConv.id, userId, 1);
            toast.success("Utente silenziato per 1 minuto");
            setShowGroupInfo(false);
        } catch (error) {
            console.error("Ban Error:", error);
            const msg = error.response?.data?.detail || error.message || 'Errore ban';
            toast.error(`Errore: ${msg}`);
        }
    };

    // Trigger Delete Group Confirmation
    const confirmDeleteGroup = () => {
        setConfirmation({
            isOpen: true,
            title: "Elimina Chat",
            message: "Sei sicuro di voler ELIMINARE definitivamente questa chat? L'azione è irreversibile.",
            isDanger: true,
            confirmText: "Elimina Chat",
            onConfirm: () => executeDeleteGroup()
        });
    };

    // Execute Delete Group
    const executeDeleteGroup = async () => {
        try {
            await chatApi.deleteConversation(activeConv.id);
            toast.success("Chat eliminata");
            setActiveConv(null);
            loadConversations();
            setShowGroupInfo(false);
        } catch (error) {
            console.error("Delete Group Error:", error);
            const msg = error.response?.data?.detail || error.message || 'Errore eliminazione gruppo';
            toast.error(`Errore: ${msg}`);
        }
    };

    const handleCreateDirect = async (userId) => {
        try {
            const result = await chatApi.createConversation({
                type: 'direct',
                member_ids: [userId]
            });
            await loadConversations();
            const conv = conversations.find(c => c.id === result.id) ||
                (await chatApi.getConversations()).find(c => c.id === result.id);
            if (conv) handleSelectConv(conv);
        } catch (error) {
            toast.error('Errore creazione chat');
        }
    };

    const handleCreateGroup = async (name, memberIds) => {
        try {
            const result = await chatApi.createConversation({
                type: 'group',
                name,
                member_ids: memberIds
            });
            await loadConversations();
            const conv = conversations.find(c => c.id === result.id) ||
                (await chatApi.getConversations()).find(c => c.id === result.id);
            if (conv) handleSelectConv(conv);
        } catch (error) {
            toast.error('Errore creazione gruppo');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Typing effect
    useEffect(() => {
        if (activeConv && isConnected) {
            sendTyping(activeConv.id, newMessage.length > 0);
        }
    }, [newMessage, activeConv, isConnected, sendTyping]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 backdrop-blur-md">
            {/* Sidebar Conversazioni */}
            <div className="w-80 border-r border-white/10 bg-slate-800/50">
                <ConversationList
                    conversations={conversations}
                    activeId={activeConv?.id}
                    onSelect={handleSelectConv}
                    onNewChat={() => setShowNewChat(true)}
                    pushSupported={pushSupported}
                    pushSubscribed={pushSubscribed}
                    onTogglePush={pushSubscribed ? () => { } : subscribePush}
                />
            </div>

            {/* Area Chat */}
            <div className="flex-1 flex flex-col">
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {activeConv.type === 'group' ? '👥' : activeConv.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">
                                        {activeConv.name}
                                    </h2>
                                    {typingUser ? (
                                        <p className="text-xs text-green-400 font-medium animate-pulse">
                                            {typingUser} sta scrivendo...
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400">
                                            {activeConv.type === 'group'
                                                ? `${activeConv.members.length} membri`
                                                : isConnected ? 'Online' : 'Offline'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Info Button */}
                            <button
                                onClick={() => setShowGroupInfo(true)}
                                className="p-2 hover:bg-white/10 rounded-full transition"
                            >
                                ℹ️
                            </button>
                        </div>

                        {/* Messaggi */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {messages.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">
                                    <p className="text-5xl mb-3">💬</p>
                                    <p>Nessun messaggio ancora.</p>
                                    <p className="text-sm">Inizia la conversazione!</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => {
                                        // Date separator
                                        const showDate = idx === 0 ||
                                            formatDate(msg.created_at) !== formatDate(messages[idx - 1].created_at);

                                        return (
                                            <div key={msg.id}>
                                                {showDate && (
                                                    <div className="text-center my-4">
                                                        <span className="bg-slate-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                                                            {formatDate(msg.created_at)}
                                                        </span>
                                                    </div>
                                                )}
                                                <MessageBubble
                                                    message={msg}
                                                    isOwn={msg.sender_id === user?.id}
                                                    isAdmin={isAdmin}
                                                    onDelete={handleDelete}
                                                />
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Preview Attachment */}
                        {attachment && (
                            <div className="px-4 py-2 bg-slate-800 border-t border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center text-blue-400">
                                        📎
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium truncate max-w-[200px]">{attachment.name}</p>
                                        <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-white">&times;</button>
                            </div>
                        )}

                        {/* MENTIONS POPUP */}
                        {mentionQuery !== null && (
                            <div className="absolute bottom-24 left-14 bg-slate-800 border border-white/10 rounded-xl shadow-xl w-64 max-h-48 overflow-y-auto z-50 animate-in slide-in-from-bottom-2">
                                {activeConv?.members
                                    ?.filter(m => m.username.toLowerCase().includes(mentionQuery.toLowerCase()) || m.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
                                    .map((m, idx) => (
                                        <button
                                            key={m.user_id}
                                            onClick={() => {
                                                const parts = newMessage.split('@');
                                                parts.pop(); // Rimuovi parte parziale
                                                setNewMessage(parts.join('@') + '@' + m.username + ' ');
                                                setMentionQuery(null);
                                            }}
                                            className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition ${idx === mentionIndex ? 'bg-blue-600/20' : ''}`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                {m.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{m.username}</p>
                                                <p className="text-gray-400 text-xs">{m.full_name}</p>
                                            </div>
                                        </button>
                                    ))}
                                {activeConv?.members?.filter(m => m.username.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                                    <p className="p-3 text-gray-500 text-xs text-center">Nessun utente trovato</p>
                                )}
                            </div>
                        )}

                        {/* Area Input */}
                        <div className="p-4 border-t border-white/10 bg-slate-800/50 relative">
                            {/* Emoji Picker Popup */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-20 left-4 z-50">
                                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} /> {/* Backdrop */}
                                    <div className="relative z-50">
                                        <EmojiPicker
                                            theme="dark"
                                            onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)}
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 items-end">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                />

                                {/* Bottone Emoji */}
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-3 rounded-xl transition ${showEmojiPicker ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                >
                                    😊
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-gray-300 transition"
                                    title="Allega file"
                                >
                                    📎
                                </button>

                                <textarea
                                    value={newMessage}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewMessage(val);

                                        // Detect Mention
                                        const lastWord = val.split(' ').pop();
                                        if (lastWord.startsWith('@') && lastWord.length > 1) {
                                            setMentionQuery(lastWord.slice(1));
                                        } else {
                                            setMentionQuery(null);
                                        }
                                    }}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Scrivi un messaggio... (@ per menzionare)"
                                    rows={1}
                                    className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!newMessage.trim() && !attachment) || uploading}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
                                >
                                    {uploading ? <span className="animate-spin">⌛</span> : '➤'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-6xl mb-4">💬</p>
                            <p className="text-xl">Seleziona una conversazione</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Nuova Chat */}
            <NewChatModal
                isOpen={showNewChat}
                onClose={() => setShowNewChat(false)}
                onCreateDirect={handleCreateDirect}
                onCreateGroup={handleCreateGroup}
                contacts={contacts}
            />

            {/* Modal Info */}
            <GroupInfoModal
                isOpen={showGroupInfo}
                onClose={() => setShowGroupInfo(false)}
                conv={activeConv}
                onBan={confirmBanUser}
                onDeleteGroup={confirmDeleteGroup}
                isAdmin={isAdmin}
            />

            {/* Modal Conferma */}
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                isDanger={confirmation.isDanger}
                confirmText={confirmation.confirmText}
            />
        </div>
    );
}

// END OF FILE - Extracted components are imported
// ... implementation ...

const { user } = useAuth();
const { toast } = useUI();
const messagesEndRef = useRef(null);
const fileInputRef = useRef(null); // Ref for file input

const [conversations, setConversations] = useState([]);
const [activeConv, setActiveConv] = useState(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [attachment, setAttachment] = useState(null); // New state for file
const [uploading, setUploading] = useState(false); // Helper for spinner

// EXTRAS STATES
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [mentionQuery, setMentionQuery] = useState(null); // Stringa dopo @
const [mentionIndex, setMentionIndex] = useState(-1);   // Keyboard nav

const [contacts, setContacts] = useState([]);
const [showNewChat, setShowNewChat] = useState(false);
const [showGroupInfo, setShowGroupInfo] = useState(false); // NEW
const [loading, setLoading] = useState(true);
const [typingUser, setTypingUser] = useState(null);

// Confirmation State
const [confirmation, setConfirmation] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDanger: false,
    confirmText: "Conferma"
});

const isAdmin = ['super_admin', 'admin'].includes(user?.role); // CHECK ROLE

// Push Notifications
const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    subscribe: subscribePush,
    permission: pushPermission
} = usePushNotifications();

// WebSocket Handlers
const handleSocketMessage = useCallback((msg) => {
    // Handle Delete via WS
    if (msg.type === 'message_deleted') {
        setMessages(prev => prev.map(m =>
            m.id === msg.message_id ? { ...m, deleted_at: new Date().toISOString() } : m
        ));
        return;
    }

    // Se è per la conversazione corrente
    if (activeConv && msg.conversation_id === activeConv.id) {
        // Verifica se messaggio esiste già (per evitare duplicati con polling)
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
        // Scroll
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Marca come letto subito
        chatApi.markAsRead(activeConv.id);
    }

    // Ricarica sempre lista per aggiornare snippet e unread count
    loadConversations();
}, [activeConv, loadConversations]);

const handleSocketTyping = useCallback((data) => {
    if (activeConv && data.conversation_id === activeConv.id && data.is_typing) {
        setTypingUser(data.user_name);
        // Nascondi dopo 3 secondi
        setTimeout(() => setTypingUser(null), 3000);
    }
}, [activeConv]);

// WebSocket Hook
const { isConnected, sendTyping } = useChatSocket(user?.id, handleSocketMessage, handleSocketTyping);

// Carica conversazioni
const loadConversations = useCallback(async () => {
    try {
        const data = await chatApi.getConversations();
        setConversations(data);
    } catch (error) {
        console.error('Error loading conversations:', error);
    } finally {
        setLoading(false);
    }
}, []);

// Carica messaggi
const loadMessages = useCallback(async (convId) => {
    try {
        const data = await chatApi.getMessages(convId, { limit: 50 });
        setMessages(data);
        // Scroll to bottom
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}, []);

// Carica contatti
const loadContacts = useCallback(async () => {
    try {
        const data = await chatApi.getContacts();
        setContacts(data);
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}, []);

// Init
useEffect(() => {
    loadConversations();
    loadContacts();
}, [loadConversations, loadContacts]);

// Polling messaggi (ogni 3 sec)
useEffect(() => {
    if (!activeConv) return;

    const interval = setInterval(() => {
        loadMessages(activeConv.id);
    }, 3000);

    return () => clearInterval(interval);
}, [activeConv, loadMessages]);

// Polling conversazioni (per aggiornare unread)
useEffect(() => {
    const interval = setInterval(() => {
        loadConversations();
    }, 5000);

    return () => clearInterval(interval);
}, [loadConversations]);

// Seleziona conversazione
const handleSelectConv = (conv) => {
    setActiveConv(conv);
    loadMessages(conv.id);
    setShowGroupInfo(false);
};

// File Selection
const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
        setAttachment(e.target.files[0]);
    }
};

// Invia messaggio
const handleSend = async () => {
    if ((!newMessage.trim() && !attachment) || !activeConv) return;

    setUploading(true);
    try {
        let attachmentUrl = null;
        let msgType = 'text';

        if (attachment) {
            const uploadRes = await chatApi.uploadAttachment(attachment);
            attachmentUrl = uploadRes.url;
            msgType = attachment.type.startsWith('image/') ? 'image' : 'file';
        }

        await chatApi.sendMessage(activeConv.id, {
            content: newMessage.trim(),
            attachment_url: attachmentUrl,
            message_type: msgType
        });

        setNewMessage('');
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input

        loadMessages(activeConv.id);
        loadConversations(); // Aggiorna preview
    } catch (error) {
        const msg = error.response?.data?.detail || 'Errore invio messaggio';
        toast.error(msg);
    } finally {
        setUploading(false);
    }
};

// Elimina messaggio
const handleDelete = async (msgId) => {
    try {
        await chatApi.deleteMessage(msgId);
        // La UI si aggiorna via WS o optimistic update
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m
        ));
        toast.success('Messaggio eliminato');
    } catch (error) {
        toast.error(error.response?.data?.detail || 'Errore eliminazione');
    }
};

// Trigger Ban Confirmation
const confirmBanUser = (userId) => {
    setConfirmation({
        isOpen: true,
        title: "Timeout Utente",
        message: "Sei sicuro di voler silenziare questo utente per 1 minuto?",
        isDanger: true,
        confirmText: "Silenzia",
        onConfirm: () => executeBanUser(userId)
    });
};

// Execute Ban
const executeBanUser = async (userId) => {
    try {
        // Usa api methods definiti in client.js
        await chatApi.timeoutUser(activeConv.id, userId, 1);
        toast.success("Utente silenziato per 1 minuto");
        setShowGroupInfo(false);
    } catch (error) {
        console.error("Ban Error:", error);
        const msg = error.response?.data?.detail || error.message || 'Errore ban';
        toast.error(`Errore: ${msg}`);
    }
};

// Trigger Delete Group Confirmation
const confirmDeleteGroup = () => {
    setConfirmation({
        isOpen: true,
        title: "Elimina Chat",
        message: "Sei sicuro di voler ELIMINARE definitivamente questa chat? L'azione è irreversibile.",
        isDanger: true,
        confirmText: "Elimina Chat",
        onConfirm: () => executeDeleteGroup()
    });
};

// Execute Delete Group
const executeDeleteGroup = async () => {
    try {
        await chatApi.deleteConversation(activeConv.id);
        toast.success("Chat eliminata");
        setActiveConv(null);
        loadConversations();
        setShowGroupInfo(false);
    } catch (error) {
        console.error("Delete Group Error:", error);
        const msg = error.response?.data?.detail || error.message || 'Errore eliminazione gruppo';
        toast.error(`Errore: ${msg}`);
    }
};

// Create handlers...
const handleCreateDirect = async (userId) => {
    try {
        const result = await chatApi.createConversation({
            type: 'direct',
            member_ids: [userId]
        });
        await loadConversations();
        const conv = conversations.find(c => c.id === result.id) ||
            (await chatApi.getConversations()).find(c => c.id === result.id);
        if (conv) handleSelectConv(conv);
    } catch (error) {
        toast.error('Errore creazione chat');
    }
};

const handleCreateGroup = async (name, memberIds) => {
    try {
        const result = await chatApi.createConversation({
            type: 'group',
            name,
            member_ids: memberIds
        });
        await loadConversations();
        const conv = conversations.find(c => c.id === result.id) ||
            (await chatApi.getConversations()).find(c => c.id === result.id);
        if (conv) handleSelectConv(conv);
    } catch (error) {
        toast.error('Errore creazione gruppo');
    }
};

const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};

// Typing effect
useEffect(() => {
    if (activeConv && isConnected) {
        sendTyping(activeConv.id, newMessage.length > 0);
    }
}, [newMessage, activeConv, isConnected, sendTyping]);

if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
}

return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 backdrop-blur-md">
        {/* Sidebar Conversazioni */}
        <div className="w-80 border-r border-white/10 bg-slate-800/50">
            <ConversationList
                conversations={conversations}
                activeId={activeConv?.id}
                onSelect={handleSelectConv}
                onNewChat={() => setShowNewChat(true)}
                pushSupported={pushSupported}
                pushSubscribed={pushSubscribed}
                onTogglePush={pushSubscribed ? () => { /* gestito automatico */ } : subscribePush}
            />
        </div>

        {/* Area Chat */}
        <div className="flex-1 flex flex-col">
            {activeConv ? (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {activeConv.type === 'group' ? '👥' : activeConv.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">
                                    {activeConv.name}
                                </h2>
                                {typingUser ? (
                                    <p className="text-xs text-green-400 font-medium animate-pulse">
                                        {typingUser} sta scrivendo...
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        {activeConv.type === 'group'
                                            ? `${activeConv.members.length} membri`
                                            : isConnected ? 'Online' : 'Offline'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Info Button */}
                        <button
                            onClick={() => setShowGroupInfo(true)}
                            className="p-2 hover:bg-white/10 rounded-full transition"
                        >
                            ℹ️
                        </button>
                    </div>

                    {/* Messaggi */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p className="text-5xl mb-3">💬</p>
                                <p>Nessun messaggio ancora.</p>
                                <p className="text-sm">Inizia la conversazione!</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => {
                                    // Date separator
                                    const showDate = idx === 0 ||
                                        formatDate(msg.created_at) !== formatDate(messages[idx - 1].created_at);

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="text-center my-4">
                                                    <span className="bg-slate-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                                                        {formatDate(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}
                                            <MessageBubble
                                                message={msg}
                                                isOwn={msg.sender_id === user?.id}
                                                isAdmin={isAdmin}
                                                onDelete={handleDelete}
                                            />
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Preview Attachment */}
                    {attachment && (
                        <div className="px-4 py-2 bg-slate-800 border-t border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center text-blue-400">
                                    📎
                                </div>
                                <div>
                                    <p className="text-sm text-white font-medium truncate max-w-[200px]">{attachment.name}</p>
                                    <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                    )}

                    {/* MENTIONS POPUP */}
                    {mentionQuery !== null && (
                        <div className="absolute bottom-24 left-14 bg-slate-800 border border-white/10 rounded-xl shadow-xl w-64 max-h-48 overflow-y-auto z-50 animate-in slide-in-from-bottom-2">
                            {activeConv?.members
                                ?.filter(m => m.username.toLowerCase().includes(mentionQuery.toLowerCase()) || m.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
                                .map((m, idx) => (
                                    <button
                                        key={m.user_id}
                                        onClick={() => {
                                            const parts = newMessage.split('@');
                                            parts.pop(); // Rimuovi parte parziale
                                            setNewMessage(parts.join('@') + '@' + m.username + ' ');
                                            setMentionQuery(null);
                                            // Focus back
                                            // fileInputRef.current?.focus(); // Idealmente focus textarea
                                        }}
                                        className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition ${idx === mentionIndex ? 'bg-blue-600/20' : ''}`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                                            {m.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{m.username}</p>
                                            <p className="text-gray-400 text-xs">{m.full_name}</p>
                                        </div>
                                    </button>
                                ))}
                            {activeConv?.members?.filter(m => m.username.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                                <p className="p-3 text-gray-500 text-xs text-center">Nessun utente trovato</p>
                            )}
                        </div>
                    )}

                    {/* Area Input */}
                    <div className="p-4 border-t border-white/10 bg-slate-800/50 relative">
                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-20 left-4 z-50">
                                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} /> {/* Backdrop */}
                                <div className="relative z-50">
                                    <EmojiPicker
                                        theme="dark"
                                        onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)}
                                        width={300}
                                        height={400}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 items-end">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.txt"
                            />

                            {/* Bottone Emoji */}
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-3 rounded-xl transition ${showEmojiPicker ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                            >
                                😊
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-gray-300 transition"
                                title="Allega file"
                            >
                                📎
                            </button>

                            <textarea
                                value={newMessage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewMessage(val);

                                    // Detect Mention
                                    const lastWord = val.split(' ').pop();
                                    if (lastWord.startsWith('@') && lastWord.length > 1) {
                                        setMentionQuery(lastWord.slice(1));
                                    } else {
                                        setMentionQuery(null);
                                    }
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="Scrivi un messaggio... (@ per menzionare)"
                                rows={1}
                                className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={(!newMessage.trim() && !attachment) || uploading}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
                            >
                                {uploading ? <span className="animate-spin">⌛</span> : '➤'}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <p className="text-6xl mb-4">💬</p>
                        <p className="text-xl">Seleziona una conversazione</p>
                    </div>
                </div>
            )}
        </div>

        {/* Click outside to close emoji picker not implemented for brevity but recommended */}

        {/* Modal Nuova Chat */}
        <NewChatModal
            isOpen={showNewChat}
            onClose={() => setShowNewChat(false)}
            onCreateDirect={handleCreateDirect}  // Usate function del paste precedente per completezza o reimplem
            onCreateGroup={handleCreateGroup}
            contacts={contacts}
        />

        {/* Modal Info */}
        <GroupInfoModal
            isOpen={showGroupInfo}
            onClose={() => setShowGroupInfo(false)}
            conv={activeConv}
            onBan={confirmBanUser}
            onDeleteGroup={confirmDeleteGroup}
            isAdmin={isAdmin}
        />

        {/* Modal Conferma (NEW) */}
        <ConfirmationModal
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmation.onConfirm}
            title={confirmation.title}
            message={confirmation.message}
            isDanger={confirmation.isDanger}
            confirmText={confirmation.confirmText}
        />
    </div>
);
}


