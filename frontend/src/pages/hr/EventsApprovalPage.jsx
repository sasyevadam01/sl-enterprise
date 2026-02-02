/**
 * SL Enterprise - Events Approval Page
 * Gestione lato HR per approvare o rifiutare eventi creati dai coordinatori
 */
import { useState, useEffect } from 'react';
import { eventsApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';

export default function EventsApprovalPage() {
    const { showConfirm, toast } = useUI();
    const [pendingEvents, setPendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null); // ID dell'evento in lavorazione
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">⚖️ Approvazione Eventi</h1>
                    <p className="text-gray-400 mt-1">Revisiona gli eventi inseriti dai coordinatori prima che influenzino il punteggio</p>
                </div>
                <div className="master-card px-4 py-2">
                    <span className="text-zinc-500">In attesa: </span>
                    <span className="neon-orange font-bold">{pendingEvents.length}</span>
                </div>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="master-card p-12 text-center">
                    <p className="text-zinc-500 text-lg">Tutti gli eventi sono stati elaborati!</p>
                    <p className="text-zinc-600 text-sm mt-2">Non ci sono eventi in attesa di approvazione.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pendingEvents.map(event => {
                        const isPositive = event.points > 0;
                        return (
                            <div key={event.id} className="master-card overflow-hidden hover:border-emerald-500/20 transition-all">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {isPositive ? '✨' : '⚠️'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-white font-semibold text-lg">{event.employee?.first_name} {event.employee?.last_name}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                    }`}>
                                                    {event.points > 0 ? '+' : ''}{event.points} pts
                                                </span>
                                            </div>
                                            <p className="text-white font-medium mt-1">{event.event_label}</p>
                                            {event.description && (
                                                <p className="text-gray-400 text-sm mt-2 italic">"{event.description}"</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                <span>📅 {new Date(event.event_date).toLocaleDateString('it-IT')}</span>
                                                <span>🕐 {new Date(event.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>👤 Creato da: {event.creator?.full_name || event.creator?.username || 'Sistema'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            disabled={processing === event.id}
                                            onClick={() => openRejectionModal(event)}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all disabled:opacity-50"
                                        >
                                            Rifiuta
                                        </button>
                                        <button
                                            disabled={processing === event.id}
                                            onClick={() => handleReview(event.id, 'approved')}
                                            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {processing === event.id ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : '✓ Approva'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rejection Modal (opzionale, semplificato per ora) */}
            {showRejectionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="master-card p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Rifiuta Evento</h3>
                        <p className="text-gray-400 mb-4 text-sm">Inserisci una motivazione per il rifiuto (opzionale):</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white mb-6 focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none"
                            placeholder="es. Informazioni non corrette o evento non rilevante..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => handleReview(eventToReject.id, 'rejected', rejectionReason)}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
                            >
                                Conferma Rifiuto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
