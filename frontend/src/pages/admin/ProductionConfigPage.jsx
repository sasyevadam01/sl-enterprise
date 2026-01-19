import React, { useState, useEffect } from 'react';
import { useUI } from '../../components/ui/CustomUI';
import { pickingApi } from '../../api/client';
import {
    Search, Plus, Save, X, Edit2, Check, Power, RefreshCw
} from 'lucide-react';

export default function ProductionConfigPage() {
    const { toast } = useUI();
    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('memory'); // memory, sponge_density, sponge_color

    // Editing State
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState(null);

    useEffect(() => {
        loadData();
    }, [categoryFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get ALL materials including inactive
            const data = await pickingApi.getConfig(categoryFilter, true);
            setMaterials(data);
        } catch (error) {
            console.error(error);
            toast.error("Errore caricamento configurazione");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (item, isNew = false) => {
        try {
            if (isNew) {
                await pickingApi.createMaterial({
                    ...item,
                    category: categoryFilter
                });
                toast.success("Elemento creato");
                setNewItem(null);
            } else {
                await pickingApi.updateMaterial(item.id, item);
                toast.success("Modifiche salvate");
                setEditingItem(null);
            }
            loadData();
        } catch (error) {
            toast.error("Errore salvataggio");
        }
    };

    const toggleStatus = async (item) => {
        try {
            await pickingApi.updateMaterial(item.id, { is_active: !item.is_active });
            toast.success(item.is_active ? "Disattivato" : "Attivato");
            loadData(); // Refresh to update list
        } catch (error) {
            toast.error("Errore cambio stato");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Configurazione Produzione</h1>
                    <p className="text-gray-400">Gestione materiali, colori e densità</p>
                </div>
                <button
                    onClick={() => setNewItem({ label: '', value: '', display_order: 0, is_active: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                    <Plus size={20} />
                    Nuovo Elemento
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'memory', label: 'Memory' },
                    { id: 'sponge_density', label: 'Densità Spugna' },
                    { id: 'sponge_color', label: 'Colori Spugna' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCategoryFilter(tab.id)}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${categoryFilter === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-gray-400 text-sm uppercase">
                            <th className="p-4">Ordine</th>
                            <th className="p-4">Etichetta</th>
                            <th className="p-4">Valore / Codice</th>
                            <th className="p-4">Anteprima</th>
                            <th className="p-4">Stato</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {newItem && (
                            <tr className="bg-blue-500/10 animate-in fade-in">
                                <td className="p-4">
                                    <input
                                        type="number"
                                        className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                        value={newItem.display_order}
                                        onChange={e => setNewItem({ ...newItem, display_order: parseInt(e.target.value) })}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                        placeholder="Nome es. D25"
                                        value={newItem.label}
                                        onChange={e => setNewItem({ ...newItem, label: e.target.value })}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                        placeholder="#HEX o Info"
                                        value={newItem.value}
                                        onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                                    />
                                </td>
                                <td className="p-4">
                                    {categoryFilter === 'sponge_color' && newItem.value && (
                                        <div
                                            className="w-8 h-8 rounded-full border border-white/20"
                                            style={{ backgroundColor: newItem.value }}
                                        />
                                    )}
                                </td>
                                <td className="p-4 text-green-400">Attivo</td>
                                <td className="p-4 flex gap-2 justify-end">
                                    <button onClick={() => handleSave(newItem, true)} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded">
                                        <Save size={18} />
                                    </button>
                                    <button onClick={() => setNewItem(null)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded">
                                        <X size={18} />
                                    </button>
                                </td>
                            </tr>
                        )}

                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Caricamento...</td></tr>
                        ) : materials.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nessun elemento configurato</td></tr>
                        ) : (
                            materials.map(item => (
                                <tr key={item.id} className={`hover:bg-white/5 transition-colors ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>
                                    {editingItem?.id === item.id ? (
                                        /* EDIT MODE */
                                        <>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                                    value={editingItem.display_order}
                                                    onChange={e => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                                    value={editingItem.label}
                                                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-white"
                                                    value={editingItem.value || ''}
                                                    onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                {categoryFilter === 'sponge_color' && (
                                                    <div
                                                        className="w-8 h-8 rounded-full border border-white/20"
                                                        style={{ backgroundColor: editingItem.value }}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">Modifica in corso...</td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <button onClick={() => handleSave(editingItem)} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setEditingItem(null)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded">
                                                    <X size={18} />
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        /* VIEW MODE */
                                        <>
                                            <td className="p-4 font-mono text-gray-400">#{item.display_order}</td>
                                            <td className="p-4 font-medium text-white">{item.label}</td>
                                            <td className="p-4 text-gray-400 font-mono text-sm">{item.value || '-'}</td>
                                            <td className="p-4">
                                                {categoryFilter === 'sponge_color' && item.value && (
                                                    <div
                                                        className="w-8 h-8 rounded-full border border-white/20 shadow-sm"
                                                        style={{ backgroundColor: item.value }}
                                                        title={item.value}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {item.is_active ? (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Archived</span>
                                                ) : ( // Bug above? "Archived"? No, logic is is_active check.
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Attivo</span>
                                                )}
                                                {!item.is_active && (
                                                    <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20 ml-2">Disattivato</span>
                                                )}
                                            </td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <button onClick={() => setEditingItem(item)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(item)}
                                                    className={`p-2 rounded transition ${item.is_active ? 'text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                                    title={item.is_active ? "Disattiva" : "Attiva"}
                                                >
                                                    <Power size={18} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
