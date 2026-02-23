/**
 * ChargeControlPage.jsx — Controllo Ricariche (Admin)
 * Dashboard KPI, stato real-time, analisi operatori, storico veicoli.
 */
import { useState, useEffect, useCallback } from 'react';
import { chargeApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Battery, BatteryCharging, BatteryWarning,
    Clock, User, AlertTriangle, TrendingUp,
    ArrowLeft, BarChart3, Activity, Users,
    Zap, ParkingCircle, ChevronDown, ChevronRight,
    MapPin, Calendar, Filter, RefreshCw, Shield,
    CheckCircle2, XCircle, Trash2
} from 'lucide-react';

// ── Forklift SVG ──
const ForkliftIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 16V18H2V16H4ZM4 16H6V12H2V16H4Z" fill={color} />
        <path d="M12 5V18H10V5H12ZM14 18H18C19.1 18 20 17.1 20 16V9L15 6H14V18ZM15 8L18.5 10V16H14V8H15Z" fill={color} />
        <path d="M6 18H8V5H6V18Z" fill={color} />
        <circle cx="7" cy="19" r="2" fill={color} />
        <circle cx="17" cy="19" r="2" fill={color} />
    </svg>
);

const formatMinutes = (mins) => {
    if (!mins && mins !== 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

const RATING_CONFIG = {
    green: { label: 'Regolare', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
    yellow: { label: 'Da Migliorare', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, dot: 'bg-amber-500' },
    red: { label: 'Critico', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, dot: 'bg-red-500' },
};


export default function ChargeControlPage() {
    const { hasPermission } = useAuth();
    const { toast } = useUI();

    const [days, setDays] = useState(7);
    const [dashboard, setDashboard] = useState(null);
    const [operators, setOperators] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [section, setSection] = useState('dashboard'); // dashboard | operators | vehicles
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleHistory, setVehicleHistory] = useState(null);
    const [deletingCycleId, setDeletingCycleId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [dashRes, opsRes, vehRes] = await Promise.all([
                chargeApi.getDashboard(days),
                chargeApi.getOperatorStats(days),
                chargeApi.getVehicles(),
            ]);
            setDashboard(dashRes);
            setOperators(opsRes || []);
            setVehicles(vehRes || []);
        } catch (err) {
            toast.error('Errore caricamento dati');
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { loadData(); }, [loadData]);

    const loadVehicleHistory = async (vehicleId) => {
        try {
            const res = await chargeApi.getVehicleHistory(vehicleId, 90);
            setVehicleHistory(res);
            setSelectedVehicle(vehicleId);
        } catch (err) {
            toast.error('Errore caricamento storico');
        }
    };

    const handleDeleteCycle = async (cycleId) => {
        setDeletingCycleId(cycleId);
        try {
            await chargeApi.deleteCycle(cycleId);
            toast.success('Ciclo eliminato con successo');
            if (selectedVehicle) {
                await loadVehicleHistory(selectedVehicle);
            }
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore durante l\'eliminazione');
        } finally {
            setDeletingCycleId(null);
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Caricamento controllo ricariche...</p>
                </div>
            </div>
        );
    }

    const rt = dashboard?.realtime || {};
    const pd = dashboard?.period || {};

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h1 className="text-lg font-bold text-slate-900">Controllo Ricariche</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={days}
                                onChange={(e) => { setDays(Number(e.target.value)); setLoading(true); }}
                                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                            >
                                <option value={7}>Ultimi 7 giorni</option>
                                <option value={14}>Ultimi 14 giorni</option>
                                <option value={30}>Ultimi 30 giorni</option>
                                <option value={90}>Ultimi 90 giorni</option>
                            </select>
                            <button onClick={() => { setLoading(true); loadData(); }} className="p-2 rounded-lg hover:bg-slate-100">
                                <RefreshCw className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-1 mt-2 -mb-px">
                        {[
                            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                            { key: 'operators', label: 'Operatori', icon: Users },
                            { key: 'vehicles', label: 'Veicoli', icon: Activity },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setSection(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                                    ${section === tab.key
                                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-4">

                {/* ══════════════════════════════════════ */}
                {/*  TAB: DASHBOARD                       */}
                {/* ══════════════════════════════════════ */}
                {section === 'dashboard' && dashboard && (
                    <div className="space-y-4">
                        {/* Real-time KPI Cards */}
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Stato Real-Time</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl border border-red-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                                        <ForkliftIcon className="w-5 h-5" color="#ef4444" />
                                    </div>
                                    <span className="text-xs text-slate-500">In Uso</span>
                                </div>
                                <span className="text-3xl font-bold text-red-600">{rt.in_use || 0}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-blue-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <BatteryCharging className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-xs text-slate-500">In Carica</span>
                                </div>
                                <span className="text-3xl font-bold text-blue-600">{rt.charging || 0}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-amber-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <ParkingCircle className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <span className="text-xs text-slate-500">Fermi</span>
                                </div>
                                <span className="text-3xl font-bold text-amber-600">{rt.parked || 0}</span>
                            </div>
                        </div>

                        {/* Period KPI */}
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-6">Periodo ({pd.days} giorni)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Totale Cicli</span>
                                <span className="text-2xl font-bold text-slate-900">{pd.total_cycles || 0}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-emerald-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Conformità 6h</span>
                                <span className={`text-2xl font-bold ${(pd.compliance_rate_6h || 0) >= 80 ? 'text-emerald-600' : (pd.compliance_rate_6h || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {pd.compliance_rate_6h || 0}%
                                </span>
                            </div>
                            <div className="bg-white rounded-2xl border border-amber-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Prelievi Anticipati</span>
                                <span className="text-2xl font-bold text-amber-600">{pd.early_pickups || 0}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-red-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Batteria Critica Ignorata</span>
                                <span className="text-2xl font-bold text-red-600">{pd.critical_battery_ignored || 0}</span>
                            </div>
                        </div>

                        {/* Additional */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl border border-blue-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Messi in Carica</span>
                                <span className="text-2xl font-bold text-blue-600">{pd.charged || 0}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-amber-200 p-4">
                                <span className="text-xs text-slate-500 block mb-1">Ricariche Non Necessarie (≥30%)</span>
                                <span className="text-2xl font-bold text-amber-600">{pd.unnecessary_charges || 0}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════ */}
                {/*  TAB: OPERATORI                       */}
                {/* ══════════════════════════════════════ */}
                {section === 'operators' && (
                    <div className="space-y-3">
                        {operators.length === 0 && (
                            <div className="text-center py-16 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Nessun dato operatore nel periodo</p>
                            </div>
                        )}
                        {operators.map((op, idx) => {
                            const cfg = RATING_CONFIG[op.rating] || RATING_CONFIG.green;
                            const RatingIcon = cfg.icon;
                            return (
                                <motion.div
                                    key={op.operator_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`bg-white rounded-2xl border-2 ${cfg.border} p-4 shadow-sm`}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                                                <User className={`w-5 h-5 ${cfg.color}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{op.operator_name}</h4>
                                                <p className="text-xs text-slate-500">{op.total_cycles} cicli nel periodo</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                            <span className="text-xs font-bold">{cfg.label}</span>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Tasso Ricarica</div>
                                            <div className={`text-lg font-bold ${op.charge_rate >= 80 ? 'text-emerald-600' : op.charge_rate >= 50 ? 'text-amber-600' : 'text-red-600'
                                                }`}>{op.charge_rate}%</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Ricariche Inutili</div>
                                            <div className={`text-lg font-bold ${op.unnecessary_charge_rate <= 20 ? 'text-emerald-600' : op.unnecessary_charge_rate <= 50 ? 'text-amber-600' : 'text-red-600'
                                                }`}>{op.unnecessary_charge_rate}%</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Prelievi Anticipati</div>
                                            <div className={`text-lg font-bold ${op.early_pickup_rate <= 10 ? 'text-emerald-600' : op.early_pickup_rate <= 30 ? 'text-amber-600' : 'text-red-600'
                                                }`}>{op.early_pickup_rate}%</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center mt-2">
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Batt. Critica Ignorata</div>
                                            <div className={`text-lg font-bold ${op.critical_ignored === 0 ? 'text-emerald-600' : op.critical_ignored <= 3 ? 'text-amber-600' : 'text-red-600'
                                                }`}>{op.critical_ignored}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Media % Batteria</div>
                                            <div className="text-lg font-bold text-slate-700">{op.avg_battery_return}%</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <div className="text-xs text-slate-500 mb-0.5">Media Utilizzo</div>
                                            <div className="text-lg font-bold text-slate-700">{formatMinutes(op.avg_usage_minutes)}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* ══════════════════════════════════════ */}
                {/*  TAB: VEICOLI (Stato + Storico)       */}
                {/* ══════════════════════════════════════ */}
                {section === 'vehicles' && (
                    <div className="space-y-3">
                        {/* Vehicle Cards */}
                        {vehicles.filter(v => v.vehicle_status !== 'blocked').map(v => {
                            const isExpanded = selectedVehicle === v.id;
                            return (
                                <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => {
                                            if (isExpanded) {
                                                setSelectedVehicle(null);
                                                setVehicleHistory(null);
                                            } else {
                                                loadVehicleHistory(v.id);
                                            }
                                        }}
                                        className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ForkliftIcon className="w-7 h-7" color={
                                                v.charge_status === 'in_use' ? '#ef4444'
                                                    : v.charge_status === 'charging' ? '#3b82f6'
                                                        : v.charge_status === 'parked' ? '#f59e0b'
                                                            : '#10b981'
                                            } />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{v.internal_code}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                                        ${v.charge_status === 'in_use' ? 'bg-red-50 text-red-700'
                                                            : v.charge_status === 'charging' ? 'bg-blue-50 text-blue-700'
                                                                : v.charge_status === 'parked' ? 'bg-amber-50 text-amber-700'
                                                                    : 'bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                        {v.charge_status === 'in_use' ? `In Uso (${v.current_operator})`
                                                            : v.charge_status === 'charging'
                                                                ? `In Carica${v.charge_remaining_minutes > 0 ? ` — ${formatMinutes(v.charge_remaining_minutes)} restanti` : ' ✅'}`
                                                                : v.charge_status === 'parked' ? `Fermo @ B${v.last_banchina || '?'}`
                                                                    : 'Disponibile'
                                                        }
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500">{v.brand} · {v.vehicle_type}</span>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                    </button>

                                    {/* Expanded: Vehicle History */}
                                    <AnimatePresence>
                                        {isExpanded && vehicleHistory && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-slate-100 overflow-hidden"
                                            >
                                                <div className="p-4 bg-slate-50">
                                                    <div className="flex items-center gap-4 mb-3 text-sm text-slate-600">
                                                        <span><strong>{vehicleHistory.stats?.total_cycles}</strong> cicli</span>
                                                        <span>Media utilizzo: <strong>{formatMinutes(vehicleHistory.stats?.avg_usage_minutes)}</strong></span>
                                                    </div>
                                                    {vehicleHistory.cycles?.length > 0 ? (
                                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                                            {vehicleHistory.cycles.map(c => (
                                                                <div key={c.id} className="bg-white rounded-xl p-3 border border-slate-200 text-sm group relative">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="font-medium text-slate-900">
                                                                            {c.pickup_time ? new Date(c.pickup_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--'}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                                                                ${c.status === 'in_use' ? 'bg-red-50 text-red-700'
                                                                                    : c.status === 'charging' ? 'bg-blue-50 text-blue-700'
                                                                                        : c.status === 'parked' ? 'bg-amber-50 text-amber-700'
                                                                                            : 'bg-slate-100 text-slate-600'
                                                                                }`}>
                                                                                {c.status === 'completed' ? (c.return_type === 'charge' ? 'Caricato' : 'Parcheggiato')
                                                                                    : c.status}
                                                                            </span>
                                                                            {c.status !== 'in_use' && (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                                                                                    disabled={deletingCycleId === c.id}
                                                                                    className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                                                    title="Elimina ciclo"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 space-y-0.5">
                                                                        <div className="flex items-center gap-1">
                                                                            <User className="w-3 h-3" /> Prelievo: {c.operator_name} ({c.pickup_battery_pct}%)
                                                                        </div>
                                                                        {c.return_time && (
                                                                            <div className="flex items-center gap-1">
                                                                                {c.return_type === 'charge'
                                                                                    ? <BatteryCharging className="w-3 h-3 text-blue-500" />
                                                                                    : <ParkingCircle className="w-3 h-3 text-amber-500" />
                                                                                }
                                                                                Ric: {c.return_operator_name || c.operator_name} ({c.return_battery_pct}%)
                                                                                {c.return_banchina_code && ` @ B${c.return_banchina_code}`}
                                                                            </div>
                                                                        )}
                                                                        {c.early_pickup && (
                                                                            <div className="flex items-center gap-1 text-amber-600">
                                                                                <AlertTriangle className="w-3 h-3" /> Anticipato: {c.early_pickup_reason}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-400 text-center py-4 text-sm">Nessuno storico</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Delete Confirmation Modal ── */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
                    >
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Elimina Ciclo</h3>
                            <p className="text-sm text-slate-600 mt-2">
                                Stai per eliminare il ciclo di <strong>{confirmDelete.operator_name}</strong>
                                {confirmDelete.pickup_time && (
                                    <> del <strong>{new Date(confirmDelete.pickup_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></>
                                )}
                                . Questa azione è <strong className="text-red-600">irreversibile</strong>.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleDeleteCycle(confirmDelete.id)}
                                disabled={deletingCycleId === confirmDelete.id}
                                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors cursor-pointer"
                            >
                                {deletingCycleId === confirmDelete.id ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Eliminazione...
                                    </div>
                                ) : (
                                    '🗑️ Conferma Eliminazione'
                                )}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="w-full py-3 rounded-xl border border-slate-300 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
