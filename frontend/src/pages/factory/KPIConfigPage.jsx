/**
 * KPI Configurator Page
 * Registrazione giornaliera KPI produzione con panoramica stati.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { kpiApi } from '../../api/client';

// Causali fermo disponibili
const DOWNTIME_REASONS = [
    { value: '', label: '-- Nessuna --' },
    { value: 'mancanza_materiale', label: 'Mancanza Materiale' },
    { value: 'manutenzione', label: 'Manutenzione' },
    { value: 'setup', label: 'Setup' },
    { value: 'altro', label: 'Altro (specifica)' },
];

// Quick downtime values
const DOWNTIME_QUICK = [0.25, 0.50, 0.75, 1.00];

// Shift types
const SHIFTS = [
    { id: 'morning', label: 'Mattino', time: '6:00 - 14:00', color: 'bg-red-600', hover: 'hover:bg-red-500' },
    { id: 'afternoon', label: 'Pomeriggio', time: '14:00 - 22:00', color: 'bg-yellow-600', hover: 'hover:bg-yellow-500' },
    { id: 'night', label: 'Notte', time: '22:00 - 6:00', color: 'bg-blue-600', hover: 'hover:bg-blue-500' },
    { id: 'custom', label: 'Centrale', time: '08:00 - 17:00', color: 'bg-purple-600', hover: 'hover:bg-purple-500' },
];

export default function KpiConfigPage() {
    // State
    const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState('morning');
    const [selectedConfigId, setSelectedConfigId] = useState(null);

    const [configs, setConfigs] = useState([]);
    const [panoramica, setPanoramica] = useState([]);
    const [entries, setEntries] = useState([]);
    const [operators, setOperators] = useState([]); // NEW: Operators List

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // State for filtering sidebar
    const [hideEmpty, setHideEmpty] = useState(false);

    // NEW: Mobile Master/Detail State
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Configurazione Modal Conferma
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        onConfirm: null
    });

    // Form state
    const [form, setForm] = useState({
        hoursTotal: 8,
        hoursDowntime: 0,
        quantityProduced: '',
        downtimeReason: '',
        downtimeNotes: '',
    });

    // Ref per focus gestione tastiera
    const confirmBtnRef = useRef(null);

    // Initial Load & Refresh
    useEffect(() => {
        loadData();
    }, [workDate]);

    // Handle Keyboard for Modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (confirmModal.isOpen && e.key === 'Enter') {
                e.preventDefault();
                confirmModal.onConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal]);

    // NEW: Load Operators when selection changes
    useEffect(() => {
        const fetchOperators = async () => {
            if (!selectedConfigId || !selectedShift) return;

            // Find config to get sector name details
            const config = configs.find(c => c.id === selectedConfigId);
            if (!config) return;

            try {
                const res = await kpiApi.getOperators(config.sector_name, workDate, selectedShift);
                setOperators(Array.isArray(res) ? res : (res?.data || []));
            } catch (err) {
                console.error("Failed to load operators:", err);
                setOperators([]);
            }
        };

        fetchOperators();
    }, [selectedConfigId, selectedShift, workDate, configs]);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const [cfgRes, panRes, entRes] = await Promise.all([
                kpiApi.getConfigs(),
                kpiApi.getPanoramica(workDate),
                kpiApi.getEntries(workDate),
            ]);

            // Handle both axios response (.data) and direct data
            const cfgData = Array.isArray(cfgRes) ? cfgRes : (cfgRes?.data || []);
            const panData = Array.isArray(panRes) ? panRes : (panRes?.data || []);
            const entData = Array.isArray(entRes) ? entRes : (entRes?.data || []);

            setConfigs(cfgData);
            setPanoramica(panData);
            setEntries(entData);

            // Auto-select first config if none selected
            if (!selectedConfigId && cfgData.length > 0) {
                setSelectedConfigId(cfgData[0].id);
            }
        } catch (err) {
            console.error('KPI Load Error:', err);
            setError('Errore caricamento dati: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    }

    // Load entry when selection changes
    useEffect(() => {
        if (selectedConfigId) {
            loadEntryForSelection();
        }
    }, [selectedConfigId, selectedShift, entries]);

    // Help: Get default hours based on day
    function getDefaultHours() {
        if (!workDate) return 8;
        const day = new Date(workDate).getDay(); // 0=Sun, 6=Sat
        return day === 6 ? 4.5 : 8;
    }

    function resetForm() {
        setForm({
            hoursTotal: getDefaultHours(),
            hoursDowntime: 0,
            quantityProduced: '',
            downtimeReason: '',
            downtimeNotes: '',
        });
    }

    function loadEntryForSelection() {
        const existing = entries.find(
            e => e.kpi_config_id === selectedConfigId && e.shift_type === selectedShift
        );

        if (existing) {
            setForm({
                hoursTotal: existing.hours_total || getDefaultHours(),
                hoursDowntime: existing.hours_downtime || 0,
                quantityProduced: existing.quantity_produced || '',
                downtimeReason: existing.downtime_reason || '',
                downtimeNotes: existing.downtime_notes || '',
            });
        } else {
            resetForm();
        }
    }

    // Current config
    const selectedConfig = useMemo(() => {
        if (!configs || configs.length === 0) return null;
        return configs.find(c => c.id === selectedConfigId) || null;
    }, [configs, selectedConfigId]);

    // Current Panoramica Item (per stats operatori)
    const currentPanoramica = useMemo(() => {
        if (!panoramica) return null;
        return panoramica.find(p => p.config_id === selectedConfigId);
    }, [panoramica, selectedConfigId]);

    // Check operatori presenti per il turno selezionato
    const hasOperators = useMemo(() => {
        if (!currentPanoramica) return true; // Fallback se dati non pronti
        const opsKey = selectedShift + '_ops';
        // Se la proprietà non esiste ancora (vecchio backend), assumi true per non bloccare
        if (currentPanoramica[opsKey] === undefined) return true;
        return currentPanoramica[opsKey] > 0;
    }, [currentPanoramica, selectedShift]);

    // Calculate derived values
    const calculated = useMemo(() => {
        // Logica orario centrale: -1 ora break automatica
        const deduction = selectedShift === 'custom' ? 1.0 : 0.0;

        const hoursNet = Math.max(0, (form.hoursTotal || 0) - (form.hoursDowntime || 0) - deduction);
        const qty = parseInt(form.quantityProduced) || 0;
        const qtyPerHour = hoursNet > 0 ? qty / hoursNet : 0;
        const target = selectedConfig?.kpi_target_hourly || 1;
        const efficiency = (qtyPerHour / target) * 100;

        return { hoursNet, qtyPerHour, efficiency, deduction };
    }, [form, selectedConfig, selectedShift]);

    // Handle quick downtime button
    function addDowntime(value) {
        setForm(f => ({
            ...f,
            hoursDowntime: Math.min(f.hoursTotal || 8, (f.hoursDowntime || 0) + value)
        }));
    }

    // Determine Logic for Next Step (Smart Skip)
    function getNextStepInfo() {
        const shiftOrder = ['morning', 'afternoon', 'night', 'custom'];

        // Build flat list of ALL valid steps (where ops > 0)
        const validSteps = [];

        configs.forEach(cfg => {
            const panItem = panoramica.find(p => p.config_id === cfg.id);
            if (!panItem) return;

            shiftOrder.forEach(shiftId => {
                const opsKey = shiftId + '_ops';
                const hasOps = panItem[opsKey] > 0;

                // Add to valid steps if it has operators
                // OR if it's the current selected (to handle edge case where we are on an empty one)
                if (hasOps || (cfg.id === selectedConfigId && selectedShift === shiftId)) {
                    validSteps.push({
                        configId: cfg.id,
                        shiftId: shiftId,
                        sectorName: cfg.sector_name,
                        shiftLabel: SHIFTS.find(s => s.id === shiftId)?.label
                    });
                }
            });
        });

        // Find current position
        const currentIndex = validSteps.findIndex(
            s => s.configId === selectedConfigId && s.shiftId === selectedShift
        );

        if (currentIndex !== -1 && currentIndex < validSteps.length - 1) {
            const next = validSteps[currentIndex + 1];

            // Determine if next step is same sector or new sector
            const isNewSector = next.configId !== selectedConfigId;

            return {
                type: isNewSector ? 'sector' : 'shift',
                targetId: isNewSector ? next.configId : next.shiftId,
                shiftTarget: next.shiftId, // Need this for sector switch too
                label: isNewSector
                    ? `Settore ${next.sectorName} (${next.shiftLabel})`
                    : `Turno ${next.shiftLabel}`,
                isNewSector
            };
        }

        return {
            type: 'finish',
            label: 'Completato'
        };
    }

    // Handle Pre-Submit (Open Confirmation)
    function handlePreSubmit(e) {
        e.preventDefault();
        if (!selectedConfigId || !form.quantityProduced) return;

        const nextStep = getNextStepInfo();
        const currentShiftLabel = SHIFTS.find(s => s.id === selectedShift)?.label;
        const sectorName = selectedConfig?.sector_name || '';

        setConfirmModal({
            isOpen: true,
            message: `Stai salvando ${sectorName} (${currentShiftLabel}).\nIl prossimo passaggio sarà: ${nextStep.label}.\nProcedi?`,
            onConfirm: () => performSubmit(nextStep)
        });
    }

    // Actual Submit Logic
    async function performSubmit(nextStep) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        try {
            await kpiApi.createEntry({
                kpi_config_id: selectedConfigId,
                work_date: workDate,
                shift_type: selectedShift,
                hours_total: form.hoursTotal || 8,
                hours_downtime: form.hoursDowntime || 0,
                quantity_produced: parseInt(form.quantityProduced) || 0,
                downtime_reason: form.downtimeReason || null,
                downtime_notes: form.downtimeNotes || null,
            });

            // Reload data to refresh panoramica dots
            await loadData();

            // Navigate to Next
            if (nextStep.type === 'shift') {
                setSelectedShift(nextStep.targetId);
            } else if (nextStep.type === 'sector') {
                setSelectedConfigId(nextStep.targetId);
                setSelectedShift(nextStep.shiftTarget); // Use the calculated valid shift
            } else {
                // Finish logic
                alert("🎉 Tutti i settori completati!");
            }

        } catch (err) {
            setError('Errore salvataggio: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    }

    // Get status color for panoramica
    function getStatusColor(status) {
        switch (status) {
            case 'complete': return 'bg-green-500';
            case 'partial': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    }

    // Get current entry for staffing display
    const currentEntry = useMemo(() => {
        if (!entries || entries.length === 0) return null;
        return entries.find(
            e => e.kpi_config_id === selectedConfigId && e.shift_type === selectedShift
        ) || null;
    }, [entries, selectedConfigId, selectedShift]);

    // Count completed
    const completedCount = useMemo(() => {
        if (!panoramica || panoramica.length === 0) return 0;
        const shiftKey = selectedShift + '_status';
        return panoramica.filter(p => p && p[shiftKey] === 'complete').length;
    }, [panoramica, selectedShift]);

    // Loading state
    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">⚙️ Inserimento Dati KPI</h1>
                <p className="text-gray-400">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">⚙️ Inserimento Dati KPI</h1>
                <div className="flex items-center gap-4">
                    <label className="text-gray-400">Data:</label>
                    <input
                        type="date"
                        value={workDate}
                        onChange={e => setWorkDate(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="flex flex-col md:grid md:grid-cols-12 gap-6">
                {/* Panoramica Sidebar */}
                <div className={`w-full md:col-span-4 bg-gray-800 rounded-lg p-4 h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] flex-col ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold">📊 Panoramica</h2>
                            <button
                                onClick={() => setHideEmpty(!hideEmpty)}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${hideEmpty
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-transparent border-gray-600 text-gray-400 hover:text-white'
                                    }`}
                                title={hideEmpty ? "Mostra tutto" : "Nascondi settori senza operatori"}
                            >
                                {hideEmpty ? 'Filtro Attivo' : 'Filtra Vuoti'}
                            </button>
                        </div>
                        <span className="text-sm text-gray-400">
                            {completedCount}/{panoramica.length}
                        </span>
                    </div>

                    {/* Shift tabs */}
                    <div className="grid grid-cols-4 gap-1 mb-4">
                        {SHIFTS.map(shift => (
                            <button
                                key={shift.id}
                                onClick={() => setSelectedShift(shift.id)}
                                className={`py-2 px-1 rounded text-[10px] font-bold uppercase transition truncate ${selectedShift === shift.id
                                    ? shift.color + ' text-white scale-105 shadow-lg'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                                title={shift.label}
                            >
                                {shift.label}
                            </button>
                        ))}
                    </div>

                    {/* Sector list */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {panoramica.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                                Nessun settore configurato
                            </p>
                        ) : (
                            panoramica
                                .filter(item => {
                                    if (!hideEmpty) return true; // Show all if filter is off

                                    // Filter out sectors with 0 operators across ALL shifts
                                    // Unless data already exists (status != empty)
                                    const hasAnyOps = ['morning_ops', 'afternoon_ops', 'night_ops', 'custom_ops']
                                        .some(key => (item[key] || 0) > 0);

                                    const hasAnyData = ['morning_status', 'afternoon_status', 'night_status', 'custom_status']
                                        .some(key => item[key] !== 'empty');

                                    // If active config, always show
                                    if (item.config_id === selectedConfigId) return true;

                                    return hasAnyOps || hasAnyData;
                                })
                                .map(item => {
                                    if (!item) return null;
                                    const shiftKey = selectedShift + '_status';
                                    const status = item[shiftKey] || 'empty';
                                    const isSelected = item.config_id === selectedConfigId;

                                    // Check ops for current shift
                                    const opsKey = selectedShift + '_ops';
                                    const hasOps = item[opsKey] !== undefined ? item[opsKey] > 0 : true;

                                    return (
                                        <button
                                            key={item.config_id}
                                            onClick={() => {
                                                setSelectedConfigId(item.config_id);
                                                setShowMobileDetail(true); // Open detail on mobile
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-4 md:py-3 rounded-lg text-left transition group mb-2 md:mb-0 border border-transparent ${isSelected
                                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border-blue-500/50'
                                                : 'bg-gray-800 md:bg-gray-700/30 hover:bg-gray-700 text-gray-200 border-gray-700 md:border-transparent'
                                                }`}
                                        >
                                            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${getStatusColor(status)}`} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`truncate text-sm font-medium ${!hasOps && 'text-gray-500'}`}>
                                                        {item.sector_name}
                                                    </span>
                                                    {/* NO OP removed */}
                                                </div>
                                            </div>

                                            <div className="flex gap-1 opacity-80 group-hover:opacity-100">
                                                {/* Mini indicators for all shifts */}
                                                {['morning', 'afternoon', 'night', 'custom'].map(sKey => {
                                                    const ops = item[sKey + '_ops'] || 0;
                                                    const stat = item[sKey + '_status'] || 'empty';

                                                    if (ops === 0) {
                                                        // No operators -> "Barred" style
                                                        return (
                                                            <div key={sKey} className="w-1.5 h-4 flex items-center justify-center" title={`${sKey}: No Op`}>
                                                                <div className="w-0.5 h-full bg-gray-700/50 rounded-full"></div>
                                                            </div>
                                                        );
                                                    }
                                                    // Has operators -> Status dot
                                                    return (
                                                        <span
                                                            key={sKey}
                                                            className={`w-1.5 h-4 rounded-full transition-colors ${getStatusColor(stat)}`}
                                                            title={`${sKey}: ${stat}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </button>
                                    );
                                })
                        )}
                    </div>
                </div >

                {/* Form Area */}
                <div className={`w-full md:col-span-8 bg-gray-800 rounded-lg p-6 relative ${showMobileDetail ? 'block' : 'hidden md:block'}`}>

                    {/* Mobile Back Button */}
                    <div className="md:hidden mb-4 pb-2 border-b border-gray-700">
                        <button
                            onClick={() => setShowMobileDetail(false)}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                        >
                            <span>←</span>
                            <span className="font-bold">Torna alla lista</span>
                        </button>
                    </div>

                    {!hasOperators ? (
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg p-6 text-center">
                            <div className="text-6xl mb-4">🚫</div>
                            <h3 className="text-xl font-bold text-gray-200">Nessun operatore in questo turno</h3>
                            <p className="text-gray-400 mt-2">Non puoi registrare dati se non ci sono operatori assegnati.</p>
                            <button
                                onClick={() => setShowMobileDetail(false)}
                                className="mt-6 px-6 py-3 bg-gray-700 rounded-lg text-white font-bold md:hidden"
                            >
                                Torna Indietro
                            </button>
                        </div>
                    ) : null
                    }

                    {
                        selectedConfig ? (
                            <>
                                {/* Sector Header */}
                                <div className="mb-6 pb-4 border-b border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                                🏭 {selectedConfig.sector_name}
                                                <span className={`text-xs px-2 py-0.5 rounded uppercase ${SHIFTS.find(s => s.id === selectedShift)?.color
                                                    }`}>
                                                    {SHIFTS.find(s => s.id === selectedShift)?.label}
                                                </span>
                                            </h2>
                                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                                                <span className="bg-gray-700 px-2 py-1 rounded">Target: <strong>{selectedConfig.kpi_target_8h}</strong> pz/8h</span>
                                                <span className="bg-gray-700 px-2 py-1 rounded">Orario: <strong>{(selectedConfig.kpi_target_hourly || 0).toFixed(1)}</strong> pz/h</span>
                                            </div>
                                        </div>

                                        {/* Staffing info from API */}
                                        <div className="text-right">
                                            <div className="text-sm text-gray-400 mb-1">Organico:</div>
                                            <div className="text-2xl font-mono font-bold">
                                                {currentPanoramica?.[selectedShift + '_ops'] || 0}
                                                <span className="text-sm text-gray-500 mx-1">/</span>
                                                {currentPanoramica?.operators_required ? parseInt(currentPanoramica.operators_required) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handlePreSubmit}>
                                    {/* Input Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                        {/* Ore Totali */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ore Totali</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={form.hoursTotal}
                                                onChange={e => setForm(f => ({ ...f, hoursTotal: parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            />
                                        </div>

                                        {/* Ore Fermo */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ore Fermo</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={form.hoursDowntime}
                                                onChange={e => setForm(f => ({ ...f, hoursDowntime: parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                            />
                                        </div>

                                        {/* Ore Nette (calcolato) */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Ore Nette
                                                {calculated.deduction > 0 && <span className="text-purple-400 text-[10px] ml-1">(-1h PAUSA)</span>}
                                            </label>
                                            <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-green-400 text-lg font-mono font-bold">
                                                {calculated.hoursNet.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Quantità */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quantità Pz</label>
                                            <input
                                                type="number"
                                                value={form.quantityProduced}
                                                onChange={e => setForm(f => ({ ...f, quantityProduced: e.target.value }))}
                                                placeholder="0"
                                                className="w-full bg-gray-700 border border-purple-500/50 rounded-lg px-4 py-3 text-white text-lg font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Downtime Buttons */}
                                    <div className="bg-gray-700/20 p-4 rounded-lg mb-6 border border-gray-700/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Rapido Fermo:</span>
                                            {DOWNTIME_QUICK.map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => addDowntime(val)}
                                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm font-mono transition"
                                                >
                                                    +{val}h
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, hoursDowntime: 0 }))}
                                                className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded text-sm ml-auto"
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        {/* Causale Fermo */}
                                        {(form.hoursDowntime || 0) > 0 && (
                                            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                                <select
                                                    value={form.downtimeReason}
                                                    onChange={e => setForm(f => ({ ...f, downtimeReason: e.target.value }))}
                                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                                >
                                                    {DOWNTIME_REASONS.map(r => (
                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                    ))}
                                                </select>

                                                {form.downtimeReason === 'altro' && (
                                                    <input
                                                        type="text"
                                                        value={form.downtimeNotes}
                                                        onChange={e => setForm(f => ({ ...f, downtimeNotes: e.target.value }))}
                                                        placeholder="Specifica causale..."
                                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* KPI Result Banner */}
                                    {form.quantityProduced && (
                                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 mb-6 border border-gray-600 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-gray-400 text-sm mb-1">Performance Oraria</div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-bold text-white">
                                                            {calculated.qtyPerHour.toFixed(1)}
                                                        </span>
                                                        <span className="text-sm text-gray-400">pz/h</span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className={`text-2xl font-bold px-4 py-2 rounded-lg inline-flex items-center gap-2 ${calculated.efficiency >= 95 ? 'bg-green-600/20 text-green-400 border border-green-500/50' :
                                                        calculated.efficiency >= 80 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50' :
                                                            'bg-red-600/20 text-red-400 border border-red-500/50'
                                                        }`}>
                                                        {calculated.efficiency >= 95 ? '⚡ ECCELLENTE' : calculated.efficiency >= 80 ? '⚠️ BUONO' : '⛔ BASSO'}
                                                        <span>{calculated.efficiency.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={saving || !form.quantityProduced}
                                        className={`w-full py-4 rounded-lg font-bold text-lg text-white shadow-lg transition transform active:scale-[0.99] ${saving || !form.quantityProduced
                                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                                            }`}
                                    >
                                        {saving ? '⏳ Salvataggio...' : '💾 Salva e Procedi (Invio)'}
                                    </button>
                                </form>

                                {/* Operators List Section */}
                                <div className="mt-8 border-t border-gray-700 pt-6">
                                    <h3 className="text-gray-400 text-sm font-bold uppercase mb-4 flex items-center gap-2">
                                        👷 Operatori Assegnati ({operators.length})
                                    </h3>

                                    {operators.length === 0 ? (
                                        <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                                            Nessun operatore specificamente assegnato a questo settore/turno.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {operators.map(op => (
                                                <a
                                                    key={op.id}
                                                    href={`/hr/employees/${op.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                                                        {op.first_name[0]}{op.last_name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
                                                            {op.last_name} {op.first_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                            <span>{op.current_role}</span>
                                                            {op.start_time && (
                                                                <span className="text-gray-600">• {op.start_time.slice(0, 5)}-{op.end_time.slice(0, 5)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-600 group-hover:text-white transition-colors">
                                                        ↗
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="text-6xl mb-4 opacity-20">🏭</div>
                                <p>Seleziona un settore dalla panoramica</p>
                            </div>
                        )
                    }
                </div >
            </div >

            {/* CONFIRMATION MODAL BEAUTIFIED */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6 transform transition-all scale-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl">
                                    💾
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Conferma Salvataggio</h3>
                                    <p className="text-sm text-gray-400">Verifica i dati prima di procedere</p>
                                </div>
                            </div>

                            <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600/50">
                                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {confirmModal.message}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    ref={confirmBtnRef}
                                    onClick={confirmModal.onConfirm}
                                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition"
                                >
                                    <span>Conferma e Procedi</span>
                                    <span className="text-xs bg-blue-800/50 px-1.5 py-0.5 rounded border border-blue-400/30">↵ Invio</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
