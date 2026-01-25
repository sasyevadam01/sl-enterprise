import React, { useState, useEffect } from 'react';
import { logisticsApi } from '../../api/client';
import { Box, MessageSquare, Clock, Settings, Plus, Trash2, Edit2, Save, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LogisticsAdminPage() {
    const [activeTab, setActiveTab] = useState('materials');

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-100 font-sans">
            <header className="mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    <Settings className="text-blue-400 w-8 h-8" />
                    Configurazione Logistica
                </h1>
                <p className="text-gray-400 mt-2">Gestione completa parametri, materiali e regole del sistema logistico.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <TabButton id="materials" label="Tipi Materiale" icon={<Box size={18} />} active={activeTab} setTab={setActiveTab} />
                <TabButton id="messages" label="Messaggi Quick" icon={<MessageSquare size={18} />} active={activeTab} setTab={setActiveTab} />
                <TabButton id="eta" label="Opzioni ETA" icon={<Clock size={18} />} active={activeTab} setTab={setActiveTab} />
                <TabButton id="config" label="Regole & Punteggi" icon={<Settings size={18} />} active={activeTab} setTab={setActiveTab} />
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-xl">
                {activeTab === 'materials' && <MaterialsManager />}
                {activeTab === 'messages' && <MessagesManager />}
                {activeTab === 'eta' && <EtaManager />}
                {activeTab === 'config' && <ConfigManager />}
            </div>
        </div>
    );
}

function TabButton({ id, label, icon, active, setTab }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap
                ${isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

// --- MATERIALS MANAGER ---
function MaterialsManager() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await logisticsApi.getMaterials(false); // get all, not just active
            setItems(data);
        } catch (err) { toast.error("Errore caricamento materiali"); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (editingId === 'new') {
                await logisticsApi.createMaterial(editForm);
                toast.success("Materiale creato");
            } else {
                await logisticsApi.updateMaterial(editingId, editForm);
                toast.success("Materiale aggiornato");
            }
            setEditingId(null);
            load();
        } catch (err) { toast.error("Errore salvataggio"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Disattivare questo materiale?")) return;
        try {
            await logisticsApi.deleteMaterial(id);
            toast.success("Materiale disattivato");
            load();
        } catch (err) { toast.error("Errore disattivazione"); }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const startNew = () => {
        setEditingId('new');
        setEditForm({ label: '', icon: '📦', category: 'altro', requires_description: false, display_order: 0, is_active: true });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-200">Elenco Tipi Materiale</h3>
                <button onClick={startNew} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={18} /> Nuovo Materiale
                </button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700 text-sm uppercase">
                                <th className="p-3">Icon</th>
                                <th className="p-3">Label</th>
                                <th className="p-3">Categoria</th>
                                <th className="p-3">Rich. Desc.</th>
                                <th className="p-3">Ordine</th>
                                <th className="p-3">Stato</th>
                                <th className="p-3 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editingId === 'new' && (
                                <MaterialRowEdit form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />
                            )}
                            {items.map(item => (
                                editingId === item.id ? (
                                    <MaterialRowEdit key={item.id} form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />
                                ) : (
                                    <MaterialRowDisplay key={item.id} item={item} onEdit={() => startEdit(item)} onDelete={() => handleDelete(item.id)} />
                                )
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const MaterialRowDisplay = ({ item, onEdit, onDelete }) => (
    <tr className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
        <td className="p-3 text-2xl">{item.icon}</td>
        <td className="p-3 font-medium text-white">{item.label}</td>
        <td className="p-3 text-blue-300 bg-blue-900/20 rounded px-2 w-fit text-xs font-mono">{item.category}</td>
        <td className="p-3 text-gray-400">{item.requires_description ? 'Sì, Obbligatoria' : 'No'}</td>
        <td className="p-3 text-gray-400">{item.display_order}</td>
        <td className="p-3">
            <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                {item.is_active ? 'ATTIVO' : 'DISATTIVO'}
            </span>
        </td>
        <td className="p-3 text-right space-x-2">
            <button onClick={onEdit} className="p-2 hover:bg-blue-600/20 text-blue-400 rounded transition"><Edit2 size={16} /></button>
            {item.is_active && (
                <button onClick={onDelete} className="p-2 hover:bg-red-600/20 text-red-400 rounded transition"><Trash2 size={16} /></button>
            )}
        </td>
    </tr>
);

const MaterialRowEdit = ({ form, setForm, onSave, onCancel }) => (
    <tr className="bg-blue-900/20 border border-blue-500/30">
        <td className="p-2"><input className="w-12 bg-gray-900 border border-gray-600 rounded p-1 text-center" value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} /></td>
        <td className="p-2"><input className="w-full bg-gray-900 border border-gray-600 rounded p-1" value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Es. Cartoni" /></td>
        <td className="p-2">
            <select className="bg-gray-900 border border-gray-600 rounded p-1 w-full" value={form.category || 'altro'} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="imballaggio">Imballaggio</option>
                <option value="chimico">Chimico</option>
                <option value="strumenti">Strumenti</option>
                <option value="altro">Altro</option>
            </select>
        </td>
        <td className="p-2 text-center"><input type="checkbox" className="w-5 h-5 accent-blue-500" checked={form.requires_description || false} onChange={e => setForm({ ...form, requires_description: e.target.checked })} /></td>
        <td className="p-2"><input type="number" className="w-16 bg-gray-900 border border-gray-600 rounded p-1" value={form.display_order || 0} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) })} /></td>
        <td className="p-2 text-center"><input type="checkbox" className="w-5 h-5 accent-green-500" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })} /></td>
        <td className="p-2 text-right flex justify-end gap-2">
            <button onClick={onSave} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded"><Save size={16} /></button>
            <button onClick={onCancel} className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded"><X size={16} /></button>
        </td>
    </tr>
);


