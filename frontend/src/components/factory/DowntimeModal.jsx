import { useState, useEffect } from 'react';
import { factoryApi } from '../../api/client';

const CAUSES = [
    { id: 'mechanical_breakdown', label: 'Guasto Meccanico', icon: '🛠️', color: 'bg-red-600 hover:bg-red-700' },
    { id: 'electrical_breakdown', label: 'Guasto Elettrico', icon: '⚡', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { id: 'no_material', label: 'Mancanza Materiale', icon: '📦', color: 'bg-orange-600 hover:bg-orange-700' },
    { id: 'no_operator', label: 'Assenza Operatore', icon: '👥', color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'setup', label: 'Cambio Formato', icon: '⚙️', color: 'bg-purple-600 hover:bg-purple-700' },
    { id: 'cleaning', label: 'Pulizia', icon: '🧹', color: 'bg-green-600 hover:bg-green-700' },
    { id: 'pause', label: 'Pausa', icon: '⏸️', color: 'bg-gray-600 hover:bg-gray-700' },
    { id: 'other', label: 'Altro', icon: 'ℹ️', color: 'bg-slate-600 hover:bg-slate-700' },
];

export default function DowntimeModal({ banchina, onClose, onSuccess }) {
    const [selectedCause, setSelectedCause] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Active Downtime Check
    const activeDowntime = banchina.active_downtime;

    const handleReport = async () => {
        if (!selectedCause) return;

        setLoading(true);
        setError(null);
        try {
            await factoryApi.reportDowntime({
                banchina_id: banchina.id,
                reason: selectedCause.id,
                notes: notes || null
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Errore nella registrazione del fermo");
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setLoading(true);
        setError(null);
        try {
            await factoryApi.closeDowntime(activeDowntime.id);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Errore nella chiusura del fermo");
            setLoading(false);
        }
    };

    // Find label/icon for active downtime
    const activeCause = activeDowntime
        ? CAUSES.find(c => c.id === activeDowntime.reason) || { label: activeDowntime.reason, icon: '⚠️', color: 'bg-red-600' }
        : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`p-6 border-b border-white/10 flex justify-between items-center ${activeDowntime ? 'bg-red-900/40' : 'bg-slate-900/50'}`}>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {activeDowntime ? '🔴 Fermo In Corso' : '⚠️ Segnala Fermo'}: Banchina {banchina.code}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {activeDowntime ? 'Risolvi il problema per riprendere la produzione' : 'Seleziona la causa del fermo'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {activeDowntime ? (
                        // --- RESOLVE MODE ---
                        <div className="flex flex-col items-center gap-6 py-4">
                            <div className={`p-6 rounded-full ${activeCause?.color || 'bg-red-600'} text-6xl shadow-2xl`}>
                                {activeCause?.icon}
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-2">{activeCause?.label}</h3>
                                <div className="text-gray-300 flex flex-col gap-1">
                                    <p>Inizio: <span className="text-white font-mono">{activeDowntime.start_time}</span></p>
                                    {activeDowntime.notes && <p className="italic">"{activeDowntime.notes}"</p>}
                                </div>
                            </div>
                            <div className="w-full h-px bg-white/10 my-2"></div>
                            <p className="text-yellow-400 text-sm animate-pulse">
                                La produzione è ferma. Clicca Risolvi quando l'operatività è ripristinata.
                            </p>
                        </div>
                    ) : (
                        // --- REPORT MODE ---
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {CAUSES.map(cause => (
                                    <button
                                        key={cause.id}
                                        onClick={() => setSelectedCause(cause)}
                                        className={`p-4 rounded-xl transition-all flex flex-col items-center gap-2 border-2 ${selectedCause?.id === cause.id
                                                ? 'border-white scale-105 shadow-xl ring-2 ring-white/20'
                                                : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                                            } ${cause.color}`}
                                    >
                                        <span className="text-3xl">{cause.icon}</span>
                                        <span className="font-bold text-sm text-center text-white">{cause.label}</span>
                                    </button>
                                ))}
                            </div>

                            {selectedCause && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Note (Opzionale)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="Dettagli aggiuntivi..."
                                        rows={3}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900/50 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition"
                        disabled={loading}
                    >
                        Annulla
                    </button>

                    {activeDowntime ? (
                        <button
                            onClick={handleResolve}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-2"
                        >
                            {loading ? 'Operazione in corso...' : '✅ Risolvi / Riprendi'}
                        </button>
                    ) : (
                        <button
                            onClick={handleReport}
                            disabled={!selectedCause || loading}
                            className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${selectedCause && !loading
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer'
                                    : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Registrazione...' : '🔴 Conferma Fermo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
