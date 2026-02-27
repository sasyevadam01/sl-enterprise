/**
 * LogisticsPoolPage.jsx
 * Pagina per magazzinieri - Piscina delle richieste
 * Lista live con presa in carico, ETA, e messaggi
 * Light Enterprise Design System v5.0
 */
import { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { logisticsApi } from '../../api/client';
import LogisticsModal from './components/LogisticsModal';
import { useUI } from '../../components/ui/CustomUI';
import {
    Warehouse, Trophy, Package, Waves, ClipboardList, BarChart3,
    Sparkles, MapPin, User, Clock, AlertCircle, ArrowRight, Inbox,
    MessageCircle, XCircle, CheckCircle, AlertTriangle, Zap, Timer,
    Rocket, Info, Send, PackageCheck, Truck
} from 'lucide-react';
import MaterialIcon from './components/MaterialIcon';
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

    // Mode Choice State (preparing vs delivering)
    const [showModeModal, setShowModeModal] = useState(false);
    const [pendingEta, setPendingEta] = useState(null);
    const [markingPreparedId, setMarkingPreparedId] = useState(null);

    useEffect(() => {
        loadData();

        // WS Connection (data refresh only — sound handled by MainLayout)
        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_request' || data.type === 'request_updated' || data.type === 'request_completed') {
                    loadRequests();
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
            const poolData = await logisticsApi.getRequests({ status: 'pending' });
            setPoolRequests(poolData.items || []);

            // Queue: include sia processing che preparing
            const queueProcessing = await logisticsApi.getRequests({ my_assigned: true, status: 'processing' });
            const queuePreparing = await logisticsApi.getRequests({ my_assigned: true, status: 'preparing' });
            setMyQueue([...(queuePreparing.items || []), ...(queueProcessing.items || [])]);
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

        // Se la richiesta è già 'prepared', skip mode choice → va direttamente a delivering
        if (selectedRequest.status === 'prepared') {
            try {
                await logisticsApi.takeRequest(selectedRequest.id, etaMinutes, 'delivering');
                setShowEtaModal(false);
                setSelectedRequest(null);
                toast.success('Ritiro preso in carico!');
                await loadRequests();
            } catch (err) {
                console.error('Errore presa in carico:', err);
                toast.error('Errore nella presa in carico');
                setShowEtaModal(false);
            }
            return;
        }

        // Per richieste pending: mostra scelta PREPARO / CONSEGNO
        setPendingEta(etaMinutes);
        setShowEtaModal(false);
        setShowModeModal(true);
    };

    const handleModeChoice = async (mode) => {
        if (!selectedRequest || !pendingEta) return;
        try {
            await logisticsApi.takeRequest(selectedRequest.id, pendingEta, mode);
            setShowModeModal(false);
            setSelectedRequest(null);
            setPendingEta(null);
            toast.success(mode === 'preparing' ? 'Preparazione avviata!' : 'Consegna avviata!');
            await loadRequests();
        } catch (err) {
            console.error('Errore presa in carico:', err);
            toast.error('Errore nella presa in carico');
            setShowModeModal(false);
        }
    };

    // --- Mark Prepared Handler ---
    const handleMarkPrepared = async (requestId) => {
        setMarkingPreparedId(requestId);
        try {
            await logisticsApi.markPrepared(requestId);
            toast.success('Materiale preparato! Torna in piscina per il ritiro.');
            await loadRequests();
        } catch (err) {
            console.error('Errore mark prepared:', err);
            toast.error('Errore nel segnare come preparato');
        } finally {
            setMarkingPreparedId(null);
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
            await logisticsApi.completeRequest(requestToComplete.id, confirmationCode);

            toast.success('Materiale consegnato con successo!');

            setShowCompleteModal(false);
            setRequestToComplete(null);
            setConfirmationCode('');
            await loadRequests();

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
                <h1><Warehouse size={24} className="inline-block mr-2 text-brand-green" style={{ verticalAlign: 'text-bottom' }} /> Gestione Magazzino</h1>

                {/* Performance Badge */}
                {performance && (
                    <div className="performance-badge">
                        <span className="points"><Trophy size={14} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> {performance.net_points || 0} pt</span>
                        <span className="missions"><Package size={14} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> {performance.missions_completed || 0} missioni</span>
                    </div>
                )}
            </header>

            {/* Selection Mode Toggle (only in Pool) */}
            {activeTab === 'pool' && poolRequests.length > 0 && (
                <div className="px-4 mb-2 flex justify-end">
                    <button
                        onClick={toggleSelectionMode}
                        className={`text-sm px-3 py-1 rounded border transition ${isSelectionMode ? 'bg-brand-green border-brand-green text-white' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}
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
                    <Waves size={16} className="inline-block mr-1.5" style={{ verticalAlign: 'text-bottom' }} /> Piscina ({poolRequests.length})
                </button>
                <button
                    className={`tab ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    <ClipboardList size={16} className="inline-block mr-1.5" style={{ verticalAlign: 'text-bottom' }} /> Mie ({myQueue.length})
                </button>
                <button
                    className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <BarChart3 size={16} className="inline-block mr-1.5" style={{ verticalAlign: 'text-bottom' }} /> Statistiche
                </button>
            </div>

            {/* Pool Tab */}
            {activeTab === 'pool' && (
                <div className="requests-list">
                    {poolRequests.length === 0 ? (
                        <div className="empty-state">
                            <Sparkles size={40} className="text-slate-300 mx-auto mb-2" />
                            <p>Nessuna richiesta in attesa</p>
                        </div>
                    ) : (
                        poolRequests.map(req => (
                            <div
                                key={req.id}
                                className={`request-card ${req.is_urgent || req.is_auto_urgent ? 'urgent urgent-pulse' : ''} ${getWaitClass(req.wait_time_seconds)} ${isSelectionMode && selectedRequestIds.has(req.id) ? 'ring-2 ring-brand-green bg-brand-green/5' : ''}`}
                                onClick={() => isSelectionMode && toggleRequestSelection(req.id)}
                            >
                                <div className="request-main">
                                    {isSelectionMode && (
                                        <div className="mr-3 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(req.id)}
                                                readOnly
                                                className="w-5 h-5 rounded border-slate-300 bg-white text-brand-green accent-brand-green"
                                            />
                                        </div>
                                    )}
                                    <div className="request-info">
                                        <span className="material-icon"><MaterialIcon emoji={req.material_type_icon} size={28} className="text-brand-green" /></span>
                                        <div className="material-details">
                                            <strong>{req.material_type_label}</strong>
                                            {req.custom_description && <p>{req.custom_description}</p>}
                                            <span className="qty">x{req.quantity} {req.unit_of_measure}</span>
                                        </div>
                                    </div>

                                    <div className="request-meta grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        <div className="banchina bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-slate-400 text-xs font-bold uppercase block">Destinazione</span>
                                            <span className="text-slate-800 font-bold text-lg flex items-center gap-1"><MapPin size={16} className="text-brand-green" /> Banchina {req.banchina_code}</span>
                                        </div>
                                        <div className="requester bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-slate-400 text-xs font-bold uppercase block">Richiedente</span>
                                            <span className="text-slate-800 font-bold text-lg truncate flex items-center gap-1"><User size={16} className="text-slate-500" /> {req.requester_name}</span>
                                        </div>
                                        <div className={`wait-time sm:col-span-2 text-center p-1 rounded-lg font-mono font-bold ${getWaitClass(req.wait_time_seconds)}`}>
                                            <Clock size={14} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> Attesa: {formatTime(req.wait_time_seconds)}
                                        </div>
                                    </div>
                                </div>

                                {(req.is_urgent || req.is_auto_urgent) && (
                                    <div className="urgent-banner">
                                        {req.is_urgent ? <><AlertCircle size={14} className="inline-block mr-1" /> URGENTE</> : <><Clock size={14} className="inline-block mr-1" /> ATTESA LUNGA</>}
                                    </div>
                                )}

                                {/* Badge PREPARATO */}
                                {req.status === 'prepared' && (
                                    <div className="prepared-banner">
                                        <PackageCheck size={14} className="inline-block mr-1" />
                                        PREPARATO da {req.prepared_by_name} — Pronto al ritiro
                                    </div>
                                )}

                                {!isSelectionMode && (
                                    <button
                                        className="btn-take"
                                        onClick={(e) => { e.stopPropagation(); handleTakeClick(req); }}
                                    >
                                        <ArrowRight size={16} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> PRENDO IO
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Batch Take Action Bar */}
            {isSelectionMode && selectedRequestIds.size > 0 && (
                <div className="fixed bottom-20 left-4 right-4 bg-white border border-brand-green rounded-xl p-4 shadow-xl z-50 flex items-center justify-between">
                    <span className="text-slate-700 font-bold">{selectedRequestIds.size} Richieste selezionate</span>
                    <button
                        onClick={() => setShowEtaModal(true)}
                        className="bg-brand-green hover:bg-brand-green/90 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition"
                    >
                        PRENDI TUTTE <Rocket size={16} className="inline-block ml-1" style={{ verticalAlign: 'text-bottom' }} />
                    </button>
                </div>
            )}

            {/* Queue Tab - Mie richieste prese in carico */}
            {activeTab === 'queue' && (
                <div className="requests-list my-queue">
                    {myQueue.length === 0 ? (
                        <div className="empty-state">
                            <Inbox size={40} className="text-slate-300 mx-auto mb-2" />
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
                                        <span className="material-icon"><MaterialIcon emoji={req.material_type_icon} size={28} className="text-brand-green" /></span>
                                        <div className="material-details">
                                            <strong>{req.material_type_label}</strong>
                                            {req.custom_description && <p>{req.custom_description}</p>}
                                        </div>
                                    </div>

                                    <div className="request-meta grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        <div className="banchina bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-slate-400 text-xs font-bold uppercase block">Destinazione</span>
                                            <span className="text-slate-800 font-bold text-lg flex items-center gap-1"><MapPin size={16} className="text-brand-green" /> Banchina {req.banchina_code}</span>
                                        </div>
                                        <div className="eta bg-brand-green/5 p-2 rounded-lg border border-brand-green/15">
                                            <span className="text-brand-green text-xs font-bold uppercase block">Tuo Arrivo</span>
                                            <span className="text-slate-800 font-bold text-lg flex items-center gap-1"><Clock size={16} className="text-brand-green" /> {req.promised_eta_minutes} min</span>
                                        </div>
                                        {req.is_overdue && <div className="overdue-badge col-span-2 bg-red-50 text-red-500 text-center font-bold p-1 rounded border border-red-200 animate-pulse flex items-center justify-center gap-1"><AlertTriangle size={14} /> In ritardo!</div>}
                                    </div>
                                </div>

                                <div className="queue-actions">
                                    <button
                                        className="btn-message"
                                        onClick={() => handleMessageClick(req)}
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                    <button
                                        className="btn-release"
                                        onClick={() => handleReleaseClick(req)}
                                    >
                                        <XCircle size={18} />
                                    </button>
                                    {req.status === 'preparing' ? (
                                        <button
                                            className="btn-complete btn-prepared"
                                            onClick={() => handleMarkPrepared(req.id)}
                                            disabled={markingPreparedId === req.id}
                                        >
                                            <PackageCheck size={16} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> PREPARATO ✓
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-complete"
                                            onClick={() => handleCompleteClick(req)}
                                        >
                                            <CheckCircle size={16} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> CONSEGNATO
                                        </button>
                                    )}
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
                            <div className="stat-label">Record Personale <Zap size={14} className="inline-block ml-0.5 text-amber-500" style={{ verticalAlign: 'text-bottom' }} /></div>
                        </div>
                    )}
                </div>
            )}

            {/* ETA Selection Modal */}
            <LogisticsModal
                isOpen={showEtaModal}
                onClose={() => setShowEtaModal(false)}
                title="Fra quanto arrivi?"
                icon={<Timer size={40} className="text-brand-green" />}
            >
                <div>
                    <p className="text-slate-500 text-center mb-6">
                        {selectedRequest?.material_type_icon} {selectedRequest?.material_type_label} <span className="mx-2">→</span> {selectedRequest?.banchina_code}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {etaOptions.map(opt => (
                            <button
                                key={opt.id}
                                className="py-4 px-4 bg-slate-50 hover:bg-brand-green/10 hover:border-brand-green border border-slate-200 rounded-xl transition-all duration-200 flex flex-col items-center justify-center group cursor-pointer"
                                onClick={() => {
                                    if (isSelectionMode) handleBatchTake(opt.minutes);
                                    else handleTake(opt.minutes);
                                }}
                            >
                                <span className="text-xl font-bold text-slate-800 group-hover:text-brand-green mb-1">{opt.minutes}'</span>
                                <span className="text-xs text-slate-400 group-hover:text-brand-green/70">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition border border-slate-200"
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
                icon={<MessageCircle size={40} className="text-blue-500" />}
            >
                <div>
                    <p className="text-slate-500 text-center mb-6">
                        A: <span className="text-slate-800 font-medium">{selectedRequest?.requester_name}</span>
                    </p>

                    <div className="space-y-3 mb-6">
                        {presetMessages.map(msg => (
                            <button
                                key={msg.id}
                                className="w-full p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 border border-slate-200 rounded-xl transition-all duration-200 flex items-center gap-3 text-left group cursor-pointer"
                                onClick={() => handleSendMessage(msg.content)}
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform duration-200"><MaterialIcon emoji={msg.icon} size={22} className="text-slate-500 group-hover:text-blue-600" /></span>
                                <span className="text-slate-700 group-hover:text-blue-700 font-medium">{msg.content}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition border border-slate-200"
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
                icon={<AlertTriangle size={40} className="text-amber-500" />}
            >
                <div className="text-center">
                    <p className="text-slate-600 mb-6">
                        Attenzione! Se rilasci questa richiesta riceverai una
                        <span className="text-red-500 font-bold ml-1">PENALITÀ</span>.
                        <br />
                        Sei sicuro di non poterla completare?
                    </p>

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition border border-slate-200"
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
                icon={<CheckCircle size={40} className="text-brand-green" />}
            >
                <div className="text-center">
                    <p className="text-slate-600 mb-6">
                        Hai consegnato il materiale a
                        <span className="text-slate-800 font-bold mx-1">{requestToComplete?.requester_name}</span>?
                    </p>

                    {/* Secure Delivery Input */}
                    {requestToComplete?.confirmation_code && (
                        <div className="mb-6">
                            <label className="block text-left text-sm text-slate-500 mb-2">Codice Conferma (Richiesto)</label>
                            <input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="Inserisci codice..."
                                className="w-full p-3 bg-slate-50 rounded-xl text-slate-800 text-center text-xl font-bold tracking-widest border border-slate-200 focus:border-brand-green outline-none"
                            />
                        </div>
                    )}
                    {!requestToComplete?.confirmation_code && (
                        <div className="mb-6">
                            <label className="block text-left text-sm text-slate-500 mb-2">Codice Conferma (Opzionale)</label>
                            <input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="Inserisci codice"
                                className="w-full p-3 bg-slate-50 rounded-xl text-slate-800 text-center tracking-widest border border-slate-200 focus:border-brand-green outline-none"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-left">
                                <Info size={12} className="inline-block mr-0.5" style={{ verticalAlign: 'text-bottom' }} /> Il codice compare sul tablet di <strong>{requestToComplete?.requester_name}</strong>
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition border border-slate-200"
                            onClick={() => setShowCompleteModal(false)}
                        >
                            No, aspetta
                        </button>
                        <button
                            className="flex-1 py-3 px-4 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all transform active:scale-95"
                            onClick={confirmComplete}
                        >
                            CONFERMA
                        </button>
                    </div>
                </div>
            </LogisticsModal>

            {/* Mode Choice Modal — Preparing vs Delivering */}
            <LogisticsModal
                isOpen={showModeModal}
                onClose={() => { setShowModeModal(false); setPendingEta(null); }}
                title="Cosa farai?"
                icon={<Package size={40} className="text-brand-green" />}
            >
                <div>
                    <p className="text-slate-500 text-center mb-2 text-sm">
                        {selectedRequest?.material_type_label} → Banchina {selectedRequest?.banchina_code}
                    </p>
                    <p className="text-slate-400 text-center mb-6 text-xs">
                        Scegli come vuoi gestire questa richiesta
                    </p>

                    <div className="space-y-3 mb-6">
                        {/* PREPARO */}
                        <button
                            className="w-full p-4 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-400 rounded-xl transition-all duration-200 flex items-center gap-4 text-left group cursor-pointer"
                            onClick={() => handleModeChoice('preparing')}
                        >
                            <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 transition">
                                <PackageCheck size={24} className="text-amber-600" />
                            </div>
                            <div>
                                <strong className="text-slate-800 text-lg block">PREPARO</strong>
                                <span className="text-slate-500 text-sm">Sto solo preparando il materiale, qualcun altro verrà a ritirarlo</span>
                            </div>
                        </button>

                        {/* CONSEGNO */}
                        <button
                            className="w-full p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl transition-all duration-200 flex items-center gap-4 text-left group cursor-pointer"
                            onClick={() => handleModeChoice('delivering')}
                        >
                            <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 transition">
                                <Truck size={24} className="text-green-600" />
                            </div>
                            <div>
                                <strong className="text-slate-800 text-lg block">CONSEGNO</strong>
                                <span className="text-slate-500 text-sm">Lo porto direttamente io alla banchina</span>
                            </div>
                        </button>
                    </div>

                    <button
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition border border-slate-200"
                        onClick={() => { setShowModeModal(false); setPendingEta(null); }}
                    >
                        Annulla
                    </button>
                </div>
            </LogisticsModal>

        </div>
    );
}
