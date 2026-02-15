/**
 * QuickActions — Dashboard Actions Bar
 * v5.0 Premium Enterprise — Desktop: inline bar, Mobile: floating dock
 */
import { Link } from 'react-router-dom';
import { Zap, CalendarOff, Star, CalendarRange, Calendar } from 'lucide-react';

export default function QuickActions({ pendingCounts }) {
    const actions = [
        { label: 'Assenza', icon: CalendarOff, to: '/hr/leaves', badge: pendingCounts.leaves > 0 ? pendingCounts.leaves : null },
        { label: 'Evento', icon: Star, to: '/hr/events/new', badge: pendingCounts.events > 0 ? pendingCounts.events : null },
        { label: 'Turni', icon: CalendarRange, to: '/hr/planner', badge: null },
        { label: 'Calendario', icon: Calendar, to: '/hr/calendar', badge: null },
    ];

    return (
        <>
            {/* Desktop: Inline action bar */}
            <div className="hidden md:flex bg-white rounded-2xl border border-slate-200 shadow-sm p-3 items-center gap-2">
                <div className="px-3 py-2 border-r border-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Azioni Rapide</span>
                </div>
                {actions.map((action, i) => (
                    <Link
                        key={i}
                        to={action.to}
                        className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600
                                   hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
                    >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                        {action.badge && (
                            <span className="bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {action.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Mobile: Floating dock (kept for tablet/mobile usability) */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 px-2 py-2 flex items-center gap-1">
                    <div className="px-2 py-1 border-r border-slate-100">
                        <Zap className="w-4 h-4 text-brand-orange" />
                    </div>
                    {actions.map((action, i) => (
                        <Link
                            key={i}
                            to={action.to}
                            className="relative flex flex-col items-center px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            <action.icon className="w-5 h-5 text-slate-600" />
                            <span className="text-[10px] text-slate-500 font-medium mt-1">{action.label}</span>
                            {action.badge && (
                                <span className="absolute -top-1 right-0.5 bg-brand-orange text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {action.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
