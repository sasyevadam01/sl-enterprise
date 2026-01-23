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
    const { user, hasPermission } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null });
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (hasPermission('manage_production_supply') && !hasPermission('create_production_orders')) {
            navigate('/production/blocks');
            return;
        }
        loadOrders();
        const interval = setInterval(loadOrders, 10000);
        return () => clearInterval(interval);
    }, [user]);

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

    const openCancelModal = (order) => {
        setCancelModal({ isOpen: true, order });
        setCancelReason('');
    };

    const confirmCancel = async () => {
        if (!cancelModal.order) return;
        try {
            await pickingApi.updateStatus(cancelModal.order.id, 'cancelled', cancelReason); // Pass reason as notes
            toast.success('Ordine annullato con successo');
            loadOrders();
            setCancelModal({ isOpen: false, order: null });
        } catch (err) {
            toast.error('Errore annullamento');
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

    const activeOrders = orders.filter(o => ['pending', 'processing'].includes(o.status));
    const deliveredOrders = orders.filter(o => ['delivered'].includes(o.status));
    const completedOrders = orders.filter(o => ['completed'].includes(o.status));

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

            {/* Empty State */}
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
                                    <p>{order.is_trimmed ? '🔷 Rifilare' : '🔲 Non Rifilato'}</p>
                                    {order.supplier_label && <p>🏭 {order.supplier_label}</p>}
                                    {order.client_ref && <p>👤 Rif: {order.client_ref}</p>}
                                    <p className="text-xs text-gray-500">Ore {formatTime(order.created_at)}</p>
                                </div>
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => openCancelModal(order)}
                                        className="mt-3 w-full py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        ❌ Annulla Richiesta
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivered Orders */}
            {deliveredOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-3 text-green-400">✅ Pronti per conferma</h2>
                    <div className="space-y-2">
                        {deliveredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => handleArchive(order.id)}
                                className="bg-green-900/20 rounded-xl p-3 border border-green-500/20 cursor-pointer hover:bg-green-900/40 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-green-300 font-medium">
                                        {order.request_type === 'memory'
                                            ? order.material_label
                                            : `${order.density_label} ${order.color_label}`}
                                        {' '}{order.dimensions}
                                    </span>
                                    <span className="px-3 py-1 bg-green-500 text-slate-900 rounded-full text-xs font-bold animate-pulse">
                                        Conferma Ricezione
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Orders (History) */}
            {completedOrders.length > 0 && (
                <div className="opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                    <h2 className="text-xs font-bold text-gray-500 uppercase mb-3">Storico Recente (Archiviati)</h2>
                    <div className="space-y-2">
                        {completedOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-slate-800/50 rounded-xl p-3 border border-white/5"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 line-through text-sm">
                                        {order.request_type === 'memory'
                                            ? order.material_label
                                            : `${order.density_label} ${order.color_label}`}
                                        {' '}{order.dimensions}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                        {formatTime(order.delivered_at || order.processed_at || order.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => navigate('/production/orders/new')}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-3xl font-bold hover:scale-110 transition-transform z-40"
            >
                +
            </button>

            {/* PREMIUM CANCEL MODAL */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setCancelModal({ isOpen: false, order: null })}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">Conferma Annullamento</h3>
                            <p className="text-red-100 text-sm mt-1">Questa azione è irreversibile</p>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-gray-300 text-center mb-6">
                                Sei sicuro di voler annullare l'ordine per <br />
                                <strong className="text-white text-lg">
                                    {cancelModal.order.request_type === 'memory'
                                        ? cancelModal.order.material_label
                                        : `${cancelModal.order.density_label} ${cancelModal.order.color_label}`}
                                </strong>?
                            </p>

                            {/* Reason Input */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo (Opzionale)</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows="1"
                                    placeholder="Es. Errore misura..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setCancelModal({ isOpen: false, order: null })}
                                    className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    className="py-3 px-4 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    🗑️ Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
