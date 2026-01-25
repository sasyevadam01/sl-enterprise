/**
 * SL Enterprise - Events Manager Component
 * Logic extracted from EventsApprovalPage
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
        loadPending(); // Initial load

        // Refresh periodically or on focus could be added here
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Eventi in Sospeso</h3>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">
                    {pendingEvents.length} Richieste
                </span>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="bg-slate-900/50 rounded-2xl border border-white/10 p-16 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner">
                        🌱
                    </div>
                    <p className="text-slate-300 text-xl font-medium">Tutto tranquillo!</p>
                    <p className="text-slate-500 text-sm mt-2">Non ci sono eventi in attesa di approvazione al momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {pendingEvents.map((event, index) => {
                            const isPositive = event.points > 0;
                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    layout
                                    className="relative bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl hover:border-white/20 transition-all group"
                                >
                                    {/* Glass Highlight */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                                        <div className="flex items-start gap-4 md:gap-5">
                                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl shrink-0 shadow-lg ${isPositive
                                                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {isPositive ? '✨' : '⚠️'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                                    <h3 className="text-white font-bold text-lg md:text-xl tracking-tight leading-tight">
                                                        {event.employee?.first_name} {event.employee?.last_name}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold shadow-lg whitespace-nowrap ${isPositive
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-red-500 text-white'
                                                        }`}>
                                                        {event.points > 0 ? '+' : ''}{event.points} pts
                                                    </span>
                                                </div>
                                                <p className="text-blue-300 font-medium mt-1 text-xs md:text-sm bg-blue-500/10 px-2 py-0.5 rounded-md w-fit border border-blue-500/20">
                                                    {event.event_label}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    Richiesto da: <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">{event.creator?.full_name || 'Sistema'}</span>
                                                </p>
                                                {event.description && (
                                                    <p className="text-slate-400 text-xs md:text-sm mt-2 md:mt-3 bg-slate-800/50 p-2 md:p-3 rounded-xl border border-white/5 italic">
                                                        "{event.description}"
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 md:mt-3 text-xs text-slate-500 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        📅 {new Date(event.event_date).toLocaleDateString('it-IT')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        🕐 {new Date(event.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:gap-3 shrink-0 pt-2 md:pt-0 border-t border-white/5 md:border-t-0 mt-2 md:mt-0">
                                            <button
                                                disabled={processing === event.id}
                                                onClick={() => openRejectionModal(event)}
                                                className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-xl transition-all disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2"
                                            >
                                                <span>✕</span> <span className="md:hidden lg:inline">Rifiuta</span>
                                            </button>
                                            <button
                                                disabled={processing === event.id}
                                                onClick={() => handleReview(event.id, 'approved')}
                                                className="flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm transform active:scale-95"
                                            >
                                                {processing === event.id ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><span>✓</span> <span className="md:hidden lg:inline">Approva</span></>
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative gradient */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500" />

                            <h3 className="text-xl font-bold text-white mb-2">Rifiuta Evento</h3>
                            <p className="text-slate-400 mb-6 text-sm">Inserisci una motivazione per il rifiuto (opzionale):</p>

                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white mb-6 focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none placeholder-slate-600 shadow-inner"
                                placeholder="es. Informazioni non corrette o evento non rilevante..."
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRejectionModal(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => handleReview(eventToReject.id, 'rejected', rejectionReason)}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                                >
                                    Conferma Rifiuto
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
