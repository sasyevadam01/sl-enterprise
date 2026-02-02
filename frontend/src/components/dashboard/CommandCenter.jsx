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
    let shiftInfo = { name: 'NOTTE', time: '22:00-06:00', emoji: '🌙', accent: 'purple' };
    if (hour >= 6 && hour < 14) {
        shiftInfo = { name: 'MATTINA', time: '06:00-14:00', emoji: '☀️', accent: 'cyan' };
    } else if (hour >= 14 && hour < 22) {
        shiftInfo = { name: 'POMERIGGIO', time: '14:00-22:00', emoji: '🌅', accent: 'orange' };
    }

    return (
        <div className="master-card p-6 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                {/* Left: User & Time - Clean Text */}
                <div className="flex items-center gap-4">
                    <div className="text-4xl">{hour >= 6 && hour < 14 ? '👋' : hour >= 14 && hour < 22 ? '✌️' : '🌙'}</div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Ciao, <span className="neon-emerald">{user?.full_name?.split(' ')[0] || 'Manager'}</span>
                        </h1>
                        <p className="text-zinc-500 flex items-center gap-2 text-sm mt-1">
                            <span className="capitalize">{format(currentTime, "EEEE d MMMM", { locale: it })}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                            <span className="font-mono neon-cyan text-xs">{format(currentTime, "HH:mm:ss")}</span>
                        </p>
                    </div>
                </div>

                {/* Center: Shift Badge - Pill Style */}
                <div className="flex-1 flex justify-center w-full md:w-auto">
                    <div className={`master-card px-5 py-3 flex items-center gap-4`}>
                        <span className="text-2xl">{shiftInfo.emoji}</span>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Turno Attuale</p>
                            <h2 className={`text-xl font-black tracking-wider neon-${shiftInfo.accent}`}>{shiftInfo.name}</h2>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10"></div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-400 font-mono">{shiftInfo.time}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className="status-dot status-low"></span>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">Live</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Quick Stats - Neon Numbers */}
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <StatPill
                        value={stats.totalEmployees || 0}
                        label="Dipendenti"
                        neonClass="neon-cyan"
                    />
                    <StatPill
                        value={stats.permessiOggi || 0}
                        label="Permessi Oggi"
                        neonClass={stats.permessiOggi > 0 ? "neon-orange" : "text-zinc-500"}
                        showDot={stats.permessiOggi > 0}
                    />
                </div>
            </div>
        </div>
    );
}

function StatPill({ value, label, neonClass, showDot }) {
    return (
        <div className="master-card flex flex-col items-center justify-center min-w-[90px] px-4 py-3">
            <div className="flex items-center gap-2">
                {showDot && <span className="status-dot status-medium"></span>}
                <span className={`text-2xl font-bold ${neonClass}`}>{value}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">{label}</span>
        </div>
    );
}
