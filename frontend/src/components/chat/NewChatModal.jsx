import React, { useState } from 'react';

export default function NewChatModal({ isOpen, onClose, onCreateDirect, onCreateGroup, contacts }) {
    const [mode, setMode] = useState('direct');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [search, setSearch] = useState('');

    if (!isOpen) return null;
    const filteredContacts = contacts.filter(c => c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()));

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