// --- MESSAGES MANAGER ---
function MessagesManager() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await logisticsApi.getPresetMessages(false);
            setItems(data);
        } catch { toast.error("Errore caricamento messaggi"); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (editingId === 'new') await logisticsApi.createPresetMessage(editForm);
            else await logisticsApi.updatePresetMessage(editingId, editForm);
            toast.success("Salvato!");
            setEditingId(null);
            load();
        } catch { toast.error("Errore salvataggio"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Disattivare?")) return;
        try { await logisticsApi.deletePresetMessage(id); load(); } catch { toast.error("Errore"); }
    };

    const startNew = () => {
        setEditingId('new');
        setEditForm({ content: '', icon: '💬', display_order: 0, is_active: true });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-200">Messaggi Veloci (Quick Msg)</h3>
                <button onClick={startNew} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={18} /> Nuovo Messaggio
                </button>
            </div>
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editingId === 'new' && <MessageCardEdit form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />}
                    {items.map(item => (
                        editingId === item.id
                            ? <MessageCardEdit key={item.id} form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />
                            : <MessageCardDisplay key={item.id} item={item} onEdit={() => { setEditingId(item.id); setEditForm({ ...item }); }} onDelete={() => handleDelete(item.id)} />
                    ))}
                </div>
            )}
        </div>
    );
}

const MessageCardDisplay = ({ item, onEdit, onDelete }) => (
    <div className={`p-4 rounded-lg border flex justify-between items-center ${item.is_active ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-700 opacity-60'}`}>
        <div className="flex items-center gap-4">
            <span className="text-2xl">{item.icon}</span>
            <div>
                <p className="font-semibold text-white">{item.content}</p>
                <p className="text-xs text-gray-500">Ordine: {item.display_order}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 hover:bg-blue-600/20 text-blue-400 rounded"><Edit2 size={16} /></button>
            {item.is_active && <button onClick={onDelete} className="p-2 hover:bg-red-600/20 text-red-400 rounded"><Trash2 size={16} /></button>}
        </div>
    </div>
);

const MessageCardEdit = ({ form, setForm, onSave, onCancel }) => (
    <div className="p-4 rounded-lg border border-blue-500 bg-blue-900/10 flex flex-col gap-3">
        <div className="flex gap-2">
            <input className="w-12 bg-gray-900 border border-gray-600 rounded p-2 text-center" value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Icon" />
            <input className="flex-1 bg-gray-900 border border-gray-600 rounded p-2" value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Messaggio..." />
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                    Ordine:
                    <input type="number" className="w-16 bg-gray-900 border border-gray-600 rounded p-1" value={form.display_order} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) })} />
                </label>
                <label className="text-sm text-gray-400 flex items-center gap-2">
                    Attivo:
                    <input type="checkbox" className="w-4 h-4 accent-green-500" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                </label>
            </div>
            <div className="flex gap-2">
                <button onClick={onSave} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Salva</button>
                <button onClick={onCancel} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">Annulla</button>
            </div>
        </div>
    </div>
);


