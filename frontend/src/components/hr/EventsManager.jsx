/**
 * SL Enterprise - Events Manager Component
 * ULTRA PREMIUM Enterprise Light Mode
 */
import { useState, useEffect } from 'react';
import { eventsApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventsManager() {
    const { showConfirm, toast } = useUI();
    const [pendingEvents, setPendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [eventToReject, setEventToReject] = useState(null);

    const loadPending = async () => {
        try {
            setLoading(true);
            const data = await eventsApi.getPending();
            setPendingEvents(data);
        } catch (error) {
            console.error('Error loading pending events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPending();
        const interval = setInterval(loadPending, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleReview = async (eventId, status, reason = null) => {
        if (status === 'approved') {
            const confirmed = await showConfirm({
                title: "Approva Evento",
                message: "Vuoi approvare questo evento? I punti verranno assegnati al dipendente.",
                type: "info",
                confirmText: "Approva"
            });
            if (!confirmed) return;
        }

        setProcessing(eventId);
        try {
            await eventsApi.reviewEvent(eventId, { status, rejection_reason: reason });
            setPendingEvents(prev => prev.filter(e => e.id !== eventId));
            toast.success(`Evento ${status === 'approved' ? 'approvato' : 'rifiutato'}`);
            if (showRejectionModal) {
                setShowRejectionModal(false);
                setRejectionReason('');
                setEventToReject(null);
            }
        } catch (error) {
            toast.error('Errore durante la revisione: ' + (error.response?.data?.detail || error.message));
        } finally {
            setProcessing(null);
        }
    };

    const openRejectionModal = (event) => {
        setEventToReject(event);
        setShowRejectionModal(true);
    };

    if (loading && pendingEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Eventi in Sospeso</h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold ring-1 ring-indigo-200">
                    {pendingEvents.length} Richieste
                </span>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center shadow-sm">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-slate-800 text-lg font-bold">Tutto tranquillo!</p>
                    <p className="text-slate-400 text-sm mt-2">Non ci sono eventi in attesa di approvazione al momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence>
                        {pendingEvents.map((event, index) => {
                            const isPositive = event.points > 0;
                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.06 }}
                                    layout
                                    className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                                >
                                    {/* Left accent bar */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />

                                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pl-5">
                                        <div className="flex items-start gap-4">
                                            {/* Points icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isPositive
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                : 'bg-red-50 text-red-500 border border-red-200'
                                                }`}>
                                                {isPositive ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-slate-900 font-bold text-base md:text-lg tracking-tight">
                                                        {event.employee?.first_name} {event.employee?.last_name}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap ${isPositive
                                                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                                        : 'bg-red-100 text-red-600 ring-1 ring-red-200'
                                                        }`}>
                                                        {event.points > 0 ? '+' : ''}{event.points} pts
                                                    </span>
                                                </div>
                                                <p className="text-blue-600 font-semibold mt-1 text-xs md:text-sm bg-blue-50 px-2 py-0.5 rounded-md w-fit border border-blue-100">
                                                    {event.event_label}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                                    Richiesto da: <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{event.creator?.full_name || 'Sistema'}</span>
                                                </p>
                                                {event.description && (
                                                    <p className="text-slate-500 text-xs md:text-sm mt-2 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 italic">
                                                        &quot;{event.description}&quot;
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {new Date(event.event_date).toLocaleDateString('it-IT')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {new Date(event.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t border-slate-100 md:border-t-0 mt-2 md:mt-0">
                                            <button
                                                disabled={processing === event.id}
                                                onClick={() => openRejectionModal(event)}
                                                className="flex-1 md:flex-none px-4 md:px-5 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl transition-all disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span className="md:hidden lg:inline">Rifiuta</span>
                                            </button>
                                            <button
                                                disabled={processing === event.id}
                                                onClick={() => handleReview(event.id, 'approved')}
                                                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm active:scale-[0.98] cursor-pointer"
                                            >
                                                {processing === event.id ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span className="md:hidden lg:inline">Approva</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Rejection Modal */}
            <AnimatePresence>
                {showRejectionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            {/* Red accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Rifiuta Evento</h3>
                                <p className="text-slate-500 mb-5 text-sm">Inserisci una motivazione per il rifiuto (opzionale):</p>

                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 mb-5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-28 resize-none placeholder-slate-400"
                                    placeholder="es. Informazioni non corrette o evento non rilevante..."
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRejectionModal(false)}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold cursor-pointer"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={() => handleReview(eventToReject.id, 'rejected', rejectionReason)}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                                    >
                                        Conferma Rifiuto
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
