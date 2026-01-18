/**
 * SL Enterprise - Leaves Page
 * Gestione ferie e permessi con workflow approvativo
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leavesApi, employeesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';

const LEAVE_TYPES = [
    { value: 'vacation', label: 'Ferie', icon: '🏖️', color: 'blue' },
    { value: 'sick', label: 'Malattia', icon: '🏥', color: 'red' },
    { value: 'permit', label: 'Permesso', icon: '📝', color: 'purple' },
    { value: 'sudden_permit', label: 'Permesso Improvviso', icon: '⚡', color: 'yellow' },
];

const STATUS_MAP = {
    pending: { label: 'In Attesa', color: 'bg-yellow-500/20 text-yellow-400', icon: '⏳' },
    approved: { label: 'Approvata', color: 'bg-green-500/20 text-green-400', icon: '✅' },
    rejected: { label: 'Rifiutata', color: 'bg-red-500/20 text-red-400', icon: '❌' },
    cancelled: { label: 'Annullata', color: 'bg-gray-500/20 text-gray-400', icon: '🚫' },
};

export default function LeavesPage() {
    const { user } = useAuth();
    const { showConfirm, toast } = useUI();
    const [loading, setLoading] = useState(true);
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('pending');
    const [processing, setProcessing] = useState(null);

    const [formData, setFormData] = useState({
        employee_id: '',
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: ''
    });

    const isHR = user?.role === 'hr_manager' || user?.role === 'super_admin';

    const fetchData = async () => {
        try {
            const [leavesData, employeesData] = await Promise.all([
                leavesApi.getLeaves({}),
                employeesApi.getEmployees()
            ]);
            setLeaves(leavesData);
            setEmployees(employeesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.employee_id || !formData.start_date || !formData.end_date) {
            toast.warning('Compila tutti i campi obbligatori');
            return;
        }

        try {
            await leavesApi.createLeave(formData.employee_id, {
                leave_type: formData.leave_type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                reason: formData.reason || null
            });
            setShowModal(false);
            setFormData({
                employee_id: '',
                leave_type: 'vacation',
                start_date: '',
                end_date: '',
                reason: ''
            });
        });
        await fetchData();
        toast.success('Richiesta creata con successo');
    } catch (error) {
        console.error('Error creating leave:', error);
        toast.error('Errore nella creazione della richiesta');
    }
};

const handleReview = async (id, status) => {
    const action = status === 'approved' ? 'approvare' : 'rifiutare';
    const confirmed = await showConfirm({
        title: status === 'approved' ? 'Approva Richiesta' : 'Rifiuta Richiesta',
        message: `Vuoi ${action} questa richiesta?`,
        type: status === 'approved' ? 'info' : 'danger',
        confirmText: status === 'approved' ? 'Approva' : 'Rifiuta'
    });
    if (!confirmed) return;

    setProcessing(id);
    try {
        await leavesApi.reviewLeave(id, { status });
        toast.success(`Richiesta ${status === 'approved' ? 'approvata' : 'rifiutata'}`);
        await fetchData();
    } catch (error) {
        console.error('Error reviewing leave:', error);
        toast.error('Errore nel processare la richiesta');
    } finally {
        setProcessing(null);
    }
};

const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${empId}`;
};

const getLeaveType = (type) => LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[0];

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const filteredLeaves = leaves.filter(l => {
    if (filter === 'all') return true;
    return l.status === filter;
});

if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
}

const pendingCount = leaves.filter(l => l.status === 'pending').length;

return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-white">🗓️ Ferie & Permessi</h1>
                <p className="text-gray-400 mt-1">Gestisci richieste ferie, permessi e assenze</p>
            </div>
            <div className="flex items-center gap-4">
                {pendingCount > 0 && isHR && (
                    <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                        <span className="text-yellow-400 font-bold">{pendingCount}</span>
                        <span className="text-yellow-300 ml-2">in attesa</span>
                    </div>
                )}
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                    <span>+</span> Nuova Richiesta
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
            {[
                { id: 'pending', label: '⏳ In Attesa' },
                { id: 'approved', label: '✅ Approvate' },
                { id: 'rejected', label: '❌ Rifiutate' },
                { id: 'all', label: 'Tutte' },
            ].map(f => (
                <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-lg transition ${filter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-white/5 border border-white/10'
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
                <thead className="bg-slate-800">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Dipendente</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tipo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Dal</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Al</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Stato</th>
                        {isHR && <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Azioni</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredLeaves.length === 0 ? (
                        <tr>
                            <td colSpan={isHR ? 6 : 5} className="px-4 py-12 text-center text-gray-400">
                                Nessuna richiesta trovata
                            </td>
                        </tr>
                    ) : (
                        filteredLeaves.map(leave => {
                            const type = getLeaveType(leave.leave_type);
                            const status = STATUS_MAP[leave.status] || STATUS_MAP.pending;

                            return (
                                <tr key={leave.id} className="hover:bg-white/5 transition">
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/hr/employees/${leave.employee_id}`}
                                            className="text-blue-400 hover:text-blue-300"
                                        >
                                            {getEmployeeName(leave.employee_id)}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-2 text-gray-300">
                                            <span>{type.icon}</span>
                                            {type.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{formatDate(leave.start_date)}</td>
                                    <td className="px-4 py-3 text-gray-400">{formatDate(leave.end_date)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                                            {status.icon} {status.label}
                                        </span>
                                    </td>
                                    {isHR && (
                                        <td className="px-4 py-3 text-right">
                                            {leave.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleReview(leave.id, 'approved')}
                                                        disabled={processing === leave.id}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition disabled:opacity-50"
                                                    >
                                                        ✓ Approva
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(leave.id, 'rejected')}
                                                        disabled={processing === leave.id}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition disabled:opacity-50"
                                                    >
                                                        ✕ Rifiuta
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* New Request Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Nuova Richiesta</h2>
                        <button
                            onClick={() => setShowModal(false)}
                            className="text-gray-400 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Employee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Dipendente *
                            </label>
                            <select
                                value={formData.employee_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            >
                                <option value="">-- Seleziona --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.last_name} {emp.first_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Leave Type - CLICKABLE BUTTONS */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Tipo Assenza
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {LEAVE_TYPES.map(t => {
                                    const isSelected = formData.leave_type === t.value;
                                    const colorMap = {
                                        blue: 'border-blue-500 bg-blue-500/20 text-blue-400',
                                        red: 'border-red-500 bg-red-500/20 text-red-400',
                                        purple: 'border-purple-500 bg-purple-500/20 text-purple-400',
                                        yellow: 'border-yellow-500 bg-yellow-500/20 text-yellow-400',
                                    };
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, leave_type: t.value }))}
                                            className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${isSelected
                                                ? colorMap[t.color]
                                                : 'border-white/10 bg-slate-700/50 hover:border-white/30 text-white'
                                                }`}
                                        >
                                            <span className="text-xl">{t.icon}</span>
                                            <span className="font-medium text-sm">{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Dal *
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Al *
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Motivazione (opzionale)
                            </label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                rows={3}
                                placeholder="Note aggiuntive..."
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                Invia Richiesta
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
);
}
