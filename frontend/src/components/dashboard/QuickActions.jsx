import React from 'react';
import { Link } from 'react-router-dom';

export default function QuickActions({ pendingCounts }) {
    const actions = [
        {
            label: 'Assenza',
            icon: '🏖️',
            to: '/hr/leaves',
            badge: pendingCounts.leaves > 0 ? pendingCounts.leaves : null
        },
        {
            label: 'Evento',
            icon: '📝',
            to: '/hr/events/new',
            badge: pendingCounts.events > 0 ? pendingCounts.events : null
        },
        {
            label: 'Turni',
            icon: '📅',
            to: '/hr/planner',
            badge: null
        },
        {
            label: 'Calendario',
            icon: '📆',
            to: '/hr/calendar',
            badge: null
        }
    ];

    return (
        <div className="floating-dock flex items-center gap-1">
            {/* Dock Label */}
            <div className="px-3 py-2 border-r border-white/10">
                <span className="text-lg">⚡</span>
            </div>

            {/* Action Items */}
            {actions.map((action, i) => (
                <Link
                    key={i}
                    to={action.to}
                    className="dock-item relative group"
                >
                    <span className="dock-icon">{action.icon}</span>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 
                                     font-medium mt-1 transition-colors">
                        {action.label}
                    </span>

                    {action.badge && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 
                                         bg-red-500 rounded-full flex items-center justify-center 
                                         text-white text-[9px] font-bold shadow-lg 
                                         shadow-red-500/50 animate-pulse">
                            {action.badge}
                        </span>
                    )}
                </Link>
            ))}
        </div>
    );
}
