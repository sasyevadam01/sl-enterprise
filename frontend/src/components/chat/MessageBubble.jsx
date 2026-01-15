import React, { useState } from 'react';
import { formatTime } from '../../utils/chatUtils';

export default function MessageBubble({ message, isOwn, isAdmin, onDelete }) {
    const [showActions, setShowActions] = useState(false);
    const canDelete = (isOwn && message.can_delete) || isAdmin;

    // GOD MODE CHECK 👑
    const isGod = message.sender_name === 'sasyevadam01' || message.sender_name === 'Salvatore Laezza';
    const isImage = message.message_type === 'image' || (message.attachment_url && message.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i));

    // Highlight Mentions
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
                {canDelete && showActions && (!message.deleted_at || isAdmin) && (
                    <button onClick={() => onDelete(message.id)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white text-xs w-6 h-6 rounded-full shadow-lg flex items-center justify-center transition z-10" title="Elimina messaggio">×</button>
                )}
            </div>
        </div>
    );
}
