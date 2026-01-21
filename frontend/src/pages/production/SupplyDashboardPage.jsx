/**
 * Lista Prelievi - Block Supply Dashboard (Mobile-First)
 * To-Do list cronologica con gestione stati
 */
import { useState, useEffect, useRef } from 'react';
import { pickingApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SupplyDashboardPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track acknowledged cancelled orders (localStorage for persistence)
    const [acknowledgedCancelled, setAcknowledgedCancelled] = useState(() => {
        try {
            const stored = localStorage.getItem('acknowledgedCancelledOrders');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        loadOrders();
        // Polling every 5s for new orders
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            // Include cancelled orders in active list so Supply can see them
            // Request 'active' (pending+processing) to ensure new orders aren't cut off by limit
            const data = await pickingApi.getRequests('active', 100);
            // Filter to active + recently cancelled (within 30 mins)
            const now = Date.now();
            const filtered = (data || []).filter(o => {
                if (['pending', 'processing'].includes(o.status)) return true;
                if (o.status === 'cancelled') {
                    const cancelTime = new Date(o.created_at).getTime();
                    return (now - cancelTime) < 7 * 24 * 60 * 60 * 1000; // 7 days (was 30 mins)
                }
                return false;
            });
            setOrders(filtered);
        } catch (err) {
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTakeCharge = async (orderId) => {
        try {
            await pickingApi.updateStatus(orderId, 'processing');
            toast.success('Presa in carico!');
            loadOrders();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore');
        }
    };

    const handleDeliver = async (orderId) => {
        try {
            await pickingApi.updateStatus(orderId, 'delivered');
            toast.success('Consegnato!');
            loadOrders();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore');
        }
    };

    // Handler for acknowledging cancelled orders
    const handleAcknowledgeCancelled = (orderId) => {
        const updated = [...acknowledgedCancelled, orderId];
        setAcknowledgedCancelled(updated);
        localStorage.setItem('acknowledgedCancelledOrders', JSON.stringify(updated));
        toast.success('Ordine rimosso dalla lista', { icon: '✓' });
    };

    const formatTime = (date) => {
        if (!date) return '';
        // Backend sends UTC timestamps, convert to local for display
        return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    // Live timer state - updates every second for urgency effect
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Live timer with seconds - creates urgency!
    const getTimeSince = (date) => {
        if (!date) return '';
        const utcDate = new Date(date);
        const totalSecs = Math.floor((Date.now() - utcDate.getTime()) / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    // SLA Color coding based on wait time
    // Green: < 5 min | Yellow: 5-10 min | Red: > 10 min
    const getSLAColor = (date) => {
        if (!date) return 'text-gray-400';
        const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (mins < 5) return 'text-green-400 bg-green-500/20';
        if (mins < 10) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-red-400 bg-red-500/20 animate-pulse';
    };

    // Separate pending, processing, and cancelled
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const processingOrders = orders.filter(o => o.status === 'processing');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    // --- SIREN / AUDIO ALERT LOGIC ---
    const [audioAllowed, setAudioAllowed] = useState(false);
    const [prevPendingCount, setPrevPendingCount] = useState(0);
    const audioContextRef = useRef(null);

    // Initialize Audio Context on user interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        setAudioAllowed(true);
        playSiren(); // Test sound
        toast.success("🔊 Sirena Attivata!");
    };

    const playSiren = () => {
        if (!audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Siren effect: fluctuating frequency
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
        oscillator.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 1.0);
    };

    // Play sound on new order
    useEffect(() => {
        if (pendingOrders.length > prevPendingCount) {
            // New order detected!
            if (audioAllowed) {
                playSiren();
                // Vibrate device if supported
                if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
                toast('🚨 NUOVA RICHIESTA!', {
                    icon: '📢',
                    duration: 5000,
                    style: { border: '2px solid red', color: 'red', fontWeight: 'bold' }
                });
            } else {
                toast('🔇 Nuova richiesta (Audio disattivato)', { icon: '📦' });
            }
        }
        setPrevPendingCount(pendingOrders.length);
    }, [pendingOrders.length, audioAllowed, prevPendingCount]);

    const enableAudio = () => {
        initAudio();
    };
    // ---------------------------------

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        🚚 Lista Prelievi
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {pendingOrders.length} in attesa • {processingOrders.length} in lavorazione
                    </p>
                </div>

                {/* Audio Toggle */}
                <button
                    onClick={enableAudio}
                    className={`p-3 rounded-full transition-all ${audioAllowed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-slate-700 text-gray-400 border border-white/10 animate-pulse'
                        }`}
                    title={audioAllowed ? "Sirena Attiva" : "Tocca per attivare Sirena"}
                >
                    {audioAllowed ? '🔊' : '🔇'}
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            )}

            {/* Empty State */}
            {!loading && orders.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">☀️</div>
                    <p className="text-xl">Nessun prelievo in coda!</p>
                    <p className="text-sm mt-2">Ottimo lavoro, rilassati un attimo</p>
                </div>
            )}

            {/* Processing Orders (My Current Work) */}
            {processingOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-yellow-400 uppercase mb-3 flex items-center gap-2">
                        <span className="animate-pulse">🔄</span> In Lavorazione
                    </h2>
                    <div className="space-y-3">
                        {processingOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-yellow-900/30 rounded-xl p-4 border-2 border-yellow-500/50"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="text-xl font-bold text-white">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        <span className="text-yellow-400 text-sm ml-2">x{order.quantity}</span>
                                    </div>
                                    <span className="text-xs text-yellow-500 bg-yellow-500/20 px-2 py-1 rounded">
                                        {getTimeSince(order.processed_at)}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-300 mb-3 space-y-1">
                                    <p>📐 <strong>{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-400' : 'text-gray-400'}>
                                        {order.is_trimmed ? '🔷 RIFILARE!' : '🔲 Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-400">🏭 {order.supplier_label}</p>}
                                    {order.client_ref && <p>👤 {order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Da: {order.creator_name} • Ore {formatTime(order.created_at)}</p>
                                </div>

                                <button
                                    onClick={() => handleDeliver(order.id)}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-lg shadow-lg"
                                >
                                    ✅ CONSEGNATO
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cancelled Orders - REQUIRE ACKNOWLEDGMENT */}
            {cancelledOrders.filter(o => !acknowledgedCancelled.includes(o.id)).length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                        🚫 ORDINI BLOCCATI - Conferma lettura!
                    </h2>
                    <div className="space-y-3">
                        {cancelledOrders
                            .filter(o => !acknowledgedCancelled.includes(o.id))
                            .map(order => (
                                <div
                                    key={order.id}
                                    className="relative bg-red-900/40 rounded-xl p-4 border-4 border-red-500 overflow-hidden animate-pulse"
                                >
                                    {/* BLOCKED Banner */}
                                    <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-2 font-black text-lg tracking-widest">
                                        ⛔ BLOCCATO - NON PRELEVARE ⛔
                                    </div>

                                    <div className="pt-10 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xl font-bold text-white">
                                                {order.request_type === 'memory'
                                                    ? order.material_label
                                                    : `${order.density_label} ${order.color_label}`}
                                            </span>
                                            <span className="text-gray-300 text-sm">x{order.quantity}</span>
                                        </div>
                                        <div className="text-sm text-gray-300 mb-3 space-y-1">
                                            <p>📐 <strong>{order.dimensions}</strong></p>
                                            {order.supplier_label && <p className="text-blue-400">🏭 {order.supplier_label}</p>}
                                            <p className="text-red-300 font-semibold">❌ Annullato da: {order.creator_name}</p>
                                            {order.notes && (
                                                <div className="mt-2 text-red-100 bg-red-800/50 p-2 rounded-lg text-sm border border-red-500/30">
                                                    <span className="font-bold opacity-70 block text-xs mb-1">MOTIVO ANNULLAMENTO:</span>
                                                    <span className="italic">"{order.notes}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleAcknowledgeCancelled(order.id)}
                                            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-800 rounded-xl text-white font-black text-lg shadow-lg border-2 border-red-400 hover:from-red-700 hover:to-red-900 transition-all"
                                        >
                                            ✓ HO CAPITO - PULISCI
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Pending Orders (Queue) */}
            {pendingOrders.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">
                        ⏳ In Attesa ({pendingOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-slate-800/80 rounded-xl p-4 border border-white/10"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="text-lg font-bold text-white">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        <span className="text-gray-400 text-sm ml-2">x{order.quantity}</span>
                                    </div>
                                    {/* Live SLA Timer with color coding */}
                                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded-lg ${getSLAColor(order.created_at)}`}>
                                        ⏱️ {getTimeSince(order.created_at)}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-400 mb-3 space-y-1">
                                    <p>📐 <strong className="text-white">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-400 font-bold' : 'text-gray-500'}>
                                        {order.is_trimmed ? '🔷 RIFILARE!' : '🔲 Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-400">🏭 {order.supplier_label}</p>}
                                    {order.client_ref && <p>👤 {order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Da: {order.creator_name}</p>
                                </div>

                                <button
                                    onClick={() => handleTakeCharge(order.id)}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold shadow-lg"
                                >
                                    🏃 PRENDI IN CARICO
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
