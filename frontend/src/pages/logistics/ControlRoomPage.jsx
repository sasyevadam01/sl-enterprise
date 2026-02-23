/**
 * ControlRoomPage.jsx
 * MONITOR SPOSTAMENTI — Torre di Controllo Admin
 * Real-time overview of ALL logistics material requests
 */
import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import AuthContext from '../../context/AuthContext';
import { logisticsApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import MaterialIcon from './components/MaterialIcon';
import {
    AlertTriangle, Clock, CheckCircle2, XCircle, Zap,
    RefreshCw, Package, User, MapPin, Timer, ChevronDown, Eye,
    Trophy, Medal, TrendingUp, TrendingDown, Calendar, History
} from 'lucide-react';
import './ControlRoomStyles.css';

const STATUS_MAP = {
    pending: { label: 'In Attesa', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Clock },
    processing: { label: 'In Lavorazione', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: RefreshCw },
    completed: { label: 'Completata', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: CheckCircle2 },
    cancelled: { label: 'Annullata', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: XCircle },
};

export default function ControlRoomPage() {
    const { user } = useContext(AuthContext);
    const { toast } = useUI();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending_count: 0, urgent_count: 0, completed_today: 0, avg_wait: 0 });
    const [filter, setFilter] = useState('active');
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);
    const [urgingId, setUrgingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const wsRef = useRef(null);
    const reconnectRef = useRef(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            if (filter === 'history') {
                // Load completed + cancelled for the selected date
                const [completedData, cancelledData] = await Promise.all([
                    logisticsApi.getRequests({ status: 'completed', limit: 500 }),
                    logisticsApi.getRequests({ status: 'cancelled', limit: 500 })
                ]);
                let allHistory = [...(completedData.items || []), ...(cancelledData.items || [])];
                // Filter by date
                allHistory = allHistory.filter(r => {
                    const refDate = r.completed_at || r.created_at;
                    return refDate && refDate.startsWith(historyDate);
                });
                // Sort by most recent first
                allHistory.sort((a, b) => {
                    const dateA = new Date(a.completed_at || a.created_at);
                    const dateB = new Date(b.completed_at || b.created_at);
                    return dateB - dateA;
                });
                setRequests(allHistory);
            } else {
                const params = {};
                if (filter === 'active') params.status = 'active';
                else if (filter === 'pending') params.status = 'pending';
                else if (filter === 'processing') params.status = 'processing';
                else if (filter === 'urgent') params.status = 'active';
                params.limit = 200;

                const data = await logisticsApi.getRequests(params);
                let items = data.items || [];

                if (filter === 'urgent') {
                    items = items.filter(r => r.is_urgent);
                }
                setRequests(items);
            }

            // Calculate stats (always from active)
            const allActive = await logisticsApi.getRequests({ status: 'active', limit: 500 });
            const today = new Date().toISOString().split('T')[0];
            const completedToday = await logisticsApi.getRequests({ status: 'completed', limit: 500 });
            const todayCompleted = (completedToday.items || []).filter(r =>
                r.completed_at && r.completed_at.startsWith(today)
            );

            const pendingItems = (allActive.items || []).filter(r => r.status === 'pending');
            const avgWait = pendingItems.length > 0
                ? pendingItems.reduce((sum, r) => sum + (r.wait_time_seconds || 0), 0) / pendingItems.length
                : 0;

            setStats({
                total: allActive.total || 0,
                pending_count: allActive.pending_count || 0,
                urgent_count: allActive.urgent_count || 0,
                completed_today: todayCompleted.length,
                avg_wait: Math.round(avgWait),
            });
        } catch (err) {
            console.error('ControlRoom load error:', err);
        } finally {
            setLoading(false);
        }
    }, [filter, historyDate]);

    const loadLeaderboard = useCallback(async () => {
        try {
            const now = new Date();
            const data = await logisticsApi.getLeaderboard(now.getMonth() + 1, now.getFullYear());
            setLeaderboard(data.entries || []);
        } catch (err) {
            console.error('Leaderboard load error:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    }, []);

    useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

    useEffect(() => { loadData(); }, [loadData]);

    // WebSocket real-time
    useEffect(() => {
        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        const connect = () => {
            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.onmessage = () => { loadData(); };
            wsRef.current.onclose = () => { reconnectRef.current = setTimeout(connect, 3000); };
            wsRef.current.onerror = () => { };
        };
        connect();
        // Refresh every 15s as fallback
        const interval = setInterval(loadData, 15000);
        return () => {
            clearInterval(interval);
            clearTimeout(reconnectRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [loadData]);

    const handleCancel = async (id) => {
        if (!window.confirm('Annullare questa richiesta?')) return;
        setCancellingId(id);
        try {
            await logisticsApi.cancelRequest(id, 'Annullata da Control Room');
            toast.success('Richiesta annullata');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore annullamento');
        } finally { setCancellingId(null); }
    };

    const handleUrgent = async (id) => {
        setUrgingId(id);
        try {
            await logisticsApi.markUrgent(id);
            toast.success('Richiesta marcata urgente');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore');
        } finally { setUrgingId(null); }
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatReactionTime = (seconds) => {
        if (!seconds) return '-';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    const getWaitClass = (seconds) => {
        if (seconds > 600) return 'cr-critical';
        if (seconds > 300) return 'cr-warning';
        return 'cr-ok';
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const filters = [
        { key: 'active', label: 'Attive', count: stats.total },
        { key: 'pending', label: 'In Attesa', count: stats.pending_count },
        { key: 'processing', label: 'In Corso', count: stats.total - stats.pending_count },
        { key: 'urgent', label: 'Urgenti', count: stats.urgent_count },
        { key: 'history', label: 'Storico', count: null, icon: History },
    ];

    return (
        <div className="cr-page">
            {/* Hero Header */}
            <div className="cr-header">
                <div className="cr-header-left">
                    <h1 className="cr-title">
                        <span className="cr-radar">📡</span>
                        CONTROL ROOM
                    </h1>
                    <p className="cr-subtitle">Monitor Spostamenti Materiali — Real-time</p>
                </div>
                <div className="cr-header-right">
                    <div className={`cr-live-badge ${requests.length > 0 ? 'active' : ''}`}>
                        <span className="cr-live-dot" />
                        LIVE
                    </div>
                    <button onClick={() => { setLoading(true); loadData(); }} className="cr-refresh-btn">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="cr-kpi-grid">
                <div className="cr-kpi-card">
                    <div className="cr-kpi-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                        <Package size={22} />
                    </div>
                    <div className="cr-kpi-data">
                        <span className="cr-kpi-value">{stats.total}</span>
                        <span className="cr-kpi-label">Richieste Attive</span>
                    </div>
                </div>
                <div className="cr-kpi-card">
                    <div className="cr-kpi-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <Clock size={22} />
                    </div>
                    <div className="cr-kpi-data">
                        <span className="cr-kpi-value">{stats.pending_count}</span>
                        <span className="cr-kpi-label">In Attesa</span>
                    </div>
                </div>
                <div className={`cr-kpi-card ${stats.urgent_count > 0 ? 'cr-kpi-alert' : ''}`}>
                    <div className="cr-kpi-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div className="cr-kpi-data">
                        <span className="cr-kpi-value">{stats.urgent_count}</span>
                        <span className="cr-kpi-label">Urgenti</span>
                    </div>
                </div>
                <div className="cr-kpi-card">
                    <div className="cr-kpi-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                        <Timer size={22} />
                    </div>
                    <div className="cr-kpi-data">
                        <span className="cr-kpi-value">{formatTime(stats.avg_wait)}</span>
                        <span className="cr-kpi-label">Attesa Media</span>
                    </div>
                </div>
                <div className="cr-kpi-card">
                    <div className="cr-kpi-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="cr-kpi-data">
                        <span className="cr-kpi-value">{stats.completed_today}</span>
                        <span className="cr-kpi-label">Evase Oggi</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="cr-filters">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`cr-filter-btn ${filter === f.key ? 'active' : ''} ${f.key === 'urgent' ? 'urgent' : ''} ${f.key === 'history' ? 'history' : ''}`}
                    >
                        {f.icon && <f.icon size={14} />}
                        {f.label}
                        {f.count !== null && <span className="cr-filter-count">{f.count}</span>}
                    </button>
                ))}
                {filter === 'history' && (
                    <div className="cr-history-date-picker">
                        <Calendar size={14} />
                        <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            className="cr-date-input"
                        />
                    </div>
                )}
            </div>

            {/* Requests Table / Cards */}
            <div className="cr-table-container">
                {loading ? (
                    <div className="cr-loading">
                        <RefreshCw size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
                        <p>Caricamento dati...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="cr-empty">
                        <Package size={48} style={{ color: '#475569' }} />
                        <p>Nessuna richiesta {filter !== 'active' ? 'con questo filtro' : 'attiva'}</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <table className="cr-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Materiale</th>
                                    <th>Banchina</th>
                                    <th>Richiedente</th>
                                    <th>Stato</th>
                                    <th>Operatore</th>
                                    {filter === 'history' ? <th>Data</th> : <th>Tempo</th>}
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => {
                                    const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
                                    const StatusIcon = statusInfo.icon;
                                    return (
                                        <tr key={req.id} className={`${req.is_urgent ? 'cr-row-urgent' : ''} ${req.is_auto_urgent ? 'cr-row-late' : ''}`}>
                                            <td className="cr-td-id">#{req.id}</td>
                                            <td className="cr-td-material">
                                                <div className="cr-material-cell">
                                                    <MaterialIcon emoji={req.material_type_icon} size={20} />
                                                    <div>
                                                        <span className="cr-material-name">{req.material_type_label}</span>
                                                        {req.custom_description && (
                                                            <span className="cr-material-desc">{req.custom_description}</span>
                                                        )}
                                                        {req.quantity > 1 && (
                                                            <span className="cr-qty-badge">×{req.quantity} {req.unit_of_measure}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="cr-td-banchina">
                                                <div className="cr-banchina-cell">
                                                    <MapPin size={14} />
                                                    <strong>{req.banchina_code}</strong>
                                                </div>
                                            </td>
                                            <td className="cr-td-requester">
                                                <div className="cr-requester-cell">
                                                    <User size={14} />
                                                    {req.requester_name}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="cr-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                                                    <StatusIcon size={13} />
                                                    {statusInfo.label}
                                                    {req.is_urgent && <Zap size={12} className="cr-urgent-icon" />}
                                                </span>
                                            </td>
                                            <td className="cr-td-operator">
                                                {req.assigned_to_name ? (
                                                    <div className="cr-operator-cell">
                                                        <div className="cr-operator-avatar">
                                                            {req.assigned_to_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="cr-operator-name">{req.assigned_to_name}</span>
                                                            {req.promised_eta_minutes && (
                                                                <span className="cr-eta-mini">ETA {req.promised_eta_minutes}m</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="cr-no-operator">—</span>
                                                )}
                                            </td>
                                            <td>
                                                {filter === 'history' ? (
                                                    <span className="cr-history-date">
                                                        {formatDateTime(req.completed_at || req.created_at)}
                                                    </span>
                                                ) : (
                                                    <span className={`cr-wait-badge ${getWaitClass(req.wait_time_seconds)}`}>
                                                        {formatTime(req.wait_time_seconds)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="cr-td-actions">
                                                {filter !== 'history' && (
                                                    <>
                                                        {req.status === 'pending' && !req.is_urgent && (
                                                            <button
                                                                onClick={() => handleUrgent(req.id)}
                                                                disabled={urgingId === req.id}
                                                                className="cr-action-btn cr-action-urgent"
                                                                title="Marca Urgente"
                                                            >
                                                                <Zap size={14} />
                                                            </button>
                                                        )}
                                                        {(req.status === 'pending' || req.status === 'processing') && (
                                                            <button
                                                                onClick={() => handleCancel(req.id)}
                                                                disabled={cancellingId === req.id}
                                                                className="cr-action-btn cr-action-cancel"
                                                                title="Annulla"
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile Cards */}
                        <div className="cr-cards-mobile">
                            {requests.map(req => {
                                const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
                                const StatusIcon = statusInfo.icon;
                                const isExpanded = expandedId === req.id;
                                return (
                                    <div
                                        key={req.id}
                                        className={`cr-card ${req.is_urgent ? 'cr-card-urgent' : ''}`}
                                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                    >
                                        <div className="cr-card-top">
                                            <div className="cr-card-material">
                                                <MaterialIcon emoji={req.material_type_icon} size={20} />

                                                <div>
                                                    <strong>{req.material_type_label}</strong>
                                                    {req.quantity > 1 && <span className="cr-qty-badge">×{req.quantity}</span>}
                                                </div>
                                            </div>
                                            <span className={`cr-wait-badge ${getWaitClass(req.wait_time_seconds)}`}>
                                                {formatTime(req.wait_time_seconds)}
                                            </span>
                                        </div>
                                        <div className="cr-card-meta">
                                            <span><MapPin size={12} /> {req.banchina_code}</span>
                                            <span><User size={12} /> {req.requester_name}</span>
                                            <span className="cr-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                                                <StatusIcon size={12} /> {statusInfo.label}
                                                {req.is_urgent && <Zap size={11} />}
                                            </span>
                                        </div>
                                        {req.assigned_to_name && (
                                            <div className="cr-card-operator">
                                                Operatore: <strong>{req.assigned_to_name}</strong>
                                                {req.promised_eta_minutes && <span> (ETA {req.promised_eta_minutes}m)</span>}
                                            </div>
                                        )}
                                        {filter === 'history' && (
                                            <div className="cr-card-operator" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {formatDateTime(req.completed_at || req.created_at)}
                                            </div>
                                        )}
                                        {isExpanded && (
                                            <div className="cr-card-actions">
                                                {req.status === 'pending' && !req.is_urgent && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleUrgent(req.id); }} className="cr-mob-btn urgent" disabled={urgingId === req.id}>
                                                        <Zap size={14} /> URGENTE
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }} className="cr-mob-btn cancel" disabled={cancellingId === req.id}>
                                                    <XCircle size={14} /> ANNULLA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <div className="cr-footer">
                <span>Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}</span>
                <span>{requests.length} risultati</span>
            </div>

            {/* LEADERBOARD SECTION */}
            <div className="cr-leaderboard-section">
                <div className="cr-leaderboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                            <Trophy size={22} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classifica Operatori</h2>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {new Date().toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {leaderboardLoading ? (
                    <div className="cr-loading" style={{ padding: '2rem 0' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ color: '#f59e0b' }} />
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="cr-empty" style={{ padding: '2rem 0' }}>
                        <Trophy size={36} style={{ color: '#475569' }} />
                        <p>Nessun dato disponibile per questo mese</p>
                    </div>
                ) : (
                    <>
                        {/* Podium - Top 3 */}
                        {leaderboard.length >= 1 && (
                            <div className="cr-podium">
                                {leaderboard.slice(0, 3).map((entry, idx) => {
                                    const medals = ['🥇', '🥈', '🥉'];
                                    const podiumColors = [
                                        { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e' },
                                        { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', text: '#475569' },
                                        { bg: 'linear-gradient(135deg, #fed7aa, #fdba74)', border: '#f97316', text: '#9a3412' }
                                    ];
                                    const style = podiumColors[idx];
                                    return (
                                        <div key={entry.employee_id} className="cr-podium-card" style={{ background: style.bg, borderColor: style.border }}>
                                            <div className="cr-podium-medal">{medals[idx]}</div>
                                            <div className="cr-podium-name" style={{ color: style.text }}>{entry.employee_name}</div>
                                            <div className="cr-podium-score">
                                                <span className="cr-podium-points">{entry.net_points}</span>
                                                <span className="cr-podium-label">punti netti</span>
                                            </div>
                                            <div className="cr-podium-stats">
                                                <span title="Missioni completate">📦 {entry.missions_completed}</span>
                                                <span title="Tempo medio reazione">{formatReactionTime(entry.avg_reaction_seconds)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Full Table */}
                        <div className="cr-leaderboard-table-wrapper">
                            <table className="cr-leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Operatore</th>
                                        <th>Missioni</th>
                                        <th>Punti</th>
                                        <th>Penalità</th>
                                        <th>Netto</th>
                                        <th>Reazione</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry) => (
                                        <tr key={entry.employee_id} className={entry.rank <= 3 ? 'cr-lb-top' : ''}>
                                            <td className="cr-lb-rank">
                                                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                                            </td>
                                            <td className="cr-lb-name">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="cr-operator-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                                                        {entry.employee_name?.charAt(0)}
                                                    </div>
                                                    {entry.employee_name}
                                                </div>
                                            </td>
                                            <td>{entry.missions_completed}</td>
                                            <td style={{ color: '#22c55e', fontWeight: 700 }}>+{entry.total_points}</td>
                                            <td style={{ color: entry.penalties_received > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                                                {entry.penalties_received > 0 ? `-${entry.penalties_received}` : '0'}
                                            </td>
                                            <td style={{ fontWeight: 900, color: entry.net_points >= 0 ? '#22c55e' : '#ef4444' }}>
                                                {entry.net_points}
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                {formatReactionTime(entry.avg_reaction_seconds)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
