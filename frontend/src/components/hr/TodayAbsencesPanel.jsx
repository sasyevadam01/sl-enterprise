/**
 * TodayAbsencesPanel - Pannello collassabile per coordinatori
 * Mostra solo gli assenti di oggi (senza chi sta lavorando)
 */
import React, { useState, useEffect } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TodayAbsencesPanel() {
    const [isOpen, setIsOpen] = useState(true);
    const [absentees, setAbsentees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAbsences = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');

                const [leavesResponse, employees] = await Promise.all([
                    leavesApi.getLeaves({
                        status_filter: 'approved',
                        start_date: today,
                        end_date: today
                    }).catch(() => []),
                    employeesApi.getEmployees().catch(() => [])
                ]);

                const leaves = Array.isArray(leavesResponse) ? leavesResponse : [];

                // Filter leaves that cover today
                const todayLeaves = leaves.filter(l => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const t = new Date(today);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    t.setHours(12, 0, 0, 0);
                    return t >= start && t <= end;
                }).map(l => {
                    const emp = employees.find(e => e.id === l.employee_id);
                    return {
                        ...l,
                        employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Dipendente'
                    };
                });

                setAbsentees(todayLeaves);
            } catch (err) {
                console.error("TodayAbsencesPanel Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAbsences();
    }, []);

    const getLeaveIcon = (type) => {
        switch (type) {
            case 'vacation': return '🏖️';
            case 'sick': return '🏥';
            case 'permit': return '📝';
            case 'sudden_permit': return '⚡';
            default: return '📋';
        }
    };

    const getLeaveLabel = (type) => {
        switch (type) {
            case 'vacation': return 'Ferie';
            case 'sick': return 'Malattia';
            case 'permit': return 'Permesso';
            case 'sudden_permit': return 'Perm. Improv.';
            default: return type;
        }
    };

    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden shadow-lg mb-4">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">🚫</span>
                    <span className="text-white font-semibold">Assenti Oggi</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${absentees.length === 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                        {loading ? '...' : absentees.length}
                    </span>
                </div>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 pt-0 border-t border-white/5">
                            {loading ? (
                                <div className="py-4 text-center text-gray-500 animate-pulse">
                                    Caricamento...
                                </div>
                            ) : absentees.length === 0 ? (
                                <div className="py-4 text-center text-green-400 text-sm">
                                    ✅ Tutti presenti oggi!
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {absentees.map((leave, i) => (
                                        <Link
                                            key={i}
                                            to={`/hr/employees/${leave.employee_id}?tab=absences`}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getLeaveIcon(leave.leave_type)}</span>
                                                <span className="text-white font-medium group-hover:text-blue-300 transition">
                                                    {leave.employee_name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded">
                                                {getLeaveLabel(leave.leave_type)}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
