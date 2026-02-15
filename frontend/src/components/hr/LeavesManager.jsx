/**
 * SL Enterprise - Leaves Manager Component
 * ULTRA PREMIUM Enterprise Light Mode
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leavesApi, employeesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';
import { motion, AnimatePresence } from 'framer-motion';

const LEAVE_TYPES = [
    { value: 'vacation', label: 'Ferie', color: 'blue' },
    { value: 'sick', label: 'Malattia', color: 'red' },
    { value: 'permit', label: 'Permesso', color: 'purple' },
    { value: 'sudden_permit', label: 'Permesso Improvviso', color: 'yellow' },
];

const LEAVE_ICONS = {
    vacation: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    sick: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    ),
    permit: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    sudden_permit: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
};

const STATUS_MAP = {
    pending: { label: 'In Attesa', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
    approved: { label: 'Approvata', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
    rejected: { label: 'Rifiutata', color: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
    cancelled: { label: 'Annullata', color: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200' },
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

    const fetchData = async (statusFilter = filter) => {
        setLoading(true);
        try {
            let leavesData;
            if (statusFilter === 'pending') {
                leavesData = await leavesApi.getPending();
            } else {
                const params = statusFilter !== 'all' ? { status_filter: statusFilter } : {};
                leavesData = await leavesApi.getLeaves(params);
            }
            const employeesData = await employeesApi.getEmployees();
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
    }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Filter Pills */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                    {[
                        { id: 'pending', label: 'In Attesa' },
                        { id: 'approved', label: 'Approvate' },
                        { id: 'rejected', label: 'Rifiutate' },
                        { id: 'all', label: 'Tutte' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${filter === f.id
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md active:scale-[0.98] flex items-center gap-2 font-bold text-sm cursor-pointer"
                >
                    <span className="text-lg leading-none">+</span> Nuova Richiesta
                </button>
            </div>

            {/* Premium Table (Desktop) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dipendente</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Richiesto da</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Periodo</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stato</th>
                            {isHR && <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Azioni</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <AnimatePresence>
                            {filteredLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan={isHR ? 6 : 5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-400 font-medium">Nessuna richiesta trovata con questo filtro.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeaves.map((leave, index) => {
                                    const type = getLeaveType(leave.leave_type);
                                    const status = STATUS_MAP[leave.status] || STATUS_MAP.pending;
                                    const typeIcon = LEAVE_ICONS[leave.leave_type] || LEAVE_ICONS.vacation;

                                    return (
                                        <motion.tr
                                            key={leave.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                            className="group hover:bg-blue-50/40 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                        {getEmployeeName(leave.employee_id).charAt(0)}
                                                    </div>
                                                    <Link
                                                        to={`/hr/employees/${leave.employee_id}`}
                                                        className="text-slate-900 hover:text-blue-600 font-bold transition-colors"
                                                    >
                                                        {getEmployeeName(leave.employee_id)}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                                        {(leave.requester?.full_name || leave.requester?.username || 'N/A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-slate-600 text-sm">
                                                        {leave.requester?.full_name || leave.requester?.username || 'Sistema'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                                                        {typeIcon}
                                                    </span>
                                                    <span className="text-slate-700 font-medium text-sm">{type.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-slate-800 font-semibold whitespace-nowrap">
                                                        {formatDate(leave.start_date)}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">fino al {formatDate(leave.end_date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            {isHR && (
                                                <td className="px-6 py-4 text-right">
                                                    {leave.status === 'pending' && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                            <button
                                                                onClick={() => handleReview(leave.id, 'approved')}
                                                                disabled={processing === leave.id}
                                                                className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg transition-all border border-emerald-200 hover:border-emerald-600 hover:shadow-sm cursor-pointer"
                                                                title="Approva"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleReview(leave.id, 'rejected')}
                                                                disabled={processing === leave.id}
                                                                className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all border border-red-200 hover:border-red-600 hover:shadow-sm cursor-pointer"
                                                                title="Rifiuta"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                <AnimatePresence>
                    {filteredLeaves.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            </div>
                            <p className="text-slate-500 font-medium">Nessuna richiesta trovata.</p>
                        </div>
                    ) : (
                        filteredLeaves.map((leave, index) => {
                            const type = getLeaveType(leave.leave_type);
                            const status = STATUS_MAP[leave.status] || STATUS_MAP.pending;
                            const empName = getEmployeeName(leave.employee_id);
                            const typeIcon = LEAVE_ICONS[leave.leave_type] || LEAVE_ICONS.vacation;

                            return (
                                <motion.div
                                    key={leave.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.04 }}
                                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-all"
                                >
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                                {empName.charAt(0)}
                                            </div>
                                            <div>
                                                <Link to={`/hr/employees/${leave.employee_id}`} className="font-bold text-slate-900 text-base">
                                                    {empName}
                                                </Link>
                                                <p className="text-xs text-slate-400">
                                                    {leave.requester ? `da ${leave.requester.full_name || leave.requester.username}` : 'Richiesta diretta'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    {/* Card Content */}
                                    <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2 border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                {typeIcon}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-700">{type.label}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mt-1">
                                            <div>
                                                <span className="block text-slate-400 text-[10px] uppercase font-bold">Dal</span>
                                                <span className="text-slate-800 font-mono font-bold">{formatDate(leave.start_date)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-slate-400 text-[10px] uppercase font-bold">Al</span>
                                                <span className="text-slate-800 font-mono font-bold">{formatDate(leave.end_date)}</span>
                                            </div>
                                        </div>
                                        {leave.reason && (
                                            <div className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-100">
                                                &quot;{leave.reason}&quot;
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Actions */}
                                    {isHR && leave.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReview(leave.id, 'rejected')}
                                                disabled={processing === leave.id}
                                                className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer"
                                            >
                                                Rifiuta
                                            </button>
                                            <button
                                                onClick={() => handleReview(leave.id, 'approved')}
                                                disabled={processing === leave.id}
                                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900">Nuova Richiesta</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Employee */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                                        Dipendente
                                    </label>
                                    <select
                                        value={formData.employee_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none appearance-none"
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                                        Tipo
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {LEAVE_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, leave_type: t.value }))}
                                                className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${formData.leave_type === t.value
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                <span className={formData.leave_type === t.value ? 'text-white' : 'text-slate-400'}>
                                                    {LEAVE_ICONS[t.value]}
                                                </span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Dal</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Al</label>
                                        <input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Note</label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
                                        rows={2}
                                        placeholder="Opzionale..."
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold cursor-pointer"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold shadow-sm cursor-pointer"
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
