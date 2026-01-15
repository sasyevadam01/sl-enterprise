import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/client';

const OnlineUsersWidget = () => {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Initial fetch and heartbeat
        refreshStatus();

        // Interval: Heartbeat & Refresh every 30s
        const interval = setInterval(() => {
            refreshStatus();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const refreshStatus = async () => {
        try {
            await usersApi.sendHeartbeat();
            const users = await usersApi.getOnlineUsers();
            setOnlineUsers(users);
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            {/* List Panel */}
            <div className={`
                mb-4 bg-slate-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right pointer-events-auto
                ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 h-0'}
            `} style={{ width: '250px' }}>
                <div className="p-3 bg-slate-900 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utenti Online ({onlineUsers.length})</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {onlineUsers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500">Nessun altro online</div>
                    ) : (
                        <ul className="divide-y divide-gray-700">
                            {onlineUsers.map(u => (
                                <li key={u.id} className="p-3 flex items-center gap-3 hover:bg-white/5">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                            {u.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-800 rounded-full"></span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{u.fullName}</div>
                                        <div className="text-xs text-gray-400">{u.role}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg border border-green-500/50 flex items-center gap-2 transition-all pointer-events-auto group"
            >
                <div className="relative">
                    <span className="text-xl">🟢</span>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-bold px-1.5 rounded-full min-w-[16px] text-center border border-slate-800">
                        {onlineUsers.length}
                    </span>
                </div>
                <span className={`max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium ${isOpen ? 'max-w-xs' : ''}`}>
                    Utenti Online
                </span>
            </button>
        </div>
    );
};

export default OnlineUsersWidget;
