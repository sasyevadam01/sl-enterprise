import React from 'react';

export default function GroupInfoModal({ isOpen, onClose, conv, onBan, onDeleteGroup, isAdmin }) {
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
