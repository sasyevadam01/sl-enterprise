/**
 * SL Enterprise - HR Management Page
 * Area riservata per la gestione interna HR
 * PROTECTED BY SECURITY GATE PROTOCOL
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leavesApi, eventsApi, employeesApi } from '../../api/client';
import { format, isSameDay, parseISO, isAfter, isBefore, differenceInCalendarDays } from 'date-fns';
import { it } from 'date-fns/locale';

const SECURITY_PIN = "1991";

import SecurityConfirmModal from '../../components/common/SecurityConfirmModal';
import AbsenceReportPanel from '../../components/hr/AbsenceReportPanel';
import BonusManagementPanel from '../../components/hr/BonusManagementPanel';

export default function HRManagementPage() {
    // Security State
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // Data State
    const [activeTab, setActiveTab] = useState('absences'); // 'absences' | 'performance' | 'bonus' | 'report'
    const [showBonusAuth, setShowBonusAuth] = useState(false);
    const [bonusPin, setBonusPin] = useState("");
    const [bonusError, setBonusError] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null, // 'leave' | 'event'
        id: null,
        title: "",
        message: "",
        itemName: ""
    });

    // AUTO-LOCK TIMER (2 Minutes)
    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            if (isUnlocked) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    setIsUnlocked(false);
                    setPin("");
                }, 2 * 60 * 1000); // 2 Minutes
            }
        };

        const domEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        if (isUnlocked) {
            domEvents.forEach(event => window.addEventListener(event, resetTimer));
            resetTimer();
        }
        return () => {
            domEvents.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(timeout);
        };
    }, [isUnlocked]);

    // Data Fetching (Only when unlocked to save resources)
    useEffect(() => {
        if (isUnlocked) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [leavesData, eventsData, empsData] = await Promise.all([
                        leavesApi.getLeaves({}), // Fetch ALL leaves
                        eventsApi.getEvents(),
                        employeesApi.getEmployees()
                    ]);

                    // Sort leaves by requested_at descending (newest first)
                    const sortedLeaves = (leavesData || []).sort((a, b) =>
                        new Date(b.created_at || b.requested_at) - new Date(a.created_at || a.requested_at)
                    );

                    setLeaves(sortedLeaves);
                    setEvents(eventsData);
                    setEmployees(empsData);
                } catch (err) {
                    console.error("Failed to fetch secure data", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isUnlocked]);

    const LEAVE_LABELS = {
        vacation: '🏖️ Ferie',
        sick: '🏥 Malattia',
        permit: '📝 Permesso',
        maternity: '👶 Maternità',
        paternity: '👨‍👧 Paternità',
        wedding: '💒 Matrimonio',
        bereavement: '🕯️ Lutto',
        other: '📋 Altro'
    };

    const STATUS_LABELS = {
        pending: { label: 'In Attesa', color: 'text-yellow-400 bg-yellow-400/10' },
        approved: { label: 'Approvata', color: 'text-green-400 bg-green-400/10' },
        rejected: { label: 'Rifiutata', color: 'text-red-400 bg-red-400/10' },
        cancelled: { label: 'Annullata', color: 'text-gray-400 bg-gray-400/10' },
    };

    // ... (rest of the component until the table)

    {/* Main Table ESTESA */ }
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_blue]"></span>
                Registro Assenze (Tutte)
            </h3>
            <span className="text-xs font-mono text-gray-400">SYNCED: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm text-gray-300"> {/* Increased text size and contrast */}
                <thead className="bg-black/40 text-xs uppercase font-mono text-gray-400 sticky top-0 backdrop-blur-sm">
                    <tr>
                        <th className="px-6 py-3 whitespace-nowrap">Dipendente</th>
                        <th className="px-6 py-3 whitespace-nowrap">Stato</th> {/* New Status Column */}
                        <th className="px-6 py-3 whitespace-nowrap">Tipo</th>
                        <th className="px-6 py-3 whitespace-nowrap">Data Richiesta</th>
                        <th className="px-6 py-3 whitespace-nowrap text-center">Periodo Assenza</th>
                        <th className="px-6 py-3 whitespace-nowrap text-center">Durata</th>
                        <th className="px-6 py-3 whitespace-nowrap">Approvato Da</th>
                        <th className="px-6 py-3 text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm"> {/* text-sm for body */}
                    {leaves.map((l) => {
                        const emp = employees.find(e => e.id === l.employee_id);
                        const empName = emp ? `${emp.last_name} ${emp.first_name}` : 'Unknown';
                        const daysCount = differenceInCalendarDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
                        const statusInfo = STATUS_LABELS[l.status] || STATUS_LABELS.pending;
                        const leaveLabel = LEAVE_LABELS[l.leave_type] || l.leave_type;

                        return (
                            <tr key={l.id} className="hover:bg-white/5 transition group">
                                <td className="px-6 py-4 font-bold text-white">{empName}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border border-white/5 ${statusInfo.color}`}>
                                        {statusInfo.label}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-300">{leaveLabel}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {format(parseISO(l.requested_at || l.created_at || new Date().toISOString()), "dd/MM/yy HH:mm")}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5">
                                        <span className="text-white font-bold">{format(parseISO(l.start_date), "dd/MM")}</span>
                                        <span className="text-gray-600">➜</span>
                                        <span className="text-white font-bold">{format(parseISO(l.end_date), "dd/MM")}</span>
                                        <span className="text-[10px] text-gray-500 ml-1">({format(parseISO(l.end_date), "yyyy")})</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-white">
                                    {daysCount} gg
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {l.reviewer ? (
                                        <span className="flex items-center gap-1 text-emerald-500/80">
                                            <span className="text-[10px]">✔</span> {l.reviewer.full_name}
                                        </span>
                                    ) : (
                                        <span className="text-yellow-500/50 text-xs italic">In attesa</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-100"> {/* Always visible or hover? User said buttons alignment issues, imply they want them visible/usable */}
                                        <Link
                                            to={`/hr/employees/${l.employee_id}?tab=absences`}
                                            className="w-9 h-9 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 transition"
                                            title="Vai al Dossier"
                                        >
                                            ✏️
                                        </Link>
                                        <button
                                            onClick={() => requestDeleteLeave(l)}
                                            className="w-9 h-9 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 transition"
                                            title="Elimina Definitivamente"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
                            </div >
                        )
}

{/* --- PERFORMANCE SECTION --- */ }
{
    activeTab === 'performance' && (
        <div className="space-y-6">
            {/* Leaderboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TOP 5 */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">🏆</span>
                        <h3 className="text-emerald-400 font-black uppercase tracking-widest">Top 5 Heroes</h3>
                    </div>
                    <div className="space-y-3">
                        {performanceStats.top5.map((emp, i) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 bg-emerald-900/10 border border-emerald-500/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-emerald-200">#{i + 1}</div>
                                    <div>
                                        <div className="font-bold text-white">{emp.last_name} {emp.first_name}</div>
                                        <div className="text-[10px] text-gray-500">{emp.department_name}</div>
                                    </div>
                                </div>
                                <div className={`font-bold font-mono text-xl ${emp.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {emp.score > 0 ? '+' : ''}{emp.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTTOM 5 */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="text-red-400 font-black uppercase tracking-widest">Watchlist (Bottom 5)</h3>
                    </div>
                    <div className="space-y-3">
                        {performanceStats.bottom5.map((emp, i) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 bg-red-900/10 border border-red-500/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center font-bold text-red-200">!</div>
                                    <div>
                                        <div className="font-bold text-white">{emp.last_name} {emp.first_name}</div>
                                        <div className="text-[10px] text-gray-500">{emp.department_name}</div>
                                    </div>
                                </div>
                                <div className={`font-bold font-mono text-xl ${emp.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {emp.score > 0 ? '+' : ''}{emp.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Events Register ESTESA */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_blue]"></span>
                        Registro Eventi & Punteggi
                    </h3>
                    <span className="text-xs font-mono text-gray-400">DATABASE: CONNECTED</span>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-black/40 text-xs uppercase font-mono text-gray-500 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">Dipendente</th>
                                <th className="px-6 py-3 whitespace-nowrap">Tipo Evento</th>
                                <th className="px-6 py-3 whitespace-nowrap">Richiesto Da</th>
                                <th className="px-6 py-3 whitespace-nowrap">Data Richiesta</th>
                                <th className="px-6 py-3 whitespace-nowrap">Approvato Da</th>
                                <th className="px-6 py-3 text-right">Punti</th>
                                <th className="px-6 py-3 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-xs">
                            {events.map((ev) => {
                                const emp = employees.find(e => e.id === ev.employee_id);
                                const empName = emp ? `${emp.last_name} ${emp.first_name}` : 'Unknown';

                                return (
                                    <tr key={ev.id} className="hover:bg-white/5 transition group">
                                        <td className="px-6 py-4 font-bold text-white">{empName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{ev.event_label}</span>
                                                <span className="text-[10px] opacity-70 truncate max-w-[150px]">{ev.notes || ev.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{ev.creator?.full_name || '-'}</td>
                                        <td className="px-6 py-4 text-gray-500">{format(parseISO(ev.created_at || new Date().toISOString()), "dd/MM/yy")}</td>
                                        <td className="px-6 py-4 text-gray-400">
                                            <span className="flex items-center gap-1 text-blue-400/80">
                                                <span className="text-[10px]">✔</span>
                                                {ev.approver?.full_name || 'System'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold text-lg ${ev.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {ev.points > 0 ? '+' : ''}{ev.points}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    className="w-8 h-8 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30"
                                                    title="Modifica"
                                                    onClick={() => alert("Per modificare un evento approvato, eliminalo e ricrealo.")}
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    onClick={() => requestDeleteEvent(ev)}
                                                    className="w-8 h-8 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30"
                                                    title="Elimina Definitivamente"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

{/* --- BONUS SECRET SECTION --- */ }
{
    activeTab === 'bonus' && (
        <BonusManagementPanel />
    )
}

{/* --- REPORT SECTION --- */ }
{
    activeTab === 'report' && (
        <AbsenceReportPanel />
    )
}
                    </>
                )}
            </div >

    {/* BONUS PIN MODAL */ }
    < AnimatePresence >
    { showBonusAuth && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBonusAuth(false)}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-yellow-500/50 p-6 rounded-2xl w-full max-w-xs shadow-[0_0_50px_rgba(234,179,8,0.2)]"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-center text-yellow-500 font-bold uppercase tracking-wider mb-4">Codice Bonus</h3>
                <form onSubmit={handleBonusAuth}>
                    <input
                        autoFocus
                        type="password"
                        className={`w-full bg-black/50 border ${bonusError ? 'border-red-500 text-red-500 animate-shake' : 'border-yellow-500/30 text-yellow-100'} rounded-lg p-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-yellow-500 transition-all`}
                        placeholder="----"
                        value={bonusPin}
                        onChange={e => {
                            setBonusPin(e.target.value);
                            setBonusError(false);
                        }}
                        maxLength={4}
                    />
                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowBonusAuth(false)}
                            className="flex-1 py-2 rounded-lg bg-slate-800 text-gray-400 hover:bg-slate-700 text-xs font-bold uppercase"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-lg bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/40 text-xs font-bold uppercase"
                        >
                            Accedi
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )}
            </AnimatePresence >

    {/* SECURITY CONFIRM MODAL */ }
    < SecurityConfirmModal

isOpen = { confirmModal.isOpen }
onClose = {() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
onConfirm = { handleConfirmDelete }
title = { confirmModal.title }
message = { confirmModal.message }
itemName = { confirmModal.itemName }
    />
        </div >
    );
}

