/**
 * Il Forno — Tracciamento Materiali nel Forno Industriale
 * Mobile-First, Live Timers, Alert Stagnazione (max 180 min)
 */
import { useState, useEffect, useCallback } from 'react';
import { ovenApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
    Flame, Clock, Plus, Trash2, User, Package,
    AlertTriangle, CheckCircle2, History, ChevronDown
} from 'lucide-react';

const ITEM_TYPES = [
    { value: 'memory_block', label: 'Blocco Memory', icon: '🧊', color: 'purple' },
    { value: 'wet_mattress', label: 'Materasso Bagnato', icon: '🛏️', color: 'blue' },
    { value: 'wet_other', label: 'Altro Materiale Bagnato', icon: '💧', color: 'cyan' },
];

const DURATION_PRESETS = [
    { label: '30 min', value: 30 },
    { label: '1 ora', value: 60 },
    { label: '1.5 ore', value: 90 },
    { label: '2 ore', value: 120 },
    { label: '3 ore (MAX)', value: 180 },
];

function formatElapsed(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getProgressColor(elapsed, expected) {
    const ratio = elapsed / expected;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.75) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function getTimeSince(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ── Insert Modal ──
function InsertModal({ onClose, onInsert }) {
    const [type, setType] = useState('');
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [minutes, setMinutes] = useState(180);
    const [loading, setLoading] = useState(false);
    const [acceptedWarning, setAcceptedWarning] = useState(false);

    const isWetType = type === 'wet_mattress' || type === 'wet_other';
    const handleTypeChange = (val) => { setType(val); setAcceptedWarning(false); };
    const handleSubmit = async () => {
        if (!type) return toast.error('Seleziona il tipo di materiale');
        if (!reference.trim()) return toast.error('Il riferimento è obbligatorio');
        setLoading(true);
        try {
            await onInsert({
                item_type: type,
                reference: reference.trim(),
                description: description.trim() || null,
                quantity,
                expected_minutes: minutes,
            });
            onClose();
        } catch {
            // handled by parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl border border-slate-200 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-center">
                    <div className="w-14 h-14 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <Flame size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Metti nel Forno</h3>
                    <p className="text-orange-100 text-sm mt-1">Compila tutti i campi</p>
                </div>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Tipo */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tipo Materiale *</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ITEM_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => handleTypeChange(t.value)}
                                    className={`p-3 rounded-xl text-center transition-all border-2 cursor-pointer ${type === t.value
                                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{t.icon}</div>
                                    <div className="text-[10px] font-bold text-slate-700 leading-tight">{t.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ⚠️ Avviso Materiale Bagnato */}
                    {(type === 'wet_mattress' || type === 'wet_other') && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex flex-col gap-3">
                            <div className="flex gap-2.5 items-start">
                                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-red-700 text-xs font-semibold leading-relaxed">
                                    <span className="font-black uppercase">Attenzione!</span> Stai inserendo del materiale Bagnato nel forno.
                                    Accertati di aver fatto la segnalazione sul gruppo <span className="font-black">Errori Fabbrica</span> taggando
                                    Coordinatori e Dirigenti. L'omissione potrebbe farti incombere in un <span className="font-black text-red-800">Richiamo Formale</span>.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer bg-white rounded-lg p-2.5 border border-red-200">
                                <input
                                    type="checkbox"
                                    checked={acceptedWarning}
                                    onChange={e => setAcceptedWarning(e.target.checked)}
                                    className="w-5 h-5 accent-red-600 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-red-700">Confermo di aver segnalato sul gruppo Errori Fabbrica</span>
                            </label>
                        </div>
                    )}

                    {/* Riferimento */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                            Riferimento Prodotto * <span className="text-red-500">(obbligatorio)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Es: Cuorflex 160x200, V25 Verde..."
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Descrizione */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Note / Descrizione</label>
                        <input
                            type="text"
                            placeholder="Opzionale..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-orange-300 outline-none"
                        />
                    </div>

                    {/* Quantità */}
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantità</label>
                        <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 bg-white rounded-lg text-slate-600 font-bold text-xl hover:bg-red-50 transition-colors border border-slate-200 cursor-pointer">-</button>
                            <span className="font-bold text-lg w-6 text-center text-slate-800">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 bg-white rounded-lg text-slate-600 font-bold text-xl hover:bg-emerald-50 transition-colors border border-slate-200 cursor-pointer">+</button>
                        </div>
                    </div>

                    {/* Durata */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Durata Prevista</label>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setMinutes(p.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${minutes === p.value
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 pt-0 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors cursor-pointer">
                        Annulla
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !type || !reference.trim() || (isWetType && !acceptedWarning)}
                        className="flex-[2] py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-xl transition-all"
                    >
                        {loading ? 'Inserimento...' : '🔥 Inserisci nel Forno'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──
export default function OvenPage() {
    const [items, setItems] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInsert, setShowInsert] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [, setTick] = useState(0);

    const loadData = useCallback(async () => {
        try {
            const data = await ovenApi.getItems();
            console.log("DEBUG OVEN DATA:", data);
            setItems(data || []);
        } catch (err) {
            console.error("DEBUG OVEN ERROR:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadHistory = async () => {
        try {
            const data = await ovenApi.getHistory(20);
            setHistory(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Live timer tick every 30s
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    const handleInsert = async (data) => {
        try {
            await ovenApi.insertItem(data);
            toast.success('Materiale inserito nel forno!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore inserimento');
            throw err;
        }
    };

    const handleRemove = async (id) => {
        try {
            await ovenApi.removeItem(id);
            toast.success('Materiale rimosso dal forno!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore rimozione');
        }
    };

    // Recalculate elapsed client-side
    const getElapsed = (insertedAt) => {
        if (!insertedAt) return 0;
        const now = new Date();
        const ins = new Date(insertedAt);
        return Math.floor((now - ins) / 60000);
    };

    const overdueItems = items.filter(i => {
        const elapsed = getElapsed(i.inserted_at);
        return elapsed > i.expected_minutes;
    });

    const typeInfo = (type) => ITEM_TYPES.find(t => t.value === type) || ITEM_TYPES[2];

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                        <Flame size={22} className="text-white" />
                    </div>
                    <div className="flex-grow">
                        <h1 className="text-xl font-bold text-slate-900">Il Forno</h1>
                        <p className="text-slate-400 text-xs">
                            {items.length === 0 ? 'Nessun materiale nel forno' : `${items.length} materiali nel forno`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-slate-900">{items.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nel Forno</div>
                    </div>
                </div>
            </div>

            {/* Overdue Alert */}
            {overdueItems.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-red-700 font-bold text-sm">
                            {overdueItems.length} materiale/i oltre il tempo previsto!
                        </p>
                        <p className="text-red-500 text-xs">Verifica e rimuovi dal forno</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
                </div>
            )}

            {/* Empty State */}
            {!loading && items.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                    <Flame size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-800 font-bold">Forno vuoto</p>
                    <p className="text-sm text-slate-400 mt-2">Premi il bottone + per inserire materiale</p>
                </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
                <div className="space-y-3 mb-8">
                    {items.map(item => {
                        const elapsed = getElapsed(item.inserted_at);
                        const info = typeInfo(item.item_type);
                        const isOverdue = elapsed > item.expected_minutes;
                        const progressPct = Math.min(100, (elapsed / item.expected_minutes) * 100);

                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-2xl border p-4 transition-all shadow-sm ${isOverdue
                                    ? 'border-red-300 ring-2 ring-red-200 shadow-red-100'
                                    : 'border-slate-200'
                                    }`}
                            >
                                {/* Top Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{info.icon}</div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{item.reference}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {info.label} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    {isOverdue && (
                                        <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider animate-pulse">
                                            SCADUTO
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {item.description && (
                                    <p className="text-xs text-slate-500 italic mb-3 pl-9">"{item.description}"</p>
                                )}

                                {/* Progress Bar */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {formatElapsed(elapsed)}</span>
                                        <span>/ {formatElapsed(item.expected_minutes)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(elapsed, item.expected_minutes)}`}
                                            style={{ width: `${progressPct}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <User size={12} />
                                        <span>{item.operator_name || '?'}</span>
                                        <span className="mx-1">•</span>
                                        <span>{getTimeSince(item.inserted_at)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${isOverdue
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                            }`}
                                    >
                                        <CheckCircle2 size={14} /> Rimuovi
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* History Toggle */}
            <button
                onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
                className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors cursor-pointer"
            >
                <History size={16} />
                Storico Rimossi
                <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>

            {showHistory && history.length > 0 && (
                <div className="space-y-1.5 mt-2">
                    {history.map(item => {
                        const info = typeInfo(item.item_type);
                        return (
                            <div key={item.id} className="bg-white rounded-xl p-3 border border-slate-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{info.icon}</span>
                                        <div>
                                            <span className="text-slate-500 text-sm font-medium">{item.reference}</span>
                                            <div className="text-[10px] text-slate-400">
                                                {item.operator_name} → {item.remover_name || '?'} • {formatElapsed(item.elapsed_minutes || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {item.removed_at ? getTimeSince(item.removed_at) : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showHistory && history.length === 0 && (
                <p className="text-center text-slate-400 text-sm mt-4">Nessun materiale nello storico</p>
            )}

            {/* FAB */}
            <button
                onClick={() => setShowInsert(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center text-white hover:scale-110 transition-all z-40 cursor-pointer"
            >
                <Plus size={28} />
            </button>

            {/* Insert Modal */}
            {showInsert && (
                <InsertModal
                    onClose={() => setShowInsert(false)}
                    onInsert={handleInsert}
                />
            )}
        </div>
    );
}
