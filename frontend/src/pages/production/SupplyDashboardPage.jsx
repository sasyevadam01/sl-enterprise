/**
 * Lista Prelievi - Block Supply Dashboard (Mobile-First)
 * To-Do list cronologica con gestione stati
 */
import { useState, useEffect } from 'react';
import { pickingApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SupplyDashboardPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
        // Polling every 5s for new orders
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const data = await pickingApi.getRequests('active', 100);
            setOrders(data || []);
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

    const formatTime = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    const getTimeSince = (date) => {
        if (!date) return '';
        const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (mins < 1) return 'Ora';
        if (mins < 60) return `${mins}m fa`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m fa`;
    };

    // Separate pending from processing (mine)
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const processingOrders = orders.filter(o => o.status === 'processing');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    🚚 Lista Prelievi
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    {pendingOrders.length} in attesa • {processingOrders.length} in lavorazione
                </p>
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
                                        {order.is_trimmed ? '✂️ RIFILARE!' : '📦 Non Rifilato'}
                                    </p>
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
                                    <span className="text-xs text-gray-500">
                                        {getTimeSince(order.created_at)}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-400 mb-3 space-y-1">
                                    <p>📐 <strong className="text-white">{order.dimensions}</strong> {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-400 font-bold' : 'text-gray-500'}>
                                        {order.is_trimmed ? '✂️ RIFILARE!' : '📦 Non Rifilato'}
                                    </p>
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
