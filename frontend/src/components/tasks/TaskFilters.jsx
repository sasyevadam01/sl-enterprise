import React from 'react';

export default function TaskFilters({ currentFilter, onFilterChange, quickFilters, onQuickFilterToggle, onSearch, searchQuery }) {

    const filters = [
        { id: 'all', label: 'Tutti', icon: '📋' },
        { id: 'active', label: 'Attivi', icon: '⚡' },
        { id: 'completed', label: 'Completati', icon: '✅' }
    ];

    const quickToggles = [
        { id: 'urgent', label: 'Urgenti', icon: '🔥', activeColor: 'bg-red-500/20 text-red-400 border-red-500/50' },
        { id: 'mine', label: 'Miei', icon: '👤', activeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
        { id: 'today', label: 'Oggi', icon: '📅', activeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
        { id: 'delegated', label: 'Delegati', icon: '​​​​​📤', activeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/50' }
    ];

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Search Bar & Main Filter Toggle */}
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Cerca task..."
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                    />
                </div>
            </div>

            {/* Horizontal Scrollable Pills */}
            <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-2 min-w-max">
                    {/* Status Tabs (Segmented Control style) */}
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5 mr-2">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => onFilterChange(f.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentFilter === f.id
                                        ? 'bg-slate-700 text-white shadow'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px bg-white/10 mx-1"></div>

                    {/* Quick Toggles */}
                    {quickToggles.map(q => (
                        <button
                            key={q.id}
                            onClick={() => onQuickFilterToggle(q.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap ${quickFilters[q.id]
                                    ? q.activeColor
                                    : 'bg-slate-800/50 border-white/5 text-gray-400 hover:bg-slate-800'
                                }`}
                        >
                            <span>{q.icon}</span>
                            {q.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
