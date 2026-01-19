/**
 * Richiesta Blocchi - Order User Dashboard (Mobile-First)
 * Lista ordini personali + FAB per nuovo ordine
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pickingApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OrderDashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
        // Polling every 10s for updates
        const interval = setInterval(loadOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const data = await pickingApi.getRequests(null, 50);
            setOrders(data || []);
        } catch (err) {
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (orderId) => {
        try {
            await pickingApi.updateStatus(orderId, 'completed');
            toast.success('Ordine archiviato');
            loadOrders();
        } catch (err) {
            toast.error('Errore archiviazione');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-gray-500/30 text-gray-300',
            processing: 'bg-yellow-500/30 text-yellow-300',
            delivered: 'bg-green-500/30 text-green-300 line-through',
            completed: 'bg-slate-600/30 text-slate-400 line-through',
            cancelled: 'bg-red-500/30 text-red-300 line-through',
        };
        const labels = {
            pending: '⏳ In Attesa',
            processing: '🔄 In Lavorazione',
            delivered: '✅ Consegnato',
            completed: '📁 Archiviato',
            cancelled: '❌ Annullato',
        };
        return (
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${styles[status] || styles.pending}`}>
                {labels[status] || status}
            </span>
        );
    };

    const formatTime = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    // Separate active from delivered/completed
    const activeOrders = orders.filter(o => ['pending', 'processing'].includes(o.status));
    const deliveredOrders = orders.filter(o => ['delivered'].includes(o.status));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    📦 Richiesta Blocchi
                </h1>
                <p className="text-gray-400 text-sm mt-1">Ciao {user?.full_name?.split(' ')[0] || 'Operatore'}! I tuoi ordini:</p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            )}

            {/* Active Orders */}
            {!loading && activeOrders.length === 0 && deliveredOrders.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">📭</div>
                    <p>Nessun ordine attivo</p>
                    <p className="text-sm mt-2">Premi il bottone + per richiedere un blocco</p>
                </div>
            )}

            {/* Active Orders List */}
            {activeOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Ordini Attivi</h2>
                    <div className="space-y-3">
                        {activeOrders.map(order => (
                            <div
                                key={order.id}
                                className={`bg-slate-800/80 rounded-xl p-4 border border-white/10 ${order.status === 'processing' ? 'ring-2 ring-yellow-500/50' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-lg font-bold text-white">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        <span className="text-gray-400 text-sm ml-2">x{order.quantity}</span>
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>
                                <div className="text-sm text-gray-400 space-y-1">
                                    <p>📐 {order.dimensions} {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p>{order.is_trimmed ? '✂️ Rifilare' : '📦 Non Rifilato'}</p>
                                    {order.client_ref && <p>👤 Rif: {order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Ore {formatTime(order.created_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivered (Click to Archive) */}
            {deliveredOrders.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Consegnati (clicca per archiviare)</h2>
                    <div className="space-y-2">
                        {deliveredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => handleArchive(order.id)}
                                className="bg-green-900/20 rounded-xl p-3 border border-green-500/20 cursor-pointer hover:bg-green-900/40 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-green-300 line-through">
                                        {order.request_type === 'memory'
                                            ? order.material_label
                                            : `${order.density_label} ${order.color_label}`}
                                        {' '}{order.dimensions}
                                    </span>
                                    <span className="text-xs text-green-500">Tap per confermare ✓</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Action Button - New Order */}
            <button
                onClick={() => navigate('/production/orders/new')}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-3xl font-bold hover:scale-110 transition-transform z-50"
            >
                +
            </button>
        </div>
    );
}
