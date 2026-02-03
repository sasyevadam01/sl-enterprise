/**
 * SL Enterprise - New Request Page
 * Unified creation for HR Events and Leave Requests
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { eventsApi, employeesApi, leavesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = [
    { value: 'vacation', label: 'Ferie', icon: '🏖️', color: 'blue' },
    { value: 'sick', label: 'Malattia', icon: '🏥', color: 'red' },
    { value: 'permit', label: 'Permesso', icon: '📝', color: 'purple' },
    { value: 'sudden_permit', label: 'Permesso Improvviso', icon: '⚡', color: 'yellow' },
];

export default function NewEventPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedEmployee = searchParams.get('employee');
    const { user } = useAuth();

    // Role-aware navigation: coordinators don't have access to approvals page
    const isManager = ['super_admin', 'admin', 'hr_manager', 'factory_controller'].includes(user?.role);
    const afterSubmitPath = isManager ? '/hr/approvals' : '/hr/tasks';

    const preselectedTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(preselectedTab === 'leave' ? 'leave' : 'event');
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null); // 'event' | 'leave'
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

    // Event Form Data
    const [eventForm, setEventForm] = useState({
        employee_id: preselectedEmployee || '',
        event_type: '',
        event_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    // Leave Form Data
    const [leaveForm, setLeaveForm] = useState({
        employee_id: preselectedEmployee || '',
        leave_type: LEAVE_TYPES[0].value,
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [emps, types] = await Promise.all([
                    employeesApi.getEmployees(),
                    eventsApi.getTypes()
                ]);
                setEmployees(emps);
                setEventTypes(types);

                if (types.length > 0) {
                    setEventForm(prev => ({ ...prev, event_type: types[0].value }));
                }

                if (preselectedEmployee) {
                    const emp = emps.find(e => e.id === parseInt(preselectedEmployee));
                    if (emp) {
                        setSelectedEmployeeName(`${emp.first_name} ${emp.last_name}`);
                    }
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [preselectedEmployee]);

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!eventForm.employee_id || !eventForm.event_type) return;

        setLoading(true);
        try {
            await eventsApi.createEvent({
                employee_id: parseInt(eventForm.employee_id),
                event_type: eventForm.event_type,
                event_date: eventForm.event_date,
                description: eventForm.description || null
            });
            setSuccess('event');
            setTimeout(() => navigate(afterSubmitPath), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Errore nella creazione evento');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) return;

        setLoading(true);
        try {
            await leavesApi.createLeave(leaveForm.employee_id, {
                leave_type: leaveForm.leave_type,
                start_date: leaveForm.start_date,
                end_date: leaveForm.end_date,
                reason: leaveForm.reason || null
            });
            setSuccess('leave');
            setTimeout(() => navigate(afterSubmitPath), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Errore nella creazione richiesta');
        } finally {
            setLoading(false);
        }
    };

    const selectedType = eventTypes.find(t => t.value === eventForm.event_type);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                {user?.role === 'super_admin' && (
                    <Link
                        to="/hr/approvals"
                        className="text-gray-400 hover:text-white transition flex items-center gap-2 mb-2"
                    >
                        ← Torna al Centro Approvazioni
                    </Link>
                )}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">📝 Nuova Richiesta</h1>
                        <p className="text-gray-400 mt-1">Crea un nuovo evento HR o inserisci una richiesta di assenza</p>
                    </div>
                </div>
            </div>

            {/* Preselected Employee Banner */}
            {selectedEmployeeName && (
                <div className="mb-6 px-4 py-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    Per dipendente: <span className="font-semibold text-white">{selectedEmployeeName}</span>
                </div>
            )}

            {/* Success Messages */}
            {success === 'event' && (
                <div className="mb-6 px-4 py-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    Evento creato con successo! In attesa di approvazione.
                </div>
            )}
            {success === 'leave' && (
                <div className="mb-6 px-4 py-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    Richiesta di assenza inserita con successo!
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('event')}
                    className={`pb-3 px-4 relative transition font-medium text-lg ${activeTab === 'event'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    ✨ Evento / Bonus / Malus
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    className={`pb-3 px-4 relative transition font-medium text-lg ${activeTab === 'leave'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    🏖️ Assenza / Ferie
                </button>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-white/10 p-6">
                {activeTab === 'event' ? (
                    /* EVENT FORM */
                    <form onSubmit={handleEventSubmit} className="space-y-6">
                        {/* Employee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                👤 Dipendente *
                            </label>
                            <select
                                value={eventForm.employee_id}
                                onChange={(e) => setEventForm(prev => ({ ...prev, employee_id: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            >
                                <option value="">-- Seleziona Dipendente --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.last_name} {emp.first_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Event Type - Premium Design */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                                📋 Tipo Evento *
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {eventTypes.map(type => {
                                    const isPositive = type.points > 0;
                                    const isSelected = eventForm.event_type === type.value;

                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setEventForm(prev => ({ ...prev, event_type: type.value }))}
                                            className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden ${isSelected
                                                ? isPositive
                                                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/20'
                                                    : 'border-red-500 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/20'
                                                : 'border-white/10 bg-slate-800/60 hover:border-white/30 hover:bg-slate-700/60'
                                                }`}
                                        >
                                            {/* Glow effect on selected */}
                                            {isSelected && (
                                                <div className={`absolute inset-0 opacity-20 ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
                                                    style={{ filter: 'blur(20px)' }} />
                                            )}

                                            <div className="relative flex items-center gap-3">
                                                {/* Type indicator icon */}
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isPositive
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {isPositive ? (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <div className="flex-grow min-w-0">
                                                    <span className="font-semibold text-white block truncate">
                                                        {type.label}
                                                    </span>
                                                    <span className={`text-xs ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                        {isPositive ? 'Evento Positivo' : 'Evento Negativo'}
                                                    </span>
                                                </div>

                                                {/* Selection indicator */}
                                                {isSelected && (
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`}>
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date & Desc */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    📅 Data Evento
                                </label>
                                <input
                                    type="date"
                                    value={eventForm.event_date}
                                    onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    📝 Note
                                </label>
                                <input
                                    type="text"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Opzionale..."
                                />
                            </div>
                        </div>

                        {/* Submit Event */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${selectedType?.points > 0
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                } disabled:opacity-50`}
                        >
                            {loading ? 'Salvataggio...' : 'Registra Evento'}
                        </button>
                    </form>
                ) : (
                    /* LEAVE FORM */
                    <form onSubmit={handleLeaveSubmit} className="space-y-6">
                        {/* Employee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                👤 Dipendente *
                            </label>
                            <select
                                value={leaveForm.employee_id}
                                onChange={(e) => setLeaveForm(prev => ({ ...prev, employee_id: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            >
                                <option value="">-- Seleziona Dipendente --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.last_name} {emp.first_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Leave Type - CLICKABLE BUTTONS */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                                🏖️ Tipo Assenza *
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {LEAVE_TYPES.map(t => {
                                    const isSelected = leaveForm.leave_type === t.value;
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
                                            onClick={() => setLeaveForm(prev => ({ ...prev, leave_type: t.value }))}
                                            className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${isSelected
                                                ? colorMap[t.color]
                                                : 'border-white/10 bg-slate-700/50 hover:border-white/30 text-white'
                                                }`}
                                        >
                                            <span className="text-2xl">{t.icon}</span>
                                            <span className="font-bold">{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-400">Date Assenza *</label>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                                    setLeaveForm(prev => ({ ...prev, start_date: today, end_date: today }));
                                }}
                                className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-medium"
                            >
                                📅 Solo Oggi
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Dal *
                                </label>
                                <input
                                    type="date"
                                    value={leaveForm.start_date}
                                    onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Al *
                                </label>
                                <input
                                    type="date"
                                    value={leaveForm.end_date}
                                    onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                📝 Motivazione (opzionale)
                            </label>
                            <textarea
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                rows={3}
                                placeholder="Dettagli aggiuntivi..."
                            />
                        </div>

                        {/* Submit Leave */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Salvataggio...' : 'Invia Richiesta Assenza'}
                        </button>
                    </form>
                )}

                {/* Generic Error */}
                {error && (
                    <div className="mt-4 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
