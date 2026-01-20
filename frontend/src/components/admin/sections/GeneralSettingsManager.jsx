import { useState, useEffect } from 'react';
import { useUI } from '../../ui/CustomUI';

export default function GeneralSettingsManager() {
    const { toast } = useUI();
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filtered states for specific known settings
    const [annualHours, setAnnualHours] = useState('256');
    const [applyToAll, setApplyToAll] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);

                // Parse specific settings
                const hours = data.find(s => s.key === 'annual_leave_hours');
                if (hours) setAnnualHours(hours.value);
            }
        } catch (error) {
            console.error(error);
            toast.error('Errore caricamento impostazioni');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');

            // Update Annual Hours
            const res = await fetch('/api/admin/settings/annual_leave_hours', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: annualHours,
                    params: { apply_to_all: applyToAll }
                })
            });

            if (res.ok) {
                toast.success('Impostazioni salvate con successo!');
                loadSettings();
            } else {
                toast.error('Errore durante il salvataggio');
            }
        } catch (error) {
            console.error(error);
            toast.error('Errore di connessione');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-gray-400">Caricamento impostazioni...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Parametri HR</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Ore Permesso Annuali (Predefinite)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Valore predefinito assegnato ai nuovi dipendenti.
                            (I dipendenti esistenti non vengono modificati automaticamente se hanno un valore personalizzato).
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={annualHours}
                                onChange={(e) => setAnnualHours(e.target.value)}
                                className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="text-gray-400">ore / anno</span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="applyToAll"
                                checked={applyToAll}
                                onChange={e => setApplyToAll(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="applyToAll" className="text-sm text-gray-300 select-none cursor-pointer">
                                Applica subito a tutti i dipendenti esistenti
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Salvataggio...' : '💾 Salva Modifiche'}
                    </button>
                </div>
            </div>
        </div>
    );
}
