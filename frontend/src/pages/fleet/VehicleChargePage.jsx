/**
 * VehicleChargePage.jsx — Ricarica Mezzi (Operatore)
 * Mobile-first interface per prelievo e riconsegna veicoli.
 * 
 * Flow: Lista Veicoli → Prelievo/Riconsegna → Conferma
 */
import { useState, useEffect, useCallback } from 'react';
import { chargeApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI, StandardModal } from '../../components/ui/CustomUI';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Battery, BatteryCharging, BatteryWarning, BatteryFull,
    MapPin, Clock, User, AlertTriangle, ShieldAlert, X,
    ArrowLeft, Check, Zap, ParkingCircle, ChevronRight,
    Lock, RefreshCw, Star, StarOff
} from 'lucide-react';

// ── SVG Forklift Icon ──
const ForkliftIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 16V18H2V16H4ZM4 16H6V12H2V16H4Z" fill={color} />
        <path d="M12 5V18H10V5H12ZM14 18H18C19.1 18 20 17.1 20 16V9L15 6H14V18ZM15 8L18.5 10V16H14V8H15Z" fill={color} />
        <path d="M6 18H8V5H6V18Z" fill={color} />
        <path d="M22 18H20V16H22V18Z" fill={color} />
        <circle cx="7" cy="19" r="2" fill={color} />
        <circle cx="17" cy="19" r="2" fill={color} />
        <rect x="2" y="14" width="8" height="2" fill={color} />
    </svg>
);

// ── Constants ──
const BATTERY_OPTIONS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BANCHINA_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16];

const VEHICLE_TYPE_LABELS = {
    forklift: 'Muletto',
    retractable: 'Retrattile',
    transpallet: 'Transpallet',
    ple: 'PLE',
    truck: 'Camion',
};

