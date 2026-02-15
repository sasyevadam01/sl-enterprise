/**
 * SL Enterprise - Announcements Page
 * Bacheca annunci aziendali
 * Design System: Light Enterprise v5.0
 */
import { useState, useEffect } from 'react';
import { announcementsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';

const priorityConfig = {
    urgent: {
        card: 'bg-red-50 border-red-200',
        accent: 'border-l-red-500',
        badge: 'bg-red-100 text-red-700 border border-red-200',
        statBg: 'bg-red-50 border-red-200',
        statText: 'text-red-600',
        icon: (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        ),
        label: 'Urgente'
    },
    important: {
        card: 'bg-amber-50 border-amber-200',
        accent: 'border-l-amber-500',
        badge: 'bg-amber-100 text-amber-700 border border-amber-200',
        statBg: 'bg-amber-50 border-amber-200',
        statText: 'text-amber-600',
        icon: (
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
        ),
        label: 'Importante'
    },
    info: {
        card: 'bg-blue-50 border-blue-200',
        accent: 'border-l-blue-500',
        badge: 'bg-blue-100 text-blue-700 border border-blue-200',
        statBg: 'bg-blue-50 border-blue-200',
        statText: 'text-blue-600',
        icon: (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
        ),
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
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="page-header-icon">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bacheca Annunci</h1>
                        <p className="text-slate-500 text-sm">Comunicazioni ufficiali dall'amministrazione</p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="action-btn action-btn-primary shadow-sm cursor-pointer"
                    >
                        {showForm ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                Chiudi
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Nuovo Annuncio
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                {Object.entries(priorityConfig).map(([key, config]) => {
                    const count = announcements.filter(a => a.priority === key).length;
                    return (
                        <div key={key} className={`master-card ${config.statBg} border rounded-xl p-4 text-center`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                {config.icon}
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{config.label}</span>
                            </div>
                            <p className={`text-3xl font-bold ${config.statText}`}>{count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Form Nuovo Annuncio */}
            {showForm && isAdmin && (
                <form onSubmit={handleSubmit} className="master-card rounded-xl p-6 space-y-4 animate-slideUp">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Crea Nuovo Annuncio
                    </h3>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Titolo</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Es: Chiusura Aziendale Agosto"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Messaggio</label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                            placeholder="Inserisci il testo dell'annuncio..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Priorità</label>
                        <div className="flex gap-3">
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: key })}
                                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 cursor-pointer ${formData.priority === key
                                        ? `${config.badge} ring-2 ring-offset-1 ring-slate-300`
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                >
                                    {config.icon} {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="action-btn action-btn-primary cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Pubblicando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Pubblica
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="action-btn action-btn-ghost cursor-pointer"
                        >
                            Annulla
                        </button>
                    </div>
                </form>
            )}

            {/* Lista Annunci */}
            {announcements.length === 0 ? (
                <div className="text-center py-20 master-card rounded-2xl border-dashed">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-slate-400 text-lg font-medium">Nessun annuncio attivo</p>
                    {isAdmin && (
                        <p className="text-slate-400 mt-2 text-sm">Clicca su "Nuovo Annuncio" per creare il primo.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((ann, index) => {
                        const config = priorityConfig[ann.priority] || priorityConfig.info;
                        return (
                            <div
                                key={ann.id}
                                className={`${config.card} border border-l-4 ${config.accent} rounded-xl p-5 transition-all hover:shadow-md animate-slideUp`}
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-slate-800">{ann.title}</h3>
                                            <span className={`px-2.5 py-0.5 ${config.badge} text-xs font-semibold rounded-full inline-flex items-center gap-1`}>
                                                {config.icon}
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 whitespace-pre-wrap mb-4 leading-relaxed">{ann.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(ann.created_at).toLocaleDateString('it-IT', {
                                                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {ann.author_name}
                                            </span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleArchive(ann.id)}
                                            className="px-3 py-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                            </svg>
                                            Archivia
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
