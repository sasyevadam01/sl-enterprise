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
                    <h1 className="text-3xl font-bold text-gray-900">Configurazione Produzione</h1>
                    <p className="text-gray-500">Gestione materiali, colori e densità</p>
                </div>
                <button
                    onClick={() => setNewItem({ label: '', value: '', display_order: 0, is_active: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-sm"
                >
                    <Plus size={20} />
                    Nuovo Elemento
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { id: 'memory', label: 'Memory' },
                    { id: 'sponge_density', label: 'Densità Spugna' },
                    { id: 'sponge_color', label: 'Colori Spugna' },
                    { id: 'block_dimension', label: '📏 Misure Blocco' },
                    { id: 'supplier', label: '🏭 Fornitori' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCategoryFilter(tab.id)}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${categoryFilter === tab.id
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="master-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm uppercase">
                            <th className="p-4">Ordine</th>
                            <th className="p-4">Etichetta</th>
                            <th className="p-4">Valore / Codice</th>
                            <th className="p-4">Anteprima</th>
                            <th className="p-4">Stato</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {newItem && (
                            <tr className="bg-green-50 animate-in fade-in">
                                <td className="p-4">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                        value={newItem.display_order}
                                        onChange={e => setNewItem({ ...newItem, display_order: parseInt(e.target.value) })}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                        placeholder="Nome es. D25"
                                        value={newItem.label}
                                        onChange={e => setNewItem({ ...newItem, label: e.target.value })}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                        placeholder="#HEX o Info"
                                        value={newItem.value}
                                        onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                                    />
                                </td>
                                <td className="p-4">
                                    {categoryFilter === 'sponge_color' && newItem.value && (
                                        <div
                                            className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                            style={{ backgroundColor: newItem.value }}
                                        />
                                    )}
                                </td>
                                <td className="p-4 text-green-600 font-medium">Attivo</td>
                                <td className="p-4 flex gap-2 justify-end">
                                    <button onClick={() => handleSave(newItem, true)} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200 transition">
                                        <Save size={18} />
                                    </button>
                                    <button onClick={() => setNewItem(null)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition">
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
                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>
                                    {editingItem?.id === item.id ? (
                                        /* EDIT MODE */
                                        <>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                                    value={editingItem.display_order}
                                                    onChange={e => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                                    value={editingItem.label}
                                                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-green-600"
                                                    value={editingItem.value || ''}
                                                    onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-4">
                                                {categoryFilter === 'sponge_color' && (
                                                    <div
                                                        className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                                        style={{ backgroundColor: editingItem.value }}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4 text-amber-600 font-medium">Modifica in corso...</td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <button onClick={() => handleSave(editingItem)} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200 transition">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setEditingItem(null)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition">
                                                    <X size={18} />
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        /* VIEW MODE */
                                        <>
                                            <td className="p-4 font-mono text-gray-500">#{item.display_order}</td>
                                            <td className="p-4 font-medium text-gray-900">{item.label}</td>
                                            <td className="p-4 text-gray-500 font-mono text-sm">{item.value || '-'}</td>
                                            <td className="p-4">
                                                {categoryFilter === 'sponge_color' && item.value && (
                                                    <div
                                                        className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                                        style={{ backgroundColor: item.value }}
                                                        title={item.value}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {item.is_active ? (
                                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 font-medium">Attivo</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full border border-red-200 font-medium">Disattivato</span>
                                                )}
                                            </td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <button onClick={() => setEditingItem(item)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(item)}
                                                    className={`p-2 rounded transition ${item.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
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
