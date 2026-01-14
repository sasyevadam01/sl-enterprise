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
        },
        {
            label: 'Scadenze',
            icon: '⚠️',
            to: '/hr/security',
            color: 'orange',
            badge: pendingCounts.expiries > 0 ? pendingCounts.expiries : null
        }
    ];

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden h-full shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    ⚡ Azioni Rapide
                </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 h-[calc(100%-53px)] content-start">
                {actions.map((action, i) => (
                    <Link
                        key={i}
                        to={action.to}
                        className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-${action.color}-500/5 border border-white/5 hover:bg-${action.color}-500/20 hover:border-${action.color}-500/30 transition duration-300 group overflow-hidden`}
                    >
                        {/* Laser Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
                            <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-${action.color}-400 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000`}></div>
                            <div className={`absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-${action.color}-400 to-transparent transform translate-x-full group-hover:-translate-x-full transition-transform duration-1000`}></div>
                        </div>

                        <span className="text-3xl group-hover:scale-110 transition duration-300 filter drop-shadow-md">{action.icon}</span>
                        <span className="text-gray-300 font-medium text-xs text-center group-hover:text-white">{action.label}</span>

                        {action.badge && (
                            <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg animate-bounce">
                                {action.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