const STATUS_CONFIG = {
    available: { label: 'Disponibile', color: 'emerald', emoji: '🟢', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    in_use: { label: 'In Uso', color: 'red', emoji: '🔴', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    charging: { label: 'In Carica', color: 'blue', emoji: '🔵', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    parked: { label: 'Fermo', color: 'amber', emoji: '🟡', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
};

// ── Battery color helper ──
const batteryColor = (pct) => {
    if (pct <= 20) return 'text-red-500';
    if (pct <= 40) return 'text-amber-500';
    if (pct <= 60) return 'text-yellow-500';
    return 'text-emerald-500';
};

const batteryBgColor = (pct) => {
    if (pct <= 20) return 'bg-red-500';
    if (pct <= 40) return 'bg-amber-500';
    if (pct <= 60) return 'bg-yellow-500';
    return 'bg-emerald-500';
};

// ── Time format helper ──
const formatMinutes = (mins) => {
    if (!mins && mins !== 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};


export default function VehicleChargePage() {
    const { user, hasPermission } = useAuth();
    const { toast } = useUI();

    // ── State ──
    const [vehicles, setVehicles] = useState([]);
    const [myActive, setMyActive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Step flow
    const [step, setStep] = useState('list'); // list | pickup | return
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedBattery, setSelectedBattery] = useState(null);
    const [selectedBanchina, setSelectedBanchina] = useState(null);
    const [returnType, setReturnType] = useState(null); // 'charge' | 'park'
    const [earlyReason, setEarlyReason] = useState('');

    // Modals
    const [earlyWarning, setEarlyWarning] = useState(null);
    const [batteryWarning, setBatteryWarning] = useState(null);
    const [confirmWarning, setConfirmWarning] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // ── Load Data ──
    const loadData = useCallback(async () => {
        try {
            const vehiclesData = await chargeApi.getVehicles();
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        } catch (err) {
            console.error('Errore caricamento veicoli:', err?.response?.status, err?.message);
            setVehicles([]);
        }
        try {
            const myActiveData = await chargeApi.getMyActive();
            setMyActive(myActiveData || null);
        } catch (err) {
            console.error('Errore caricamento mezzo attivo:', err?.response?.status, err?.message);
            setMyActive(null);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // ── Pickup Flow ──
    const handleVehicleClick = (vehicle) => {
        if (vehicle.charge_status === 'in_use') {
            toast.error(`🔴 Veicolo in uso da ${vehicle.current_operator}`);
            return;
        }
        if (vehicle.vehicle_status === 'blocked') {
            toast.error('⛔ Veicolo bloccato per sicurezza');
            return;
        }
        if (myActive) {
            toast.error('⚠️ Hai già un veicolo in uso. Riconsegnalo prima.');
            return;
        }
        setSelectedVehicle(vehicle);
        setSelectedBattery(null);
        setStep('pickup');
    };

    const handlePickupConfirm = async () => {
        if (!selectedBattery) {
            toast.error('Seleziona la % di batteria');
            return;
        }

        // Check if vehicle was charging and < 6h
        if (selectedVehicle.charge_status === 'charging' &&
            selectedVehicle.charge_remaining_minutes > 0) {
            setEarlyWarning(selectedVehicle);
            return;
        }

        await executePickup();
    };

    const executePickup = async (reason = null) => {
        setSubmitting(true);
        try {
            const data = { battery_pct: selectedBattery };
            if (reason) data.early_reason = reason;

            await chargeApi.pickup(selectedVehicle.id, data);
            toast.success(`✅ Veicolo ${selectedVehicle.internal_code} prelevato!`);

            setStep('list');
            setSelectedVehicle(null);
            setSelectedBattery(null);
            setEarlyWarning(null);
            setEarlyReason('');
            await loadData();
        } catch (err) {
            const detail = err.response?.data?.detail || 'Errore durante il prelievo';
            // If early pickup required, show the warning
            if (err.response?.status === 422 && detail.includes('early_reason')) {
                setEarlyWarning(selectedVehicle);
            } else {
                toast.error(detail);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Return Flow ──
    const handleReturn = () => {
        if (!myActive) return;
        setSelectedVehicle(myActive.vehicle);
        setSelectedBattery(null);
        setSelectedBanchina(null);
        setReturnType(null);
        setStep('return');
    };

    const handleReturnConfirm = async () => {
        if (!selectedBattery) {
            toast.error('Seleziona la % di batteria');
            return;
        }
        if (!returnType) {
            toast.error('Seleziona come vuoi lasciare il mezzo');
            return;
        }
        if (returnType === 'park' && !selectedBanchina) {
            toast.error('Seleziona la banchina');
            return;
        }

        // Warnings
        if (returnType === 'charge' && selectedBattery >= 30) {
            setBatteryWarning('sufficient');
            return;
        }
        if (returnType === 'park' && selectedBattery <= 20) {
            setBatteryWarning('critical');
            return;
        }

        await executeReturn();
    };

    const executeReturn = async () => {
        setSubmitting(true);
        try {
            const data = {
                battery_pct: selectedBattery,
                return_type: returnType,
            };
            if (returnType === 'park') data.banchina_id = selectedBanchina;

            const res = await chargeApi.returnVehicle(myActive.cycle.id, data);

            const warnings = res.warnings || [];
            if (warnings.length > 0) {
                setConfirmWarning(warnings);
            } else {
                toast.success(res.message);
            }

            setStep('list');
            setSelectedVehicle(null);
            setSelectedBattery(null);
            setSelectedBanchina(null);
            setReturnType(null);
            setBatteryWarning(null);
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore durante la riconsegna');
        } finally {
            setSubmitting(false);
        }
    };

    const resetToList = () => {
        setStep('list');
        setSelectedVehicle(null);
        setSelectedBattery(null);
        setSelectedBanchina(null);
        setReturnType(null);
        setEarlyWarning(null);
        setEarlyReason('');
        setBatteryWarning(null);
    };


    // ════════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Caricamento mezzi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">

            {/* ── Header ── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    {step !== 'list' ? (
                        <button onClick={resetToList} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Indietro</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <BatteryCharging className="w-5 h-5 text-blue-600" />
                            <h1 className="text-lg font-bold text-slate-900">Ricarica Mezzi</h1>
                        </div>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4">
                <AnimatePresence mode="wait">

                    {/* ════════════════════════════════════════ */}
                    {/*  STEP: LISTA VEICOLI                    */}
                    {/* ════════════════════════════════════════ */}
                    {step === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                            {/* My Active Vehicle Banner */}
                            {myActive && (
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="mb-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <ForkliftIcon className="w-6 h-6" color="white" />
                                            <span className="font-bold text-lg">Il Tuo Mezzo</span>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                                            {myActive.vehicle?.internal_code}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-blue-100 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Battery className="w-4 h-4" /> {myActive.cycle?.pickup_battery_pct}%
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" /> {formatMinutes(myActive.cycle?.usage_minutes)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleReturn}
                                        className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors"
                                    >
                                        🔄 Riconsegna Mezzo
                                    </button>
                                </motion.div>
                            )}

                            {/* Vehicle List */}
                            <div className="space-y-2">
                                {vehicles.filter(v => v.vehicle_status !== 'blocked').map(vehicle => {
                                    const cfg = STATUS_CONFIG[vehicle.charge_status] || STATUS_CONFIG.available;
                                    const isMyVehicle = myActive?.vehicle?.id === vehicle.id;

                                    return (
                                        <motion.button
                                            key={vehicle.id}
                                            onClick={() => handleVehicleClick(vehicle)}
                                            disabled={vehicle.charge_status === 'in_use' || isMyVehicle}
                                            className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]
                                                ${isMyVehicle
                                                    ? 'border-blue-400 bg-blue-50 opacity-60'
                                                    : vehicle.charge_status === 'in_use'
                                                        ? `${cfg.border} ${cfg.bg} opacity-60 cursor-not-allowed`
                                                        : `${cfg.border} ${cfg.bg} hover:shadow-md cursor-pointer`
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                                                        <ForkliftIcon className="w-7 h-7" color={
                                                            vehicle.charge_status === 'in_use' ? '#ef4444'
                                                                : vehicle.charge_status === 'charging' ? '#3b82f6'
                                                                    : vehicle.charge_status === 'parked' ? '#f59e0b'
                                                                        : '#10b981'
                                                        } />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 text-lg">
                                                                {vehicle.internal_code}
                                                            </span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {vehicle.brand} · {VEHICLE_TYPE_LABELS[vehicle.vehicle_type] || vehicle.vehicle_type}
                                                        </div>
                                                    </div>
                                                </div>

                                                {vehicle.charge_status === 'available' && !isMyVehicle && (
                                                    <ChevronRight className="w-5 h-5 text-emerald-400" />
                                                )}
                                            </div>

                                            {/* Status Details */}
                                            {vehicle.charge_status === 'in_use' && (
                                                <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                                                    <User className="w-3.5 h-3.5" /> {vehicle.current_operator}
                                                </div>
                                            )}
                                            {vehicle.charge_status === 'charging' && (
                                                <div className="mt-2 flex items-center gap-3 text-xs">
                                                    <span className={`flex items-center gap-1 ${batteryColor(vehicle.battery_pct || 0)}`}>
                                                        <BatteryCharging className="w-3.5 h-3.5" /> {vehicle.battery_pct}%
                                                    </span>
                                                    <span className="flex items-center gap-1 text-blue-600">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {vehicle.charge_remaining_minutes > 0
                                                            ? `Mancano ${formatMinutes(vehicle.charge_remaining_minutes)}`
                                                            : '✅ Carica completa!'
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {vehicle.charge_status === 'parked' && (
                                                <div className="mt-2 flex items-center gap-3 text-xs">
                                                    <span className={`flex items-center gap-1 ${batteryColor(vehicle.battery_pct || 0)}`}>
                                                        <Battery className="w-3.5 h-3.5" /> {vehicle.battery_pct}%
                                                    </span>
                                                    {vehicle.last_banchina && (
                                                        <span className="flex items-center gap-1 text-amber-600">
                                                            <MapPin className="w-3.5 h-3.5" /> Banchina {vehicle.last_banchina}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {vehicles.length === 0 && (
                                <div className="text-center py-16 text-slate-400">
                                    <ForkliftIcon className="w-16 h-16 mx-auto mb-3" color="#94a3b8" />
                                    <p>Nessun veicolo disponibile</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════ */}
                    {/*  STEP: PRELIEVO                         */}
                    {/* ════════════════════════════════════════ */}
                    {step === 'pickup' && selectedVehicle && (
                        <motion.div key="pickup" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}>

                            {/* Vehicle Info */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <ForkliftIcon className="w-8 h-8" color="#3b82f6" />
                                    <div>
                                        <h2 className="font-bold text-xl text-slate-900">{selectedVehicle.internal_code}</h2>
                                        <p className="text-sm text-slate-500">{selectedVehicle.brand} · {VEHICLE_TYPE_LABELS[selectedVehicle.vehicle_type]}</p>
                                    </div>
                                </div>
                                {selectedVehicle.charge_status === 'charging' && (
                                    <div className="mt-3 bg-blue-50 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                                        <BatteryCharging className="w-5 h-5" />
                                        <span>
                                            In carica — {selectedVehicle.charge_remaining_minutes > 0
                                                ? `Mancano ${formatMinutes(selectedVehicle.charge_remaining_minutes)}`
                                                : 'Carica completa ✅'
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Battery Selection */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Battery className="w-5 h-5 text-slate-400" />
                                    Percentuale Batteria
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {BATTERY_OPTIONS.map(pct => (
                                        <button
                                            key={pct}
                                            onClick={() => setSelectedBattery(pct)}
                                            className={`py-3 rounded-xl font-bold text-lg transition-all active:scale-95
                                                ${selectedBattery === pct
                                                    ? `${batteryBgColor(pct)} text-white shadow-md scale-105`
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <button
                                onClick={handlePickupConfirm}
                                disabled={!selectedBattery || submitting}
                                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]
                                    ${selectedBattery
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {submitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Prelievo in corso...
                                    </div>
                                ) : (
                                    `🚀 Preleva Veicolo ${selectedVehicle.internal_code}`
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════ */}
                    {/*  STEP: RICONSEGNA                       */}
                    {/* ════════════════════════════════════════ */}
                    {step === 'return' && myActive && (
                        <motion.div key="return" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}>

                            {/* Vehicle Info */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <ForkliftIcon className="w-8 h-8" color="#3b82f6" />
                                    <div>
                                        <h2 className="font-bold text-xl text-slate-900">{myActive.vehicle?.internal_code}</h2>
                                        <p className="text-sm text-slate-500">In uso da {formatMinutes(myActive.cycle?.usage_minutes)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Return Type Selection */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3">Cosa vuoi fare?</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { setReturnType('charge'); setSelectedBanchina(null); }}
                                        className={`py-6 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95
                                            ${returnType === 'charge'
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-blue-300'
                                            }`}
                                    >
                                        <Zap className={`w-8 h-8 ${returnType === 'charge' ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <span className={`font-bold text-sm ${returnType === 'charge' ? 'text-blue-700' : 'text-slate-600'}`}>
                                            🔌 Metti in Carica
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setReturnType('park')}
                                        className={`py-6 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95
                                            ${returnType === 'park'
                                                ? 'border-amber-500 bg-amber-50 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-amber-300'
                                            }`}
                                    >
                                        <ParkingCircle className={`w-8 h-8 ${returnType === 'park' ? 'text-amber-600' : 'text-slate-400'}`} />
                                        <span className={`font-bold text-sm ${returnType === 'park' ? 'text-amber-700' : 'text-slate-600'}`}>
                                            📍 Lascio Mezzo
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Battery Selection */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Battery className="w-5 h-5 text-slate-400" />
                                    Batteria Attuale
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {BATTERY_OPTIONS.map(pct => (
                                        <button
                                            key={pct}
                                            onClick={() => setSelectedBattery(pct)}
                                            className={`py-3 rounded-xl font-bold text-lg transition-all active:scale-95
                                                ${selectedBattery === pct
                                                    ? `${batteryBgColor(pct)} text-white shadow-md scale-105`
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Banchina Selection (only for park) */}
                            <AnimatePresence>
                                {returnType === 'park' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-slate-400" />
                                                Banchina
                                            </h3>
                                            <div className="grid grid-cols-4 gap-2">
                                                {BANCHINA_OPTIONS.map(b => (
                                                    <button
                                                        key={b}
                                                        onClick={() => setSelectedBanchina(b)}
                                                        className={`py-3 rounded-xl font-bold text-lg transition-all active:scale-95
                                                            ${selectedBanchina === b
                                                                ? 'bg-amber-500 text-white shadow-md scale-105'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {b}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Confirm Button */}
                            <button
                                onClick={handleReturnConfirm}
                                disabled={!selectedBattery || !returnType || (returnType === 'park' && !selectedBanchina) || submitting}
                                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]
                                    ${(selectedBattery && returnType && (returnType === 'charge' || selectedBanchina))
                                        ? returnType === 'charge'
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-amber-600 text-white hover:bg-amber-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {submitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Riconsegna in corso...
                                    </div>
                                ) : returnType === 'charge' ? (
                                    '🔌 Conferma Messa in Carica'
                                ) : returnType === 'park' ? (
                                    '📍 Conferma Lascio Mezzo'
                                ) : (
                                    'Seleziona un\'opzione'
                                )}
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>


            {/* ════════════════════════════════════════════════ */}
            {/*  MODALS                                         */}
            {/* ════════════════════════════════════════════════ */}

            {/* Early Pickup Warning */}
            {earlyWarning && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                    >
                        <div className="text-center mb-4">
                            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-2" />
                            <h3 className="text-xl font-bold text-slate-900">⚠️ Carica Insufficiente</h3>
                            <p className="text-sm text-slate-600 mt-2">
                                Stai togliendo il veicolo dalla carica prima delle 6 ore previste.
                                {earlyWarning.charge_remaining_minutes > 0 && (
                                    <> Mancano ancora <strong>{formatMinutes(earlyWarning.charge_remaining_minutes)}</strong>.</>
                                )}
                            </p>
                        </div>
                        <textarea
                            value={earlyReason}
                            onChange={(e) => setEarlyReason(e.target.value)}
                            placeholder="Scrivi il motivo del prelievo anticipato..."
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 mb-4"
                            rows={3}
                        />
                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    if (!earlyReason.trim()) {
                                        toast.error('Inserisci il motivo');
                                        return;
                                    }
                                    executePickup(earlyReason.trim());
                                }}
                                disabled={submitting || !earlyReason.trim()}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all
                                    ${earlyReason.trim()
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {submitting ? 'Prelievo...' : '⚡ PROCEDI COMUNQUE'}
                            </button>
                            <button
                                onClick={() => { setEarlyWarning(null); setEarlyReason(''); }}
                                className="w-full py-3 rounded-xl border border-slate-300 text-slate-600 font-medium text-sm hover:bg-slate-50"
                            >
                                Annulla
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Battery Warning (sufficient / critical) */}
            {batteryWarning && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                    >
                        {batteryWarning === 'sufficient' ? (
                            <>
                                <div className="text-center mb-4">
                                    <BatteryFull className="w-16 h-16 text-amber-500 mx-auto mb-2" />
                                    <h3 className="text-xl font-bold text-slate-900">⚠️ Batteria Sufficiente</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        La batteria è al <strong>{selectedBattery}%</strong> (≥ 30%).
                                        Non è necessario metterlo in carica. Vuoi procedere comunque?
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => { setBatteryWarning(null); executeReturn(); }}
                                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
                                    >
                                        🔌 Sì, Metti in Carica
                                    </button>
                                    <button
                                        onClick={() => setBatteryWarning(null)}
                                        className="w-full py-3 rounded-xl border border-slate-300 text-slate-600 font-medium text-sm hover:bg-slate-50"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-4">
                                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-2" />
                                    <h3 className="text-xl font-bold text-red-700">⛔ BATTERIA CRITICA</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        Stai lasciando il mezzo con solo <strong className="text-red-600">{selectedBattery}%</strong> di batteria
                                        senza caricarlo. Il mezzo potrebbe <strong>non essere utilizzabile domani!</strong>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => { setBatteryWarning(null); executeReturn(); }}
                                        className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700"
                                    >
                                        ⚠️ Procedi — Mi assumo la responsabilità
                                    </button>
                                    <button
                                        onClick={() => { setBatteryWarning(null); setReturnType('charge'); }}
                                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
                                    >
                                        🔌 Mettilo in Carica Invece
                                    </button>
                                    <button
                                        onClick={() => setBatteryWarning(null)}
                                        className="w-full py-3 rounded-xl border border-slate-300 text-slate-600 font-medium text-sm hover:bg-slate-50"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Post-Return Warnings (unplug battery, etc.) */}
            {confirmWarning && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                    >
                        <div className="text-center mb-4">
                            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-2" />
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Attenzione</h3>
                            <div className="space-y-2">
                                {confirmWarning.map((w, i) => (
                                    <p key={i} className="text-sm font-medium text-slate-700 bg-amber-50 rounded-xl p-3">
                                        {w}
                                    </p>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => { setConfirmWarning(null); toast.success('✅ Riconsegna completata!'); }}
                            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                        >
                            ✅ Ho Capito
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
