/**
 * CommandCenter — Dashboard Header
 * v5.1 Premium Enterprise with Color Accents
 */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock, Users, CalendarOff, Sun, Moon, Sunset } from 'lucide-react';

export default function CommandCenter({ stats, user }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = currentTime.getHours();

    let shiftInfo = { name: 'Notte', time: '22:00 – 06:00', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' };
    if (hour >= 6 && hour < 14) {
        shiftInfo = { name: 'Mattina', time: '06:00 – 14:00', icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' };
    } else if (hour >= 14 && hour < 22) {
        shiftInfo = { name: 'Pomeriggio', time: '14:00 – 22:00', icon: Sunset, color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100' };
    }

    const ShiftIcon = shiftInfo.icon;
    const greeting = hour >= 6 && hour < 14 ? 'Buongiorno' : hour >= 14 && hour < 22 ? 'Buon pomeriggio' : 'Buonasera';

    return (
        <div className="dashboard-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Brand accent top bar */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #2D8C0E, #35A012 40%, #E6620F)' }} />

            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                {/* Left: Greeting */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-green/10 to-brand-green/5 flex items-center justify-center ring-1 ring-brand-green/20">
                        <span className="text-xl font-bold text-brand-green">
                            {user?.full_name?.charAt(0) || 'U'}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {greeting}, {user?.full_name?.split(' ')[0] || 'Manager'}
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                            <span className="capitalize">{format(currentTime, "EEEE d MMMM", { locale: it })}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="font-mono text-slate-400 text-xs tabular-nums">{format(currentTime, "HH:mm:ss")}</span>
                        </p>
                    </div>
                </div>

                {/* Center: Shift Badge */}
                <div className={`flex items-center gap-3 px-5 py-3 rounded-xl ${shiftInfo.bg} ring-1 ${shiftInfo.ring}`}>
                    <div className={`w-9 h-9 rounded-lg ${shiftInfo.bg} flex items-center justify-center`}>
                        <ShiftIcon className={`w-5 h-5 ${shiftInfo.color}`} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Turno Attuale</p>
                        <p className={`text-base font-bold ${shiftInfo.color}`}>{shiftInfo.name}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 mx-1" />
                    <div className="text-right">
                        <p className="text-xs text-slate-500 font-mono">{shiftInfo.time}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-semibold text-green-600 uppercase">Live</span>
                        </div>
                    </div>
                </div>

                {/* Right: Stats */}
                <div className="flex gap-3">
                    <StatCard value={stats.totalEmployees || 0} label="Dipendenti" icon={Users} color="green" />
                    <StatCard value={stats.permessiOggi || 0} label="Permessi Oggi" icon={CalendarOff}
                        color={stats.permessiOggi > 0 ? 'orange' : 'slate'} />
                </div>
            </div>
        </div>
    );
}

const colorMap = {
    green: { iconBg: 'bg-green-100', iconText: 'text-green-600', valueTxt: 'text-green-700', cardBg: 'bg-green-50/50', ring: 'ring-green-100' },
    orange: { iconBg: 'bg-orange-100', iconText: 'text-orange-600', valueTxt: 'text-orange-700', cardBg: 'bg-orange-50/50', ring: 'ring-orange-100' },
    slate: { iconBg: 'bg-slate-100', iconText: 'text-slate-500', valueTxt: 'text-slate-800', cardBg: 'bg-slate-50/50', ring: 'ring-slate-100' },
};

function StatCard({ value, label, icon: Icon, color = 'slate' }) {
    const c = colorMap[color] || colorMap.slate;
    return (
        <div className={`flex flex-col items-center justify-center min-w-[90px] px-4 py-3 rounded-xl ${c.cardBg} ring-1 ${c.ring} transition-all duration-150 hover:scale-105 hover:shadow-md cursor-default`}>
            <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md ${c.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${c.iconText}`} />
                </div>
                <span className={`text-2xl font-bold tabular-nums ${c.valueTxt}`}>{value}</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-1 font-medium">{label}</span>
        </div>
    );
}
