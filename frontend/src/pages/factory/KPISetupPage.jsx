import React, { useState, useEffect } from 'react';
import { kpiApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StaffingModal from './StaffingModal';
import { motion, AnimatePresence } from 'framer-motion';

const KPISetupPage = () => {
    const { user } = useAuth();
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConfig, setSelectedConfig] = useState(null); // For Staffing Modal
    const [isStaffingModalOpen, setIsStaffingModalOpen] = useState(false);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newConfig, setNewConfig] = useState({ sector_name: '', kpi_target_8h: 400 });

    // Delete Confirmation
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Load Configs
    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setLoading(true);
            const data = await kpiApi.getConfigs();
            setConfigs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await kpiApi.createConfig({
                ...newConfig,
                kpi_target_hourly: newConfig.kpi_target_8h / 8.0,
                is_active: true
            });
            setIsCreateModalOpen(false);
            setNewConfig({ sector_name: '', kpi_target_8h: 400 });
            loadConfigs();
        } catch (error) {
            console.error("Create failed", error);
            alert("Errore nella creazione del KPI");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await kpiApi.deleteConfig(deleteTarget.id);
            if (res.status === 'deactivated') {
                alert(`⚠️ ${res.message}`);
            }
            setDeleteTarget(null);
            loadConfigs();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Errore durante l'eliminazione");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700/50">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        ⚙️ Configurazione KPI
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">
                        Gestisci i settori produttivi, i target di efficienza e l'organico necessario.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-blue-600 px-6 font-medium text-white transition-all duration-300 hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                >
                    <span className="mr-2 text-xl">+</span>
                    <span>Nuovo KPI</span>
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                </button>
            </div>

            {/* List Section */}
            <div className="grid gap-4">
                <AnimatePresence>
                    {configs.map((config, index) => (
                        <ConfigRow
                            key={config.id}
                            config={config}
                            index={index}
                            onOpenStaffing={() => {
                                setSelectedConfig(config);
                                setIsStaffingModalOpen(true);
                            }}
                            onDelete={() => setDeleteTarget(config)}
                            onReload={loadConfigs}
                        />
                    ))}
                </AnimatePresence>

                {configs.length === 0 && (
                    <div className="text-center py-20 text-gray-500 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700">
                        Nessun KPI configurato. Clicca su "Nuovo KPI" per iniziare.
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700 ring-1 ring-white/10"
                    >
                        <h2 className="text-2xl font-bold text-white mb-6">Nuovo Settore KPI</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Nome Settore</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    value={newConfig.sector_name}
                                    onChange={e => setNewConfig({ ...newConfig, sector_name: e.target.value })}
                                    placeholder="Es. Imballaggio Grassi"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Target (8 ore)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={newConfig.kpi_target_8h}
                                        onChange={e => setNewConfig({ ...newConfig, kpi_target_8h: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="absolute right-4 top-3 text-gray-500 text-sm">Pz</span>
                                </div>
                                <p className="text-blue-400 text-xs mt-2 text-right">
                                    Target orario stimato: <span className="font-mono font-bold">{((newConfig.kpi_target_8h || 0) / 8).toFixed(1)}</span> pz/h
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newConfig.sector_name}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                            >
                                Crea Settore
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-red-500/30 ring-1 ring-red-500/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-2xl">
                                🗑️
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Elimina KPI</h3>
                                <p className="text-sm text-gray-400">Questa azione è irreversibile.</p>
                            </div>
                        </div>

                        <div className="text-gray-300 mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                            Stai per eliminare il settore <strong className="text-white">{deleteTarget.sector_name}</strong>.
                            <br /><br />
                            <span className="text-xs text-gray-500">Nota: Se ci sono dati storici, il settore verrà disattivato invece di essere cancellato.</span>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 transition"
                            >
                                Conferma Eliminazione
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Staffing Modal */}
            {isStaffingModalOpen && selectedConfig && (
                <StaffingModal
                    config={selectedConfig}
                    onClose={() => {
                        setIsStaffingModalOpen(false);
                        loadConfigs(); // Refresh totals on close
                    }}
                />
            )}
        </div>
    );
};

// Subcomponent for Row logic
const ConfigRow = ({ config, index, onOpenStaffing, onDelete, onReload }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        kpi_target_8h: config.kpi_target_8h
    });

    const handleSave = async () => {
        try {
            await kpiApi.updateConfig(config.id, {
                kpi_target_8h: parseInt(editValues.kpi_target_8h),
                kpi_target_hourly: parseInt(editValues.kpi_target_8h) / 8.0
            });
            setIsEditing(false);
            onReload();
        } catch (error) {
            console.error("Save failed", error);
            alert("Errore aggiornamento");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
                relative bg-gray-800 rounded-xl p-5 border transition-all duration-300
                ${isEditing ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-blue-900/20 shadow-lg' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-750 hover:shadow-xl'}
            `}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* Sector Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center text-lg shadow-inner">
                            🏭
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{config.sector_name}</h3>
                            <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                                <span>ID: #{config.id}</span>
                                <span className="text-gray-600">•</span>
                                <span className={config.operators_required > 0 ? "text-green-400" : "text-gray-500"}>
                                    {config.operators_required ? config.operators_required.toFixed(1) : '0'} Operatori Richiesti
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Info */}
                <div className="flex items-center gap-6 bg-gray-900/50 px-6 py-3 rounded-lg border border-gray-700/50">
                    <div className="text-center">
                        <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Target 8h</span>
                        {isEditing ? (
                            <input
                                type="number"
                                className="bg-gray-800 border border-blue-500 rounded px-2 py-1 text-white w-24 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={editValues.kpi_target_8h}
                                onChange={(e) => setEditValues({ kpi_target_8h: e.target.value })}
                                autoFocus
                            />
                        ) : (
                            <span className="block text-xl font-mono text-white tracking-widest">{config.kpi_target_8h}</span>
                        )}
                    </div>

                    <div className="w-px h-8 bg-gray-700"></div>

                    <div className="text-center opacity-70">
                        <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Orario</span>
                        <span className="block text-lg font-mono text-gray-300">{(config.kpi_target_8h / 8).toFixed(1)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-700/50 md:ml-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2"
                            >
                                💾 Salva
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onOpenStaffing}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium border border-gray-600 transition-all hover:shadow-lg group"
                            >
                                👥 <span className="hidden lg:inline group-hover:inline">Gestisci Organico</span>
                            </button>

                            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700">
                                <button
                                    onClick={() => {
                                        setEditValues({ kpi_target_8h: config.kpi_target_8h });
                                        setIsEditing(true);
                                    }}
                                    className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-md transition-all"
                                    title="Modifica Target"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-md transition-all"
                                    title="Elimina KPI"
                                >
                                    🗑️
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default KPISetupPage;
