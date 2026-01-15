import { useState, useEffect } from 'react';
import { useUI } from '../../components/ui/CustomUI';
import ConfigurationTable from '../../components/admin/ConfigurationTable';
import DepartmentsManager from '../../components/admin/sections/DepartmentsManager';
import BanchineManager from '../../components/admin/sections/BanchineManager';
import WorkstationsManager from '../../components/admin/sections/WorkstationsManager';
import JobRolesManager from '../../components/admin/sections/JobRolesManager';
import GeneralSettingsManager from '../../components/admin/sections/GeneralSettingsManager';

const API_BASE = '/api';

export default function SystemConfigPage() {
    const { toast, showConfirm } = useUI();
    const [activeTab, setActiveTab] = useState('general'); // Default to General
    const [loading, setLoading] = useState(false);

    // Data states for lookup lists
    const [downtimeReasons, setDowntimeReasons] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [trainingTypes, setTrainingTypes] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);

    const loadData = async (type, setter, endpoint) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/config/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setter(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadData('downtime', setDowntimeReasons, 'downtime-reasons');
        loadData('exam', setExamTypes, 'exam-types');
        loadData('training', setTrainingTypes, 'training-types');
        loadData('event', setEventTypes, 'event-types');
    }, []);

    const handleAdd = async (endpoint, data, reload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/config/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Elemento creato!');
                reload();
            } else {
                toast.error('Errore creazione');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    const handleEdit = async (endpoint, id, data, reload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/config/${endpoint}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Modificato correttamente');
                reload();
            } else {
                toast.error('Errore modifica');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    const handleDelete = async (endpoint, id, reload) => {
        const confirm = await showConfirm({
            title: 'Elimina Configurazione',
            message: 'Sei sicuro di voler eliminare questo elemento?',
            type: 'danger',
            confirmText: 'Elimina'
        });
        if (!confirm) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/config/${endpoint}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Eliminato correttamente');
                reload();
            } else {
                toast.error('Impossibile eliminare (elemento in uso?)');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    const structuralTabs = [
        { id: 'general', label: '🛠️ Generale', component: <GeneralSettingsManager /> },
        { id: 'banchine', label: '🏭 Banchine', component: <BanchineManager /> },
        { id: 'departments', label: '🏢 Reparti', component: <DepartmentsManager /> },
        { id: 'workstations', label: '⚙️ Postazioni', component: <WorkstationsManager /> },
        { id: 'job_roles', label: '👷 Ruoli', component: <JobRolesManager /> },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">⚙️ Configurazioni di Sistema</h1>
                <p className="text-gray-400 mt-1">Gestisci la struttura aziendale e le tabelle di supporto.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-white/10 pb-1">
                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider w-full mb-1">
                    Struttura Aziendale
                </div>
                {structuralTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition relative ${activeTab === tab.id
                            ? 'text-white bg-slate-800 border-t border-x border-white/10'
                            : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}

                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider w-full mt-2 mb-1">
                    Tabelle di Supporto
                </div>
                {[
                    { id: 'production', label: '🛑 Causali Fermo' },
                    { id: 'medical', label: '🏥 Visite Mediche' },
                    { id: 'training', label: '🎓 Formazione' },
                    { id: 'events', label: '⚖️ Eventi HR' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition relative ${activeTab === tab.id
                            ? 'text-white bg-slate-800 border-t border-x border-white/10'
                            : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {/* Structural Components */}
                {structuralTabs.map(tab => activeTab === tab.id && <div key={tab.id}>{tab.component}</div>)}

                {/* Lookup Lists */}
                {activeTab === 'production' && (
                    <ConfigurationTable
                        title="Causali Fermo Macchina"
                        description="Definisci le motivazioni che gli operatori possono selezionare in caso di fermo."
                        items={downtimeReasons}
                        onAdd={(data) => handleAdd('downtime-reasons', data, () => loadData('downtime', setDowntimeReasons, 'downtime-reasons'))}
                        onEdit={(id, data) => handleEdit('downtime-reasons', id, data, () => loadData('downtime', setDowntimeReasons, 'downtime-reasons'))}
                        onDelete={(id) => handleDelete('downtime-reasons', id, () => loadData('downtime', setDowntimeReasons, 'downtime-reasons'))}
                        addButtonLabel="Nuova Causale"
                        columns={[
                            { key: 'label', label: 'Causale', placeholder: 'es. Guasto Meccanico' },
                            {
                                key: 'category',
                                label: 'Categoria',
                                type: 'select',
                                options: [
                                    { value: 'technical', label: 'Tecnico' },
                                    { value: 'organizational', label: 'Organizzativo' },
                                    { value: 'material', label: 'Materiale' },
                                    { value: 'other', label: 'Altro' }
                                ]
                            },
                            { key: 'description', label: 'Descrizione' }
                        ]}
                    />
                )}

                {activeTab === 'medical' && (
                    <ConfigurationTable
                        title="Tipologie Visite Mediche"
                        description="Configura le visite periodiche e la frequenza di rinnovo predefinita."
                        items={examTypes}
                        onAdd={(data) => handleAdd('exam-types', data, () => loadData('exam', setExamTypes, 'exam-types'))}
                        onEdit={(id, data) => handleEdit('exam-types', id, data, () => loadData('exam', setExamTypes, 'exam-types'))}
                        onDelete={(id) => handleDelete('exam-types', id, () => loadData('exam', setExamTypes, 'exam-types'))}
                        addButtonLabel="Nuovo Tipo Visita"
                        columns={[
                            { key: 'name', label: 'Nome Visita', placeholder: 'es. Visita Periodica' },
                            { key: 'frequency_months', label: 'Frequenza (Mesi)', type: 'number', placeholder: '12' },
                            { key: 'description', label: 'Note' }
                        ]}
                    />
                )}

                {activeTab === 'training' && (
                    <ConfigurationTable
                        title="Corsi di Formazione"
                        description="Gestisci il catalogo corsi e la validità degli attestati."
                        items={trainingTypes}
                        onAdd={(data) => handleAdd('training-types', data, () => loadData('training', setTrainingTypes, 'training-types'))}
                        onEdit={(id, data) => handleEdit('training-types', id, data, () => loadData('training', setTrainingTypes, 'training-types'))}
                        onDelete={(id) => handleDelete('training-types', id, () => loadData('training', setTrainingTypes, 'training-types'))}
                        addButtonLabel="Nuovo Corso"
                        columns={[
                            { key: 'name', label: 'Nome Corso', placeholder: 'es. Patentino Muletto' },
                            { key: 'validity_months', label: 'Validità (Mesi)', type: 'number', placeholder: '36' },
                            { key: 'required_role', label: 'Ruolo Richiesto', placeholder: 'Opzionale' }
                        ]}
                    />
                )}

                {activeTab === 'events' && (
                    <ConfigurationTable
                        title="Eventi HR e Sanzioni"
                        description="Definisci gli eventi disciplinari e i relativi punteggi."
                        items={eventTypes}
                        onAdd={(data) => handleAdd('event-types', data, () => loadData('event', setEventTypes, 'event-types'))}
                        onEdit={(id, data) => handleEdit('event-types', id, data, () => loadData('event', setEventTypes, 'event-types'))}
                        onDelete={(id) => handleDelete('event-types', id, () => loadData('event', setEventTypes, 'event-types'))}
                        addButtonLabel="Nuovo Evento"
                        columns={[
                            { key: 'label', label: 'Nome Evento', placeholder: 'es. Ritardo > 15m' },
                            { key: 'default_points', label: 'Punti (-/+)', type: 'number', placeholder: '-2' },
                            {
                                key: 'severity',
                                label: 'Severità',
                                type: 'select',
                                options: [
                                    { value: 'info', label: 'Info (Blu)' },
                                    { value: 'success', label: 'Positivo (Verde)' },
                                    { value: 'warning', label: 'Attenzione (Giallo)' },
                                    { value: 'danger', label: 'Grave (Rosso)' }
                                ]
                            },
                            { key: 'icon', label: 'Emoji', placeholder: '📝' }
                        ]}
                    />
                )}
            </div>
        </div>
    );
}
