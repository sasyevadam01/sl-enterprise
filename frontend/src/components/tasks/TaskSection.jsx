/**
 * TaskSection - Collapsible section for Inbox view
 * Mostra una sezione di task con header, contatore e collapse
 */
import { useState } from 'react';

export default function TaskSection({
    title,
    icon,
    count,
    children,
    defaultExpanded = true,
    emptyMessage = "Nessun task in questa sezione",
    color = "blue"
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const colorClasses = {
        blue: 'border-blue-500/30 bg-blue-500/5',
        green: 'border-green-500/30 bg-green-500/5',
        yellow: 'border-yellow-500/30 bg-yellow-500/5',
        purple: 'border-purple-500/30 bg-purple-500/5',
    };

    const headerColors = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        purple: 'text-purple-400',
    };

    return (
        <div className={`rounded-xl border ${colorClasses[color] || colorClasses.blue} overflow-hidden transition-all`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <h3 className={`font-bold ${headerColors[color] || headerColors.blue}`}>
                        {title}
                    </h3>
                    <span className="bg-white/10 text-gray-300 text-sm px-2 py-0.5 rounded-full font-medium">
                        {count}
                    </span>
                </div>
                <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {count > 0 ? (
                        children
                    ) : (
                        <div className="text-center py-8 text-gray-500 italic">
                            {emptyMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
