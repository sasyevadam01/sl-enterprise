/**
 * SL Enterprise - Approval Center Page
 * Central hub for HR approvals (Leaves & Events)
 * ULTRA PREMIUM Enterprise Light Mode
 */
import { useState, useEffect } from 'react';
import LeavesManager from '../../components/hr/LeavesManager';
import EventsManager from '../../components/hr/EventsManager';
import { hrStatsApi } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApprovalCenterPage() {
    const [activeTab, setActiveTab] = useState('leaves');
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
        const interval = setInterval(fetchCounts, 5000);
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        {
            id: 'leaves',
            label: 'Ferie & Permessi',
            count: counts.leaves,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            activeColor: 'text-blue-600',
            badgeColor: 'bg-blue-600 text-white',
        },
        {
            id: 'events',
            label: 'Eventi HR',
            count: counts.events,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            activeColor: 'text-indigo-600',
            badgeColor: 'bg-indigo-600 text-white',
        }
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Ultra Premium Header */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
                {/* Decorative accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />

                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Centro Approvazioni
                            </h1>
                            <p className="text-slate-500 mt-1 text-sm md:text-base">
                                Gestisci e revisiona tutte le richieste operative e gli eventi HR in un unico posto centralizzato.
                            </p>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="flex gap-4 mt-6 pt-5 border-t border-slate-100">
                        <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-amber-600 font-medium">Ferie in attesa</p>
                                <p className="text-xl font-extrabold text-amber-700">{counts.leaves}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-2.5 border border-indigo-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-indigo-600 font-medium">Eventi in attesa</p>
                                <p className="text-xl font-extrabold text-indigo-700">{counts.events}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Tab Selector */}
            <div className="flex gap-1 p-1.5 bg-slate-100 rounded-xl border border-slate-200 w-fit shadow-sm">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${isActive
                                ? 'text-slate-900'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            {/* Active background pill */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                                />
                            )}

                            {/* Icon */}
                            <span className={`relative z-10 ${isActive ? tab.activeColor : ''}`}>
                                {tab.icon}
                            </span>

                            {/* Label */}
                            <span className="relative z-10 hidden sm:inline">{tab.label}</span>

                            {/* Badge */}
                            {tab.count > 0 && (
                                <span className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                    ? tab.badgeColor
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
