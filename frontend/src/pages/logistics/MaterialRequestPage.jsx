/**
 * MaterialRequestPage.jsx
 * Pagina per operatori banchina - Richiesta Materiali
 * Griglia pulsanti touch-friendly per richieste veloci
 * Light Enterprise Design System v5.0
 */
import { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { logisticsApi, fleetApi } from '../../api/client';
import LogisticsModal from './components/LogisticsModal';
import { useUI } from '../../components/ui/CustomUI';

const VISIBLE_ACTIVE_STATUSES = ['pending', 'preparing', 'prepared', 'processing'];
import { Package, Clock, ArrowRight, MapPin, User, XCircle, AlertTriangle } from 'lucide-react';
import MaterialIcon from './components/MaterialIcon';
import './LogisticsStyles.css';

export default function MaterialRequestPage() {
    const { user } = useContext(AuthContext);
    const { toast } = useUI();
    const [materials, setMaterials] = useState([]);
    const [requireOtp, setRequireOtp] = useState(false);
    const [banchine, setBanchine] = useState([]);
    const [selectedBanchina, setSelectedBanchina] = useState(null);
    const [activeRequest, setActiveRequest] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customMaterial, setCustomMaterial] = useState(null);
    const [customDescription, setCustomDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        loadData();

        // Smart Banchina: Load last used
        const lastBanchina = localStorage.getItem('last_banchina_id');
        if (lastBanchina) {
            setSelectedBanchina(lastBanchina);
        }

        // WS Connection
        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'request_updated' || data.type === 'request_completed') {
                    checkActiveRequest();
                }
            } catch (err) {
                console.error("WS error:", err);
            }
        };

        const interval = setInterval(checkActiveRequest, 5000);

        return () => {
            clearInterval(interval);
            ws.close();
        };
    }, []);

    const loadData = async () => {
        try {
            setError(null);
            const [mats, banchs] = await Promise.all([
                logisticsApi.getMaterials(),
                fleetApi.getBanchine()
            ]);
            setMaterials(mats);
            setBanchine(banchs);

            if (user?.employee?.default_banchina_id) {
                setSelectedBanchina(user.employee.default_banchina_id);
            }

            await checkActiveRequest();
        } catch (err) {
            console.error('📦 loadData ERROR:', err);
            setError("Impossibile caricare i dati. Verifica la connessione o riprova.");
        } finally {
            setLoading(false);
        }
    };

    const checkActiveRequest = async () => {
        try {
            const data = await logisticsApi.getRequests({ my_requests: true, status: 'active' });
            const activeList = data.items?.filter(r => VISIBLE_ACTIVE_STATUSES.includes(r.status)) || [];
            setActiveRequest(activeList);

            if (activeList.length > 0) {
                const msgs = await logisticsApi.getMessages(activeList[0].id);
                setMessages(msgs);
            }
        } catch (err) {
            console.error('Errore check richiesta:', err);
        }
    };

    const [selectedUom, setSelectedUom] = useState('pz');
    const uomOptions = ['pz', 'kg', 'm', 'mq', 'bancali', 'pacchi', 'rotoli', 'scatole'];

    const handleMaterialClick = (material) => {
        setCustomMaterial(material);
        setCustomDescription('');
        setQuantity(1);
        setRequireOtp(false);
        setSelectedUom(material.unit_of_measure || 'pz');
        setShowCustomModal(true);
    };

    const sendRequest = async () => {
        if (!selectedBanchina) {
            alert('Seleziona una banchina!');
            return;
        }

        setShowCustomModal(false);

        setSending(true);
        try {
            localStorage.setItem('last_banchina_id', selectedBanchina);

            const request = await logisticsApi.createRequest({
                material_type_id: customMaterial.id,
                custom_description: customDescription,
                quantity: quantity,
                unit_of_measure: selectedUom,
                banchina_id: selectedBanchina,
                require_otp: requireOtp
            });
            setActiveRequest(prev => [...prev, request]);
            setCustomDescription('');
            setQuantity(1);
            setRequireOtp(false);
        } catch (err) {
            console.error('Errore invio richiesta:', err);
            const errorMsg = err.response?.data?.detail || "Errore durante l'invio della richiesta.";
            toast.error(errorMsg);
        } finally {
            setSending(false);
        }
    };

    // Helper per formattazione tempo
    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const absSeconds = Math.abs(seconds);

        if (absSeconds >= 3600) {
            const h = Math.floor(absSeconds / 3600);
            const m = Math.floor((absSeconds % 3600) / 60);
            return `${h}h ${m}m`;
        }

        const m = Math.floor(absSeconds / 60);
        const s = Math.floor(absSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className="logistics-page">
                <div className="text-center p-8">
                    <div className="text-red-600 text-xl font-bold mb-4">⚠️ Ops! Qualcosa è andato storto.</div>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button onClick={() => { setLoading(true); loadData(); }} className="px-6 py-2 bg-brand-green hover:bg-brand-green/90 rounded-lg text-white font-bold transition-colors">
                        🔄 Riprova
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="logistics-page"><div className="loading-spinner">Caricamento...</div></div>;
    }

    return (
        <div className="logistics-page pb-20">
            <header className="logistics-header bg-white p-4 shadow-sm rounded-2xl border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Package size={24} className="text-brand-green" /> Richiesta Materiali</h1>
                <p className="text-slate-500 text-sm mb-4 italic">Per Fare la tua Richiesta, Clicca sul numero Banchina</p>
                <div className="banchina-selector-mobile">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {banchine.map(b => (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBanchina(b.id)}
                                className={`p-3 rounded-xl font-bold text-sm transition-all ${selectedBanchina === b.id ? 'bg-brand-green text-white shadow-md' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                            >
                                {b.code}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Active Requests List */}
            {activeRequest && (activeRequest.length > 0) && (
                <div className="px-4 pt-4 space-y-4">
                    <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Richieste Attive ({activeRequest.length})</h3>
                    {activeRequest.map(req => (
                        <div key={req.id} className="active-request-card p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl"><MaterialIcon emoji={req.material_type_icon} size={32} className="text-brand-green" /></span>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 leading-none">{req.material_type_label}</h2>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs text-slate-400 font-mono">#{req.id}</span>
                                            {req.quantity >= 1 && (
                                                <span className="text-xs px-2 py-0.5 bg-brand-green/10 text-brand-green rounded-full font-bold border border-brand-green/20">
                                                    x{req.quantity} {req.unit_of_measure}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`status-badge inline-flex items-center gap-1 ${req.status === 'pending' ? 'text-amber-600' : 'text-green-600'} font-bold text-sm`}>
                                        {req.status === 'pending' ? <span className="flex items-center gap-1"><Clock size={14} /> Attesa</span> : <span className="flex items-center gap-1"><ArrowRight size={14} /> In arrivo</span>}
                                    </div>
                                    <div className="text-xl font-mono font-bold text-slate-800 tracking-widest mt-1">
                                        {formatTime(req.wait_time_seconds || 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Details Row */}
                            <div className="flex justify-between items-center text-sm text-slate-500 border-t border-slate-100 pt-2 mt-2">
                                <span className="flex items-center gap-1"><MapPin size={14} className="text-brand-green" /> {req.banchina_code || 'Banchina ?'}</span>
                                {req.assigned_to_name && <span className="flex items-center gap-1"><User size={14} className="text-slate-400" /> {req.assigned_to_name}</span>}
                            </div>

                            {/* SECURE DELIVERY OTP */}
                            {req.confirmation_code && (
                                <div className="mt-4 p-4 bg-brand-green/5 border border-brand-green/15 rounded-xl text-center">
                                    <div className="text-[10px] text-brand-green font-bold uppercase tracking-widest mb-1">Codice Consegna (OTP)</div>
                                    <div className="text-3xl font-black text-slate-800 tracking-[0.3em] font-mono">{req.confirmation_code}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">Dettalo al mulettista per confermare l'arrivo</div>
                                </div>
                            )}

                            <CancelButton requestId={req.id} onCancel={checkActiveRequest} />
                        </div>
                    ))}
                </div>
            )}

            <div className="materials-grid p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {materials.map(mat => (
                    <button
                        key={mat.id}
                        className={`relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all ${(!selectedBanchina || sending) ? 'bg-slate-50 opacity-50 border border-slate-200' : 'bg-white hover:bg-slate-50 shadow-sm border border-slate-200 hover:border-brand-green hover:shadow-md cursor-pointer'}`}
                        onClick={() => handleMaterialClick(mat)}
                        disabled={sending || !selectedBanchina}
                    >
                        <MaterialIcon emoji={mat.icon} size={36} className="text-brand-green mb-3" />
                        <span className="text-slate-700 font-medium text-center leading-tight">{mat.label}</span>
                    </button>
                ))}
            </div>

            <LogisticsModal
                isOpen={showCustomModal}
                onClose={() => setShowCustomModal(false)}
                title={customMaterial?.label}
                icon={customMaterial?.icon}
            >
                <div>
                    <div className="form-group mb-4">
                        <label className="block text-slate-500 text-sm font-bold mb-2">Quantità & Unità</label>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 flex-1">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition">-</button>
                                <span className="flex-1 text-center text-2xl font-bold text-slate-800">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition">+</button>
                            </div>
                            <div className="w-1/3">
                                <select value={selectedUom} onChange={(e) => setSelectedUom(e.target.value)} className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-2 text-slate-700 font-bold text-center">
                                    {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-group mb-6">
                        <label className="block text-slate-500 text-sm font-bold mb-2">Note {customMaterial?.requires_description && '*'}</label>
                        <textarea
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            placeholder="Descrizione..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 outline-none"
                        />
                    </div>

                    <div className="form-group mb-6">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition ${requireOtp ? 'bg-brand-green border-brand-green' : 'border-slate-300'}`}>
                                {requireOtp && <span className="text-white font-bold">✓</span>}
                            </div>
                            <input
                                type="checkbox"
                                checked={requireOtp}
                                onChange={(e) => setRequireOtp(e.target.checked)}
                                className="hidden"
                            />
                            <div>
                                <span className="text-slate-700 font-bold block">Richiedi Codice Sicurezza (OTP)</span>
                                <span className="text-xs text-slate-400">Il magazziniere dovrà chiederti il codice per consegnare</span>
                            </div>
                        </label>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition border border-slate-200" onClick={() => setShowCustomModal(false)}>Annulla</button>
                        <button
                            className="flex-[2] py-4 bg-brand-green text-white rounded-xl font-bold hover:bg-brand-green/90 transition shadow-sm"
                            onClick={() => sendRequest()}
                            disabled={sending || (customMaterial?.requires_description && !customDescription.trim())}
                        >
                            {sending ? '...' : 'Invia'}
                        </button>
                    </div>
                </div>
            </LogisticsModal>
        </div>
    );
}

// Helper per cancellazione (con modale integrato per coerenza stilistica)
function CancelButton({ requestId, onCancel }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const { toast } = useUI();

    const handleConfirmCancel = async () => {
        setCancelling(true);
        try {
            await logisticsApi.cancelRequest(requestId, "Errore operatore");
            setShowConfirm(false);
            onCancel(); // Reload
        } catch (e) {
            console.error(e);
            toast.error("Errore cancellazione: " + (e.response?.data?.detail || e.message));
        } finally {
            setCancelling(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="w-full mt-4 py-3 border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition"
            >
                <XCircle size={16} className="inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} /> Annulla Richiesta
            </button>

            <LogisticsModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Annullare Richiesta?"
                icon={<AlertTriangle size={40} className="text-amber-500" />}
            >
                <div className="text-center">
                    <p className="text-slate-600 mb-6">
                        Sei sicuro di voler rimuovere questa richiesta dalla coda?
                        <br />
                        <span className="text-sm text-slate-400">Questa azione non si può annullare.</span>
                    </p>

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition border border-slate-200"
                            onClick={() => setShowConfirm(false)}
                            disabled={cancelling}
                        >
                            No, tieni
                        </button>
                        <button
                            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
                            onClick={handleConfirmCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? "Annullamento..." : "Sì, ANNULLA"}
                        </button>
                    </div>
                </div>
            </LogisticsModal>
        </>
    );
}
