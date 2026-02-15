/**
 * TaskSection - Collapsible section for Inbox view
 * v3.0 - Premium Enterprise Light Mode
 */
import { useState } from 'react';

export default function TaskSection({
    title,
    count,
    children,
    defaultExpanded = true,
    emptyMessage = "Nessun task in questa sezione",
    color = "blue"
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const colorClasses = {
        blue: 'border-blue-200 bg-blue-50/30',
        green: 'border-emerald-200 bg-emerald-50/30',
        yellow: 'border-amber-200 bg-amber-50/30',
        purple: 'border-purple-200 bg-purple-50/30',
    };

    const headerColors = {
        blue: 'text-blue-700',
        green: 'text-emerald-700',
        yellow: 'text-amber-700',
        purple: 'text-purple-700',
    };

    const countColors = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-emerald-100 text-emerald-700',
        yellow: 'bg-amber-100 text-amber-700',
        purple: 'bg-purple-100 text-purple-700',
    };

    const sectionIcons = {
        blue: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
        purple: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        yellow: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        green: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    return (
        <div className={`rounded-xl border ${colorClasses[color] || colorClasses.blue} overflow-hidden transition-all`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <span className={headerColors[color] || headerColors.blue}>{sectionIcons[color] || sectionIcons.blue}</span>
                    <h3 className={`font-bold ${headerColors[color] || headerColors.blue}`}>
                        {title}
                    </h3>
                    <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold ${countColors[color] || countColors.blue}`}>
                        {count}
                    </span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {count > 0 ? (
                        children
                    ) : (
                        <div className="text-center py-8 text-slate-400 italic">
                            {emptyMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
