import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function CommandCenter({ stats, user }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = currentTime.getHours();

    // Determine actual shift
    let shiftInfo = { name: 'NOTTE', time: '22:00-06:00', color: 'purple', gradient: 'from-purple-500 to-indigo-500' };
    if (hour >= 6 && hour < 14) {
        shiftInfo = { name: 'MATTINA', time: '06:00-14:00', color: 'blue', gradient: 'from-blue-500 to-cyan-500' };
    } else if (hour >= 14 && hour < 22) {
        shiftInfo = { name: 'POMERIGGIO', time: '14:00-22:00', color: 'orange', gradient: 'from-orange-500 to-red-500' };
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-${shiftInfo.color}-500/20 rounded-full blur-3xl group-hover:bg-${shiftInfo.color}-500/30 transition duration-1000`}></div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                {/* Left: User & Time */}
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">👋</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Ciao, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user?.full_name?.split(' ')[0] || 'Manager'}</span>
                        </h1>
                        <p className="text-gray-400 flex items-center gap-2 text-sm mt-1">
                            <span>{format(currentTime, "EEEE d MMMM", { locale: it })}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                            <span className="font-mono text-blue-400">{format(currentTime, "HH:mm:ss")}</span>
                        </p>
                    </div>
                </div>

                {/* Center: Shift Indicator */}
                <div className="flex-1 flex justify-center w-full md:w-auto">
                    <div className={`px-6 py-3 rounded-2xl bg-gradient-to-r ${shiftInfo.gradient} bg-opacity-10 border border-white/10 shadow-lg relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition duration-500"></div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold mb-0.5">Turno Attuale</p>
                                <h2 className="text-2xl font-black text-white tracking-widest">{shiftInfo.name}</h2>
                            </div>
                            <div className="h-8 w-[1px] bg-white/20"></div>
                            <div className="text-right">
                                <p className="text-xs text-white/90 font-mono">{shiftInfo.time}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-white uppercase">Live</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Quick Stats */}
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <StatPill
                        value={stats.totalEmployees || 0}
                        label="Dipendenti"
                        icon="👥"
                        color="blue"
                    />
                    <StatPill
                        value={stats.permessiOggi || 0}
                        label="Permessi Oggi"
                        icon="📋"
                        color={stats.permessiOggi > 0 ? "emerald" : "slate"}
                        alert={stats.permessiOggi > 0}
                    />
                </div>
            </div>
        </div>
    );
}

function StatPill({ value, label, icon, color, alert }) {
    return (
        <div className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-xl border transition duration-300 ${alert ? `bg-${color}-500/10 border-${color}-500/50` : 'bg-slate-700/30 border-white/5'}`}>
            <span className={`text-xl font-bold ${alert ? `text-${color}-400` : 'text-white'}`}>{value}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</span>
        </div>
    );
}
