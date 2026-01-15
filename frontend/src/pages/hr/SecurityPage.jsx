import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { expiriesApi, facilityApi } from '../../api/client';
import { PlusIcon, TrashIcon, PencilIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useUI } from '../../components/ui/CustomUI';

export default function SecurityPage() {
    const { showConfirm, toast } = useUI();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // all, contracts, certifications, medical, services
    const [details, setDetails] = useState({
        certifications: [],
        medical: [],
        contracts: [],
        services: []
    });

    // Modal controls for adding/editing services
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [serviceForm, setServiceForm] = useState({
        name: '',
        category: 'other',
        provider_name: '',
        contact_email: '',
        contact_phone: '',
        due_date: '',
        recurrence_months: 12,
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashData, certs, medical, contracts, services] = await Promise.all([
                expiriesApi.getExpiries().catch(e => ({})),
                expiriesApi.getCertifications(60).catch(e => []),
                expiriesApi.getMedicalExams(60).catch(e => []),
                expiriesApi.getContracts(60).catch(e => []),
                facilityApi.getDb().catch(e => [])
            ]);

            setDashboard(dashData);
            setDetails({
                certifications: Array.isArray(certs) ? certs : [],
                medical: Array.isArray(medical) ? medical : [],
                contracts: Array.isArray(contracts) ? contracts : [],
                services: Array.isArray(services) ? services : []
            });
        } catch (error) {
            console.error('Error fetching security data:', error);
            setDetails({ certifications: [], medical: [], contracts: [], services: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingService) {
                await facilityApi.update(editingService.id, serviceForm);
            } else {
                await facilityApi.create(serviceForm);
            }
            setIsServiceModalOpen(false);
            setEditingService(null);
            setServiceForm({
                name: '', category: 'other', provider_name: '', contact_email: '',
                contact_phone: '', due_date: '', recurrence_months: 12, notes: ''
            });
            toast.success(editingService ? "Servizio aggiornato" : "Nuovo servizio creato");
            fetchData();
        } catch (error) {
            console.error('Error saving service:', error);
            toast.error('Errore nel salvataggio');
        }
    };

    const handleDeleteService = async (id) => {
        const confirmed = await showConfirm({
            title: "Elimina Scadenza",
            message: "Sei sicuro di voler eliminare questa scadenza?",
            type: "danger",
            confirmText: "Elimina"
        });
        if (!confirmed) return;

        try {
            await facilityApi.delete(id);
            toast.success("Scadenza eliminata");
            fetchData();
        } catch (error) {
            console.error('Error deleting service', error);
            toast.error("Errore durante l'eliminazione");
        }
    };

    const handleEditService = (service) => {
        setEditingService(service);
        setServiceForm({
            ...service,
            due_date: service.due_date.split('T')[0] // Format for input date
        });
        setIsServiceModalOpen(true);
    };

    const openNewServiceModal = () => {
        setEditingService(null);
        setServiceForm({
            name: '',
            category: 'other',
            provider_name: '',
            contact_email: '',
            contact_phone: '',
            due_date: '',
            recurrence_months: 12,
            notes: ''
        });
        setIsServiceModalOpen(true);
    };

    // Counting Logic
    const urgentCount = (dashboard?.total_urgent || 0) +
        (details.services?.filter(s => new Date(s.due_date) < new Date(Date.now() + 7 * 86400000) && s.status !== 'completed').length || 0);

    const tabs = [
        { id: 'all', label: 'Tutte', count: (details.certifications?.length || 0) + (details.medical?.length || 0) + (details.contracts?.length || 0) + (details.services?.length || 0) },
        { id: 'services', label: '🛠️ Servizi Esterni', count: details.services?.length || 0 },
        { id: 'contracts', label: '📄 Contratti', count: details.contracts?.length || 0 },
        { id: 'certifications', label: '🎓 Certificazioni', count: details.certifications?.length || 0 },
        { id: 'medical', label: '🏥 Visite Mediche', count: details.medical?.length || 0 },
    ];

    const getFilteredItems = () => {
        let items = [];
        if (activeTab === 'all') {
            items = [
                ...details.services.map(i => ({ ...i, _type: 'service' })),
                ...details.contracts.map(i => ({ ...i, _type: 'contract' })),
                ...details.certifications.map(i => ({ ...i, _type: 'certification' })),
                ...details.medical.map(i => ({ ...i, _type: 'medical' }))
            ];
        } else if (activeTab === 'services') {
            items = details.services.map(i => ({ ...i, _type: 'service' }));
        } else {
            // ... existing logic fallback ...
            if (activeTab === 'contracts') items = details.contracts.map(i => ({ ...i, _type: 'contract' }));
            if (activeTab === 'certifications') items = details.certifications.map(i => ({ ...i, _type: 'certification' }));
            if (activeTab === 'medical') items = details.medical.map(i => ({ ...i, _type: 'medical' }));
        }


        // Final safety check to ensure we always return an array
        return Array.isArray(items) ? items.sort((a, b) => {
            const dateA = a.due_date || a.contract_end || a.expiry_date || a.next_exam_date;
            const dateB = b.due_date || b.contract_end || b.expiry_date || b.next_exam_date;
            return new Date(dateA) - new Date(dateB);
        }) : [];
    };

    const filteredItems = getFilteredItems();

    if (loading) return <div className="text-white text-center mt-10">Caricamento in corso...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">🛡️ Sicurezza & RSPP</h1>
                    <p className="text-gray-400 mt-1">Gestione Scadenze HR e Manutenzioni Infrastrutturali</p>
                </div>
                <div className="flex gap-4">
                    {urgentCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-red-400 font-bold text-lg leading-none">{urgentCount}</p>
                                <p className="text-red-300 text-xs">Urgente</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={openNewServiceModal}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Aggiungi Servizio
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-slate-700 text-white border border-white/20'
                            : 'text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-800'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Main Table */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-slate-900/50 text-xs uppercase font-medium text-gray-400">
                        <tr>
                            <th className="px-6 py-4">Titolo / Dipendente</th>
                            <th className="px-6 py-4">Categoria / Tipo</th>
                            <th className="px-6 py-4">Scadenza</th>
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredItems.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-10 opacity-50">Nessuna scadenza trovata</td></tr>
                        ) : filteredItems.map((item, idx) => {
                            const date = item.due_date || item.contract_end || item.expiry_date || item.next_exam_date;
                            const daysLeft = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
                            const isUrgent = daysLeft <= 7;

                            return (
                                <tr key={idx} className={`hover:bg-white/5 transition ${isUrgent ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        {item._type === 'service' ? (
                                            <span className="font-semibold text-white">{item.name}</span>
                                        ) : (
                                            <Link to={`/hr/employees/${item.employee_id || item.id}`} className="text-blue-400 hover:underline">
                                                {item.employee_name || `${item.first_name} ${item.last_name}`}
                                            </Link>
                                        )}
                                        {item._type === 'service' && item.provider_name && (
                                            <div className="text-xs text-gray-500">{item.provider_name}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-slate-700/50 text-xs border border-white/5">
                                            {item._type === 'service' ? item.category : (item.cert_type || item.exam_type || 'Contratto')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span>{new Date(date).toLocaleDateString('it-IT')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${daysLeft < 0 ? 'bg-red-500/20 text-red-400' :
                                            daysLeft <= 7 ? 'bg-orange-500/20 text-orange-400' :
                                                daysLeft <= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-green-500/20 text-green-400'
                                            }`}>
                                            {daysLeft < 0 ? `Scaduto da ${Math.abs(daysLeft)}gg` :
                                                daysLeft === 0 ? 'SCADE OGGI' :
                                                    `${daysLeft} giorni`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item._type === 'service' && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEditService(item)} className="p-1 hover:bg-white/10 rounded text-blue-400 transition" title="Modifica">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteService(item.id)} className="p-1 hover:bg-white/10 rounded text-red-400 transition" title="Elimina">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Service Modal */}
            {isServiceModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingService ? 'Modifica Servizio' : 'Nuova Scadenza Servizio'}
                        </h2>
                        <form onSubmit={handleServiceSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome Servizio / Macchinario</label>
                                <input type="text" required value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    className="w-full bg-slate-800 border-white/10 rounded-lg text-white" placeholder="es. Manutenzione Compressori" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                                    <select value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                                        className="w-full bg-slate-800 border-white/10 rounded-lg text-white">
                                        <option value="air_system">Aria Compressa</option>
                                        <option value="shelving">Scaffalature</option>
                                        <option value="hvac">Aria Condizionata</option>
                                        <option value="pest_control">Disinfestazione</option>
                                        <option value="fire_safety">Antincendio</option>
                                        <option value="other">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Fornitore</label>
                                    <input type="text" value={serviceForm.provider_name} onChange={e => setServiceForm({ ...serviceForm, provider_name: e.target.value })}
                                        className="w-full bg-slate-800 border-white/10 rounded-lg text-white" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Data Scadenza</label>
                                    <input type="date" required value={serviceForm.due_date} onChange={e => setServiceForm({ ...serviceForm, due_date: e.target.value })}
                                        className="w-full bg-slate-800 border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Ricorrenza (Mesi)</label>
                                    <input type="number" value={serviceForm.recurrence_months} onChange={e => setServiceForm({ ...serviceForm, recurrence_months: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border-white/10 rounded-lg text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Note</label>
                                <textarea value={serviceForm.notes} onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })}
                                    className="w-full bg-slate-800 border-white/10 rounded-lg text-white h-20" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-4 py-2 hover:bg-white/10 rounded-lg text-gray-300">Annulla</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">Salva</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
