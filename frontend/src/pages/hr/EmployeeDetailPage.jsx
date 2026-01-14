/**
 * SL Enterprise - Employee Detail Page
 * Full dossier: Personal Info, Documents (with PDF preview), Certifications, Medical Exams.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { employeesApi, eventsApi, leavesApi } from '../../api/client';
import LeaveHoursWidget from '../../components/LeaveHoursWidget';
import { useUI } from '../../components/ui/CustomUI';

// --- Sub-components ---

const DocumentsTab = ({ employeeId, employeeName }) => {
    const { showConfirm, toast } = useUI();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [newDoc, setNewDoc] = useState({ type: 'contract', name: '', file: null });

    const docTypes = [
        { value: 'contract', label: 'Contratto' },
        { value: 'id_card', label: 'Carta Identità' },
        { value: 'tax_code', label: 'Codice Fiscale' },
        { value: 'cv', label: 'Curriculum' },
        { value: 'other', label: 'Altro' },
    ];

    const loadDocuments = useCallback(async () => {
        try {
            const data = await employeesApi.getDocuments(employeeId);
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { loadDocuments(); }, [loadDocuments]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newDoc.file) return toast.warning('Seleziona un file');
        setUploading(true);
        try {
            await employeesApi.uploadDocument(employeeId, newDoc.type, newDoc.name || newDoc.file.name, newDoc.file);
            setNewDoc({ type: 'contract', name: '', file: null });
            toast.success('Documento caricato con successo');
            loadDocuments();
        } catch (error) {
            toast.error('Errore upload: ' + (error.response?.data?.detail || error.message));
        } finally {
            setUploading(false);
        }
    };

    const openPreview = (filePath) => {
        // Base URL for static files served by backend
        const url = `http://localhost:8000/${filePath}`;
        setPreviewUrl(url);
    };

    const handleDelete = async (doc) => {
        const confirmed = await showConfirm({
            title: "Elimina Documento",
            message: `Sei sicuro di voler cancellare IL DOCUMENTO "${doc.doc_name}" per ${employeeName}?`,
            type: "danger",
            confirmText: "Elimina"
        });
        if (!confirmed) return;

        try {
            await employeesApi.deleteDocument(employeeId, doc.id);
            toast.success('Documento eliminato');
            loadDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Errore eliminazione documento');
        }
    };

    if (loading) return <div className="text-gray-400 text-center py-8">Caricamento documenti...</div>;

    return (
        <div className="space-y-6">
            {/* Upload Form */}
            <form onSubmit={handleUpload} className="bg-black/20 rounded-lg p-4 space-y-4">
                <h4 className="text-white font-medium">Carica Nuovo Documento</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={newDoc.type}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, type: e.target.value }))}
                        className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                    >
                        {docTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Nome documento (opzionale)"
                        value={newDoc.name}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                    />
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setNewDoc(prev => ({ ...prev, file: e.target.files[0] }))}
                        className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                    />
                </div>
                <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
                >
                    {uploading ? 'Caricamento...' : 'Carica'}
                </button>
            </form>

            {/* Documents List */}
            {documents.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nessun documento caricato</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">{doc.doc_name}</p>
                                <p className="text-gray-400 text-sm">{docTypes.find(t => t.value === doc.doc_type)?.label || doc.doc_type}</p>
                                <p className="text-gray-500 text-xs">{new Date(doc.uploaded_at).toLocaleDateString('it-IT')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openPreview(doc.file_path)}
                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
                                >
                                    Visualizza
                                </button>
                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* PDF Preview Modal */}
            {
                previewUrl && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
                        <div className="bg-slate-800 rounded-lg w-11/12 h-5/6 p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-semibold">Anteprima Documento</h3>
                                <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            <iframe src={previewUrl} className="flex-1 rounded bg-white" title="PDF Preview" />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

const CertificationsTab = ({ employeeId, employeeName }) => {
    const { showConfirm, toast } = useUI();
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ cert_type: 'art37_gen', cert_name: '', issue_date: '', expiry_date: '', notes: '' });

    const certTypes = [
        { value: 'art37_gen', label: 'Art. 37 Generale' },
        { value: 'art37_spec', label: 'Art. 37 Specifico' },
        { value: 'first_aid', label: 'Primo Soccorso' },
        { value: 'fire_safety', label: 'Antincendio' },
        { value: 'forklift', label: 'Carrello Elevatore' },
        { value: 'ple', label: 'PLE (Piattaforme)' },
        { value: 'preposto', label: 'Preposto' },
        { value: 'other', label: 'Altro' },
    ];

    const loadCertifications = useCallback(async () => {
        try {
            const data = await employeesApi.getCertifications(employeeId);
            setCertifications(data);
        } catch (error) {
            console.error('Error loading certifications:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { loadCertifications(); }, [loadCertifications]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await employeesApi.updateCertification(employeeId, editingId, formData);
            } else {
                await employeesApi.addCertification(employeeId, formData);
            }
            setFormData({ cert_type: 'art37_gen', cert_name: '', issue_date: '', expiry_date: '', notes: '' });
            setEditingId(null);
            setShowForm(false);
            toast.success(editingId ? "Certificazione aggiornata" : "Nuova certificazione aggiunta");
            loadCertifications();
        } catch (error) {
            toast.error('Errore: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (cert) => {
        setFormData({
            cert_type: cert.cert_type,
            cert_name: cert.cert_name,
            issue_date: cert.issue_date ? cert.issue_date.split('T')[0] : '',
            expiry_date: cert.expiry_date ? cert.expiry_date.split('T')[0] : '',
            notes: cert.notes || ''
        });
        setEditingId(cert.id);
        setShowForm(true);
    };

    const handleDelete = async (certId, certName) => {
        const confirmed = await showConfirm({
            title: "Elimina Certificazione",
            message: `Sei sicuro di voler cancellare LA CERTIFICAZIONE "${certName}" per ${employeeName}?`,
            type: "danger",
            confirmText: "Elimina"
        });
        if (!confirmed) return;

        try {
            await employeesApi.deleteCertification(employeeId, certId);
            toast.success("Certificazione eliminata");
            loadCertifications();
        } catch (error) {
            console.error('Error deleting certification:', error);
            toast.error('Errore eliminazione certificazione');
        }
    };

    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return 'valid';
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) return 'expired';
        if (daysUntil <= 30) return 'warning';
        return 'valid';
    };

    const statusStyles = {
        valid: 'bg-green-500/20 text-green-400',
        warning: 'bg-orange-500/20 text-orange-400',
        expired: 'bg-red-500/20 text-red-400',
    };

    if (loading) return <div className="text-gray-400 text-center py-8">Caricamento certificazioni...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">Certificazioni e Patentini</h4>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                    + Aggiungi
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-black/20 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={formData.cert_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, cert_type: e.target.value }))}
                            className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                        >
                            {certTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder="Nome/Descrizione"
                            value={formData.cert_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, cert_name: e.target.value }))}
                            className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                        />
                        <div>
                            <label className="text-gray-400 text-sm">Data Rilascio</label>
                            <input
                                type="date"
                                value={formData.issue_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                                className="w-full bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Data Scadenza</label>
                            <input
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                                className="w-full bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">{editingId ? 'Aggiorna' : 'Salva'}</button>
                        <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">Annulla</button>
                    </div>
                </form>
            )}

            {certifications.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nessuna certificazione registrata</p>
            ) : (
                <div className="space-y-3">
                    {certifications.map(cert => {
                        const status = getExpiryStatus(cert.expiry_date);
                        return (
                            <div key={cert.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-white font-medium">{cert.cert_name || certTypes.find(t => t.value === cert.cert_type)?.label}</p>
                                    <p className="text-gray-400 text-sm">
                                        Rilasciato: {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('it-IT') : 'N/D'}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm ${statusStyles[status]}`}>
                                        {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('it-IT') : 'Nessuna scadenza'}
                                    </span>
                                    {status === 'expired' && <p className="text-red-400 text-xs mt-1">SCADUTO</p>}
                                    {status === 'warning' && <p className="text-orange-400 text-xs mt-1">In scadenza</p>}
                                    <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => handleEdit(cert)}
                                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                        >
                                            ✏️ Modifica
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cert.id, cert.cert_name || certTypes.find(t => t.value === cert.cert_type)?.label)}
                                            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                                        >
                                            🗑️ Elimina
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }
        </div >
    );
};

const MedicalTab = ({ employeeId, employeeName }) => {
    const { showConfirm, toast } = useUI();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ exam_type: 'periodic', exam_date: '', next_exam_date: '', outcome: 'fit', notes: '', limitations: '', doctor_name: '' });

    const outcomes = [
        { value: 'fit', label: 'Idoneo' },
        { value: 'fit_with_limits', label: 'Idoneo con Limitazioni' },
        { value: 'unfit', label: 'Non Idoneo' },
        { value: 'pending', label: 'In Attesa' },
    ];

    const outcomeStyles = {
        fit: 'bg-green-500/20 text-green-400',
        fit_with_limits: 'bg-yellow-500/20 text-yellow-400',
        unfit: 'bg-red-500/20 text-red-400',
        pending: 'bg-gray-500/20 text-gray-400',
    };

    const loadExams = useCallback(async () => {
        try {
            const data = await employeesApi.getMedicalExams(employeeId);
            setExams(data);
        } catch (error) {
            console.error('Error loading medical exams:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { loadExams(); }, [loadExams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.next_exam_date) payload.next_exam_date = null;
            if (!payload.exam_type) payload.exam_type = 'periodic';

            if (editingId) {
                await employeesApi.updateMedicalExam(employeeId, editingId, payload);
            } else {
                await employeesApi.addMedicalExam(employeeId, payload);
            }
            setFormData({ exam_type: 'periodic', exam_date: '', next_exam_date: '', outcome: 'fit', notes: '', limitations: '', doctor_name: '' });
            setEditingId(null);
            setShowForm(false);
            toast.success(editingId ? "Visita aggiornata" : "Nuova visita registrata");
            loadExams();
        } catch (error) {
            toast.error('Errore: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (exam) => {
        setFormData({
            exam_type: exam.exam_type || 'periodic',
            exam_date: exam.exam_date ? exam.exam_date.split('T')[0] : '',
            next_exam_date: exam.next_exam_date ? exam.next_exam_date.split('T')[0] : '',
            outcome: exam.outcome,
            notes: exam.notes || '',
            limitations: exam.limitations || '',
            doctor_name: exam.doctor_name || ''
        });
        setEditingId(exam.id);
        setShowForm(true);
    };

    const handleDelete = async (examId, examDate) => {
        const dateStr = new Date(examDate).toLocaleDateString('it-IT');
        const confirmed = await showConfirm({
            title: "Elimina Visita Medica",
            message: `Sei sicuro di voler cancellare LA VISITA MEDICA del ${dateStr} per ${employeeName}?`,
            type: "danger",
            confirmText: "Elimina"
        });
        if (!confirmed) return;

        try {
            await employeesApi.deleteMedicalExam(employeeId, examId);
            toast.success("Visita eliminata");
            loadExams();
        } catch (error) {
            console.error('Error deleting medical exam:', error);
            toast.error('Errore eliminazione visita medica');
        }
    };

    if (loading) return <div className="text-gray-400 text-center py-8">Caricamento visite mediche...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">Visite Mediche</h4>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                    + Aggiungi Visita
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-black/20 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm">Data Visita</label>
                            <input
                                type="date"
                                value={formData.exam_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                                className="w-full bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Prossima Visita</label>
                            <input
                                type="date"
                                value={formData.next_exam_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, next_exam_date: e.target.value }))}
                                className="w-full bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <select
                            value={formData.outcome}
                            onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                            className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                        >
                            {outcomes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder="Note / Limitazioni"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="bg-slate-700 border border-white/10 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">{editingId ? 'Aggiorna' : 'Salva'}</button>
                        <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">Annulla</button>
                    </div>
                </form>
            )}

            {exams.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nessuna visita medica registrata</p>
            ) : (
                <div className="space-y-3">
                    {exams.map(exam => (
                        <div key={exam.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">
                                    Visita del {new Date(exam.exam_date).toLocaleDateString('it-IT')}
                                </p>
                                {exam.notes && <p className="text-gray-400 text-sm">{exam.notes}</p>}
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm ${outcomeStyles[exam.outcome]}`}>
                                    {outcomes.find(o => o.value === exam.outcome)?.label}
                                </span>
                                {exam.next_exam_date && (
                                    <p className="text-gray-400 text-xs mt-1">
                                        Prossima: {new Date(exam.next_exam_date).toLocaleDateString('it-IT')}
                                    </p>
                                )}
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => handleEdit(exam)}
                                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                    >
                                        ✏️ Modifica
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exam.id, exam.exam_date)}
                                        className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                                    >
                                        🗑️ Elimina
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    );
};

