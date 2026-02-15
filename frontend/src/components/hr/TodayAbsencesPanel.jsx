/**
 * TodayAbsencesPanel - Pannello collassabile per coordinatori
 * Mostra solo gli assenti di oggi (senza chi sta lavorando)
 * Premium Enterprise Light Mode
 */
import React, { useState, useEffect } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Palmtree, Stethoscope, FileText, Zap, ChevronDown, CheckCircle2 } from 'lucide-react';

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
            case 'vacation': return <Palmtree className="w-4 h-4 text-sky-600" />;
            case 'sick': return <Stethoscope className="w-4 h-4 text-red-500" />;
            case 'permit': return <FileText className="w-4 h-4 text-amber-600" />;
            case 'sudden_permit': return <Zap className="w-4 h-4 text-orange-500" />;
            default: return <FileText className="w-4 h-4 text-slate-500" />;
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card mb-4">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-800 font-semibold">Assenti Oggi</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${absentees.length === 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                        {loading ? '...' : absentees.length}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                        <div className="p-3 pt-0 border-t border-slate-100">
                            {loading ? (
                                <div className="py-4 text-center text-slate-400 animate-pulse">
                                    Caricamento...
                                </div>
                            ) : absentees.length === 0 ? (
                                <div className="py-3 mx-1 mt-2 text-center bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-800 text-sm font-medium">Tutti presenti oggi!</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mt-2">
                                    {absentees.map((leave, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {getLeaveIcon(leave.leave_type)}
                                                <span className="text-slate-800 font-medium text-sm">
                                                    {leave.employee_name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-medium">
                                                {getLeaveLabel(leave.leave_type)}
                                            </span>
                                        </div>
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
