/**
 * LogisticsPoolPage.jsx
 * Pagina per magazzinieri - Piscina delle richieste
 * Lista live con presa in carico, ETA, e messaggi
 */
import { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { logisticsApi } from '../../api/client';
import LogisticsModal from './components/LogisticsModal';
import { useUI } from '../../components/ui/CustomUI';
import './LogisticsStyles.css';

export default function LogisticsPoolPage() {
    const { user } = useContext(AuthContext);
    const { toast } = useUI();
    const [poolRequests, setPoolRequests] = useState([]);
    const [myQueue, setMyQueue] = useState([]);
    const [etaOptions, setEtaOptions] = useState([]);
    const [presetMessages, setPresetMessages] = useState([]);
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEtaModal, setShowEtaModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState('pool'); // pool, queue, stats

    // Modals state
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [requestToRelease, setRequestToRelease] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [requestToComplete, setRequestToComplete] = useState(null);
    const [confirmationCode, setConfirmationCode] = useState('');

    // Multi-Take State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());

    useEffect(() => {
        loadData();

        // WS Connection
        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_request' || data.type === 'request_updated' || data.type === 'request_completed') {
                    // Refresh data on any relevant update
                    loadRequests();
                    if (data.type === 'new_request') {
                        // Optional: play a subtle notification sound (if permission allows) or show a special toast
                        console.log("🚀 Nuova richiesta in piscina!");
                    }
                }
            } catch (err) {
                console.error("WS error:", err);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    const loadData = async () => {
        try {
            const [eta, msgs, perf] = await Promise.all([
                logisticsApi.getEtaOptions().catch(err => {
                    console.error("⚠️ Error fetching ETA options:", err);
                    return [];
                }),
                logisticsApi.getPresetMessages().catch(err => {
                    console.error("⚠️ Error fetching preset messages:", err);
                    return [];
                }),
                logisticsApi.getMyPerformance().catch(err => {
                    console.error("⚠️ Error fetching performance:", err);
                    return null;
                })
            ]);

            // Fallback for ETA if empty
            const finalEta = (eta && eta.length > 0) ? eta : [
                { id: 'f1', minutes: 5, label: '5 min' },
                { id: 'f2', minutes: 10, label: '10 min' },
                { id: 'f3', minutes: 15, label: '15 min' },
                { id: 'f4', minutes: 30, label: '30+ min' }
            ];

            setEtaOptions(finalEta);
            setPresetMessages(msgs || []);
            setPerformance(perf);
            await loadRequests();
        } catch (err) {
            console.error('❌ Critical error in loadData:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRequests = async () => {
        try {
            // Pool (pendenti)
            const poolData = await logisticsApi.getRequests({ status: 'pending' });
            setPoolRequests(poolData.items || []);

            // La mia coda (assegnate a me)
            const queueData = await logisticsApi.getRequests({ my_assigned: true, status: 'processing' });
            setMyQueue(queueData.items || []);
        } catch (err) {
            console.error('Errore caricamento richieste:', err);
        }
    };

    // --- Batch Take Handlers ---
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedRequestIds(new Set());
    };

    const toggleRequestSelection = (id) => {
        const newSet = new Set(selectedRequestIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRequestIds(newSet);
    };

    const handleBatchTake = async (etaMinutes) => {
        if (selectedRequestIds.size === 0) return;
        try {
            await logisticsApi.takeRequestBatch(Array.from(selectedRequestIds), etaMinutes);
            setShowEtaModal(false);
            setIsSelectionMode(false);
            setSelectedRequestIds(new Set());
            await loadRequests();
        } catch (err) {
            console.error('Errore batch take:', err);
        }
    };



    const handleTakeClick = (request) => {
        setSelectedRequest(request);
        setShowEtaModal(true);
    };

    const handleTake = async (etaMinutes) => {
        if (!selectedRequest) return;

        try {
            await logisticsApi.takeRequest(selectedRequest.id, etaMinutes);
            setShowEtaModal(false);
            setSelectedRequest(null);
            await loadRequests();
        } catch (err) {
            console.error('Errore presa in carico:', err);
            setShowEtaModal(false); // Close on error too
        }
    };

    // --- Complete Request Handlers ---
    const handleCompleteClick = (request) => {
        setRequestToComplete(request);
        setShowCompleteModal(true);
    };

    const confirmComplete = async () => {
        if (!requestToComplete) return;

        try {
            // Se c'è un codice conferma inserito, passalo (logica da implementare in client se necessario, o via params)
            // Per ora il backend accetta confirmation_code nelle custom props o params se lo aggiorniamo
            await logisticsApi.completeRequest(requestToComplete.id, confirmationCode);

            toast.success(`✅ Materiale consegnato con successo!`);

            setShowCompleteModal(false);
            setRequestToComplete(null);
            setConfirmationCode(''); // Reset
            await loadRequests();

            // Ricarica performance
            const perf = await logisticsApi.getMyPerformance().catch(() => null);
            setPerformance(perf);
        } catch (err) {
            console.error('Errore completamento:', err);
            const errorMsg = err.response?.data?.detail || "Errore durante il completamento.";
            toast.error(errorMsg);
        }
    };

    // --- Release Request Handlers ---
    const handleReleaseClick = (request) => {
        setRequestToRelease(request);
        setShowReleaseModal(true);
    };

    const confirmRelease = async () => {
        if (!requestToRelease) return;

        try {
            const result = await logisticsApi.releaseRequest(requestToRelease.id);
            toast.warning(`Richiesta rilasciata. Penalità: -${result.penalty_applied} punti`);

            setShowReleaseModal(false);
            setRequestToRelease(null);
            await loadRequests();
        } catch (err) {
            console.error('Errore rilascio:', err);
            toast.error("Errore durante il rilascio.");
        }
    };

    const handleMessageClick = (request) => {
        setSelectedRequest(request);
        setShowMessageModal(true);
    };

    const handleSendMessage = async (content) => {
        if (!selectedRequest) return;

        try {
            await logisticsApi.sendMessage(selectedRequest.id, content);
            setShowMessageModal(false);
            setSelectedRequest(null);
            toast.info('Messaggio inviato al richiedente');
        } catch (err) {
            console.error('Errore invio messaggio:', err);
            toast.error("Errore invio messaggio");
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const absSeconds = Math.abs(seconds);

        if (absSeconds >= 3600) {
            const h = Math.floor(absSeconds / 3600);
            const m = Math.floor((absSeconds % 3600) / 60);
            return `${h}h ${m}m`;
        }

        const m = Math.floor(absSeconds / 60);
        const s = Math.floor(absSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getWaitClass = (seconds) => {
        if (seconds > 180) return 'critical';  // > 3 min
        if (seconds > 120) return 'warning';   // > 2 min
        return 'normal';
    };

    if (loading) {
        return (
            <div className="logistics-page pool-page">
                <div className="loading-spinner">Caricamento...</div>
            </div>
        );
    }

    return (
        <div className="logistics-page pool-page">
            <header className="pool-header">
                <h1>🚛 Gestione Magazzino</h1>

                {/* Performance Badge */}
                {performance && (
                    <div className="performance-badge">
                        <span className="points">🏆 {performance.net_points || 0} pt</span>
                        <span className="missions">📦 {performance.missions_completed || 0} missioni</span>
                    </div>
                )}
            </header>

            {/* Selection Mode Toggle (only in Pool) */}
            {activeTab === 'pool' && poolRequests.length > 0 && (
                <div className="px-4 mb-2 flex justify-end">
                    <button
                        onClick={toggleSelectionMode}
                        className={`text-sm px-3 py-1 rounded border ${isSelectionMode ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-400'}`}
                    >
                        {isSelectionMode ? 'Annulla Selezione' : 'Selezione Multipla'}
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="pool-tabs">
                <button
                    className={`tab ${activeTab === 'pool' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pool')}
                >
                    🏊 Piscina ({poolRequests.length})
                </button>
                <button
                    className={`tab ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    📋 Mie ({myQueue.length})
                </button>
                <button
                    className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    📊 Statistiche
                </button>
            </div>

            {/* Pool Tab */}
            {activeTab === 'pool' && (
                <div className="requests-list">
                    {poolRequests.length === 0 ? (
                        <div className="empty-state">
                            <span className="emoji">✨</span>
                            <p>Nessuna richiesta in attesa</p>
                        </div>
                    ) : (
                        poolRequests.map(req => (
                            <div
                                key={req.id}
                                className={`request-card ${req.is_urgent || req.is_auto_urgent ? 'urgent urgent-pulse' : ''} ${getWaitClass(req.wait_time_seconds)} ${isSelectionMode && selectedRequestIds.has(req.id) ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''}`}
                                onClick={() => isSelectionMode && toggleRequestSelection(req.id)}
                            >
                                <div className="request-main">
                                    {isSelectionMode && (
                                        <div className="mr-3 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(req.id)}
                                                readOnly
                                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600"
                                            />
                                        </div>
                                    )}
                                    <div className="request-info">
                                        <span className="material-icon">{req.material_type_icon || '📦'}</span>
                                        <div className="material-details">
                                            <strong>{req.material_type_label}</strong>
                                            {req.custom_description && <p>{req.custom_description}</p>}
                                            <span className="qty">x{req.quantity} {req.unit_of_measure}</span>
                                        </div>
                                    </div>

                                    <div className="request-meta grid grid-cols-2 gap-2 mt-2">
                                        <div className="banchina bg-black/30 p-2 rounded-lg">
                                            <span className="text-gray-400 text-xs font-bold uppercase block">Destinazione</span>
                                            <span className="text-white font-bold text-lg">📍 Banchina {req.banchina_code}</span>
                                        </div>
                                        <div className="requester bg-black/30 p-2 rounded-lg">
                                            <span className="text-gray-400 text-xs font-bold uppercase block">Richiedente</span>
                                            <span className="text-white font-bold text-lg truncate">👤 {req.requester_name}</span>
                                        </div>
                                        <div className={`wait-time col-span-2 text-center p-1 rounded-lg font-mono font-bold ${getWaitClass(req.wait_time_seconds)}`}>
                                            ⏱️ Attesa: {formatTime(req.wait_time_seconds)}
                                        </div>
                                    </div>
                                </div>

                                {(req.is_urgent || req.is_auto_urgent) && (
                                    <div className="urgent-banner">
                                        {req.is_urgent ? '🔴 URGENTE' : '⏱️ ATTESA LUNGA'}
                                    </div>
                                )}

                                {!isSelectionMode && (
                                    <button
                                        className="btn-take"
                                        onClick={(e) => { e.stopPropagation(); handleTakeClick(req); }}
                                    >
                                        🏃 PRENDO IO
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Batch Take Action Bar */}
            {isSelectionMode && selectedRequestIds.size > 0 && (
                <div className="fixed bottom-20 left-4 right-4 bg-gray-900 border border-blue-500 rounded-xl p-4 shadow-2xl z-50 flex items-center justify-between">
                    <span className="text-white font-bold">{selectedRequestIds.size} Richieste selezionate</span>
                    <button
                        onClick={() => setShowEtaModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg"
                    >
                        PRENDI TUTTE 🚀
                    </button>
                </div>
            )}

            {/* Queue Tab - Mie richieste prese in carico */}
            {activeTab === 'queue' && (
                <div className="requests-list my-queue">
                    {myQueue.length === 0 ? (
                        <div className="empty-state">
                            <span className="emoji">📭</span>
                            <p>Nessuna richiesta in corso</p>
                        </div>
                    ) : (
                        myQueue.map(req => (
                            <div
                                key={req.id}
                                className={`request-card in-progress ${req.is_urgent ? 'urgent urgent-pulse' : ''} ${req.is_overdue ? 'overdue' : ''}`}
                            >
                                <div className="request-main">
                                    <div className="request-info">
                                        <span className="material-icon">{req.material_type_icon || '📦'}</span>
                                        <div className="material-details">
                                            <strong>{req.material_type_label}</strong>
                                            {req.custom_description && <p>{req.custom_description}</p>}
                                        </div>
                                    </div>

                                    <div className="request-meta grid grid-cols-2 gap-2 mt-2">
                                        <div className="banchina bg-black/30 p-2 rounded-lg">
                                            <span className="text-gray-400 text-xs font-bold uppercase block">Destinazione</span>
                                            <span className="text-white font-bold text-lg">📍 Banchina {req.banchina_code}</span>
                                        </div>
                                        <div className="eta bg-blue-900/30 p-2 rounded-lg border border-blue-500/30">
                                            <span className="text-blue-300 text-xs font-bold uppercase block">Tuo Arrivo</span>
                                            <span className="text-white font-bold text-lg">⏱️ {req.promised_eta_minutes} min</span>
                                        </div>
                                        {req.is_overdue && <div className="overdue-badge col-span-2 bg-red-500/20 text-red-400 text-center font-bold p-1 rounded border border-red-500/50 animate-pulse">⚠️ In ritardo!</div>}
                                    </div>
                                </div>

                                <div className="queue-actions">
                                    <button
                                        className="btn-message"
                                        onClick={() => handleMessageClick(req)}
                                    >
                                        💬
                                    </button>
                                    <button
                                        className="btn-release"
                                        onClick={() => handleReleaseClick(req)}
                                    >
                                        ❌
                                    </button>
                                    <button
                                        className="btn-complete"
                                        onClick={() => handleCompleteClick(req)}
                                    >
                                        ✅ CONSEGNATO
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && performance && (
                <div className="stats-section">
                    <div className="stat-card">
                        <div className="stat-value">{performance.missions_completed}</div>
                        <div className="stat-label">Missioni Completate</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value positive">+{performance.total_points}</div>
                        <div className="stat-label">Punti Guadagnati</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value negative">-{performance.penalties_received}</div>
                        <div className="stat-label">Penalità</div>
                    </div>
                    <div className="stat-card highlight">
                        <div className="stat-value">{performance.net_points}</div>
                        <div className="stat-label">Punti Netti</div>
                    </div>
                    {performance.avg_reaction_seconds && (
                        <div className="stat-card">
                            <div className="stat-value">{formatTime(performance.avg_reaction_seconds)}</div>
                            <div className="stat-label">Tempo Medio Reazione</div>
                        </div>
                    )}
                    {performance.fastest_reaction_seconds && (
                        <div className="stat-card">
                            <div className="stat-value">{formatTime(performance.fastest_reaction_seconds)}</div>
                            <div className="stat-label">Record Personale ⚡</div>
                        </div>
                    )}
                </div>
            )}

            {/* ETA Selection Modal */}
            <LogisticsModal
                isOpen={showEtaModal}
                onClose={() => setShowEtaModal(false)}
                title="Fra quanto arrivi?"
                icon="⏰"
            >
                <div>
                    <p className="text-gray-400 text-center mb-6">
                        {selectedRequest?.material_type_icon} {selectedRequest?.material_type_label} <span className="mx-2">→</span> {selectedRequest?.banchina_code}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {etaOptions.map(opt => (
                            <button
                                key={opt.id}
                                className="py-4 px-4 bg-gray-800/80 hover:bg-blue-600/20 hover:border-blue-500 border border-transparent rounded-xl transition-all duration-200 flex flex-col items-center justify-center group"
                                onClick={() => {
                                    if (isSelectionMode) handleBatchTake(opt.minutes);
                                    else handleTake(opt.minutes);
                                }}
                            >
                                <span className="text-xl font-bold text-white group-hover:text-blue-400 mb-1">{opt.minutes}'</span>
                                <span className="text-xs text-gray-400 group-hover:text-blue-200">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition"
                        onClick={() => setShowEtaModal(false)}
                    >
                        Annulla
                    </button>
                </div>
            </LogisticsModal>

            {/* Message Modal */}
            <LogisticsModal
                isOpen={showMessageModal}
                onClose={() => setShowMessageModal(false)}
                title="Invia Messaggio"
                icon="💬"
            >
                <div>
                    <p className="text-gray-400 text-center mb-6">
                        A: <span className="text-white font-medium">{selectedRequest?.requester_name}</span>
                    </p>

                    <div className="space-y-3 mb-6">
                        {presetMessages.map(msg => (
                            <button
                                key={msg.id}
                                className="w-full p-4 bg-gray-800/80 hover:bg-purple-600/20 hover:border-purple-500 border border-transparent rounded-xl transition-all duration-200 flex items-center gap-3 text-left group"
                                onClick={() => handleSendMessage(msg.content)}
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{msg.icon}</span>
                                <span className="text-gray-200 group-hover:text-purple-200 font-medium">{msg.content}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition"
                        onClick={() => setShowMessageModal(false)}
                    >
                        Annulla
                    </button>
                </div>
            </LogisticsModal>
            {/* Release Confirmation Modal */}
            <LogisticsModal
                isOpen={showReleaseModal}
                onClose={() => setShowReleaseModal(false)}
                title="Rilasciare la richiesta?"
                icon="⚠️"
            >
                <div className="text-center">
                    <p className="text-gray-300 mb-6">
                        Attenzione! Se rilasci questa richiesta riceverai una
                        <span className="text-red-400 font-bold ml-1">PENALITÀ</span>.
                        <br />
                        Sei sicuro di non poterla completare?
                    </p>

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                            onClick={() => setShowReleaseModal(false)}
                        >
                            Annulla
                        </button>
                        <button
                            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
                            onClick={confirmRelease}
                        >
                            Sì, Rilascia
                        </button>
                    </div>
                </div>
            </LogisticsModal>

            {/* Complete Confirmation Modal */}
            <LogisticsModal
                isOpen={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                title="Conferma Consegna"
                icon="✅"
            >
                <div className="text-center">
                    <p className="text-gray-300 mb-6">
                        Hai consegnato il materiale a
                        <span className="text-white font-bold mx-1">{requestToComplete?.requester_name}</span>?
                    </p>

                    {/* Secure Delivery Input */}
                    {requestToComplete?.confirmation_code && (
                        <div className="mb-6">
                            <label className="block text-left text-sm text-gray-400 mb-2">Codice Conferma (Richiesto)</label>
                            <input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="Inserisci codice..."
                                className="w-full p-3 bg-gray-700 rounded-xl text-white text-center text-xl font-bold tracking-widest border border-gray-600 focus:border-green-500 outline-none"
                            />
                        </div>
                    )}
                    {/* Fallback optional input if we want to allow manual code entry even if not strictly required by DB but by process */}
                    {!requestToComplete?.confirmation_code && (
                        <div className="mb-6">
                            <label className="block text-left text-sm text-gray-400 mb-2">Codice Conferma (Opzionale)</label>
                            <input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="Inserisci codice"
                                className="w-full p-3 bg-gray-700 rounded-xl text-white text-center tracking-widest border border-gray-600 focus:border-green-500 outline-none"
                            />
                            <p className="text-[10px] text-gray-500 mt-2 text-left">
                                ℹ️ Il codice compare sul tablet di <strong>{requestToComplete?.requester_name}</strong>
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                            onClick={() => setShowCompleteModal(false)}
                        >
                            No, aspetta
                        </button>
                        <button
                            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all transform active:scale-95"
                            onClick={confirmComplete}
                        >
                            CONFERMA
                        </button>
                    </div>
                </div>
            </LogisticsModal>

        </div>
    );
}
