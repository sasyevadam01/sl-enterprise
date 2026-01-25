import { useState, useEffect } from 'react';
import { logisticsApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';

export default function LogisticsConfigPage() {
    const { toast } = useUI();
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    // Definisco le categorie e le chiavi conosciute per ordinarle meglio
    const categories = {
        'POINTS': {
            title: '🏆 Punti & Bonus',
            icon: '⭐',
            keys: ['points_base_mission', 'points_urgent_mission', 'points_super_speed_bonus', 'points_save_abandoned']
        },
        'PENALTIES': {
            title: '⚠️ Penalità',
            icon: '🔻',
            keys: ['penalty_late_light', 'penalty_late_medium', 'penalty_late_severe', 'penalty_release_task', 'penalty_urgency_received']
        },
        'THRESHOLDS': {
            title: '⏱️ Soglie Tempo (minuti)',
            icon: '⏳',
            keys: ['threshold_late_light_minutes', 'threshold_late_medium_minutes', 'threshold_sla_warning_minutes']
        }
    };

    // Helper per label user-friendly
    const getLabel = (key) => {
        const labels = {
            'points_base_mission': 'Punti Base (Missione)',
            'points_urgent_mission': 'Punti Missione Urgente',
            'points_super_speed_bonus': 'Bonus Super Velocità',
            'points_save_abandoned': 'Punti Salvataggio (Task Rilasciata)',
            'penalty_late_light': 'Penalità Ritardo Lieve',
            'penalty_late_medium': 'Penalità Ritardo Medio',
            'penalty_late_severe': 'Penalità Ritardo Grave',
            'penalty_release_task': 'Penalità Rilascio Task',
            'penalty_urgency_received': 'Penalità Sollecito',
            'threshold_late_light_minutes': 'Soglia Ritardo Lieve (min)',
            'threshold_late_medium_minutes': 'Soglia Ritardo Medio (min)',
            'threshold_sla_warning_minutes': 'Soglia Avviso Ritardo (min)'
        };
        return labels[key] || key;
    };

    // --- MATERIALS LOGIC ---
    const [materials, setMaterials] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        icon: '📦',
        category: 'imballo',
        display_order: 10,
        base_points: 0,
        requires_description: false
    });

    useEffect(() => {
        loadConfig();
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            const data = await logisticsApi.getMaterials(false);
            setMaterials(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (material) => {
        setEditingId(material.id);
        setFormData({
            label: material.label,
            icon: material.icon,
            category: material.category,
            display_order: material.display_order,
            base_points: material.base_points || 0,
            requires_description: material.requires_description
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            label: '',
            icon: '📦',
            category: 'imballo',
            display_order: 10,
            base_points: 0,
            requires_description: false
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await logisticsApi.updateMaterial(editingId, formData);
                toast.success("Materiale aggiornato!");
            } else {
                await logisticsApi.createMaterial(formData);
                toast.success("Materiale creato!");
            }
            handleCancelEdit();
            loadMaterials();
        } catch (err) {
            toast.error("Errore salvataggio");
        }
    };

    const handleDeleteMaterial = async (id) => {
        if (!window.confirm("Sei sicuro?")) return;
        try {
            await logisticsApi.deleteMaterial(id);
            toast.success("Materiale eliminato");
            loadMaterials();
        } catch (err) {
            toast.error("Errore eliminazione");
        }
    };

    const loadConfig = async () => {
        try {
            const data = await logisticsApi.getConfig();
            console.log("Loaded config:", data);
            setConfigs(data);
        } catch (err) {
            console.error(err);
            toast.error("Errore caricamento configurazioni");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key, newValue) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            await logisticsApi.updateConfig(key, newValue);
            toast.success(`Aggiornato: ${getLabel(key)}`);
            loadConfig(); // Reload to be sure
        } catch (err) {
            console.error(err);
            toast.error("Errore aggiornamento");
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // Raggruppa le config per categoria
    const groupedConfigs = Object.keys(categories).reduce((acc, catKey) => {
        acc[catKey] = configs.filter(c => categories[catKey].keys.includes(c.config_key));
        return acc;
    }, {});

    // Config non categorizzate (Other)
    const allKnownKeys = Object.values(categories).flatMap(c => c.keys);
    const otherConfigs = configs.filter(c => !allKnownKeys.includes(c.config_key));

    if (loading) return <div className="p-8 text-white">Caricamento...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-white mb-2">⚙️ Configurazione Logistica</h1>
            <p className="text-gray-400 mb-8">Gestisci materiali, punteggi e parametri del sistema.</p>

            {/* --- SEZIONE MATERIALI --- */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        <h2 className="text-xl font-bold text-white">{editingId ? 'Modifica Materiale' : 'Tipi di Materiale'}</h2>
                    </div>
                    {editingId && (
                        <button onClick={handleCancelEdit} className="text-sm text-gray-400 hover:text-white underline">
                            Annulla Modifica
                        </button>
                    )}
                </div>

                {/* Form Nuovo/Edit Materiale */}
                <form onSubmit={handleFormSubmit} className={`p-4 rounded-lg border border-slate-700 mb-6 flex flex-wrap gap-4 items-end transition-colors ${editingId ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-900/50'}`}>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Etichetta</label>
                        <input
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            required
                            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white w-48 focus:border-blue-500 outline-none"
                            placeholder="Es. Cartoni..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Icona</label>
                        <input
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white w-16 text-center focus:border-blue-500 outline-none"
                            placeholder="📦"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white w-32 focus:border-blue-500 outline-none"
                        >
                            <option value="imballo">Imballo</option>
                            <option value="materie_prime">Mat. Prime</option>
                            <option value="logistica">Logistica</option>
                            <option value="altro">Altro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Ordine</label>
                        <input
                            type="number"
                            value={formData.display_order}
                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white w-20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1 text-yellow-400">Punti Bonus</label>
                        <input
                            type="number"
                            value={formData.base_points}
                            onChange={(e) => setFormData({ ...formData, base_points: parseInt(e.target.value) || 0 })}
                            className="bg-slate-800 border border-yellow-600/50 rounded px-3 py-2 text-yellow-100 w-24 focus:border-yellow-500 outline-none text-right font-bold"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="checkbox"
                            id="req_desc"
                            checked={formData.requires_description}
                            onChange={(e) => setFormData({ ...formData, requires_description: e.target.checked })}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="req_desc" className="text-sm text-gray-300 cursor-pointer">Richiede Note</label>
                    </div>
                    <button type="submit" className={`font-bold py-2 px-4 rounded mb-0.5 transition ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                        {editingId ? '💾 Salva' : '+ Aggiungi'}
                    </button>
                </form>

                {/* Lista Materiali */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-sm border-b border-slate-700">
                                <th className="p-2">Icona</th>
                                <th className="p-2">Nome</th>
                                <th className="p-2">Categoria</th>
                                <th className="p-2">Bonus</th>
                                <th className="p-2 text-center">Ordine</th>
                                <th className="p-2 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map(m => (
                                <tr key={m.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition group ${editingId === m.id ? 'bg-blue-900/10' : ''}`}>
                                    <td className="p-2 text-2xl">{m.icon}</td>
                                    <td className="p-2 font-medium text-white">
                                        {m.label}
                                        {!m.is_active && <span className="ml-2 text-xs bg-red-500/20 text-red-500 px-1 rounded">Disattivo</span>}
                                    </td>
                                    <td className="p-2 text-gray-300 text-sm">{m.category}</td>
                                    <td className="p-2 text-center">
                                        {m.base_points > 0 && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold">+{m.base_points} pt</span>}
                                    </td>
                                    <td className="p-2 text-center text-gray-400">{m.display_order}</td>
                                    <td className="p-2 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => handleEdit(m)}
                                                className="text-blue-400 hover:text-blue-300 p-1"
                                                title="Modifica"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMaterial(m.id)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                                title="Elimina"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6 mt-12">🎛️ Parametri Punteggi</h2>
            <div className="space-y-8">
                {Object.entries(categories).map(([catKey, category]) => (
                    <div key={catKey} className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                            <span className="text-2xl">{category.icon}</span>
                            <h2 className="text-xl font-bold text-white">{category.title}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedConfigs[catKey]?.map(conf => (
                                <ConfigItem
                                    key={conf.config_key}
                                    conf={conf}
                                    label={getLabel(conf.config_key)}
                                    onSave={handleUpdate}
                                    isSaving={saving[conf.config_key]}
                                />
                            ))}
                            {groupedConfigs[catKey]?.length === 0 && (
                                <p className="text-gray-500 italic col-span-full">Nessun parametro trovato.</p>
                            )}
                        </div>
                    </div>
                ))}

                {/* Other Configs */}
                {otherConfigs.length > 0 && (
                    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-6">🛠️ Altre Configurazioni</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {otherConfigs.map(conf => (
                                <ConfigItem
                                    key={conf.config_key}
                                    conf={conf}
                                    label={conf.config_key}
                                    onSave={handleUpdate}
                                    isSaving={saving[conf.config_key]}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConfigItem({ conf, label, onSave, isSaving }) {
    const [value, setValue] = useState(conf.config_value);
    const hasChanged = value !== conf.config_value;

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 transition">
            <label className="block text-sm text-gray-400 font-bold mb-2 h-10 flex items-center">{label}</label>
            <div className="flex gap-2">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:border-blue-500 outline-none"
                    placeholder=" Valore..."
                />
                <button
                    onClick={() => onSave(conf.config_key, value)}
                    disabled={!hasChanged || isSaving}
                    className={`px-3 py-2 rounded font-bold transition ${hasChanged
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? '...' : '💾'}
                </button>
            </div>
        </div>
    );
}
