import React from 'react';
import { Link } from 'react-router-dom';

export default function QuickActions({ pendingCounts }) {
    const actions = [
        {
            label: 'Nuova Assenza',
            icon: '🏖️',
            to: '/hr/leaves',
            color: 'blue',
            badge: pendingCounts.leaves > 0 ? pendingCounts.leaves : null
        },
        {
            label: 'Nuovo Evento',
            icon: '📝',
            to: '/hr/events/new',
            color: 'purple',
            badge: pendingCounts.events > 0 ? pendingCounts.events : null
        },
        {
            label: 'Gestione Turni',
            icon: '📅',
            to: '/hr/planner',
            color: 'teal',
            badge: null
        }
    ];

    return (
        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl p-3">
            <div className="flex items-center justify-between gap-4 h-full">
                <div className="hidden md:flex items-center gap-2 px-4 border-r border-white/10 h-full">
                    <span className="text-xl">⚡</span>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                        Azioni<br />Rapide
                    </h3>
                </div>

                <div className="flex-1 flex gap-3 overflow-x-auto custom-scrollbar pb-1">
                    {actions.map((action, i) => (
                        <Link
                            key={i}
                            to={action.to}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-${action.color}-500/10 border border-white/5 hover:bg-${action.color}-500/20 hover:border-${action.color}-500/30 transition duration-300 group relative overflow-hidden`}
                        >
                            <span className="text-2xl group-hover:scale-110 transition duration-300 transform">{action.icon}</span>
                            <span className="text-gray-300 font-bold text-xs uppercase tracking-wide group-hover:text-white">{action.label}</span>

                            {action.badge && (
                                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-lg animate-pulse">
                                    {action.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
