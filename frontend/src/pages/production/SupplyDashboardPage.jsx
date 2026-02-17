/**
 * Lista Prelievi - Block Supply Dashboard (Mobile-First)
 * To-Do list cronologica con gestione stati
 */
import { useState, useEffect, useRef } from 'react';
import { pickingApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SupplyDashboardPage() {
    const { user: _user } = useAuth();
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
            const activeData = await pickingApi.getRequests('active', -1);

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

    const getSLAColor = (date) => {
        if (!date) return 'text-slate-400';
        const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (mins < 5) return 'text-emerald-700 bg-emerald-50';
        if (mins < 10) return 'text-amber-700 bg-amber-50';
        return 'text-red-700 bg-red-50 font-bold';
    };

    // --- SECTOR FILTER (Touch-friendly) ---
    const [sectorFilter, setSectorFilter] = useState('all'); // all, Pantografo, Giostra

    // Separate pending, processing, and cancelled
    const allPendingOrders = orders.filter(o => o.status === 'pending');
    const pendingOrders = sectorFilter === 'all'
        ? allPendingOrders
        : allPendingOrders.filter(o => o.target_sector === sectorFilter);
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
        toast.success('Sirena Attivata');
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
                toast('NUOVA RICHIESTA!', {
                    icon: '!',
                    duration: 5000,
                    style: { border: '2px solid #dc2626', color: '#dc2626', fontWeight: 'bold', background: '#fff' }
                });
            } else {
                toast('Nuova richiesta (Audio disattivato)', { icon: '📦' });
            }
        }
        setPrevPendingCount(pendingOrders.length);
    }, [pendingOrders.length, audioAllowed, prevPendingCount]);

    const enableAudio = () => {
        initAudio();
    };
    // ---------------------------------

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24">
            {/* Hero Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 relative overflow-hidden">

                <div className="relative z-10">
                    {/* Title row */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Lista Prelievi</h1>
                                <p className="text-xs text-slate-400">Block Supply Dashboard</p>
                            </div>
                        </div>

                        {/* Audio Toggle */}
                        <button
                            onClick={enableAudio}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all cursor-pointer ${audioAllowed
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
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
                        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
                            <div className="text-2xl font-bold text-amber-700">{pendingOrders.length}</div>
                            <div className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">In Attesa</div>
                        </div>
                        {/* Processing */}
                        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">{processingOrders.length}</div>
                            <div className="text-[10px] text-blue-600 uppercase tracking-wider font-medium">In Corso</div>
                        </div>
                        {/* Cancelled */}
                        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{cancelledOrders.length}</div>
                            <div className="text-[10px] text-red-600 uppercase tracking-wider font-medium">Bloccati</div>
                        </div>
                    </div>

                    {/* Sector Filter - Touch Friendly Pills */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setSectorFilter('all')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer ${sectorFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                        >
                            Tutti ({allPendingOrders.length})
                        </button>
                        <button
                            onClick={() => setSectorFilter('Pantografo')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer ${sectorFilter === 'Pantografo'
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                        >
                            Pantografo
                        </button>
                        <button
                            onClick={() => setSectorFilter('Giostra')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer ${sectorFilter === 'Giostra'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                        >
                            Giostra
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* Empty State */}
            {!loading && orders.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                    <svg className="w-16 h-16 text-emerald-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xl font-bold text-slate-800 mb-2">Nessun prelievo in coda!</p>
                    <p className="text-sm text-slate-400">Ottimo lavoro, rilassati un attimo</p>
                </div>
            )}

            {/* Processing Orders (My Current Work) */}
            {processingOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        In Lavorazione
                    </h2>
                    <div className="space-y-4">
                        {processingOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white rounded-2xl border-2 border-blue-200 p-4 relative overflow-hidden shadow-sm"
                            >
                                {/* Color indicator strip */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl"
                                    style={{ backgroundColor: order.material_color || order.color_value || '#3b82f6' }}
                                />

                                {/* Header with material name and timer */}
                                <div className="flex justify-between items-start mb-3 pl-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-slate-900">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        {order.target_sector && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${order.target_sector === 'Pantografo'
                                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                                }`}>
                                                {order.target_sector.substring(0, 1)}
                                            </span>
                                        )}
                                        <span className="text-blue-600 font-bold">×{order.quantity}</span>
                                    </div>
                                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg font-mono border border-blue-200">
                                        {getTimeSince(order.processed_at)}
                                    </span>
                                </div>

                                {/* Info grid - single column for mobile */}
                                <div className="text-sm text-slate-500 mb-4 pl-3 space-y-1">
                                    <p><strong className="text-slate-800">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-600 font-bold' : 'text-slate-400'}>
                                        {order.is_trimmed ? 'RIFILARE!' : 'Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-600">{order.supplier_label}</p>}
                                    {order.client_ref && <p className="text-slate-600">{order.client_ref}</p>}
                                    <p className="text-xs text-slate-400">Da: {order.creator_name} • Ore {formatTime(order.created_at)}</p>
                                </div>

                                {/* Compact action button */}
                                <button
                                    onClick={() => requestDeliveryConfirmation(order)}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold text-base shadow-sm active:scale-[0.98] transition-all cursor-pointer"
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
                    <h2 className="text-sm font-bold text-red-600 uppercase mb-3 flex items-center gap-2">
                        ORDINI BLOCCATI - Conferma lettura!
                    </h2>
                    <div className="space-y-3">
                        {cancelledOrders
                            .map(order => (
                                <div
                                    key={order.id}
                                    className="relative bg-red-50 rounded-xl p-4 border-2 border-red-300 overflow-hidden"
                                >
                                    {/* BLOCKED Banner */}
                                    <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-1 font-bold text-sm tracking-widest">
                                        BLOCCATO - NON PRELEVARE
                                    </div>

                                    <div className="pt-8 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-lg font-bold text-slate-900">
                                                {order.request_type === 'memory'
                                                    ? order.material_label
                                                    : `${order.density_label} ${order.color_label}`}
                                            </span>
                                            <span className="text-slate-600 text-sm">x{order.quantity}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 mb-3 space-y-1">
                                            <p><strong>{order.dimensions}</strong></p>
                                            {order.supplier_label && <p className="text-blue-600">{order.supplier_label}</p>}
                                            <p className="text-red-600 font-semibold">Annullato da: {order.creator_name}</p>
                                            {order.notes && (
                                                <div className="mt-2 text-red-800 bg-red-100 p-2 rounded-lg text-sm border border-red-200">
                                                    <span className="font-bold opacity-70 block text-xs mb-1">MOTIVO ANNULLAMENTO:</span>
                                                    <span className="italic">"{order.notes}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleAcknowledgeCancelled(order.id)}
                                            className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl text-white font-black text-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                        >
                                            HO CAPITO - PULISCI
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
                    <h2 className="text-sm font-bold text-slate-500 uppercase mb-3">
                        In Attesa ({pendingOrders.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden"
                            >
                                {/* Color indicator strip */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl"
                                    style={{ backgroundColor: order.material_color || order.color_value || '#94a3b8' }}
                                />

                                {/* Header with material name and timer */}
                                <div className="flex justify-between items-start mb-3 pl-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg font-bold text-slate-900">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        {order.target_sector && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${order.target_sector === 'Pantografo'
                                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                                }`}>
                                                {order.target_sector}
                                            </span>
                                        )}
                                        <span className="text-slate-500 font-bold">×{order.quantity}</span>
                                    </div>
                                    {/* Live SLA Timer */}
                                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded-lg whitespace-nowrap border ${getSLAColor(order.created_at)}`}>
                                        {getTimeSince(order.created_at)}
                                    </span>
                                </div>

                                {/* Info grid - single column for mobile */}
                                <div className="text-sm text-slate-500 mb-4 pl-3 space-y-1">
                                    <p><strong className="text-slate-800">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-600 font-bold' : 'text-slate-400'}>
                                        {order.is_trimmed ? 'RIFILARE!' : 'Non Rifilato'}
                                    </p>
                                    {order.supplier_label && <p className="text-blue-600">{order.supplier_label}</p>}
                                    {order.client_ref && <p className="text-slate-600">{order.client_ref}</p>}
                                    <p className="text-xs text-slate-400">Da: {order.creator_name}</p>
                                </div>

                                {/* Action buttons */}
                                <button
                                    onClick={() => handleTakeCharge(order.id)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    PRENDI IN CARICO
                                </button>

                                <button
                                    onClick={() => openRejectModal(order)}
                                    className="w-full mt-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-2xl text-center">

                        <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">CONFERMA CONSEGNA</h2>
                        <p className="text-slate-500 mb-6">
                            Stai completando la consegna di <strong className="text-slate-800">{confirmDeliveryModal.quantity}</strong> Blocco/i
                            <span className="text-blue-600 font-bold"> {confirmDeliveryModal.request_type === 'memory'
                                ? confirmDeliveryModal.material_label
                                : `${confirmDeliveryModal.density_label} ${confirmDeliveryModal.color_label}`}</span>
                        </p>
                        <p className="text-lg text-amber-600 font-bold mb-6">Sei sicuro?</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmDeliveryModal(null)}
                                className="py-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-lg transition-all cursor-pointer"
                            >
                                NO
                            </button>

                            <button
                                onClick={confirmDelivery}
                                className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                                SI, CONSEGNA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTION MODAL */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectModal({ isOpen: false, order: null })} />
                    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-red-600 p-6 text-center">
                            <h3 className="text-xl font-bold text-white">Rifiuta Richiesta</h3>
                            <p className="text-red-100 text-sm mt-1">Segnala perché non puoi evadere l'ordine</p>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-center mb-6">
                                Richiesta di <strong className="text-slate-900">{rejectModal.order?.creator_name}</strong><br />
                                <span className="text-blue-600 font-bold">
                                    {rejectModal.order?.request_type === 'memory' ? rejectModal.order?.material_label : `${rejectModal.order?.density_label} ${rejectModal.order?.color_label}`}
                                </span>
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Motivazione</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows="2"
                                    placeholder="Es. Manca materiale a terra, Arrivo tra 1 ora..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setRejectModal({ isOpen: false, order: null })}
                                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmRejection}
                                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
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
