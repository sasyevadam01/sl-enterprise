/**
 * SL Enterprise - Chat Page
 * Messaggistica interna tipo WhatsApp
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';

// Formatta data messaggio
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

// Componente Messaggio
const MessageBubble = ({ message, isOwn, onDelete }) => {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`max-w-[70%] relative group ${isOwn
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                : 'bg-slate-700 text-white rounded-2xl rounded-bl-sm'
                } px-4 py-2 shadow-lg`}>
                {!isOwn && (
                    <p className="text-xs text-blue-300 font-semibold mb-1">
                        {message.sender_name}
                    </p>
                )}

                {message.deleted_at ? (
                    <p className="italic text-gray-400">🚫 Messaggio eliminato</p>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}

                <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-[10px] opacity-60">
                        {formatTime(message.created_at)}
                    </span>
                </div>

                {/* Delete button */}
                {isOwn && message.can_delete && showActions && !message.deleted_at && (
                    <button
                        onClick={() => onDelete(message.id)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white text-xs w-6 h-6 rounded-full shadow-lg flex items-center justify-center transition"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

// Componente Lista Conversazioni
const ConversationList = ({ conversations, activeId, onSelect, onNewChat }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
                <button
                    onClick={onNewChat}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                    <span>+</span> Nuova Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p className="text-4xl mb-2">💬</p>
                        <p>Nessuna conversazione</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => onSelect(conv)}
                            className={`p-4 border-b border-white/5 cursor-pointer transition ${activeId === conv.id
                                ? 'bg-blue-600/20 border-l-4 border-l-blue-500'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0">
                                    {conv.type === 'group' ? '👥' : conv.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-white truncate">
                                            {conv.name || 'Chat'}
                                        </h3>
                                        {conv.unread_count > 0 && (
                                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">
                                        {conv.last_message || 'Nessun messaggio'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Modal Nuova Chat
const NewChatModal = ({ isOpen, onClose, onCreateDirect, onCreateGroup, contacts }) => {
    const [mode, setMode] = useState('direct'); // 'direct' o 'group'
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredContacts = contacts.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.username.toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (userId) => {
        if (mode === 'direct') {
            setSelectedUsers([userId]);
        } else {
            setSelectedUsers(prev =>
                prev.includes(userId)
                    ? prev.filter(id => id !== userId)
                    : [...prev, userId]
            );
        }
    };

    const handleCreate = () => {
        if (mode === 'direct' && selectedUsers.length === 1) {
            onCreateDirect(selectedUsers[0]);
        } else if (mode === 'group' && selectedUsers.length > 0 && groupName.trim()) {
            onCreateGroup(groupName, selectedUsers);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Nuova Conversazione</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                {/* Mode Selector */}
                <div className="p-4 flex gap-2">
                    <button
                        onClick={() => { setMode('direct'); setSelectedUsers([]); }}
                        className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'direct' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        👤 Chat Diretta
                    </button>
                    <button
                        onClick={() => { setMode('group'); setSelectedUsers([]); }}
                        className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'group' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        👥 Gruppo
                    </button>
                </div>

                {/* Group Name */}
                {mode === 'group' && (
                    <div className="px-4 pb-2">
                        <input
                            type="text"
                            placeholder="Nome del gruppo..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-slate-700 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="px-4 pb-2">
                    <input
                        type="text"
                        placeholder="Cerca contatto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                </div>

                {/* Contact List */}
                <div className="max-h-60 overflow-y-auto">
                    {filteredContacts.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => toggleUser(contact.id)}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition ${selectedUsers.includes(contact.id)
                                ? 'bg-blue-600/20'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedUsers.includes(contact.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-500'
                                }`}>
                                {selectedUsers.includes(contact.id) && (
                                    <span className="text-white text-xs">✓</span>
                                )}
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                {contact.full_name?.charAt(0) || contact.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-white font-medium">{contact.full_name || contact.username}</p>
                                <p className="text-gray-400 text-xs">@{contact.username}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleCreate}
                        disabled={(mode === 'direct' && selectedUsers.length !== 1) ||
                            (mode === 'group' && (selectedUsers.length === 0 || !groupName.trim()))}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition"
                    >
                        {mode === 'direct' ? 'Inizia Chat' : 'Crea Gruppo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Pagina principale
export default function ChatPage() {
    const { user } = useAuth();
    const { toast } = useUI();
    const messagesEndRef = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [contacts, setContacts] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [loading, setLoading] = useState(true);

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
    };

    // Invia messaggio
    const handleSend = async () => {
        if (!newMessage.trim() || !activeConv) return;

        try {
            await chatApi.sendMessage(activeConv.id, { content: newMessage.trim() });
            setNewMessage('');
            loadMessages(activeConv.id);
            loadConversations(); // Aggiorna preview
        } catch (error) {
            toast.error('Errore invio messaggio');
        }
    };

    // Elimina messaggio
    const handleDelete = async (msgId) => {
        try {
            await chatApi.deleteMessage(msgId);
            loadMessages(activeConv.id);
            toast.success('Messaggio eliminato');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore eliminazione');
        }
    };

    // Crea chat diretta
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

    // Crea gruppo
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

    // Keypress Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

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
                />
            </div>

            {/* Area Chat */}
            <div className="flex-1 flex flex-col">
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-slate-800/50 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {activeConv.type === 'group' ? '👥' : activeConv.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{activeConv.name}</h2>
                                <p className="text-xs text-gray-400">
                                    {activeConv.type === 'group'
                                        ? `${activeConv.members?.length || 0} membri`
                                        : 'Chat diretta'}
                                </p>
                            </div>
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
                                                    onDelete={handleDelete}
                                                />
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/10 bg-slate-800/50">
                            <div className="flex gap-3">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Scrivi un messaggio..."
                                    rows={1}
                                    className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 rounded-xl font-bold transition"
                                >
                                    ➤
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-6xl mb-4">💬</p>
                            <p className="text-xl">Seleziona una conversazione</p>
                            <p className="text-sm mt-2">O inizia una nuova chat</p>
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
        </div>
    );
}
