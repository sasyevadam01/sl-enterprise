/**
 * SL Enterprise - Chat Page (DEBUG VERSION - HOOKS ENABLED)
 * Isolating ReferenceError - EmojiPicker still DISABLED
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
// import EmojiPicker from 'emoji-picker-react'; // DISABLED
// const EmojiPicker = React.lazy(() => import('emoji-picker-react')); // DISABLED

import { chatApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../components/ui/CustomUI';
import useChatSocket from '../hooks/useChatSocket'; // ENABLED
import usePushNotifications from '../hooks/usePushNotifications'; // ENABLED
import { formatTime, formatDate } from '../utils/chatUtils';

// =========================================================================================
// COMPONENTS (Consolidated)
// =========================================================================================

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Conferma", isDanger = false }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition">Annulla</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg font-bold text-white transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

function NewChatModal({ isOpen, onClose, onCreateDirect, onCreateGroup, contacts }) {
    const [mode, setMode] = useState('direct');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [search, setSearch] = useState('');

    if (!isOpen) return null;
    const filteredContacts = (contacts || []).filter(c => c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()));

    const toggleUser = (userId) => {
        if (mode === 'direct') { setSelectedUsers([userId]); }
        else { setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]); }
    };
    const handleCreate = () => {
        if (mode === 'direct' && selectedUsers.length === 1) { onCreateDirect(selectedUsers[0]); }
        else if (mode === 'group' && selectedUsers.length > 0 && groupName.trim()) { onCreateGroup(groupName, selectedUsers); }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Nuova Conversazione</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-4 flex gap-2">
                    <button onClick={() => { setMode('direct'); setSelectedUsers([]); }} className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'direct' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'}`}>👤 Chat Diretta</button>
                    <button onClick={() => { setMode('group'); setSelectedUsers([]); }} className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'group' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'}`}>👥 Gruppo</button>
                </div>
                {mode === 'group' && (
                    <div className="px-4 pb-2"><input type="text" placeholder="Nome del gruppo..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400" /></div>
                )}
                <div className="px-4 pb-2"><input type="text" placeholder="Cerca contatto..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400" /></div>
                <div className="max-h-60 overflow-y-auto">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} onClick={() => toggleUser(contact.id)} className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition ${selectedUsers.includes(contact.id) ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedUsers.includes(contact.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>{selectedUsers.includes(contact.id) && <span className="text-white text-xs">✓</span>}</div>
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">{contact.full_name?.charAt(0) || contact.username.charAt(0).toUpperCase()}</div>
                            <div><p className="text-white font-medium">{contact.full_name || contact.username}</p><p className="text-gray-400 text-xs">@{contact.username}</p></div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/10">
                    <button onClick={handleCreate} disabled={(mode === 'direct' && selectedUsers.length !== 1) || (mode === 'group' && (selectedUsers.length === 0 || !groupName.trim()))} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition">{mode === 'direct' ? 'Inizia Chat' : 'Crea Gruppo'}</button>
                </div>
            </div>
        </div>
    );
}

function GroupInfoModal({ isOpen, onClose, conv, onBan, onDeleteGroup, isAdmin }) {
    if (!isOpen || !conv) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Info {conv.type === 'group' ? 'Gruppo' : 'Chat'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Membri ({conv.members?.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {conv.members?.map(m => (
                            <div key={m.user_id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                        {m.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">{m.full_name || m.username}</p>
                                        <p className="text-[10px] text-gray-400">{m.role}</p>
                                    </div>
                                </div>
                                {isAdmin && m.role !== 'admin' && (
                                    <button
                                        onClick={() => onBan(m.user_id)}
                                        className="text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 px-2 py-1 rounded"
                                        title="Banna per 1 minuto"
                                    >
                                        🔇 1m
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {isAdmin && (
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={onDeleteGroup}
                            className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                        >
                            🗑️ Elimina Completamente {conv.type === 'group' ? 'Gruppo' : 'Chat'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConversationList({ conversations, activeId, onSelect, onNewChat, pushSupported, pushSubscribed, onTogglePush }) {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10 flex gap-2">
                <button onClick={onNewChat} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"><span>+</span> Nuova Chat</button>
                {pushSupported && (
                    <button onClick={onTogglePush} className={`px-3 rounded-xl border border-white/10 transition ${pushSubscribed ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white'}`} title={pushSubscribed ? "Notifiche attive" : "Attiva notifiche"}>🔔</button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {(conversations || []).length === 0 ? (
                    <div className="text-center py-10 text-gray-500"><p className="text-4xl mb-2">💬</p><p>Nessuna conversazione</p></div>
                ) : (
                    conversations.map(conv => (
                        <div key={conv.id} onClick={() => onSelect(conv)} className={`p-4 border-b border-white/5 cursor-pointer transition ${activeId === conv.id ? 'bg-blue-600/20 border-l-4 border-l-blue-500' : 'hover:bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0">
                                    {conv.type === 'group' ? '👥' : conv.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-white truncate">{conv.name || 'Chat'}</h3>
                                        {conv.unread_count > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{conv.unread_count}</span>}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{conv.last_message || 'Nessun messaggio'}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function MessageBubble({ message, isOwn, isAdmin, onDelete }) {
    const [showActions, setShowActions] = useState(false);
    const canDelete = (isOwn && message.can_delete) || isAdmin;

    const isGod = message.sender_name === 'sasyevadam01' || message.sender_name === 'Salvatore Laezza';
    const isImage = message.message_type === 'image' || (message.attachment_url && message.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i));

    const renderContent = (content) => {
        if (!content) return null;
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.match(/^@\w+$/)) {
                return <span key={i} className="text-blue-300 font-bold bg-blue-500/20 px-1 rounded mx-0.5">{part}</span>;
            }
            return part;
        });
    };

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`max-w-[70%] relative group px-4 py-2 shadow-lg transition-all duration-300
                ${isGod ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}
                ${isOwn
                    ? (isGod ? 'rounded-2xl rounded-br-sm' : 'bg-blue-600 text-white rounded-2xl rounded-br-sm')
                    : (isGod ? 'rounded-2xl rounded-bl-sm' : 'bg-slate-700 text-white rounded-2xl rounded-bl-sm')
                }
            `}>
                {!isOwn && (
                    <div className="flex items-center gap-1 mb-1">
                        <p className={`text-xs font-semibold ${isGod ? 'text-yellow-400' : 'text-blue-300'}`}>
                            {message.sender_name}
                        </p>
                        {isGod && <span className="text-yellow-400 text-xs" title="God Mode">👑</span>}
                    </div>
                )}
                {message.deleted_at ? (
                    <p className="italic text-gray-400">🚫 Messaggio eliminato {isAdmin && '(Admin)'}</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {message.attachment_url && (
                            <div className="rounded-lg overflow-hidden my-1">
                                {isImage ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`}
                                        alt="Allegato"
                                        className="max-h-60 w-auto object-cover cursor-pointer hover:scale-105 transition"
                                        onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`, '_blank')}
                                    />
                                ) : (
                                    <a
                                        href={`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-black/20 p-2 rounded hover:bg-black/30 transition text-sm"
                                    >
                                        📎 Scarica Allegato
                                    </a>
                                )}
                            </div>
                        )}
                        {message.content && (
                            <p className={`whitespace-pre-wrap break-words ${isGod ? 'text-yellow-50 font-medium' : ''}`}>
                                {renderContent(message.content)}
                            </p>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-end gap-2 mt-1">
                    <span className={`text-[10px] ${isGod ? 'text-yellow-500/60' : 'opacity-60'}`}>
                        {formatTime(message.created_at)}
                    </span>
                    {isOwn && <span className="text-[10px] opacity-60">✓✓</span>}
                </div>
            </div>
        </div>
    );
}

// =========================================================================================
// MAIN PAGE COMPONENT
// =========================================================================================
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
            setConversations(data || []);
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
            setMessages(data || []);
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
            setContacts(data || []);
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }, []);

    // Init
    useEffect(() => {
        loadConversations();
        loadContacts();
    }, [loadConversations, loadContacts]);

    // Polling messaggi (ogni 3 sec) - SOCKET REPLACEMENT FOR NOW
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

    const handleSelectConv = (conv) => {
        setActiveConv(conv);
        loadMessages(conv.id);
        setShowGroupInfo(false);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

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

    const executeBanUser = async (userId) => {
        try {
            await chatApi.timeoutUser(activeConv.id, userId, 1);
            toast.success("Utente silenziato per 1 minuto");
            setShowGroupInfo(false);
        } catch (error) {
            const msg = error.response?.data?.detail || error.message || 'Errore ban';
            toast.error(`Errore: ${msg}`);
        }
    };

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

    const executeDeleteGroup = async () => {
        try {
            await chatApi.deleteConversation(activeConv.id);
            toast.success("Chat eliminata");
            setActiveConv(null);
            loadConversations();
            setShowGroupInfo(false);
        } catch (error) {
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
            const conv = (conversations || []).find(c => c.id === result.id) ||
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
            const conv = (conversations || []).find(c => c.id === result.id) ||
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
            {/* Sidebar */}
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
                                    <h2 className="font-semibold text-lg">{activeConv.name}</h2>
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
                            <button onClick={() => setShowGroupInfo(true)} className="p-2 hover:bg-white/10 rounded-full transition">ℹ️</button>
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
                                        const showDate = idx === 0 || formatDate(msg.created_at) !== formatDate(messages[idx - 1].created_at);
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
                                    <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center text-blue-400">📎</div>
                                    <div><p className="text-sm text-white font-medium truncate max-w-[200px]">{attachment.name}</p><p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p></div>
                                </div>
                                <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-white">&times;</button>
                            </div>
                        )}

                        {/* Area Input */}
                        <div className="p-4 border-t border-white/10 bg-slate-800/50 relative">
                            {/* Emoji Picker DISABLED */}
                            <div className="flex gap-3 items-end">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
                                <button onClick={() => toast.info("Emoji momentaneamente disabilitate per manutenzione.")} className="p-3 rounded-xl bg-slate-700 text-gray-300 hover:bg-slate-600 transition">😊</button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-gray-300 transition" title="Allega file">📎</button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewMessage(val);
                                        // Mentions logic stripped for now
                                        const lastWord = val.split(' ').pop();
                                        if (lastWord.startsWith('@') && lastWord.length > 1) { setMentionQuery(lastWord.slice(1)); } else { setMentionQuery(null); }
                                    }}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Scrivi un messaggio..."
                                    rows={1}
                                    className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button onClick={handleSend} disabled={(!newMessage.trim() && !attachment) || uploading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2">
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

            <NewChatModal isOpen={showNewChat} onClose={() => setShowNewChat(false)} onCreateDirect={handleCreateDirect} onCreateGroup={handleCreateGroup} contacts={contacts} />
            <GroupInfoModal isOpen={showGroupInfo} onClose={() => setShowGroupInfo(false)} conv={activeConv} onBan={confirmBanUser} onDeleteGroup={confirmDeleteGroup} isAdmin={isAdmin} />
            <ConfirmationModal isOpen={confirmation.isOpen} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} isDanger={confirmation.isDanger} confirmText={confirmation.confirmText} />
        </div>
    );
}