const EventsTab = ({ employeeId, employeeName }) => {
    const { showConfirm, toast } = useUI();
    const [timeline, setTimeline] = useState({ events: [], total_points: 0, positive_count: 0, negative_count: 0 });
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [timelineData, badgesData] = await Promise.all([
                eventsApi.getTimeline(employeeId),
                eventsApi.getBadges(employeeId)
            ]);
            setTimeline(timelineData);
            setBadges(badgesData);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    const handleDeleteEvent = async (event) => {
        const confirmed = await showConfirm({
            title: "Elimina Evento",
            message: `Sei sicuro di voler cancellare L'EVENTO "${event.label}" per ${employeeName}? I punti verranno stornati.`,
            type: "danger",
            confirmText: "Elimina"
        });
        if (!confirmed) return;

        try {
            await eventsApi.deleteEvent(event.id);
            toast.success("Evento eliminato");
            loadData();
        } catch (error) {
            console.error("Error deleting event:", error);
            toast.error("Errore eliminazione evento");
        }
    };

    useEffect(() => { loadData(); }, [loadData]);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) return <div className="text-gray-400 text-center py-8">Caricamento eventi...</div>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 ${timeline.total_points >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <p className="text-gray-400 text-sm">Punteggio Totale</p>
                    <p className={`text-3xl font-bold ${timeline.total_points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {timeline.total_points > 0 ? '+' : ''}{timeline.total_points}
                    </p>
                </div>
                <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/30">
                    <p className="text-gray-400 text-sm">Eventi Positivi</p>
                    <p className="text-3xl font-bold text-green-400">{timeline.positive_count}</p>
                </div>
                <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30">
                    <p className="text-gray-400 text-sm">Eventi Negativi</p>
                    <p className="text-3xl font-bold text-red-400">{timeline.negative_count}</p>
                </div>
                <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/30">
                    <p className="text-gray-400 text-sm">Badge Ottenuti</p>
                    <p className="text-3xl font-bold text-purple-400">{badges.length}</p>
                </div>
            </div>

            {/* Badges Section */}
            {badges.length > 0 && (
                <div className="bg-slate-700/30 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3">🏆 Badge</h4>
                    <div className="flex flex-wrap gap-3">
                        {badges.map(badge => (
                            <div
                                key={badge.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${badge.badge_type === 'positive'
                                    ? 'bg-green-500/20 border border-green-500/30'
                                    : 'bg-red-500/20 border border-red-500/30'
                                    }`}
                            >
                                <span className="text-2xl">{badge.badge_icon}</span>
                                <div>
                                    <p className="text-white text-sm font-medium">{badge.badge_name}</p>
                                    <p className="text-gray-400 text-xs">{formatDate(badge.earned_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Add Event Button */}
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">📋 Storico Eventi</h4>
                <Link
                    to={`/hr/events/new?employee=${employeeId}`}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                    + Nuovo Evento
                </Link>
            </div>

            {/* Events Timeline */}
            {timeline.events.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Nessun evento registrato</p>
                    <p className="text-gray-600 text-sm mt-2">Gli eventi positivi e negativi appariranno qui</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10"></div>

                    <div className="space-y-4">
                        {timeline.events.map((event, index) => {
                            const isPositive = event.points > 0;
                            return (
                                <div key={event.id} className="relative pl-12">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${isPositive
                                        ? 'bg-green-500/20 border-green-500'
                                        : 'bg-red-500/20 border-red-500'
                                        }`}>
                                        <div className={`absolute inset-1 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                    </div>

                                    {/* Event Card */}
                                    <div className={`rounded-xl p-4 ${isPositive
                                        ? 'bg-green-500/5 border border-green-500/20'
                                        : 'bg-red-500/5 border border-red-500/20'
                                        }`}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white font-medium">{event.label}</p>
                                                {event.description && (
                                                    <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                                                )}
                                                <p className="text-gray-500 text-xs mt-2">{formatDate(event.date)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {event.points > 0 ? '+' : ''}{event.points}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteEvent(event)}
                                                    className="text-white/40 hover:text-red-400 transition"
                                                    title="Elimina evento"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const AbsenceTab = ({ employeeId, employeeName }) => {
    const { showConfirm, toast } = useUI();
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(true);

    // Status styles map
    const ABSENCE_STATUS = {
        pending: { label: 'In Attesa', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
        approved: { label: 'Approvata', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        rejected: { label: 'Rifiutata', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
        cancelled: { label: 'Annullata', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
    };

    const LEAVE_LABELS = {
        vacation: '🏖️ Ferie',
        sick: '🏥 Malattia',
        permit: '📝 Permesso',
        maternity: '👶 Maternità',
        paternity: '👨‍👧 Paternità',
        wedding: '💒 Matrimonio',
        bereavement: '🕯️ Lutto',
        other: '📋 Altro'
    };

    const loadAbsences = useCallback(async () => {
        try {
            // Fetch leaves and filter by employee client-side or assume endpoint supports filtering
            const allLeaves = await leavesApi.getLeaves({});
            // Filter strictly for this employee
            const empLeaves = allLeaves.filter(l => l.employee_id === parseInt(employeeId));
            // Sort by start date desc
            empLeaves.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
            setAbsences(empLeaves);
        } catch (error) {
            console.error("Error loading absences:", error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    const handleDelete = async (leave) => {
        const typeLabel = LEAVE_LABELS[leave.leave_type] || leave.leave_type;
        const confirmed = await showConfirm({
            title: "Annulla Assenza",
            message: `Sei sicuro di voler cancellare L'ASSENZA "${typeLabel}" per ${employeeName}?`,
            type: "danger",
            confirmText: "Annulla Assenza"
        });
        if (!confirmed) return;

        try {
            await leavesApi.cancelLeave(leave.id);
            toast.success("Assenza annullata");
            loadAbsences();
        } catch (e) {
            toast.error("Errore durante l'annullamento");
        }
    };

    useEffect(() => { loadAbsences(); }, [loadAbsences]);

    if (loading) return <div className="text-center py-8 text-gray-400">Caricamento assenze...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">Storico Assenze e Permessi</h4>
                {/* Potremmo aggiungere pulsante crea richiesta qui in futuro */}
            </div>

            {absences.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nessuna assenza registrata</p>
            ) : (
                <div className="space-y-3">
                    {absences.map(leave => (
                        <div key={leave.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{LEAVE_LABELS[leave.leave_type] || leave.leave_type}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded border ${ABSENCE_STATUS[leave.status]?.color || 'text-gray-400'}`}>
                                        {ABSENCE_STATUS[leave.status]?.label || leave.status}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">
                                    Dal {new Date(leave.start_date).toLocaleDateString('it-IT')} al {new Date(leave.end_date).toLocaleDateString('it-IT')}
                                </p>
                                {leave.reason && <p className="text-gray-500 text-xs mt-1">Note: {leave.reason}</p>}
                            </div>
                            <div>
                                {(leave.status === 'pending' || leave.status === 'approved') && (
                                    <button
                                        onClick={() => handleDelete(leave)}
                                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition text-sm flex items-center gap-1"
                                    >
                                        🗑️ Annulla
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const { showConfirm, toast } = useUI();

    const [employee, setEmployee] = useState({
        first_name: '',
        last_name: '',
        fiscal_code: '',
        current_role: '',
        department_id: '',
        contract_type: 'full_time',
        contract_end: '',
        email: '',
        phone: '',
        address: '',
        is_active: true
    });

    const [activeTab, setActiveTab] = useState('overview');
    const [allEmployees, setAllEmployees] = useState([]);
    const [banchine, setBanchine] = useState([]); // [NEW]
    const [availableRoles, setAvailableRoles] = useState([]); // [NEW] Ruoli da Macchine_Ruoli_Banchine
    const [roleFilter, setRoleFilter] = useState(''); // [NEW] Filtro ricerca ruoli
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Load available roles, banchine and employees on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await employeesApi.getEmployees();
                // Extract unique roles from employees
                const uniqueRoles = [...new Set(data.map(e => e.current_role).filter(Boolean))].sort();
                setAvailableRoles(uniqueRoles);
                setAllEmployees(data.filter(e => e.is_active && e.id !== parseInt(id)));

                // Fetch banchine
                const banchineData = await employeesApi.getBanchine();
                setBanchine(banchineData);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!isNew) {
            loadEmployee();
        }
    }, [id]);

    const loadEmployee = async () => {
        try {
            const data = await employeesApi.getEmployee(id);
            setEmployee(data);
        } catch (error) {
            console.error(error);
            toast.error("Errore nel caricamento del dipendente");
            navigate('/hr/employees');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEmployee(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isNew) {
                await employeesApi.createEmployee(employee);
                navigate('/hr/employees');
                toast.success("Nuovo dipendente creato");
            } else {
                await employeesApi.updateEmployee(id, employee);
                toast.success("Salvataggio completato!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore durante il salvataggio: " + (error.response?.data?.detail || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm({
            title: "Elimina Dipendente",
            message: 'ATTENZIONE: Sei sicuro di voler eliminare DEFINITIVAMENTE questo dipendente?\n\nTutti i dati associati (documenti, eventi, storico) verranno persi irrevocabilmente.',
            type: "danger",
            confirmText: "Elimina Definitivamente"
        });

        if (!confirmed) {
            return;
        }

        try {
            setLoading(true);
            await employeesApi.deleteEmployee(id);
            navigate('/hr/employees');
            toast.success("Dipendente eliminato");
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Errore durante l'eliminazione: " + (error.response?.data?.detail || error.message));
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white text-center mt-20">Caricamento...</div>;

    const tabs = [
        { id: 'overview', label: '👤 Anagrafica' },
        { id: 'documents', label: '📁 Documenti' },
        { id: 'certifications', label: '🎓 Certificazioni' },
        { id: 'medical', label: '⚕️ Visite Mediche' },
        { id: 'events', label: '📋 Eventi & Badge' },
        { id: 'absences', label: '🏖️ Assenze' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/hr/employees')} className="text-gray-400 hover:text-white mb-2 text-sm">
                        &larr; Torna alla lista
                    </button>
                    <h1 className="text-3xl font-bold text-white">
                        {isNew ? 'Nuovo Dipendente' : `${employee.first_name} ${employee.last_name}`}
                    </h1>
                    {/* Fiscal Code Removed as per user request */}
                </div>
                <div className="flex gap-3 items-center">
                    {!isNew && (
                        <>
                            {employee.user ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg mr-2">
                                    <span className="text-lg">👤</span>
                                    <div>
                                        <p className="text-[10px] text-blue-300 font-bold uppercase leading-none">Utente Collegato</p>
                                        <p className="text-sm text-white font-mono leading-none mt-1">{employee.user.username}</p>
                                    </div>
                                    {(employee.user.role_label || employee.user.role) && (
                                        <div className="ml-2 px-2 py-0.5 bg-slate-700/50 border border-white/10 rounded text-xs text-gray-300">
                                            {employee.user.role_label || {
                                                'admin': 'Amministratore',
                                                'super_admin': 'Super Admin',
                                                'hr_manager': 'HR Manager',
                                                'coordinator': 'Coordinatore',
                                                'factory_controller': 'Responsabile Fabbrica',
                                                'record_user': 'Utente Base'
                                            }[employee.user.role] || employee.user.role}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="px-3 py-1 bg-slate-700/30 border border-white/5 rounded-lg mr-2">
                                    <p className="text-xs text-slate-500">Nessun utente collegato</p>
                                </div>
                            )}

                            <button
                                onClick={handleDelete}
                                className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-sm transition font-medium"
                            >
                                Elimina
                            </button>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${employee.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {employee.is_active ? 'Attivo' : 'Non Attivo'}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            {!isNew && (
                <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                {activeTab === 'overview' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Monte Ore Widget - Visible only for existing employees */}
                        {!isNew && (
                            <div className="mb-6">
                                <LeaveHoursWidget employeeId={id} />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Anagrafica */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Anagrafica</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nome</label>
                                        <input name="first_name" value={employee.first_name} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Cognome</label>
                                        <input name="last_name" value={employee.last_name} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white" required />
                                    </div>
                                </div>
                                <div>
                                    {/* Fiscal Code Input Removed */}
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                                    <input name="email" type="email" value={employee.email || ''} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Telefono</label>
                                    <input name="phone" value={employee.phone || ''} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white" />
                                </div>
                            </div>

                            {/* Contratto */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Contratto</h3>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Reparto</label>
                                    <select
                                        name="department_name"
                                        value={employee.department_name || ''}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">-- Seleziona Reparto --</option>
                                        {['Autista', 'Bordatura', 'Bugnatura', 'Coordinamento', 'Dirigenza', 'Foratura', 'Guanciali e Culle', 'Imballaggio', 'Incollaggio', 'Keyhelm', 'Magazzinieri', 'Manutenzione', 'Preparazione', 'Pressa', 'Pulizie', 'Recupero', 'Resi', 'Reti/Letti', 'Spedizioni', 'Taglio Poliuretano', 'Ufficio'].map(reparto => (
                                            <option key={reparto} value={reparto}>{reparto}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Ruolo Attuale</label>
                                    <select
                                        name="current_role"
                                        value={employee.current_role || ''}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">-- Seleziona Ruolo --</option>
                                        {availableRoles.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* [NEW] Secondary Role and Banchina */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Ruolo Secondario (Jolly)</label>
                                        <select
                                            name="secondary_role"
                                            value={employee.secondary_role || ''}
                                            onChange={handleChange}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                                        >
                                            <option value="">-- Nessuno --</option>
                                            {availableRoles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Banchina Default</label>
                                        <select
                                            name="default_banchina_id"
                                            value={employee.default_banchina_id || ''}
                                            onChange={handleChange}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                                        >
                                            <option value="">-- Nessuna --</option>
                                            {banchine.map(b => (
                                                <option key={b.id} value={b.id}>B{b.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* End NEW */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tipo Contratto</label>
                                        <select name="contract_type" value={employee.contract_type} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white">
                                            <option value="full_time">Full Time</option>
                                            <option value="part_time">Part Time</option>
                                            <option value="internship">Stage</option>
                                            <option value="agency">Somministrazione</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Scadenza</label>
                                        <input type="date" name="contract_end" value={employee.contract_end ? employee.contract_end.split('T')[0] : ''} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Responsabile (Manager)</label>
                                    <select
                                        name="manager_id"
                                        value={employee.manager_id || ''}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="" className="bg-slate-900 text-gray-400">-- Nessuno --</option>
                                        {allEmployees
                                            .filter(emp => {
                                                const role = (emp.current_role || '').toLowerCase();
                                                const dept = (emp.department_name || '').toLowerCase();
                                                // Keywords for management positions
                                                // Stricter filter: only Coordinators and Top Management
                                                const managerKeywords = ['coordinatore', 'amministratore', 'direttore', 'admin'];
                                                // Always include if role matches keywords
                                                return managerKeywords.some(k => role.includes(k));
                                            })
                                            .map(emp => (
                                                <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                                                    {emp.last_name} {emp.first_name} ({emp.current_role || 'N/D'})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input type="checkbox" name="is_active" checked={employee.is_active} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 bg-gray-700" />
                                    <span className="text-white">Dipendente Attivo</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-white/10">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg transition disabled:opacity-50"
                            >
                                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </form>
                )
                }

                {activeTab === 'events' && !isNew && <EventsTab employeeId={id} employeeName={`${employee.first_name} ${employee.last_name}`} />}
                {activeTab === 'documents' && !isNew && <DocumentsTab employeeId={id} employeeName={`${employee.first_name} ${employee.last_name}`} />}
                {activeTab === 'certifications' && !isNew && <CertificationsTab employeeId={id} employeeName={`${employee.first_name} ${employee.last_name}`} />}
                {activeTab === 'medical' && !isNew && <MedicalTab employeeId={id} employeeName={`${employee.first_name} ${employee.last_name}`} />}
                {activeTab === 'absences' && !isNew && <AbsenceTab employeeId={id} employeeName={`${employee.first_name} ${employee.last_name}`} />}
            </div >
        </div >
    );
}
