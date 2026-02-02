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

    // Modal State for Rejection
    const [rejectModal, setRejectModal] = useState({ isOpen: false, order: null });
    const [rejectReason, setRejectReason] = useState('');

    // Track acknowledged cancelled orders (localStorage removed - now synced with server)
    // No dedicated state needed, we just reload the list


    useEffect(() => {
        loadOrders();
        // Polling every 5s for new orders
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            // Fetch active orders (pending+processing) - these won't be cut off by limit
            const activeData = await pickingApi.getRequests('active', 100);

            // Fetch cancelled orders separately for the warning section
            const cancelledData = await pickingApi.getRequests('cancelled', 50);

            // Combine and filter cancelled to recent ones (7 days)
            const now = Date.now();
            const recentCancelled = (cancelledData || []).filter(o => {
                const cancelTime = new Date(o.created_at).getTime();
                return (now - cancelTime) < 7 * 24 * 60 * 60 * 1000; // 7 days
            });

            // Combine active + recent cancelled
            const combined = [...(activeData || []), ...recentCancelled];
            setOrders(combined);
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

    const openRejectModal = (order) => {
        setRejectModal({ isOpen: true, order });
        setRejectReason('');
    };

    const confirmRejection = async () => {
        if (!rejectModal.order) return;
        try {
            // "cancelled" with reason. production.py will handle it as "Rejected" if I am Supply
            await pickingApi.updateStatus(rejectModal.order.id, 'cancelled', rejectReason);
            toast.success('Richiesta rifiutata (Utente notificato)');
            setRejectModal({ isOpen: false, order: null });
            loadOrders();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore rifiuto');
        }
    };

    // Confirmation Modal State for Delivery
    const [confirmDeliveryModal, setConfirmDeliveryModal] = useState(null); // holds order object or null

    const requestDeliveryConfirmation = (order) => {
        setConfirmDeliveryModal(order);
    };

    const confirmDelivery = () => {
        if (confirmDeliveryModal) {
            handleDeliver(confirmDeliveryModal.id);
            setConfirmDeliveryModal(null);
        }
    };

    // Handler for acknowledging cancelled orders
    const handleAcknowledgeCancelled = async (orderId) => {
        try {
            await pickingApi.acknowledge(orderId);
            toast.success('Ordine rimosso dalla lista', { icon: '✓' });
            loadOrders();
        } catch (err) {
            console.error('Error ack cancelled:', err);
            toast.error('Errore durante la rimozione');
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        // Backend sends UTC without 'Z' suffix - append it to force UTC interpretation
        const dateStr = typeof date === 'string' && !date.endsWith('Z') ? date + 'Z' : date;
        return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
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
        // Backend sends UTC without 'Z' suffix - append it to force UTC interpretation
        const dateStr = date.endsWith('Z') ? date : date + 'Z';
        const utcDate = new Date(dateStr);
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
    // "Cancelled" orders displayed here are ONLY those cancelled by the USER (processed_by_id is null)
    // If *I* rejected them (processed_by_id is me), I don't need to see them as "Blocked"
    const cancelledOrders = orders.filter(o => o.status === 'cancelled' && !o.processed_by_id);


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
        <div className="min-h-screen carbon-background p-4 pb-24">
            {/* Hero Header Card */}
            <div className="master-card p-5 mb-6 relative overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                <div className="relative z-10">
                    {/* Title row */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Lista Prelievi</h1>
                                <p className="text-xs text-gray-400">Block Supply Dashboard</p>
                            </div>
                        </div>

                        {/* Audio Toggle - Premium Style */}
                        <button
                            onClick={enableAudio}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${audioAllowed
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                : 'bg-zinc-800 text-gray-400 border border-white/10'
                                }`}
                            title={audioAllowed ? "Sirena Attiva" : "Tocca per attivare Sirena"}
                        >
                            {audioAllowed ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* KPI Counters Row */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Pending */}
                        <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-white/5">
                            <div className="text-2xl font-bold neon-orange">{pendingOrders.length}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">In Attesa</div>
                        </div>
                        {/* Processing */}
                        <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-yellow-500/20">
                            <div className="text-2xl font-bold text-yellow-400" style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>{processingOrders.length}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">In Corso</div>
                        </div>
                        {/* Cancelled */}
                        <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-white/5">
                            <div className="text-2xl font-bold text-red-400">{cancelledOrders.length}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Bloccati</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-400"></div>
                </div>
            )}

            {/* Empty State - Premium */}
            {!loading && orders.length === 0 && (
                <div className="master-card p-8 text-center">
                    <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xl font-bold text-white mb-2">Nessun prelievo in coda!</p>
                    <p className="text-sm text-gray-400">Ottimo lavoro, rilassati un attimo</p>
                </div>
            )}

            {/* Processing Orders (My Current Work) */}
            {processingOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-yellow-400 uppercase mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        In Lavorazione
                    </h2>
                    <div className="space-y-4">
                        {processingOrders.map(order => (
                            <div
                                key={order.id}
                                className="master-card p-4 border-2 border-yellow-500/40 relative overflow-hidden"
                            >
                                {/* Color indicator strip */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
                                    style={{ backgroundColor: order.material_color || order.color_value || '#f59e0b' }}
                                />

                                {/* Header with material name and timer */}
                                <div className="flex justify-between items-start mb-3 pl-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        {order.target_sector && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${order.target_sector === 'Pantografo'
                                                ? 'bg-cyan-900/30 text-cyan-400 border-cyan-500/30'
                                                : 'bg-purple-900/30 text-purple-400 border-purple-500/30'
                                                }`}>
                                                {order.target_sector.substring(0, 1)}
                                            </span>
                                        )}
                                        <span className="text-yellow-400 font-bold">×{order.quantity}</span>
                                    </div>
                                    <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-lg font-mono">
                                        {getTimeSince(order.processed_at)}
                                    </span>
                                </div>

                                {/* Info grid - single column for mobile */}
                                <div className="text-sm text-gray-300 mb-4 pl-3 space-y-1">
                                    <p><strong className="text-white">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-400 font-bold' : 'text-gray-500'}>
                                        {order.is_trimmed ? 'RIFILARE!' : 'Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-400">{order.supplier_label}</p>}
                                    {order.client_ref && <p>{order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Da: {order.creator_name} • Ore {formatTime(order.created_at)}</p>
                                </div>

                                {/* Compact action button */}
                                <button
                                    onClick={() => requestDeliveryConfirmation(order)}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-base shadow-lg shadow-green-500/20 active:scale-[0.98] transition-transform"
                                >
                                    CONSEGNATO
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cancelled Orders - REQUIRE ACKNOWLEDGMENT */}
            {cancelledOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                        ORDINI BLOCCATI - Conferma lettura!
                    </h2>
                    <div className="space-y-3">
                        {cancelledOrders
                            .map(order => (
                                <div
                                    key={order.id}
                                    className="relative bg-red-900/40 rounded-xl p-4 border border-red-500 overflow-hidden"
                                >
                                    {/* BLOCKED Banner */}
                                    <div className="absolute top-0 left-0 right-0 bg-red-600/80 text-white text-center py-1 font-bold text-sm tracking-widest">
                                        BLOCCATO - NON PRELEVARE
                                    </div>

                                    <div className="pt-8 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-lg font-bold text-white">
                                                {order.request_type === 'memory'
                                                    ? order.material_label
                                                    : `${order.density_label} ${order.color_label}`}
                                            </span>
                                            <span className="text-gray-300 text-sm">x{order.quantity}</span>
                                        </div>
                                        <div className="text-sm text-gray-300 mb-3 space-y-1">
                                            <p><strong>{order.dimensions}</strong></p>
                                            {order.supplier_label && <p className="text-blue-400">{order.supplier_label}</p>}
                                            <p className="text-red-300 font-semibold">Annullato da: {order.creator_name}</p>
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
                        In Attesa ({pendingOrders.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className="master-card p-4 relative overflow-hidden"
                            >
                                {/* Color indicator strip */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
                                    style={{ backgroundColor: order.material_color || order.color_value || '#6b7280' }}
                                />

                                {/* Header with material name and timer */}
                                <div className="flex justify-between items-start mb-3 pl-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg font-bold text-white">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        {order.target_sector && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${order.target_sector === 'Pantografo'
                                                ? 'bg-cyan-900/30 text-cyan-300 border-cyan-500/30'
                                                : 'bg-purple-900/30 text-purple-300 border-purple-500/30'
                                                }`}>
                                                {order.target_sector}
                                            </span>
                                        )}
                                        <span className="text-gray-400 font-bold">×{order.quantity}</span>
                                    </div>
                                    {/* Live SLA Timer */}
                                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded-lg whitespace-nowrap ${getSLAColor(order.created_at)}`}>
                                        {getTimeSince(order.created_at)}
                                    </span>
                                </div>

                                {/* Info grid - single column for mobile */}
                                <div className="text-sm text-gray-400 mb-4 pl-3 space-y-1">
                                    <p><strong className="text-white">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-400 font-bold' : 'text-gray-500'}>
                                        {order.is_trimmed ? 'RIFILARE!' : 'Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-400">{order.supplier_label}</p>}
                                    {order.client_ref && <p>{order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Da: {order.creator_name}</p>
                                </div>

                                {/* Action buttons */}
                                <button
                                    onClick={() => handleTakeCharge(order.id)}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
                                >
                                    PRENDI IN CARICO
                                </button>

                                <button
                                    onClick={() => openRejectModal(order)}
                                    className="w-full mt-2 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    NON DISPONIBILE
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DELIVERY CONFIRMATION MODAL */}
            {confirmDeliveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl border border-green-500/30 p-8 max-w-md w-full shadow-2xl text-center">

                        <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h2 className="text-xl font-bold text-white mb-2">CONFERMA CONSEGNA</h2>
                        <p className="text-gray-400 mb-6">
                            Stai completando la consegna di <strong className="text-white">{confirmDeliveryModal.quantity}</strong> Blocco/i
                            <span className="text-cyan-400 font-bold"> {confirmDeliveryModal.request_type === 'memory'
                                ? confirmDeliveryModal.material_label
                                : `${confirmDeliveryModal.density_label} ${confirmDeliveryModal.color_label}`}</span>
                        </p>
                        <p className="text-lg text-yellow-400 font-bold mb-6">Sei sicuro?</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmDeliveryModal(null)}
                                className="py-4 rounded-xl border-2 border-gray-500/30 bg-gray-700/30 hover:bg-gray-600/40 text-gray-300 font-bold text-lg transition-all"
                            >
                                NO
                            </button>

                            <button
                                onClick={confirmDelivery}
                                className="py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all active:scale-95"
                            >
                                SÌ, CONSEGNA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTION MODAL */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectModal({ isOpen: false, order: null })} />
                    <div className="relative bg-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gradient-to-r from-red-800 to-pink-900 p-6 text-center">
                            <h3 className="text-xl font-bold text-white">Rifiuta Richiesta</h3>
                            <p className="text-red-100 text-sm mt-1">Segnala perché non puoi evadere l'ordine</p>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-300 text-center mb-6">
                                Richiesta di <strong className="text-white">{rejectModal.order?.creator_name}</strong><br />
                                <span className="text-cyan-400 font-bold">
                                    {rejectModal.order?.request_type === 'memory' ? rejectModal.order?.material_label : `${rejectModal.order?.density_label} ${rejectModal.order?.color_label}`}
                                </span>
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivazione</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows="2"
                                    placeholder="Es. Manca materiale a terra, Arrivo tra 1 ora..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setRejectModal({ isOpen: false, order: null })}
                                    className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmRejection}
                                    className="py-3 px-4 bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-500 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg"
                                >
                                    RIFIUTA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
