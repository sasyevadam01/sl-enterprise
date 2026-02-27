/**
 * LogisticsDashboardPage.jsx
 * Dashboard Coordinatore Logistica
 * Visualizzazione Mappa, Feed Live e KPI
 */
import { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import api, { logisticsApi } from '../../api/client';
import LogisticsMap from './LogisticsMap';
import { User, ArrowRight, Radio, XCircle } from 'lucide-react';
import MaterialIcon from './components/MaterialIcon';
import { useUI } from '../../components/ui/CustomUI';
import './LogisticsStyles.css';

export default function LogisticsDashboardPage() {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [cancellingId, setCancellingId] = useState(null);
    const [operators, setOperators] = useState([]); // Real-time operators
    const [stats, setStats] = useState({
        active: 0,
        urgent: 0,
        avgWait: 0,
        completedToday: 0
    });
    const [selectedBanchina, setSelectedBanchina] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useUI();

    useEffect(() => {
        loadData();

        // WS Connection (data refresh only — sound handled by MainLayout)
        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_request' || data.type === 'request_updated' || data.type === 'request_completed') {
                    loadData();
                }
            } catch (err) {
                console.error("WS error:", err);
            }
        };

        return () => ws.close();
    }, []);

    const loadData = async () => {
        try {
            // Carica tutte le richieste attive
            const [activeData, completedData, onlineData] = await Promise.all([
                logisticsApi.getRequests({ status: 'active' }),
                logisticsApi.getRequests({ status: 'completed', limit: 100 }),
                api.get('/users/online')
            ]);

            const allActive = activeData.items || [];
            const completed = completedData.items || [];

            setRequests(allActive);

            // Filtra operatori con GPS valido
            const activeOps = onlineData.data ? onlineData.data.filter(u => u.lat && u.lon) : [];
            setOperators(activeOps);

            // Calcola Stats
            const urgentCount = allActive.filter(r => r.is_urgent).length;

            // Calcola tempo medio attesa (solo pending)
            const pendingReqs = allActive.filter(r => r.status === 'pending');
            const totalWait = pendingReqs.reduce((acc, r) => acc + (r.wait_time_seconds || 0), 0);
            const avgWait = pendingReqs.length > 0 ? Math.round(totalWait / pendingReqs.length) : 0;

            setStats({
                active: allActive.length,
                urgent: urgentCount,
                avgWait: avgWait,
                completedToday: completed.length // Questo è un'approssimazione basata sugli ultimi 100
            });

            setLoading(false);
        } catch (err) {
            console.error('Errore caricamento dashboard:', err);
        }
    };

    const handleBanchinaClick = (banchina, status) => {
        if (!status.hasRequest) {
            setSelectedBanchina(null);
            return;
        }

        // Arricchisci dati banchina con le richieste
        setSelectedBanchina({
            ...banchina,
            requests: status.requests
        });
    };

    const isSuperAdmin = user?.role === 'super_admin' || user?.permissions?.includes('supervise_logistics') || user?.permissions?.includes('*');

    const handleAdminCancel = async (requestId) => {
        if (!window.confirm('Sei sicuro di voler annullare questa richiesta?')) return;
        setCancellingId(requestId);
        try {
            await logisticsApi.cancelRequest(requestId, 'Annullata da Super Admin');
            toast.success('Richiesta annullata con successo');
            // Aggiorna i dati
            await loadData();
            setSelectedBanchina(null);
        } catch (err) {
            console.error('Errore annullamento:', err);
            toast.error(err.response?.data?.detail || 'Errore durante l\'annullamento');
        } finally {
            setCancellingId(null);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="loading-spinner">Caricamento Dashboard...</div>;
    }

    return (
        <div className="logistics-page dashboard-page">
            {/* KPI Header */}
            <div className="dashboard-stats">
                <div className="stat-box">
                    <h3>Richieste Attive</h3>
                    <div className="value">{stats.active}</div>
                </div>
                <div className="stat-box urgent">
                    <h3>Urgenti</h3>
                    <div className="value">{stats.urgent}</div>
                </div>
                <div className="stat-box">
                    <h3>Attesa Media</h3>
                    <div className={`value ${stats.avgWait > 180 ? 'critical' : ''}`}>
                        {formatTime(stats.avgWait)}
                    </div>
                </div>
                <div className="stat-box success">
                    <h3>Evase Oggi</h3>
                    <div className="value">{stats.completedToday}</div>
                </div>
            </div>

            <div className="dashboard-content">
                {/* Mappa Centrale */}
                <div className="map-section">
                    <LogisticsMap
                        requests={requests}
                        operators={operators}
                        onBanchinaClick={handleBanchinaClick}
                    />
                </div>

                {/* Sidebar Dettagli / Feed */}
                <div className="dashboard-sidebar">
                    {selectedBanchina ? (
                        <div className="banchina-details">
                            <div className="details-header">
                                <h2>{selectedBanchina.code}</h2>
                                <span>{selectedBanchina.name}</span>
                                <button className="close-btn" onClick={() => setSelectedBanchina(null)}>×</button>
                            </div>

                            <div className="requests-list-mini">
                                {selectedBanchina.requests.map(req => (
                                    <div key={req.id} className={`mini-card ${req.is_urgent ? 'urgent urgent-pulse' : ''}`}>
                                        <div className="card-header">
                                            <span className="icon"><MaterialIcon emoji={req.material_type_icon} size={18} className="text-brand-green" /></span>
                                            <strong>{req.material_type_label}</strong>
                                        </div>
                                        {req.custom_description && <p className="desc">{req.custom_description}</p>}

                                        <div className="meta">
                                            <div className="requester flex items-center gap-1"><User size={14} className="text-slate-400" /> {req.requester_name}</div>

                                            {req.status === 'pending' ? (
                                                <div className="status pending">
                                                    In attesa da: {formatTime(req.wait_time_seconds)}
                                                </div>
                                            ) : (
                                                <div className="status processing">
                                                    <ArrowRight size={12} className="inline-block mr-0.5" style={{ verticalAlign: 'text-bottom' }} /> {req.assigned_to_name} (ETA: {req.promised_eta_minutes} min)
                                                </div>
                                            )}
                                        </div>

                                        {/* Super Admin Cancel Button */}
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => handleAdminCancel(req.id)}
                                                disabled={cancellingId === req.id}
                                                className="mt-2 w-full py-2 flex items-center justify-center gap-1 border-2 border-red-200 text-red-500 font-bold text-xs rounded-lg hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                                            >
                                                <XCircle size={14} />
                                                {cancellingId === req.id ? 'Annullamento...' : 'ANNULLA RICHIESTA'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="activity-feed">
                            <h3 className="flex items-center gap-2"><Radio size={16} className="text-brand-green" /> Feed Attività</h3>
                            {requests.length === 0 ? (
                                <div className="empty-feed">Nessuna attività corrente</div>
                            ) : (
                                <div className="feed-list">
                                    {requests.map(req => (
                                        <div key={req.id} className="feed-item" onClick={() => {
                                            // Simula click banchina per mostrare dettagli
                                            const banchinaFake = {
                                                id: req.banchina_id,
                                                code: req.banchina_code,
                                                name: req.banchina_name
                                            };
                                            handleBanchinaClick(banchinaFake, { hasRequest: true, requests: [req] });
                                        }}>
                                            <div className="time">{formatTime(req.wait_time_seconds)}</div>
                                            <div className="content">
                                                <strong>{req.banchina_code}</strong>: {req.material_type_label} <br />
                                                <span className="user">{req.requester_name}</span>
                                                {req.is_urgent && <span className="urgent-tag">URGENTE</span>}
                                                {req.status === 'processing' && req.assigned_to_name && (
                                                    <span className="assigned-tag">
                                                        <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Preso da: {req.assigned_to_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
