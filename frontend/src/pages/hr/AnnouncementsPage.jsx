/**
 * SL Enterprise - Announcements Page
 * Bacheca annunci aziendali
 */
import { useState, useEffect } from 'react';
import { announcementsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';

const priorityConfig = {
    urgent: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        badge: 'bg-red-500',
        icon: '🔴',
        label: 'Urgente'
    },
    important: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/50',
        badge: 'bg-amber-500',
        icon: '🟡',
        label: 'Importante'
    },
    info: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/50',
        badge: 'bg-blue-500',
        icon: '🟢',
        label: 'Informativo'
    }
};

export default function AnnouncementsPage() {
    const { user } = useAuth();
    const { showConfirm, toast } = useUI();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '', priority: 'info' });
    const [saving, setSaving] = useState(false);

    const isAdmin = user?.role === 'super_admin' || user?.role === 'hr_manager';

    const loadAnnouncements = async () => {
        try {
            const data = await announcementsApi.getAll(true);
            setAnnouncements(data);
        } catch (error) {
            console.error('Error loading announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message) return;

        setSaving(true);
        try {
            await announcementsApi.create(formData);
            setFormData({ title: '', message: '', priority: 'info' });
            setShowForm(false);
            loadAnnouncements();
            toast.success("Annuncio pubblicato");
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Errore nella creazione dell\'annuncio');
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (id) => {
        const confirmed = await showConfirm({
            title: "Archivia Annuncio",
            message: 'Archiviare questo annuncio?',
            type: "warning",
            confirmText: "Archivia"
        });
        if (!confirmed) return;

        try {
            await announcementsApi.archive(id);
            toast.success("Annuncio archiviato");
            loadAnnouncements();
        } catch (error) {
            console.error('Error archiving:', error);
            toast.error("Errore durante l'archiviazione");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">📢 Bacheca Annunci</h1>
                    <p className="text-gray-400 mt-2 text-lg">Comunicazioni ufficiali dall'amministrazione</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg"
                    >
                        {showForm ? '✕ Chiudi' : '➕ Nuovo Annuncio'}
                    </button>
                )}
            </div>

            {/* Form Nuovo Annuncio */}
            {showForm && isAdmin && (
                <form onSubmit={handleSubmit} className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">📝 Crea Nuovo Annuncio</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Titolo</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            placeholder="Es: Chiusura Aziendale Agosto"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Messaggio</label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                            placeholder="Inserisci il testo dell'annuncio..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Priorità</label>
                        <div className="flex gap-3">
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: key })}
                                    className={`px-4 py-2 rounded-xl font-medium transition ${formData.priority === key
                                        ? `${config.bg} ${config.border} border-2 text-white`
                                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                                        }`}
                                >
                                    {config.icon} {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                        >
                            {saving ? '⏳ Pubblicando...' : '📤 Pubblica'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 font-medium rounded-xl transition"
                        >
                            Annulla
                        </button>
                    </div>
                </form>
            )}

            {/* Lista Annunci */}
            {announcements.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-white/10">
                    <p className="text-gray-500 text-xl font-medium">📭 Nessun annuncio attivo</p>
                    {isAdmin && (
                        <p className="text-gray-600 mt-2">Clicca su "Nuovo Annuncio" per creare il primo.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((ann) => {
                        const config = priorityConfig[ann.priority] || priorityConfig.info;
                        return (
                            <div
                                key={ann.id}
                                className={`${config.bg} border-l-4 ${config.border} rounded-2xl p-6 transition hover:shadow-lg`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{ann.title}</h3>
                                            <span className={`px-2 py-1 ${config.badge} text-white text-xs font-bold rounded-full`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 whitespace-pre-wrap mb-4">{ann.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>📅 {new Date(ann.created_at).toLocaleDateString('it-IT', {
                                                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}</span>
                                            <span>👤 {ann.author_name}</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleArchive(ann.id)}
                                            className="px-3 py-2 bg-slate-700 hover:bg-red-600/50 text-gray-400 hover:text-white rounded-lg transition text-sm"
                                        >
                                            🗑️ Archivia
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-400">
                        {announcements.filter(a => a.priority === 'urgent').length}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Urgenti</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">
                        {announcements.filter(a => a.priority === 'important').length}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Importanti</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">
                        {announcements.filter(a => a.priority === 'info').length}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Informativi</p>
                </div>
            </div>
        </div>
    );
}
