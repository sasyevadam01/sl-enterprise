/**
 * SL Enterprise - Approval Center Page
 * Central hub for HR approvals (Leaves & Events)
 */
import { useState, useEffect } from 'react';
import LeavesManager from '../../components/hr/LeavesManager';
import EventsManager from '../../components/hr/EventsManager';
import { hrStatsApi } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApprovalCenterPage() {
    const [activeTab, setActiveTab] = useState('leaves'); // 'leaves' | 'events'
    const [counts, setCounts] = useState({ leaves: 0, events: 0 });

    const fetchCounts = async () => {
        try {
            const data = await hrStatsApi.getPendingCounts();
            setCounts(data);
        } catch (error) {
            console.error("Error fetching approval counts:", error);
        }
    };

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 5000); // Poll for badges
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        { id: 'leaves', label: 'Ferie & Permessi', icon: '🏖️', count: counts.leaves, color: 'from-orange-400 to-pink-500' },
        { id: 'events', label: 'Eventi HR', icon: '⚖️', count: counts.events, color: 'from-blue-400 to-cyan-500' }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 md:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        Centro Approvazioni
                    </h1>
                    <p className="text-slate-400 mt-2 text-base md:text-lg max-w-2xl">
                        Gestisci e revisiona tutte le richieste operative e gli eventi HR in un unico posto centralizzato.
                    </p>
                </div>
            </div>

            {/* Premium Tab Selector */}
            <div className="flex gap-3 p-2 bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/10 w-fit shadow-xl">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-3 overflow-hidden ${isActive ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {/* Active background with gradient */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className={`absolute inset-0 bg-gradient-to-r ${tab.color} opacity-90 rounded-xl`}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                />
                            )}

                            {/* Icon container */}
                            <span className={`relative z-10 text-xl ${isActive ? 'drop-shadow-lg' : ''}`}>
                                {tab.icon}
                            </span>

                            {/* Label */}
                            <span className="relative z-10 hidden sm:inline">{tab.label}</span>

                            {/* Badge for pending count */}
                            {tab.count > 0 && (
                                <span className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                        ? 'bg-white/30 text-white'
                                        : 'bg-red-500 text-white animate-pulse'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'leaves' && <LeavesManager />}
                        {activeTab === 'events' && <EventsManager />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
