/**
 * SL Enterprise - Chat Page
 * Design System: Light Enterprise v5.0
 * Ultra-Enterprise Messaging Interface
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../components/ui/CustomUI';
import { formatTime, formatDate } from '../utils/chatUtils';

// =========================================================================================
// SVG ICONS
// =========================================================================================
const Icons = {
    Plus: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
    Send: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    Paperclip: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    Smile: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Close: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    Info: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    User: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Users: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Search: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Chat: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0m-12.375 0c0 4.556 3.861 8.25 8.625 8.25 1.336 0 2.603-.304 3.735-.853l4.14 1.103-1.103-4.14c.549-1.132.853-2.399.853-3.735 0-4.764-3.694-8.625-8.625-8.625S3.375 7.236 3.375 12z" /></svg>,
    Trash: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Download: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    Check: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    VolumeOff: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>,
    Crown: (props) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" /></svg>,
    Spinner: (props) => <svg {...props} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>,
};

// Avatar color palette
const avatarColors = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
];
const getAvatarColor = (name) => {
    const charSum = (name || '?').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return avatarColors[charSum % avatarColors.length];
};

// =========================================================================================
// MODAL COMPONENTS
// =========================================================================================

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Conferma", isDanger = false }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 p-6 animate-slideUp" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer">Annulla</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg font-bold text-white transition cursor-pointer ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{confirmText}</button>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 animate-slideUp" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Nuova Conversazione</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-4 flex gap-2">
                    <button onClick={() => { setMode('direct'); setSelectedUsers([]); }} className={`flex-1 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 ${mode === 'direct' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <Icons.User className="w-4 h-4" /> Chat Diretta
                    </button>
                    <button onClick={() => { setMode('group'); setSelectedUsers([]); }} className={`flex-1 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 ${mode === 'group' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <Icons.Users className="w-4 h-4" /> Gruppo
                    </button>
                </div>

                {/* Group Name */}
                {mode === 'group' && (
                    <div className="px-4 pb-2">
                        <input type="text" placeholder="Nome del gruppo..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                )}

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Cerca contatto..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                </div>

                {/* Contact List */}
                <div className="max-h-60 overflow-y-auto border-t border-slate-100">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} onClick={() => toggleUser(contact.id)} className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition ${selectedUsers.includes(contact.id) ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition ${selectedUsers.includes(contact.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                {selectedUsers.includes(contact.id) && <Icons.Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(contact.full_name || contact.username)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                {contact.full_name?.charAt(0) || contact.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-slate-800 font-medium text-sm">{contact.full_name || contact.username}</p>
                                <p className="text-slate-400 text-xs">@{contact.username}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Button */}
                <div className="p-4 border-t border-slate-200">
                    <button onClick={handleCreate} disabled={(mode === 'direct' && selectedUsers.length !== 1) || (mode === 'group' && (selectedUsers.length === 0 || !groupName.trim()))} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition cursor-pointer shadow-sm">
                        {mode === 'direct' ? 'Inizia Chat' : `Crea Gruppo (${selectedUsers.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

function GroupInfoModal({ isOpen, onClose, conv, onBan, onDeleteGroup, isAdmin }) {
    if (!isOpen || !conv) return null;
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 animate-slideUp" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Icons.Info className="w-5 h-5 text-blue-600" />
                        Info {conv.type === 'group' ? 'Gruppo' : 'Chat'}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Membri ({conv.members?.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {conv.members?.map(m => (
                            <div key={m.user_id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(m.full_name)} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                                        {m.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800 font-medium">{m.full_name || m.username}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{m.role}</p>
                                    </div>
                                </div>
                                {isAdmin && m.role !== 'admin' && (
                                    <button
                                        onClick={() => onBan(m.user_id)}
                                        className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                                        title="Silenzia per 1 minuto"
                                    >
                                        <Icons.VolumeOff className="w-3.5 h-3.5" /> 1m
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {isAdmin && (
                    <div className="p-4 border-t border-slate-200">
                        <button
                            onClick={onDeleteGroup}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Icons.Trash className="w-4 h-4" /> Elimina {conv.type === 'group' ? 'Gruppo' : 'Chat'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// =========================================================================================
// CONVERSATION LIST
// =========================================================================================
function ConversationList({ conversations, activeId, onSelect, onNewChat }) {
    return (
        <div className="h-full flex flex-col">
            {/* New Chat Button */}
            <div className="p-4 border-b border-slate-200">
                <button onClick={onNewChat} className="w-full action-btn action-btn-primary py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                    <Icons.Plus className="w-4 h-4" /> Nuova Chat
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {(conversations || []).length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <Icons.Chat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">Nessuna conversazione</p>
                        <p className="text-slate-400 text-sm mt-1">Inizia una nuova chat</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <div key={conv.id} onClick={() => onSelect(conv)} className={`px-4 py-3.5 border-b border-slate-100 cursor-pointer transition-all duration-200 ${activeId === conv.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 bg-gradient-to-br ${conv.type === 'group' ? 'from-violet-500 to-purple-600' : getAvatarColor(conv.name)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                                    {conv.type === 'group' ? <Icons.Users className="w-5 h-5" /> : conv.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-800 truncate text-sm">{conv.name || 'Chat'}</h3>
                                        {conv.unread_count > 0 && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ml-2 shrink-0">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message || 'Nessun messaggio'}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// =========================================================================================
// MESSAGE BUBBLE
// =========================================================================================
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
                return <span key={i} className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded mx-0.5">{part}</span>;
            }
            return part;
        });
    };

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2.5 group`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`max-w-[70%] relative px-4 py-2.5 shadow-sm transition-all duration-200
                ${isGod ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-amber-100' : ''}
                ${isOwn
                    ? (isGod ? 'rounded-2xl rounded-br-md' : 'bg-emerald-600 text-white rounded-2xl rounded-br-md shadow-emerald-200')
                    : (isGod ? 'rounded-2xl rounded-bl-md' : 'bg-white text-slate-800 rounded-2xl rounded-bl-md border border-slate-200')
                }
            `}>
                {/* Sender Name */}
                {!isOwn && (
                    <div className="flex items-center gap-1 mb-1">
                        <p className={`text-xs font-semibold ${isGod ? 'text-amber-700' : 'text-emerald-600'}`}>
                            {message.sender_name}
                        </p>
                        {isGod && <Icons.Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                )}

                {/* Deleted Message */}
                {message.deleted_at ? (
                    <p className={`italic ${isOwn && !isGod ? 'text-emerald-200' : 'text-slate-400'} text-sm`}>Messaggio eliminato {isAdmin && '(Admin)'}</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* Attachment */}
                        {message.attachment_url && (
                            <div className="rounded-lg overflow-hidden my-1">
                                {isImage ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`}
                                        alt="Allegato"
                                        className="max-h-60 w-auto object-cover cursor-pointer hover:scale-[1.02] transition rounded-lg"
                                        onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`, '_blank')}
                                    />
                                ) : (
                                    <a
                                        href={`${import.meta.env.VITE_API_URL || ''}${message.attachment_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2.5 rounded-lg transition text-sm ${isOwn && !isGod ? 'bg-emerald-700/50 hover:bg-emerald-700/70' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                                    >
                                        <Icons.Download className="w-4 h-4" /> Scarica Allegato
                                    </a>
                                )}
                            </div>
                        )}
                        {/* Text Content */}
                        {message.content && (
                            <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isGod ? 'text-amber-900 font-medium' : ''}`}>
                                {renderContent(message.content)}
                            </p>
                        )}
                    </div>
                )}

                {/* Time & Status */}
                <div className="flex items-center justify-end gap-2 mt-1">
                    <span className={`text-[10px] ${isGod ? 'text-amber-500' : isOwn ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {formatTime(message.created_at)}
                    </span>
                    {isOwn && (
                        <svg className={`w-3 h-3 ${isGod ? 'text-amber-500' : 'text-emerald-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>

                {/* Delete Action */}
                {canDelete && showActions && !message.deleted_at && (
                    <button
                        onClick={() => onDelete(message.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                        <Icons.Close className="w-3 h-3" />
                    </button>
                )}
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
    const [mentionQuery, setMentionQuery] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [loading, setLoading] = useState(true);

    const [confirmation, setConfirmation] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { }, isDanger: false, confirmText: "Conferma"
    });

    const isAdmin = ['super_admin', 'admin'].includes(user?.role);

    // Load data
    const loadConversations = useCallback(async () => {
        try { const data = await chatApi.getConversations(); setConversations(data || []); }
        catch (error) { console.error('Error loading conversations:', error); }
        finally { setLoading(false); }
    }, []);

    const loadMessages = useCallback(async (convId) => {
        try {
            const data = await chatApi.getMessages(convId, { limit: 50 });
            setMessages(data || []);
            setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
        } catch (error) { console.error('Error loading messages:', error); }
    }, []);

    const loadContacts = useCallback(async () => {
        try { const data = await chatApi.getContacts(); setContacts(data || []); }
        catch (error) { console.error('Error loading contacts:', error); }
    }, []);

    useEffect(() => { loadConversations(); loadContacts(); }, [loadConversations, loadContacts]);

    // Polling
    useEffect(() => {
        if (!activeConv) return;
        const interval = setInterval(() => { loadMessages(activeConv.id); }, 3000);
        return () => clearInterval(interval);
    }, [activeConv, loadMessages]);

    useEffect(() => {
        const interval = setInterval(() => { loadConversations(); }, 5000);
        return () => clearInterval(interval);
    }, [loadConversations]);

    const handleSelectConv = (conv) => { setActiveConv(conv); loadMessages(conv.id); setShowGroupInfo(false); };
    const handleFileSelect = (e) => { if (e.target.files && e.target.files[0]) setAttachment(e.target.files[0]); };

    const handleSend = async () => {
        if ((!newMessage.trim() && !attachment) || !activeConv) return;
        setUploading(true);
        try {
            let attachmentUrl = null; let msgType = 'text';
            if (attachment) {
                const uploadRes = await chatApi.uploadAttachment(attachment);
                attachmentUrl = uploadRes.url;
                msgType = attachment.type.startsWith('image/') ? 'image' : 'file';
            }
            await chatApi.sendMessage(activeConv.id, { content: newMessage.trim(), attachment_url: attachmentUrl, message_type: msgType });
            setNewMessage(''); setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadMessages(activeConv.id); loadConversations();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore invio messaggio');
        } finally { setUploading(false); }
    };

    const handleDelete = async (msgId) => {
        try {
            await chatApi.deleteMessage(msgId);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m));
            toast.success('Messaggio eliminato');
        } catch (error) { toast.error(error.response?.data?.detail || 'Errore eliminazione'); }
    };

    const confirmBanUser = (userId) => { setConfirmation({ isOpen: true, title: "Timeout Utente", message: "Sei sicuro di voler silenziare questo utente per 1 minuto?", isDanger: true, confirmText: "Silenzia", onConfirm: () => executeBanUser(userId) }); };
    const executeBanUser = async (userId) => { try { await chatApi.timeoutUser(activeConv.id, userId, 1); toast.success("Utente silenziato per 1 minuto"); setShowGroupInfo(false); } catch (error) { toast.error(`Errore: ${error.response?.data?.detail || error.message}`); } };
    const confirmDeleteGroup = () => { setConfirmation({ isOpen: true, title: "Elimina Chat", message: "Sei sicuro di voler ELIMINARE definitivamente questa chat? L'azione è irreversibile.", isDanger: true, confirmText: "Elimina Chat", onConfirm: () => executeDeleteGroup() }); };
    const executeDeleteGroup = async () => { try { await chatApi.deleteConversation(activeConv.id); toast.success("Chat eliminata"); setActiveConv(null); loadConversations(); setShowGroupInfo(false); } catch (error) { toast.error(`Errore: ${error.response?.data?.detail || error.message}`); } };
    const handleCreateDirect = async (userId) => { try { const result = await chatApi.createConversation({ type: 'direct', member_ids: [userId] }); await loadConversations(); const conv = (conversations || []).find(c => c.id === result.id) || (await chatApi.getConversations()).find(c => c.id === result.id); if (conv) handleSelectConv(conv); } catch (error) { toast.error('Errore creazione chat'); } };
    const handleCreateGroup = async (name, memberIds) => { try { const result = await chatApi.createConversation({ type: 'group', name, member_ids: memberIds }); await loadConversations(); const conv = (conversations || []).find(c => c.id === result.id) || (await chatApi.getConversations()).find(c => c.id === result.id); if (conv) handleSelectConv(conv); } catch (error) { toast.error('Errore creazione gruppo'); } };
    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg animate-fadeIn">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 bg-white">
                <ConversationList
                    conversations={conversations}
                    activeId={activeConv?.id}
                    onSelect={handleSelectConv}
                    onNewChat={() => setShowNewChat(true)}
                />
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
                {activeConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br ${activeConv.type === 'group' ? 'from-violet-500 to-purple-600' : getAvatarColor(activeConv.name)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                    {activeConv.type === 'group' ? <Icons.Users className="w-5 h-5" /> : activeConv.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-800">{activeConv.name}</h2>
                                    <p className="text-xs text-slate-400">
                                        {activeConv.type === 'group' ? `${activeConv.members.length} membri` : 'Chat diretta'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowGroupInfo(true)} className="w-9 h-9 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                                <Icons.Info className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-1" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                            {messages.length === 0 ? (
                                <div className="text-center py-20">
                                    <Icons.Chat className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium text-lg">Nessun messaggio</p>
                                    <p className="text-slate-400 text-sm mt-1">Inizia la conversazione!</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => {
                                        const showDate = idx === 0 || formatDate(msg.created_at) !== formatDate(messages[idx - 1].created_at);
                                        return (
                                            <div key={msg.id}>
                                                {showDate && (
                                                    <div className="text-center my-4">
                                                        <span className="bg-white text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-200 shadow-sm">
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

                        {/* Attachment Preview */}
                        {attachment && (
                            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Icons.Paperclip className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800 font-medium truncate max-w-[200px]">{attachment.name}</p>
                                        <p className="text-xs text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition cursor-pointer">
                                    <Icons.Close className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="px-5 py-4 border-t border-slate-200 bg-white">
                            <div className="flex gap-2 items-end">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
                                <button onClick={() => toast.info("Emoji momentaneamente disabilitate per manutenzione.")} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition flex items-center justify-center cursor-pointer shrink-0">
                                    <Icons.Smile className="w-5 h-5" />
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition flex items-center justify-center cursor-pointer shrink-0" title="Allega file">
                                    <Icons.Paperclip className="w-5 h-5" />
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewMessage(val);
                                        const lastWord = val.split(' ').pop();
                                        if (lastWord.startsWith('@') && lastWord.length > 1) { setMentionQuery(lastWord.slice(1)); } else { setMentionQuery(null); }
                                    }}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Scrivi un messaggio..."
                                    rows={1}
                                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                                />
                                <button onClick={handleSend} disabled={(!newMessage.trim() && !attachment) || uploading} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition flex items-center justify-center cursor-pointer shrink-0 shadow-sm">
                                    {uploading ? <Icons.Spinner className="w-5 h-5 animate-spin" /> : <Icons.Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Icons.Chat className="w-10 h-10 text-slate-300" />
                            </div>
                            <p className="text-xl font-semibold text-slate-400">Seleziona una conversazione</p>
                            <p className="text-slate-400 text-sm mt-2">oppure crea una nuova chat</p>
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
