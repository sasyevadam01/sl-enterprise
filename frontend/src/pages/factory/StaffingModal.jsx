import React, { useState, useEffect } from 'react';
import { kpiApi, adminApi } from '../../api/client';

const StaffingModal = ({ config, onClose }) => {
    const [requirements, setRequirements] = useState([]);
    const [workstations, setWorkstations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ role_name: '', quantity: 1.0 });

    useEffect(() => {
        loadData();
    }, [config]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [reqs, wsList] = await Promise.all([
                kpiApi.getKpiRequirements(config.id),
                adminApi.getWorkstations()
            ]);
            setRequirements(reqs);
            // Sort workstations alphabetically
            setWorkstations(wsList.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id, field, value) => {
        try {
            // Optimistic update
            setRequirements(prev => prev.map(r =>
                r.id === id ? { ...r, [field]: value } : r
            ));
            await kpiApi.updateRequirement(id, { [field]: value });
        } catch (error) {
            console.error('Update failed', error);
            loadData(); // Revert
        }
    };

    const handleCreate = async () => {
        if (!newItem.role_name) return;
        try {
            const created = await kpiApi.createRequirement(config.id, newItem);
            setRequirements([...requirements, created]);
            setNewItem({ role_name: '', quantity: 1.0 });
        } catch (error) {
            console.error('Create failed', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        👥 Organico: {config.sector_name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center text-gray-400">Caricamento...</div>
                    ) : (
                        <div className="space-y-4">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                                <div className="col-span-8">Ruolo / Mansione</div>
                                <div className="col-span-4 text-center">Quantità (N°)</div>
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {requirements.map(req => (
                                    <div key={req.id} className="grid grid-cols-12 gap-4 items-center bg-gray-750 p-2 rounded">
                                        <div className="col-span-8">
                                            <span className="text-white ml-2">{req.role_name}</span>
                                        </div>
                                        <div className="col-span-4 text-center">
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white w-20 text-center"
                                                value={req.quantity}
                                                onChange={(e) => handleUpdate(req.id, 'quantity', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add New */}
                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <h3 className="text-sm font-medium text-gray-300 mb-3">➕ Aggiungi Ruolo da Postazioni</h3>
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-8">
                                        <select
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none appearance-none"
                                            value={newItem.role_name}
                                            onChange={(e) => setNewItem({ ...newItem, role_name: e.target.value })}
                                        >
                                            <option value="">-- Seleziona Postazione --</option>
                                            {workstations.map(ws => (
                                                <option key={ws.id} value={ws.name}>
                                                    {ws.name} ({ws.department_id ? 'Associato' : 'No Reparto'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            step="0.5"
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-center"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            onClick={handleCreate}
                                            disabled={!newItem.role_name}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Aggiungi
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">* Seleziona dalla lista delle Postazioni configurate in Admin.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffingModal;