// --- ETA MANAGER ---
function EtaManager() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        try { setItems(await logisticsApi.getEtaOptions(false)); } catch { } finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (editingId === 'new') await logisticsApi.createEtaOption(editForm);
            else await logisticsApi.updateEtaOption(editingId, editForm);
            setEditingId(null); load(); toast.success("Salvato");
        } catch { toast.error("Errore"); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-200">Opzioni Tempo di Arrivo (ETA)</h3>
                <button onClick={() => { setEditingId('new'); setEditForm({ minutes: 5, label: '', is_active: true, display_order: 0 }) }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={18} /> Nuova Opzione
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editingId === 'new' && <EtaCardEdit form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />}
                {items.map(item => (
                    editingId === item.id
                        ? <EtaCardEdit key={item.id} form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={() => setEditingId(null)} />
                        : <EtaCardDisplay key={item.id} item={item} onEdit={() => { setEditingId(item.id); setEditForm({ ...item }); }} onDelete={async () => { await logisticsApi.deleteEtaOption(item.id); load(); }} />
                ))}
            </div>
        </div>
    );
}

const EtaCardDisplay = ({ item, onEdit, onDelete }) => (
    <div className={`p-4 rounded-lg flex flex-col gap-2 border ${item.is_active ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/50 border-gray-700 opacity-60'}`}>
        <div className="flex justify-between items-start">
            <div>
                <div className="text-2xl font-bold text-blue-400">{item.minutes}'</div>
                <div className="text-sm text-gray-400 uppercase tracking-widest">{item.label}</div>
            </div>
            <div className="flex gap-1">
                <button onClick={onEdit} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded"><Edit2 size={14} /></button>
                {item.is_active && <button onClick={onDelete} className="p-1.5 hover:bg-red-600/20 text-red-400 rounded"><Trash2 size={14} /></button>}
            </div>
        </div>
    </div>
);

const EtaCardEdit = ({ form, setForm, onSave, onCancel }) => (
    <div className="p-4 rounded-lg border border-blue-500 bg-blue-900/10 flex flex-col gap-3">
        <label className="text-xs text-gray-400">Minuti</label>
        <input type="number" className="bg-gray-900 border border-gray-600 rounded p-2" value={form.minutes} onChange={e => setForm({ ...form, minutes: parseInt(e.target.value) })} />
        <label className="text-xs text-gray-400">Etichetta (es. Rapido)</label>
        <input className="bg-gray-900 border border-gray-600 rounded p-2" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
        <div className="flex justify-between mt-2">
            <button onClick={onSave} className="bg-green-600 text-white px-3 py-1 rounded text-sm"><Save size={14} /></button>
            <button onClick={onCancel} className="bg-gray-600 text-white px-3 py-1 rounded text-sm"><X size={14} /></button>
        </div>
    </div>
);


// --- CONFIG MANAGER ---
function ConfigManager() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await logisticsApi.getConfig();
            setConfigs(data);
        } catch { } finally { setLoading(false); }
    };

    const handleUpdate = async (key, value) => {
        try {
            await logisticsApi.updateConfig(key, value);
            toast.success("Parametro aggiornato");
            load();
        } catch { toast.error("Errore aggiornamento"); }
    };

    const grouped = {
        Points: configs.filter(c => c.config_key.startsWith('points_')),
        Penalties: configs.filter(c => c.config_key.startsWith('penalty_')),
        Thresholds: configs.filter(c => c.config_key.startsWith('threshold_'))
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-200 mb-6">Regole di Gamification & SLA</h3>

            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ConfigGroup title="Punti (Rewards)" items={grouped.Points} onUpdate={handleUpdate} icon={<Box className="text-green-400" />} />
                    <ConfigGroup title="Penalità (Malus)" items={grouped.Penalties} onUpdate={handleUpdate} icon={<Trash2 className="text-red-400" />} />
                    <ConfigGroup title="Soglie Tempo (Minuti)" items={grouped.Thresholds} onUpdate={handleUpdate} icon={<Clock className="text-yellow-400" />} />
                </div>
            )}
        </div>
    );
}

const ConfigGroup = ({ title, items, onUpdate, icon }) => (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h4 className="font-bold text-gray-300 mb-4 flex items-center gap-2">{icon} {title}</h4>
        <div className="space-y-4">
            {items.map(c => (
                <div key={c.config_key} className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-mono uppercase truncate" title={c.config_key}>
                        {c.config_key.replace(/^(points_|penalty_|threshold_)/, '').replace(/_/g, ' ')}
                    </label>
                    <div className="flex gap-2">
                        <input
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 w-full font-mono text-blue-300 focus:border-blue-500 outline-none"
                            defaultValue={c.config_value}
                            onBlur={(e) => {
                                if (e.target.value !== c.config_value) onUpdate(c.config_key, e.target.value);
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const LoadingSpinner = () => (
    <div className="flex justify-center py-20">
        <RefreshCw className="animate-spin text-blue-500 w-12 h-12" />
    </div>
);
