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
    const [urgencyModal, setUrgencyModal] = useState({ isOpen: false, order: null });

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
            // Fetch only active + delivered (user's own orders)
            const [activeData, deliveredData, cancelledData, completedData] = await Promise.all([
                pickingApi.getRequests('active'),
                pickingApi.getRequests('delivered'),
                pickingApi.getRequests('cancelled'),
                pickingApi.getRequests('completed', 10), // Storico recente (ultimi 10)
            ]);
            const combined = [
                ...(activeData || []),
                ...(deliveredData || []),
                ...(cancelledData || []),
                ...(completedData || []),
            ];
            setOrders(combined);
        } catch (err) {
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (orderId) => {
        try {
            await pickingApi.updateStatus(orderId, 'completed');
            toast.success('Ricezione confermata!');
            loadOrders();
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (err.response?.status === 403) {
                toast.error('Solo il richiedente originale può confermare la ricezione');
            } else {
                toast.error(detail || 'Errore conferma ricezione');
            }
        }
    };

    const handleAcknowledge = async (orderId) => {
        try {
            // Acknowledge a rejection (clears it from list)
            await pickingApi.acknowledge(orderId);
            toast.success('Rimosso dalla lista');
            loadOrders();
        } catch {
            toast.error('Errore operazione');
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
        } catch {
            toast.error('Errore annullamento');
        }
    };

    const handleToggleUrgency = async (orderId, currentUrgency) => {
        try {
            await pickingApi.toggleUrgency(orderId);
            toast.success(currentUrgency ? 'Urgenza rimossa' : '🚨 Urgenza richiesta!');
            loadOrders();
            setUrgencyModal({ isOpen: false, order: null });
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore cambio urgenza');
        }
    };

    const openUrgencyModal = (order) => {
        setUrgencyModal({ isOpen: true, order });
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
            processing: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
            delivered: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
            completed: 'bg-slate-100 text-slate-400 line-through',
            cancelled: 'bg-red-100 text-red-600 ring-1 ring-red-200 line-through',
        };
        const labels = {
            pending: 'In Attesa',
            processing: 'In Lavorazione',
            delivered: 'Consegnato',
            completed: 'Archiviato',
            cancelled: 'Annullato',
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${styles[status] || styles.pending}`}>
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
    const rejectedOrders = orders.filter(o => o.status === 'cancelled' && o.processed_by_id); // Rejected by Supply

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24 relative overflow-hidden">
            {/* Siervoplast Logo Watermark — Background */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
                <img
                    src="/logo-siervoplast.png"
                    alt=""
                    className="w-80 md:w-[28rem] select-none"
                    style={{
                        opacity: 0.04,
                        filter: 'grayscale(100%)',
                    }}
                />
            </div>
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Richiesta Blocchi</h1>
                        <p className="text-slate-400 text-xs">Ciao {user?.full_name?.split(' ')[0] || 'Operatore'}! I tuoi ordini:</p>
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
            {!loading && activeOrders.length === 0 && deliveredOrders.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-8 text-center">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-slate-800 font-bold">Nessun ordine attivo</p>
                    <p className="text-sm text-slate-400 mt-2">Premi il bottone + per richiedere un blocco</p>
                </div>
            )}

            {/* Active Orders List */}
            {activeOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-blue-600 uppercase mb-3">Ordini Attivi</h2>
                    <div className="space-y-3">
                        {activeOrders.map(order => (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl border shadow-sm p-4 relative overflow-hidden transition-all duration-300 ${order.is_urgent
                                    ? 'border-red-300 ring-2 ring-red-200 shadow-red-100'
                                    : order.status === 'processing'
                                        ? 'border-amber-300 ring-1 ring-amber-200'
                                        : 'border-slate-200'
                                    }`}
                            >
                                {/* Urgent Badge */}
                                {order.is_urgent && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                        URGENTE
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-lg font-bold text-slate-900">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        <span className="text-slate-400 text-sm ml-2">x{order.quantity}</span>
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>
                                <div className="text-sm text-slate-500 space-y-1">
                                    <p className="text-slate-700 font-medium">{order.dimensions} {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                    <p className={order.is_trimmed ? 'text-orange-600 font-bold' : 'text-slate-400'}>{order.is_trimmed ? 'Rifilare' : 'Non Rifilato'}</p>
                                    {order.supplier_label && <p className="text-blue-600">{order.supplier_label}</p>}
                                    {order.client_ref && <p className="text-slate-600">Rif: {order.client_ref}</p>}
                                    <p className="text-xs text-slate-400">Ore {formatTime(order.created_at)}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-3 flex gap-2">
                                    {/* Urgency Toggle Button */}
                                    {(order.status === 'pending' || order.status === 'processing') && (
                                        <button
                                            onClick={() => order.is_urgent ? handleToggleUrgency(order.id, true) : openUrgencyModal(order)}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer active:scale-[0.98] ${order.is_urgent
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                }`}
                                        >
                                            {order.is_urgent ? 'Urgente' : 'Richiedi Urgenza'}
                                        </button>
                                    )}

                                    {/* Cancel Button - Only for pending */}
                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => openCancelModal(order)}
                                            className="py-2.5 px-4 bg-slate-50 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                                        >
                                            Annulla
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* REJECTED Orders */}
            {rejectedOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-red-600 uppercase mb-3 flex items-center gap-2">
                        Richieste Rifiutate
                    </h2>
                    <div className="space-y-3">
                        {rejectedOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-red-50 rounded-2xl p-4 border-2 border-red-200"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-lg font-bold text-slate-900">
                                            {order.request_type === 'memory'
                                                ? order.material_label
                                                : `${order.density_label} ${order.color_label}`}
                                        </span>
                                        <span className="text-slate-400 text-sm ml-2">x{order.quantity}</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
                                        RIFIUTATO
                                    </span>
                                </div>

                                <div className="text-sm text-slate-500 mb-4">
                                    <div className="bg-red-100 p-3 rounded-lg border border-red-200">
                                        <p className="text-xs text-red-600 font-bold mb-1 uppercase">Motivazione:</p>
                                        <p className="text-red-800 italic">"{order.notes}"</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAcknowledge(order.id)}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    OK, HO CAPITO
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivered Orders */}
            {deliveredOrders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-emerald-600 uppercase mb-3">Pronti per conferma</h2>
                    <div className="space-y-2">
                        {deliveredOrders.map(order => {
                            const isOwner = order.created_by_id === user?.id;
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => isOwner && handleArchive(order.id)}
                                    className={`bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-200 transition-all ${isOwner ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md' : 'opacity-70'}`}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-lg font-bold text-slate-900 block">
                                                    {order.request_type === 'memory'
                                                        ? order.material_label
                                                        : `${order.density_label} ${order.color_label}`}
                                                </span>
                                                <div className="text-sm text-slate-500 space-y-0.5 mt-1">
                                                    <p>{order.dimensions} {order.custom_height ? `(H: ${order.custom_height}cm)` : ''}</p>
                                                    {order.client_ref && <p className="font-bold text-slate-800">Rif: {order.client_ref}</p>}
                                                    {order.supplier_label && <p className="text-blue-600">{order.supplier_label}</p>}
                                                    <p className="text-xs text-slate-400">{order.is_trimmed ? 'Rifilare' : 'Non Rifilato'}</p>
                                                </div>
                                            </div>
                                            {isOwner ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleArchive(order.id); }}
                                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                                                >
                                                    Conferma Ricezione
                                                </button>
                                            ) : (
                                                <span className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium">
                                                    Ordine di {order.creator_name?.split(' ')[0] || 'altro utente'}
                                                </span>
                                            )}
                                        </div>
                                        {order.notes && (
                                            <div className="text-xs text-slate-400 italic border-t border-slate-100 pt-2 mt-1">
                                                "Note: {order.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Completed Orders (History) */}
            {completedOrders.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xs font-bold text-slate-400 uppercase mb-3">Storico Recente (Archiviati)</h2>
                    <div className="space-y-1.5">
                        {completedOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white rounded-xl p-3 border border-slate-100"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 line-through text-sm">
                                        {order.request_type === 'memory'
                                            ? order.material_label
                                            : `${order.density_label} ${order.color_label}`}
                                        {' '}{order.dimensions}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
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
                className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white text-3xl font-bold hover:scale-110 transition-all z-40 cursor-pointer"
            >
                +
            </button>

            {/* CANCEL MODAL */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setCancelModal({ isOpen: false, order: null })}
                    />

                    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-red-600 p-6 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white">Conferma Annullamento</h3>
                            <p className="text-red-100 text-sm mt-1">Questa azione è irreversibile</p>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 text-center mb-6">
                                Sei sicuro di voler annullare l'ordine per <br />
                                <strong className="text-slate-900 text-lg">
                                    {cancelModal.order.request_type === 'memory'
                                        ? cancelModal.order.material_label
                                        : `${cancelModal.order.density_label} ${cancelModal.order.color_label}`}
                                </strong>?
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Motivo (Opzionale)</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows="1"
                                    placeholder="Es. Errore misura..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setCancelModal({ isOpen: false, order: null })}
                                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                                >
                                    Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Urgency Confirmation Modal */}
            {urgencyModal.isOpen && urgencyModal.order && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="bg-red-600 p-5 text-center">
                            <div className="w-14 h-14 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white">Richiedi Urgenza?</h3>
                            <p className="text-red-100 text-sm mt-1">Il magazziniere verrà avvisato</p>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 text-center mb-6">
                                Confermi di voler marcare come <strong className="text-red-600">URGENTE</strong> l'ordine per<br />
                                <strong className="text-slate-900 text-lg">
                                    {urgencyModal.order.request_type === 'memory'
                                        ? urgencyModal.order.material_label
                                        : `${urgencyModal.order.density_label} ${urgencyModal.order.color_label}`}
                                </strong>?
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setUrgencyModal({ isOpen: false, order: null })}
                                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => handleToggleUrgency(urgencyModal.order.id, false)}
                                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                                >
                                    Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
