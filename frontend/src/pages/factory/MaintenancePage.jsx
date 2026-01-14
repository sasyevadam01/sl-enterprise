import { useState, useEffect, useRef } from 'react';
import { maintenanceApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import { format, differenceInMinutes, parseISO } from 'date-fns';

// --- SIREN AUDIO COMPONENT ---
const SirenManager = ({ active }) => {
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);

    useEffect(() => {
        if (active) {
            startSiren();
        } else {
            stopSiren();
        }
        return () => stopSiren();
    }, [active]);

    const startSiren = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Oscillator
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
        // Siren effect (LFO is complex, let's just do a simple beep loop or continuous tone)
        // Let's sweep frequency
        osc.frequency.linearRampToValueAtTime(880, audioCtxRef.current.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(440, audioCtxRef.current.currentTime + 1.0);

        // Loop the sweep? 
        // Simplest is just a high pitched beep

        gain.connect(audioCtxRef.current.destination);
        osc.connect(gain);
        osc.start();

        // Make it loop manually or use LFO. 
        // Let's use an Interval to modulate frequency for "Siren" effect
        oscillatorRef.current = osc;
        gainNodeRef.current = gain;

        window.sirenInterval = setInterval(() => {
            if (osc && audioCtxRef.current) {
                const now = audioCtxRef.current.currentTime;
                osc.frequency.cancelScheduledValues(now);
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.linearRampToValueAtTime(880, now + 0.5);
                osc.frequency.linearRampToValueAtTime(440, now + 1.0);
            }
        }, 1000);
    };

    const stopSiren = () => {
        if (window.sirenInterval) clearInterval(window.sirenInterval);
        if (oscillatorRef.current) {
            try {
                oscillatorRef.current.stop();
                oscillatorRef.current.disconnect();
            } catch (e) { }
            oscillatorRef.current = null;
        }
    };

    return null; // Invisible component
};

export default function MaintenancePage() {
    const { toast } = useUI();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSirenActive, setIsSirenActive] = useState(false);

    // Resolve Modal
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [resolveNotes, setResolveNotes] = useState('');
    const [showResolveModal, setShowResolveModal] = useState(false);

    useEffect(() => {
        loadQueue();
        const interval = setInterval(loadQueue, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const loadQueue = async () => {
        try {
            const data = await maintenanceApi.getQueue(true); // Active only
            setRequests(data);

            // Check for High Priority Open tickets
            const hasEmergency = data.some(r => r.priority === 'high' && r.status === 'open');
            setIsSirenActive(hasEmergency);

        } catch (error) {
            console.error("Polling error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (id) => {
        try {
            await maintenanceApi.acknowledge(id);
            toast.success("Presa in carico! Sirena disattivata.");
            loadQueue(); // Refresh immediately
        } catch (error) {
            toast.error("Errore presa in carico");
        }
    };

    const openResolveModal = (req) => {
        setSelectedRequest(req);
        setResolveNotes('');
        setShowResolveModal(true);
    };

    const handleResolve = async () => {
        if (!selectedRequest) return;
        try {
            await maintenanceApi.resolve(selectedRequest.id, resolveNotes);
            toast.success("Ticket Risolto ✅");
            setShowResolveModal(false);
            loadQueue();
        } catch (error) {
            toast.error("Errore risoluzione");
        }
    };

    if (loading) return <div className="p-10 text-white">Caricamento...</div>;

    return (
        <div className={`min-h-screen p-6 transition-colors duration-500 ${isSirenActive ? 'bg-red-900' : 'bg-slate-900'}`}>
            <SirenManager active={isSirenActive} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        {isSirenActive ? '🆘 ALLARME ATTIVO' : '🔧 Pronto Intervento'}
                    </h1>
                    <p className="text-gray-300 mt-1">Gestione segnalazioni e guasti in tempo reale</p>
                </div>
                {isSirenActive && (
                    <div className="animate-pulse bg-red-600 px-6 py-3 rounded-xl font-bold text-white shadow-lg">
                        ⚠️ EMERGENZA ORA
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <div className="p-12 bg-slate-800 rounded-2xl text-center text-gray-400">
                        <span className="text-5xl block mb-4">✅</span>
                        <p className="text-xl">Nessuna richiesta attiva.</p>
                        <p>Il reparto produzione è operativo.</p>
                    </div>
                ) : (
                    requests.map(req => (
                        <div
                            key={req.id}
                            className={`relative p-6 rounded-2xl border-l-8 shadow-xl ${req.priority === 'high'
                                    ? 'bg-red-950/80 border-red-500 animate-pulse-slow'
                                    : 'bg-slate-800 border-yellow-500'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                {/* Left: Info */}
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${req.priority === 'high' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-black'
                                            }`}>
                                            {req.priority === 'high' ? '🚨 BLOCCANTE' : '⚠️ SEGNALAZIONE'}
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            {format(parseISO(req.created_at), 'HH:mm')}
                                            {' '}({differenceInMinutes(new Date(), parseISO(req.created_at))} min fa)
                                        </span>
                                    </div>

                                    <h2 className="text-2xl font-bold text-white mb-1">
                                        {req.machine_name} <span className="text-lg font-normal text-gray-400">({req.banchina})</span>
                                    </h2>

                                    <div className="text-lg text-gray-200 mb-2">
                                        <span className="font-bold text-blue-400 capitalize">{req.problem_type}:</span> {req.description}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span>👤 Segnalato da: <span className="text-white">{req.reporter_name}</span></span>
                                        {req.taken_by_name && (
                                            <span className="ml-4">🛠️ Preso in carico da: <span className="text-green-400 font-bold">{req.taken_by_name}</span></span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                                    {req.status === 'open' && (
                                        <button
                                            onClick={() => handleAcknowledge(req.id)}
                                            className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xl"
                                        >
                                            ✋ PRENDI IN CARICO
                                        </button>
                                    )}

                                    {req.status === 'in_progress' && (
                                        <button
                                            onClick={() => openResolveModal(req)}
                                            className="py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xl"
                                        >
                                            ✅ RISOLVI
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Chiudi Intervento</h2>
                        <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            placeholder="Descrivi l'intervento effettuato..."
                            className="w-full p-4 rounded-lg bg-slate-700 text-white border border-slate-600 h-32 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleResolve}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
