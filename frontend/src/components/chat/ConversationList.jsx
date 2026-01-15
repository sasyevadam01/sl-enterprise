import React from 'react';

export default function ConversationList({ conversations, activeId, onSelect, onNewChat, pushSupported, pushSubscribed, onTogglePush }) {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10 flex gap-2">
                <button onClick={onNewChat} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"><span>+</span> Nuova Chat</button>
                {pushSupported && (
                    <button onClick={onTogglePush} className={`px-3 rounded-xl border border-white/10 transition ${pushSubscribed ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white'}`} title={pushSubscribed ? "Notifiche attive" : "Attiva notifiche"}>🔔</button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
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
