import React from 'react';
import { Link } from 'react-router-dom';

// Premium SVG Icons with 3D Gradients
const AssenzaIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="assenzaBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="assenzaBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <filter id="assenzaGlow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#assenzaBg)" stroke="#334155" strokeWidth="1" />
        <path d="M22 10L14 22h6l-2 8 8-12h-6l2-8z" fill="url(#assenzaBolt)" filter="url(#assenzaGlow)" />
    </svg>
);

const EventoIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="eventoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="eventoRocket" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="eventoFlame" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#eventoBg)" />
        <rect x="4" y="4" width="32" height="32" rx="8" fill="#fef9c3" opacity="0.5" />
        <g transform="translate(8, 6) rotate(45, 12, 14)">
            <ellipse cx="12" cy="10" rx="6" ry="8" fill="url(#eventoRocket)" />
            <ellipse cx="12" cy="6" rx="3" ry="3" fill="#1e3a5f" />
            <path d="M6 16 L12 28 L18 16" fill="url(#eventoFlame)" />
            <circle cx="6" cy="12" r="2" fill="#60a5fa" />
            <circle cx="18" cy="12" r="2" fill="#60a5fa" />
        </g>
    </svg>
);

const TurniIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="turniBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5f5f4" />
                <stop offset="100%" stopColor="#e7e5e4" />
            </linearGradient>
            <linearGradient id="turniAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#turniBg)" />
        <rect x="4" y="4" width="32" height="32" rx="8" fill="white" opacity="0.7" />
        {/* Grid lines */}
        <line x1="10" y1="14" x2="30" y2="14" stroke="#d6d3d1" strokeWidth="1" />
        <line x1="10" y1="20" x2="30" y2="20" stroke="#d6d3d1" strokeWidth="1" />
        <line x1="10" y1="26" x2="30" y2="26" stroke="#d6d3d1" strokeWidth="1" />
        <line x1="10" y1="32" x2="30" y2="32" stroke="#d6d3d1" strokeWidth="1" />
        <line x1="16" y1="10" x2="16" y2="34" stroke="#d6d3d1" strokeWidth="1" />
        <line x1="24" y1="10" x2="24" y2="34" stroke="#d6d3d1" strokeWidth="1" />
        {/* Accent cells */}
        <rect x="17" y="21" width="6" height="5" rx="1" fill="url(#turniAccent)" />
        <rect x="25" y="15" width="4" height="4" rx="1" fill="#fdba74" />
        <rect x="11" y="27" width="4" height="4" rx="1" fill="#fed7aa" />
        {/* Edit pen */}
        <g transform="translate(26, 6)">
            <rect x="0" y="0" width="10" height="10" rx="2" fill="url(#turniAccent)" opacity="0.9" />
            <path d="M2 7.5L3 4L6.5 7.5L3.5 8.5L2 7.5Z" fill="white" />
            <path d="M4 3L7 6L6.5 7.5L3 4L4 3Z" fill="white" />
        </g>
    </svg>
);

const CalendarioIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="calBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="100%" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id="calHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#calBg)" />
        {/* Calendar body */}
        <rect x="6" y="10" width="28" height="26" rx="4" fill="white" />
        <rect x="6" y="10" width="28" height="8" rx="4" fill="url(#calHeader)" />
        <rect x="6" y="14" width="28" height="4" fill="url(#calHeader)" />
        {/* Calendar hooks */}
        <rect x="12" y="6" width="3" height="8" rx="1.5" fill="#475569" />
        <rect x="25" y="6" width="3" height="8" rx="1.5" fill="#475569" />
        {/* Calendar dots */}
        <circle cx="12" cy="23" r="2" fill="#e2e8f0" />
        <circle cx="20" cy="23" r="2" fill="#e2e8f0" />
        <circle cx="28" cy="23" r="2" fill="#3b82f6" />
        <circle cx="12" cy="30" r="2" fill="#e2e8f0" />
        <circle cx="20" cy="30" r="2" fill="#93c5fd" />
        <circle cx="28" cy="30" r="2" fill="#e2e8f0" />
    </svg>
);

export default function QuickActions({ pendingCounts }) {
    const actions = [
        {
            label: 'Assenza',
            icon: <AssenzaIcon />,
            to: '/hr/leaves',
            badge: pendingCounts.leaves > 0 ? pendingCounts.leaves : null
        },
        {
            label: 'Evento',
            icon: <EventoIcon />,
            to: '/hr/events/new',
            badge: pendingCounts.events > 0 ? pendingCounts.events : null
        },
        {
            label: 'Turni',
            icon: <TurniIcon />,
            to: '/hr/planner',
            badge: null
        },
        {
            label: 'Calendario',
            icon: <CalendarioIcon />,
            to: '/hr/calendar',
            badge: null
        }
    ];

    return (
        <div className="floating-dock flex items-center gap-1">
            {/* Dock Label - Lightning Icon */}
            <div className="px-3 py-2 border-r border-white/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                    </defs>
                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="url(#boltGradient)" />
                </svg>
            </div>

            {/* Action Items */}
            {actions.map((action, i) => (
                <Link
                    key={i}
                    to={action.to}
                    className="dock-item relative group flex flex-col items-center p-2 rounded-xl 
                               hover:bg-white/5 transition-all duration-200"
                >
                    <span className="dock-icon transform group-hover:scale-110 transition-transform duration-200">
                        {action.icon}
                    </span>
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

