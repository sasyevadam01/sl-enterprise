/**
 * SL Enterprise - Bonus Management Panel
 * Monthly bonus registry with auto-population from positive events
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { employeesApi } from '../../api/client';

// Create axios instance for bonus-specific endpoints
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const MONTHS = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default function BonusManagementPanel() {
    const DEFAULT_BUDGET = 2000;

    // Date State
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Budget State (persisted in localStorage per month/year)
    const budgetKey = `bonus_budget_${month}_${year}`;
    const [budget, setBudget] = useState(() => {
        const saved = localStorage.getItem(budgetKey);
        return saved ? parseFloat(saved) : DEFAULT_BUDGET;
    });
    const [editingBudget, setEditingBudget] = useState(false);

    // Data State
    const [bonuses, setBonuses] = useState([]);
    const [positiveEvents, setPositiveEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState({ bonus_count: 0, total_amount: 0 });
    const [loading, setLoading] = useState(false);

    // Form State
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualForm, setManualForm] = useState({ employee_id: '', amount: '', description: '' });
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [departments, setDepartments] = useState([]);

    // Event Bonus Modal State
    const [eventModal, setEventModal] = useState({
        isOpen: false,
        event: null,
        amount: '50',
        description: ''
    });

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, bonus: null });

    // Edit Modal State
    const [editModal, setEditModal] = useState({
        isOpen: false,
        bonus: null,
        amount: '',
        description: ''
    });

    // Reload budget when month/year changes
    useEffect(() => {
        const key = `bonus_budget_${month}_${year}`;
        const saved = localStorage.getItem(key);
        setBudget(saved ? parseFloat(saved) : DEFAULT_BUDGET);
    }, [month, year]);

    // Save budget to localStorage
    const handleSaveBudget = (newBudget) => {
        localStorage.setItem(`bonus_budget_${month}_${year}`, newBudget.toString());
        setBudget(newBudget);
        setEditingBudget(false);
    };

    // Load Data
    useEffect(() => {
        loadData();
    }, [month, year]);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [bonusRes, eventsRes, summaryRes] = await Promise.all([
                api.get(`/bonuses?month=${month}&year=${year}`),
                api.get(`/bonuses/positive-events?month=${month}&year=${year}`),
                api.get(`/bonuses/summary?month=${month}&year=${year}`)
            ]);
            setBonuses(bonusRes.data);
            setPositiveEvents(eventsRes.data);
            setSummary(summaryRes.data);
        } catch (e) {
            console.error('Failed to load bonus data', e);
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            // Use employeesApi which handles response unwrapping (same as EmployeesPage)
            const [empResponse, deptRes] = await Promise.all([
                employeesApi.getEmployees(),
                api.get('/admin/departments')
            ]);

            // employeesApi returns array directly (already unwrapped by interceptor)
            let empData = [];
            if (Array.isArray(empResponse)) {
                empData = empResponse;
            } else if (empResponse && Array.isArray(empResponse.data)) {
                empData = empResponse.data;
            }

            const deptData = deptRes.data?.departments || deptRes.data || [];
            console.log('BONUS: Loaded', empData.length, 'employees and', Array.isArray(deptData) ? deptData.length : 0, 'departments');

            setEmployees(empData);
            setDepartments(Array.isArray(deptData) ? deptData : []);
        } catch (e) {
            console.error('Failed to load employees/departments', e);
            setEmployees([]);
            setDepartments([]);
        }
    };

    // Filtered employees for manual entry - show all if no department selected
    const filteredEmployees = useMemo(() => {
        if (!Array.isArray(employees) || employees.length === 0) return [];

        let filtered = employees;

        // Filter by department if one is selected
        if (selectedDepartment) {
            const deptId = parseInt(selectedDepartment);
            // Find department name from selected ID
            const selectedDeptObj = departments.find(d => d.id === deptId);
            const deptName = selectedDeptObj ? selectedDeptObj.name : '';

            // Match on both department_id and department_name (some employees may use text)
            filtered = filtered.filter(emp =>
                emp.department_id === deptId ||
                (emp.department_name && emp.department_name.toLowerCase() === deptName.toLowerCase())
            );
        }

        return filtered;
    }, [employees, selectedDepartment, departments]);

    // Open modal for event bonus assignment
    const handleAssignFromEvent = (event) => {
        setEventModal({
            isOpen: true,
            event: event,
            amount: '50',
            description: event.event_type || ''
        });
    };

    // Confirm event bonus from modal
    const handleConfirmEventBonus = async () => {
        if (!eventModal.amount || isNaN(parseFloat(eventModal.amount))) return;

        try {
            await api.post('/bonuses', {
                employee_id: eventModal.event.employee_id,
                event_id: eventModal.event.id,
                amount: parseFloat(eventModal.amount),
                description: eventModal.description || eventModal.event.event_type,
                month: month,
                year: year
            });
            setEventModal({ isOpen: false, event: null, amount: '50', description: '' });
            loadData();
        } catch (e) {
            alert('Errore: ' + (e.response?.data?.detail || e.message));
        }
    };

    // Manual bonus
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualForm.employee_id || !manualForm.amount) {
            alert('Seleziona dipendente e importo');
            return;
        }

        try {
            await api.post('/bonuses', {
                employee_id: parseInt(manualForm.employee_id),
                amount: parseFloat(manualForm.amount),
                description: manualForm.description || 'Bonus discrezionale',
                month: month,
                year: year
            });
            setManualForm({ employee_id: '', amount: '', description: '' });
            setEmployeeSearch('');
            setShowManualForm(false);
            loadData();
        } catch (e) {
            alert('Errore: ' + (e.response?.data?.detail || e.message));
        }
    };

    // Open delete confirmation modal
    const handleDeleteClick = (bonus) => {
        setDeleteModal({ isOpen: true, bonus });
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!deleteModal.bonus) return;
        try {
            await api.delete(`/bonuses/${deleteModal.bonus.id}`);
            setDeleteModal({ isOpen: false, bonus: null });
            loadData();
        } catch (e) {
            alert('Errore eliminazione');
        }
    };

    // Open edit modal
    const handleEditClick = (bonus) => {
        setEditModal({
            isOpen: true,
            bonus: bonus,
            amount: bonus.amount.toString(),
            description: bonus.description || bonus.event_description || ''
        });
    };

    // Confirm edit
    const handleConfirmEdit = async () => {
        if (!editModal.bonus) return;
        try {
            await api.patch(`/bonuses/${editModal.bonus.id}`, {
                amount: parseFloat(editModal.amount),
                description: editModal.description
            });
            setEditModal({ isOpen: false, bonus: null, amount: '', description: '' });
            loadData();
        } catch (e) {
            alert('Errore modifica: ' + (e.response?.data?.detail || e.message));
        }
    };

    // Export PDF
    const handleExportPDF = async () => {
        try {
            const res = await api.get(`/bonuses/export/pdf?month=${month}&year=${year}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Bonus_${MONTHS[month]}_${year}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Errore export PDF');
        }
    };

    // Navigate months
    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    return (
        <div className="space-y-6">
            {/* HEADER WITH MONTH NAV */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="w-10 h-10 rounded-lg bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/50 transition">◀</button>
                    <div className="text-center">
                        <div className="text-2xl font-black text-yellow-400">{MONTHS[month]} {year}</div>
                        <div className="text-xs text-yellow-500/60 uppercase tracking-widest">Registro Bonus</div>
                    </div>
                    <button onClick={nextMonth} className="w-10 h-10 rounded-lg bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/50 transition">▶</button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowManualForm(!showManualForm)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold uppercase rounded-lg transition"
                    >
                        ➕ Aggiungi Manuale
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-slate-800 border border-yellow-500/30 text-yellow-400 hover:bg-slate-700 font-bold uppercase rounded-lg transition"
                    >
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* BUDGET SUMMARY */}
            <div className="grid grid-cols-4 gap-4">
                {/* Budget Input */}
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-500/50 rounded-xl p-4 text-center relative">
                    {editingBudget ? (
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-yellow-400 text-xl">€</span>
                            <input
                                type="number"
                                defaultValue={budget}
                                autoFocus
                                onBlur={(e) => handleSaveBudget(parseFloat(e.target.value) || DEFAULT_BUDGET)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget(parseFloat(e.target.value) || DEFAULT_BUDGET)}
                                className="w-24 bg-slate-800 border border-yellow-500/50 rounded px-2 py-1 text-2xl font-bold text-yellow-400 text-center"
                            />
                        </div>
                    ) : (
                        <div className="text-4xl font-black text-yellow-400 cursor-pointer hover:text-yellow-300" onClick={() => setEditingBudget(true)}>
                            € {budget.toLocaleString()}
                        </div>
                    )}
                    <div className="text-xs text-yellow-500/60 uppercase tracking-wider">Budget Mensile ✏️</div>
                </div>

                {/* Remaining */}
                <div className={`border rounded-xl p-4 text-center ${(budget - summary.total_amount) >= 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    <div className={`text-4xl font-black ${(budget - summary.total_amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        € {(budget - summary.total_amount).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Rimanente</div>
                </div>

                {/* Erogated */}
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                    <div className="text-4xl font-black text-yellow-400">€ {summary.total_amount.toLocaleString()}</div>
                    <div className="text-xs text-yellow-500/60 uppercase tracking-wider">Erogato</div>
                </div>

                {/* Positive Events */}
                <div className="bg-slate-900/60 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <div className="text-4xl font-black text-white">{positiveEvents.filter(e => !e.already_has_bonus).length}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Eventi Senza Bonus</div>
                </div>
            </div>

            {/* BUDGET PROGRESS BAR */}
            <div className="bg-slate-900/60 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Utilizzo Budget</span>
                    <span className={`font-bold ${(summary.total_amount / budget) > 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {((summary.total_amount / budget) * 100).toFixed(0)}%
                    </span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${(summary.total_amount / budget) > 1 ? 'bg-red-500' : (summary.total_amount / budget) > 0.8 ? 'bg-orange-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'} transition-all duration-500`}
                        style={{ width: `${Math.min((summary.total_amount / budget) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* MANUAL FORM */}
            <AnimatePresence>
                {showManualForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleManualSubmit} className="bg-slate-900/80 border border-yellow-500/30 rounded-xl p-6 space-y-4">
                            <h3 className="text-lg font-bold text-yellow-400">➕ Inserimento Manuale</h3>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Department Filter */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 uppercase">Filtra Reparto</label>
                                    <select
                                        value={selectedDepartment}
                                        onChange={e => setSelectedDepartment(e.target.value)}
                                        className="w-full bg-slate-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-white"
                                    >
                                        <option value="">Tutti i Reparti</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Employee Dropdown */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 uppercase">Seleziona Dipendente</label>
                                    <select
                                        value={manualForm.employee_id}
                                        onChange={e => setManualForm({ ...manualForm, employee_id: e.target.value })}
                                        className="w-full bg-slate-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-white"
                                        required
                                    >
                                        <option value="">-- Seleziona --</option>
                                        {filteredEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.last_name} {emp.first_name} {emp.department_name ? `(${emp.department_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 uppercase">Importo €</label>
                                    <input
                                        type="number"
                                        value={manualForm.amount}
                                        onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                                        placeholder="50"
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-slate-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 uppercase">Motivo (opzionale)</label>
                                    <input
                                        type="text"
                                        value={manualForm.description}
                                        onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                                        placeholder="Bonus discrezionale"
                                        className="w-full bg-slate-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg">
                                    Assegna Bonus
                                </button>
                                <button type="button" onClick={() => setShowManualForm(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                                    Annulla
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* POSITIVE EVENTS (Auto-populate) */}
            {positiveEvents.filter(e => !e.already_has_bonus).length > 0 && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">✨ Eventi Positivi del Mese (senza bonus assegnato)</h3>
                    <div className="space-y-2">
                        {positiveEvents.filter(e => !e.already_has_bonus).map(ev => (
                            <div key={ev.id} className="flex items-center justify-between bg-slate-900/60 rounded-lg p-3">
                                <div>
                                    <div className="font-medium text-white">{ev.employee_name}</div>
                                    <div className="text-sm text-emerald-400">{ev.event_type} • +{ev.points} punti</div>
                                    <div className="text-xs text-gray-500">Richiesto da: {ev.created_by_name} • {ev.event_date}</div>
                                </div>
                                <button
                                    onClick={() => handleAssignFromEvent(ev)}
                                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg"
                                >
                                    💰 Assegna Bonus
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BONUSES TABLE */}
            <div className="bg-slate-900/80 border border-yellow-500/20 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-yellow-500/10">
                    <h3 className="text-lg font-bold text-yellow-400">💰 Bonus Assegnati - {MONTHS[month]} {year}</h3>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">Caricamento...</div>
                ) : bonuses.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Nessun bonus assegnato per questo mese.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800 text-yellow-400/80 uppercase text-xs">
                                <tr>
                                    <th className="text-left p-3">Dipendente</th>
                                    <th className="text-left p-3">Evento / Motivo</th>
                                    <th className="text-left p-3">Richiesto Da</th>
                                    <th className="text-center p-3">Data</th>
                                    <th className="text-right p-3">Importo €</th>
                                    <th className="text-center p-3">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-yellow-500/10">
                                {bonuses.map(b => (
                                    <tr key={b.id} className="hover:bg-yellow-500/5">
                                        <td className="p-3 font-medium text-white">{b.employee_name}</td>
                                        <td className="p-3 text-gray-300">{b.event_description || b.description || '-'}</td>
                                        <td className="p-3 text-gray-400">{b.event_requester || b.created_by_name || '-'}</td>
                                        <td className="p-3 text-right font-bold text-yellow-400">€ {b.amount.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEditClick(b)}
                                                    className="text-blue-400 hover:text-blue-300"
                                                    title="Modifica"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(b)}
                                                    className="text-red-400 hover:text-red-300"
                                                    title="Elimina"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-yellow-900/30 text-yellow-400 font-bold">
                                <tr>
                                    <td colSpan="4" className="p-3 text-right">TOTALE:</td>
                                    <td className="p-3 text-right text-lg">€ {summary.total_amount.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* EVENT BONUS MODAL - Styled Premium */}
            <AnimatePresence>
                {eventModal.isOpen && eventModal.event && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setEventModal({ isOpen: false, event: null, amount: '50', description: '' })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-yellow-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(234,179,8,0.2)]"
                        >
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">💰</div>
                                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 uppercase tracking-wider">
                                    Assegna Bonus
                                </h3>
                                <p className="text-gray-400 mt-1">{eventModal.event.employee_name}</p>
                            </div>

                            {/* Event Info */}
                            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 mb-4">
                                <div className="text-sm text-yellow-400 font-medium">{eventModal.event.event_type}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                    +{eventModal.event.points} punti • {eventModal.event.event_date}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-4">
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Importo Bonus (€)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 text-xl font-bold">€</span>
                                    <input
                                        type="number"
                                        value={eventModal.amount}
                                        onChange={e => setEventModal({ ...eventModal, amount: e.target.value })}
                                        className="w-full bg-slate-800 border-2 border-yellow-500/50 rounded-xl px-4 py-3 pl-12 text-2xl font-bold text-yellow-400 text-center focus:border-yellow-400 focus:outline-none transition"
                                        autoFocus
                                        min="0"
                                        step="5"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Note / Motivazione</label>
                                <input
                                    type="text"
                                    value={eventModal.description}
                                    onChange={e => setEventModal({ ...eventModal, description: e.target.value })}
                                    placeholder="Es. Premio produttività"
                                    className="w-full bg-slate-800 border border-yellow-500/30 rounded-xl px-4 py-2 text-white"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEventModal({ isOpen: false, event: null, amount: '50', description: '' })}
                                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 font-bold uppercase rounded-xl transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmEventBonus}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black uppercase rounded-xl transition shadow-lg"
                                >
                                    ✓ Conferma
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DELETE CONFIRMATION MODAL */}
            <AnimatePresence>
                {deleteModal.isOpen && deleteModal.bonus && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteModal({ isOpen: false, bonus: null })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-red-500/50 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_60px_rgba(239,68,68,0.2)]"
                        >
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">⚠️</div>
                                <h3 className="text-xl font-black text-red-400 uppercase tracking-wider">
                                    Elimina Bonus
                                </h3>
                                <p className="text-gray-400 mt-2">
                                    Confermi l'eliminazione del bonus di <span className="text-yellow-400 font-bold">€{deleteModal.bonus.amount}</span> per <span className="text-white">{deleteModal.bonus.employee_name}</span>?
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, bonus: null })}
                                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 font-bold uppercase rounded-xl transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black uppercase rounded-xl transition shadow-lg"
                                >
                                    🗑️ Elimina
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EDIT BONUS MODAL */}
            <AnimatePresence>
                {editModal.isOpen && editModal.bonus && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setEditModal({ isOpen: false, bonus: null, amount: '', description: '' })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-blue-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(59,130,246,0.2)]"
                        >
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">✏️</div>
                                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase tracking-wider">
                                    Modifica Bonus
                                </h3>
                                <p className="text-gray-400 mt-1">{editModal.bonus.employee_name}</p>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-4">
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Importo (€)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 text-xl font-bold">€</span>
                                    <input
                                        type="number"
                                        value={editModal.amount}
                                        onChange={e => setEditModal({ ...editModal, amount: e.target.value })}
                                        className="w-full bg-slate-800 border-2 border-blue-500/50 rounded-xl px-4 py-3 pl-12 text-2xl font-bold text-blue-400 text-center focus:border-blue-400 focus:outline-none transition"
                                        autoFocus
                                        min="0"
                                        step="5"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Note / Motivazione</label>
                                <input
                                    type="text"
                                    value={editModal.description}
                                    onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                                    placeholder="Motivo bonus"
                                    className="w-full bg-slate-800 border border-blue-500/30 rounded-xl px-4 py-2 text-white"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditModal({ isOpen: false, bonus: null, amount: '', description: '' })}
                                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 font-bold uppercase rounded-xl transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmEdit}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black uppercase rounded-xl transition shadow-lg"
                                >
                                    ✓ Salva
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
