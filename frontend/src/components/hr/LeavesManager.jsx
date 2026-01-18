/**
 * SL Enterprise - Leaves Manager Component
 * Logic extracted from LeavesPage to be used in ApprovalCenter
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leavesApi, employeesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';
import { motion, AnimatePresence } from 'framer-motion';

const LEAVE_TYPES = [
    { value: 'vacation', label: 'Ferie', icon: '🏖️', color: 'blue' },
    { value: 'sick', label: 'Malattia', icon: '🏥', color: 'red' },
    { value: 'permit', label: 'Permesso', icon: '📝', color: 'purple' },
    { value: 'sudden_permit', label: 'Permesso Improvviso', icon: '⚡', color: 'yellow' },
];

const STATUS_MAP = {
    pending: { label: 'In Attesa', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: '⏳' },
    approved: { label: 'Approvata', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: '✅' },
    rejected: { label: 'Rifiutata', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: '❌' },
    cancelled: { label: 'Annullata', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: '🚫' },
};

export default function LeavesManager() {
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Modern Pill Filters */}
                <div className="flex p-1 bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/10">
                    {[
                        { id: 'pending', label: '⏳ In Attesa' },
                        { id: 'approved', label: '✅ Approvate' },
                        { id: 'rejected', label: '❌ Rifiutate' },
                        { id: 'all', label: 'Tutte' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4">
                    {/* Stats Example - Maybe add later */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 font-medium"
                    >
                        <span>+</span> Nuova Richiesta
                    </button>
                </div>
            </div>

            {/* Premium Table (Desktop) */}
            <div className="hidden md:block bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <table className="w-full">
                    <thead className="bg-slate-900/80 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dipendente</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Richiesto da</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Periodo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Stato</th>
                            {isHR && <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Azioni</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                            {filteredLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan={isHR ? 6 : 5} className="px-6 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-4xl opacity-50">📭</span>
                                            <p>Nessuna richiesta trovata con questo filtro.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeaves.map((leave, index) => {
                                    const type = getLeaveType(leave.leave_type);
                                    const status = STATUS_MAP[leave.status] || STATUS_MAP.pending;

                                    return (
                                        <motion.tr
                                            key={leave.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2, delay: index * 0.05 }}
                                            className="group hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                                        {getEmployeeName(leave.employee_id).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/hr/employees/${leave.employee_id}`}
                                                            className="text-white hover:text-blue-400 font-bold transition-colors block"
                                                        >
                                                            {getEmployeeName(leave.employee_id)}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-[10px] font-bold">
                                                        {(leave.requester?.full_name || leave.requester?.username || 'N/A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-slate-300 text-sm">
                                                        {leave.requester?.full_name || leave.requester?.username || 'Sistema'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl bg-slate-800 p-1.5 rounded-lg border border-white/5">{type.icon}</span>
                                                    <span className="text-slate-300 font-medium">{type.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-slate-200 font-medium whitespace-nowrap">
                                                        {formatDate(leave.start_date)}
                                                    </span>
                                                    <span className="text-slate-500 text-xs">fino al {formatDate(leave.end_date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                                                    {status.icon} {status.label}
                                                </span>
                                            </td>
                                            {isHR && (
                                                <td className="px-6 py-4 text-right">
                                                    {leave.status === 'pending' && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                                                            <button
                                                                onClick={() => handleReview(leave.id, 'approved')}
                                                                disabled={processing === leave.id}
                                                                className="w-8 h-8 flex items-center justify-center bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all border border-green-500/30 hover:scale-110"
                                                                title="Approva"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={() => handleReview(leave.id, 'rejected')}
                                                                disabled={processing === leave.id}
                                                                className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/30 hover:scale-110"
                                                                title="Rifiuta"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </motion.tr>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (Phone) */}
            <div className="md:hidden space-y-4">
                <AnimatePresence>
                    {filteredLeaves.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-slate-900/50 rounded-2xl border border-white/10">
                            <span className="text-4xl block mb-2 opacity-50">📭</span>
                            <p className="text-slate-500">Nessuna richiesta trovata.</p>
                        </div>
                    ) : (
                        filteredLeaves.map((leave, index) => {
                            const type = getLeaveType(leave.leave_type);
                            const status = STATUS_MAP[leave.status] || STATUS_MAP.pending;
                            const empName = getEmployeeName(leave.employee_id);

                            return (
                                <motion.div
                                    key={leave.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-lg active:scale-[0.98] transition-all"
                                >
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                                                {empName.charAt(0)}
                                            </div>
                                            <div>
                                                <Link to={`/hr/employees/${leave.employee_id}`} className="font-bold text-white text-base">
                                                    {empName}
                                                </Link>
                                                <p className="text-xs text-slate-500">
                                                    {leave.requester ? `by ${leave.requester.full_name || leave.requester.username}` : 'Richiesta diretta'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-2 border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{type.icon}</span>
                                                <span className="text-sm font-medium text-slate-300">{type.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mt-1">
                                            <div>
                                                <span className="block text-slate-500">Dal</span>
                                                <span className="text-white font-mono">{formatDate(leave.start_date)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-slate-500">Al</span>
                                                <span className="text-white font-mono">{formatDate(leave.end_date)}</span>
                                            </div>
                                        </div>
                                        {leave.reason && (
                                            <div className="text-xs text-slate-400 italic mt-1 pt-1 border-t border-white/5">
                                                "{leave.reason}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Actions */}
                                    {isHR && leave.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReview(leave.id, 'rejected')}
                                                disabled={processing === leave.id}
                                                className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors"
                                            >
                                                Rifiuta
                                            </button>
                                            <button
                                                onClick={() => handleReview(leave.id, 'approved')}
                                                disabled={processing === leave.id}
                                                className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-bold hover:bg-green-500/20 transition-colors"
                                            >
                                                Approva
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* New Request Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="bg-slate-800/50 p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Nuova Richiesta</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Employee */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                        Dipendente
                                    </label>
                                    <select
                                        value={formData.employee_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
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

                                {/* Leave Type */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                        Tipo
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                        {LEAVE_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, leave_type: t.value }))}
                                                className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${formData.leave_type === t.value
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                                    : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span>{t.icon}</span> {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                            Dal
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                            Al
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                        Note
                                    </label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                        rows={2}
                                        placeholder="Opzionale..."
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition font-bold"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition font-bold shadow-lg"
                                    >
                                        Invia
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
