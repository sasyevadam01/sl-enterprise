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
                        leavesApi.getLeaves({}), // Fetch ALL leaves (removed status_filter)
                        eventsApi.getEvents(),
                        employeesApi.getEmployees()
                    ]);

                    // Sort leaves by requested_at descending (newest first)
                    // Fallback to created_at if requested_at is missing
                    const sortedLeaves = (leavesData || []).sort((a, b) => {
                        const dateA = new Date(a.requested_at || a.created_at || 0);
                        const dateB = new Date(b.requested_at || b.created_at || 0);
                        return dateB - dateA;
                    });

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
        sudden_permit: '⚡ Permesso Improvviso'
    };

    const STATUS_LABELS = {
        pending: { label: 'In Attesa', color: 'text-yellow-400 bg-yellow-400/10' },
        approved: { label: 'Approvata', color: 'text-green-400 bg-green-400/10' },
        rejected: { label: 'Rifiutata', color: 'text-red-400 bg-red-400/10' },
        cancelled: { label: 'Annullata', color: 'text-gray-400 bg-gray-400/10' },
    };

    // --- COMPUTED STATS ---

    // 1. ABSENCE STATS
    const absenceStats = useMemo(() => {
        const today = new Date(); // Use system time

        // Enrichment helper
        const enrich = (l) => {
            const emp = employees.find(e => e.id === l.employee_id);
            return {
                ...l,
                employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Sconosciuto'
            };
        };

        const absentsToday = leaves.filter(l => {
            if (l.status !== 'approved') return false; // Only count approved leaves for "Absents Today"
            const start = parseISO(l.start_date);
            const end = parseISO(l.end_date);
            return (isSameDay(today, start) || isAfter(today, start)) && (isSameDay(today, end) || isBefore(today, end));
        }).map(enrich);

        const returningTomorrow = leaves.filter(l => l.status === 'approved' && isSameDay(parseISO(l.end_date), today)).map(enrich);

        const sickLeaves = leaves.filter(l => l.status === 'approved' && l.leave_type === 'sick').length;
        const totalApprovedLeaves = leaves.filter(l => l.status === 'approved').length || 1;
        const sickRate = Math.round((sickLeaves / totalApprovedLeaves) * 100);

        return { absentsToday, returningTomorrow, sickRate };
    }, [leaves, employees]);

    // 2. PERFORMANCE STATS (Top/Bottom 5)
    const performanceStats = useMemo(() => {
        const empScores = {};
        employees.forEach(e => empScores[e.id] = { ...e, score: 0, eventCount: 0 });

        events.forEach(ev => {
            if (empScores[ev.employee_id]) {
                empScores[ev.employee_id].eventCount += 1;
                // Sum actual points from backend
                empScores[ev.employee_id].score += (ev.points || 0);
            }
        });

        const activeEmployees = Object.values(empScores).filter(e => e.eventCount > 0);

        // Strict Separation:
        // Top 5 = Only Positive Scores (> 0) sorted Descending
        // Bottom 5 = Only Negative Scores (< 0) sorted Ascending (Lowest first)
        const positive = activeEmployees.filter(e => e.score > 0).sort((a, b) => b.score - a.score);
        const negative = activeEmployees.filter(e => e.score < 0).sort((a, b) => a.score - b.score);

        return {
            top5: positive.slice(0, 5),
            bottom5: negative.slice(0, 5)
        };
    }, [events, employees]);


    // PIN PAD Logic
    const handleDigit = (digit) => {
        if (pin.length < 4) {
            const newPin = pin + digit;
            setPin(newPin);
            setError(false);
            if (newPin.length === 4) {
                if (newPin === SECURITY_PIN) {
                    setTimeout(() => setIsUnlocked(true), 300);
                } else {
                    setError(true);
                    setTimeout(() => setPin(""), 600);
                }
            }
        }
    };

    // BONUS AUTH Logic
    const handleBonusAuth = (e) => {
        e.preventDefault();
        if (bonusPin === "1234") {
            setShowBonusAuth(false);
            setBonusPin("");
            setActiveTab('bonus');
        } else {
            setBonusError(true);
            setTimeout(() => setBonusError(false), 1000);
        }
    };


    // --- ACTIONS ---
    const requestDeleteLeave = (leave) => {
        setConfirmModal({
            isOpen: true,
            type: 'leave',
            id: leave.id,
            title: "RIMOZIONE ASSENZA",
            message: "ATTENZIONE: Stai per rimuovere un'assenza registrata. Questa azione aggiornerà i conteggi globali.",
            itemName: `${leave.employee_name} - ${leave.leave_type}`
        });
    };

    const requestDeleteEvent = (event) => {
        setConfirmModal({
            isOpen: true,
            type: 'event',
            id: event.id,
            title: "RIMOZIONE EVENTO",
            message: "ATTENZIONE: Stai per cancellare un evento di performance. Il punteggio verrà ricalcolato immediatamente.",
            itemName: `${event.employee_name} - ${event.event_label}`
        });
    };

    const handleConfirmDelete = async () => {
        const { type, id } = confirmModal;
        try {
            if (type === 'leave') {
                await leavesApi.cancelLeave(id);
                setLeaves(prev => prev.filter(l => l.id !== id));
            } else if (type === 'event') {
                await eventsApi.deleteEvent(id);
                setEvents(prev => prev.filter(e => e.id !== id));
            }
        } catch (err) {
            alert("Errore durante l'eliminazione: " + err.message);
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    // Event Edit Modal State
    const [editEventModal, setEditEventModal] = useState({
        isOpen: false,
        event: null,
        description: '',
        points: 0,
        eventDate: ''
    });

    const handleEditEvent = (ev) => {
        setEditEventModal({
            isOpen: true,
            event: ev,
            description: ev.description || '',
            points: ev.points || 0,
            eventDate: ev.event_date ? ev.event_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd')
        });
    };

    const handleSaveEvent = async () => {
        try {
            const updated = await eventsApi.updateEvent(editEventModal.event.id, {
                description: editEventModal.description,
                points: parseInt(editEventModal.points),
                event_date: editEventModal.eventDate
            });

            setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
            setEditEventModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            alert("Errore durante il salvataggio: " + err.message);
        }
    };

    // --- LOCK SCREEN RENDER ---
    if (!isUnlocked) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                {/* Bank Vault Background Effect for Lock Screen */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-950"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"></div>

                <div className="relative max-w-md w-full bg-slate-900/80 backdrop-blur-xl border-2 border-red-900/50 rounded-3xl p-8 shadow-[0_0_100px_rgba(220,38,38,0.2)]">
                    <div className="text-center mb-8">
                        <motion.div animate={error ? { x: [-10, 10, -10, 10, 0], color: "#EF4444" } : { color: "#9CA3AF" }} className="text-6xl mb-4">
                            {error ? "🚫" : "🔒"}
                        </motion.div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                            {error ? "ACCESSO NEGATO" : "AREA RISERVATA"}
                        </h2>
                        <p className={`text-xs font-mono mt-2 tracking-wider ${error ? 'text-red-500 font-bold animate-pulse' : 'text-gray-500'}`}>
                            {error ? "CODICE DI SICUREZZA ERRATO" : "INSERIRE CODICE IDENTIFICATIVO"}
                        </p>
                    </div>

                    <div className="flex justify-center gap-4 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin[i] ? (error ? 'bg-red-600 border-red-600' : 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]') : 'border-gray-700 bg-gray-800'}`} />
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button key={num} onClick={() => handleDigit(num.toString())} className="h-16 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-white/5 text-2xl text-white font-mono font-bold transition active:scale-95 active:bg-gray-600">{num}</button>
                        ))}
                        <div className="col-span-1"></div>
                        <button onClick={() => handleDigit("0")} className="h-16 rounded-xl bg-gray-800/50 hover:bg-gray-700 border border-white/5 text-2xl text-white font-mono font-bold transition active:scale-95 active:bg-gray-600">0</button>
                        <button onClick={() => { setPin(""); setError(false); }} className="h-16 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-xl text-red-400 font-bold transition active:scale-95 flex items-center justify-center">CANC</button>
                    </div>
                </div>
            </div>
        );
    }



    // --- MAIN DASHBOARD RENDER ---
    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950">
            {/* --- BANK STYLE BACKGROUND --- */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-black pointer-events-none"></div>
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none"></div>

            <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
                {/* Header Secured */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-emerald-900/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            🛡️
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 uppercase tracking-wide">
                                Security Dashboard
                            </h1>
                            <p className="text-emerald-400/60 text-xs font-mono uppercase tracking-widest">
                                Livello Accesso: Admin • Monitoraggio Attivo
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-slate-900/80 backdrop-blur border border-white/10 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('absences')}
                            className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition ${activeTab === 'absences' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Registro Assenze
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition ${activeTab === 'performance' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Registro Punti
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition ${activeTab === 'report' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            📊 Report
                        </button>
                    </div>

                    <button
                        className={`ml-2 px-4 py-2 rounded-md text-sm font-bold uppercase transition border border-yellow-500/50 ${activeTab === 'bonus' ? 'bg-yellow-600/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-900/20'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            if (activeTab !== 'bonus') setShowBonusAuth(true);
                        }}
                    >
                        ⭐ BONUS/MESE
                    </button>

                    <div className="flex-grow"></div>

                    <button
                        onClick={() => { setIsUnlocked(false); setPin(""); }}
                        className="px-4 py-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-900/40 transition text-xs font-bold uppercase tracking-widest"
                    >
                        Lock Terminal 🔒
                    </button>
                </div>


                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-emerald-500 rounded-full border-t-transparent"></div></div>
                ) : (
                    <>
                        {/* --- ABSENCES SECTION --- */}
                        {activeTab === 'absences' && (
                            <div className="space-y-6">
                                {/* Cards Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-900/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition duration-300">
                                        <div className="absolute right-0 top-0 p-4 opacity-10 text-9xl text-red-500 group-hover:scale-110 transition">🚫</div>
                                        <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Assenti Oggi</h3>
                                        <div className="text-4xl font-black text-white mb-2">{absenceStats.absentsToday.length}</div>
                                        <div className="space-y-1 relative z-10">
                                            {absenceStats.absentsToday.slice(0, 3).map(l => (
                                                <div key={l.id} className="text-xs text-red-300 flex justify-between">
                                                    <span>{l.employee_name}</span>
                                                    <span className="font-mono">{l.leave_type}</span>
                                                </div>
                                            ))}
                                            {absenceStats.absentsToday.length > 3 && <div className="text-xs text-gray-500">...altri {absenceStats.absentsToday.length - 3}</div>}
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/60 backdrop-blur-md border border-orange-500/30 rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition duration-300">
                                        <div className="absolute right-0 top-0 p-4 opacity-10 text-9xl text-orange-500 group-hover:scale-110 transition">📉</div>
                                        <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Tasso Malattia</h3>
                                        <div className="text-4xl font-black text-white mb-2">{absenceStats.sickRate}%</div>
                                        <p className="text-xs text-orange-300">Incidenza malattie sul totale assenze registrate questo mese.</p>
                                    </div>

                                    <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition duration-300">
                                        <div className="absolute right-0 top-0 p-4 opacity-10 text-9xl text-emerald-500 group-hover:scale-110 transition">📅</div>
                                        <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Rientri Domani</h3>
                                        <div className="text-4xl font-black text-white mb-2">{absenceStats.returningTomorrow.length}</div>
                                        <div className="space-y-1 relative z-10">
                                            {absenceStats.returningTomorrow.slice(0, 3).map(l => (
                                                <div key={l.id} className="text-xs text-emerald-300">
                                                    ➜ {l.employee_name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Main Table ESTESA */}
                                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_blue]"></span>
                                            Registro Assenze (Tutte)
                                        </h3>
                                        <span className="text-xs font-mono text-gray-400">SYNCED: {new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[600px]">
                                        <table className="w-full text-left text-sm text-gray-300">
                                            <thead className="bg-black/40 text-xs uppercase font-mono text-gray-400 sticky top-0 backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-6 py-3 whitespace-nowrap">Dipendente</th>
                                                    <th className="px-6 py-3 whitespace-nowrap">Stato</th>
                                                    <th className="px-6 py-3 whitespace-nowrap">Tipo</th>
                                                    <th className="px-6 py-3 whitespace-nowrap">Data Richiesta</th>
                                                    <th className="px-6 py-3 whitespace-nowrap text-center">Periodo Assenza</th>
                                                    <th className="px-6 py-3 whitespace-nowrap text-center">Durata</th>
                                                    <th className="px-6 py-3 whitespace-nowrap">Approvato Da</th>
                                                    <th className="px-6 py-3 text-right">Azioni</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-sm">{leaves.map((l) => {
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
                                                            <div className="flex justify-end gap-2 opacity-100">
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
                            </div>
                        )}

                        {/* --- PERFORMANCE SECTION --- */}
                        {activeTab === 'performance' && (
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
                                            <tbody className="divide-y divide-white/5 font-mono text-xs">{events.map((ev) => {
                                                const emp = employees.find(e => e.id === ev.employee_id);
                                                const empName = emp ? `${emp.last_name} ${emp.first_name}` : 'Unknown';

                                                return (
                                                    <tr key={ev.id} className="hover:bg-white/5 transition group">
                                                        <td className="px-6 py-4 font-bold text-white">{empName}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold">{ev.event_label}</span>
                                                                <span className="text-xs text-gray-300 mt-1 italic border-l-2 border-emerald-500/30 pl-2 whitespace-pre-wrap">{ev.description || ev.notes || "Nessuna nota aggiuntiva"}</span>
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
                                                            <div className="flex justify-end gap-2 opacity-100 transition">
                                                                <button
                                                                    className="w-8 h-8 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30"
                                                                    title="Modifica"
                                                                    onClick={() => handleEditEvent(ev)}
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
                        )}

                        {/* --- BONUS SECRET SECTION --- */}
                        {activeTab === 'bonus' && (
                            <BonusManagementPanel />
                        )}

                        {/* --- REPORT SECTION --- */}
                        {activeTab === 'report' && (
                            <AbsenceReportPanel />
                        )}
                    </>
                )}
            </div>

            {/* BONUS PIN MODAL */}
            <AnimatePresence>
                {showBonusAuth && (
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
            </AnimatePresence>

            {/* SECURITY CONFIRM MODAL */}
            {/* EDIT EVENT MODAL */}
            <AnimatePresence>
                {editEventModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-blue-500/30 rounded-3xl p-8 w-full max-w-lg shadow-[0_0_50px_rgba(59,130,246,0.2)]"
                        >
                            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <span className="text-2xl">📝</span> Modifica Evento
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrizione / Note</label>
                                    <textarea
                                        value={editEventModal.description}
                                        onChange={e => setEditEventModal({ ...editEventModal, description: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition h-32 resize-none"
                                        placeholder="Inserisci i dettagli dell'evento..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Punteggio</label>
                                        <input
                                            type="number"
                                            value={editEventModal.points}
                                            onChange={e => setEditEventModal({ ...editEventModal, points: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Evento</label>
                                        <input
                                            type="date"
                                            value={editEventModal.eventDate}
                                            onChange={e => setEditEventModal({ ...editEventModal, eventDate: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setEditEventModal({ ...editEventModal, isOpen: false })}
                                    className="flex-1 py-3 bg-slate-800 text-gray-400 font-bold uppercase rounded-xl hover:bg-slate-700 transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold uppercase rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition"
                                >
                                    Salva Modifiche
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SecurityConfirmModal

                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmDelete}
                title={confirmModal.title}
                message={confirmModal.message}
                itemName={confirmModal.itemName}
            />
        </div>
    );
}
