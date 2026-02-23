/**
 * SL Enterprise - New Request Page
 * Unified creation for HR Events and Leave Requests
 * Premium Enterprise Light Mode
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { eventsApi, employeesApi, leavesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = [
    { value: 'vacation', label: 'Ferie', color: 'blue' },
    { value: 'sick', label: 'Malattia', color: 'red' },
    { value: 'permit', label: 'Permesso', color: 'purple' },
    { value: 'sudden_permit', label: 'Permesso Improvviso', color: 'amber' },
];

/* SVG icon helpers */
const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

export default function NewEventPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedEmployee = searchParams.get('employee');
    const { user } = useAuth();

    const isManager = ['super_admin', 'admin', 'hr_manager', 'factory_controller'].includes(user?.role);
    const afterSubmitPath = isManager ? '/hr/approvals' : '/hr/tasks';

    const preselectedTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(preselectedTab === 'leave' ? 'leave' : 'event');
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

    const [eventForm, setEventForm] = useState({
        employee_id: preselectedEmployee || '',
        event_type: '',
        event_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const [leaveForm, setLeaveForm] = useState({
        employee_id: preselectedEmployee || '',
        leave_type: LEAVE_TYPES[0].value,
        start_date: '',
        end_date: '',
        start_time: '08:00',
        end_time: '17:00',
        reason: ''
    });

    const isPermitType = ['permit', 'sudden_permit'].includes(leaveForm.leave_type);

    const calculateHours = (startTime, endTime) => {
        if (!startTime || !endTime) return 0;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        return Math.max(0, Math.round(diffMinutes / 60));
    };

    const permitHours = calculateHours(leaveForm.start_time, leaveForm.end_time);

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
        if (!leaveForm.employee_id || !leaveForm.start_date) return;
        if (!isPermitType && !leaveForm.end_date) return;
        if (isPermitType && permitHours <= 0) {
            setError('L\'ora di fine deve essere dopo l\'ora di inizio');
            return;
        }

        setLoading(true);
        try {
            let payload = {
                leave_type: leaveForm.leave_type,
                reason: leaveForm.reason || null
            };

            if (isPermitType) {
                payload.start_date = `${leaveForm.start_date}T${leaveForm.start_time}:00`;
                payload.end_date = `${leaveForm.start_date}T${leaveForm.end_time}:00`;
                payload.hours = permitHours;
            } else {
                payload.start_date = leaveForm.start_date;
                payload.end_date = leaveForm.end_date;
            }

            await leavesApi.createLeave(leaveForm.employee_id, payload);
            setSuccess('leave');
            setTimeout(() => navigate(afterSubmitPath), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Errore nella creazione richiesta');
        } finally {
            setLoading(false);
        }
    };

    const selectedType = eventTypes.find(t => t.value === eventForm.event_type);

    /* ── Shared input class ── */
    const inputClass = "w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition";
    const labelClass = "block text-sm font-medium text-slate-700 mb-2";

    return (
        <div className="max-w-2xl mx-auto">
            {/* ── Header ── */}
            <div className="mb-6">
                {user?.role === 'super_admin' && (
                    <Link
                        to="/hr/approvals"
                        className="text-slate-500 hover:text-slate-800 transition flex items-center gap-2 mb-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Torna al Centro Approvazioni
                    </Link>
                )}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Nuova Richiesta</h1>
                        <p className="text-slate-500 mt-1">Crea un nuovo evento HR o inserisci una richiesta di assenza</p>
                    </div>
                </div>
            </div>

            {/* ── Preselected Employee Banner ── */}
            {selectedEmployeeName && (
                <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <UserIcon />
                    </div>
                    Per dipendente: <span className="font-semibold text-slate-900">{selectedEmployeeName}</span>
                </div>
            )}

            {/* ── Success Messages ── */}
            {success === 'event' && (
                <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Evento creato con successo! In attesa di approvazione.
                </div>
            )}
            {success === 'leave' && (
                <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Richiesta di assenza inserita con successo!
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex gap-1 border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('event')}
                    className={`pb-3 px-4 relative transition font-medium text-sm flex items-center gap-2 cursor-pointer ${activeTab === 'event'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    Evento / Bonus / Malus
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    className={`pb-3 px-4 relative transition font-medium text-sm flex items-center gap-2 cursor-pointer ${activeTab === 'leave'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
                        }`}
                >
                    <CalendarIcon />
                    Assenza / Ferie
                </button>
            </div>

            {/* ── Form Wrapper — "Foglio di Carta" ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                {activeTab === 'event' ? (
                    /* ═══════ EVENT FORM ═══════ */
                    <form onSubmit={handleEventSubmit} className="space-y-6">
                        {/* Employee */}
                        <div>
                            <label className={labelClass}>Dipendente *</label>
                            <select
                                value={eventForm.employee_id}
                                onChange={(e) => setEventForm(prev => ({ ...prev, employee_id: e.target.value }))}
                                className={inputClass}
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

                        {/* Event Type - Radio Cards */}
                        <div>
                            <label className={labelClass}>Tipo Evento *</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {eventTypes.map(type => {
                                    const isPositive = type.points > 0;
                                    const isSelected = eventForm.event_type === type.value;

                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setEventForm(prev => ({ ...prev, event_type: type.value }))}
                                            className={`group relative p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${isSelected
                                                ? isPositive
                                                    ? 'border-2 border-emerald-500 bg-emerald-50 shadow-sm'
                                                    : 'border-2 border-red-500 bg-red-50 shadow-sm'
                                                : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Type indicator icon */}
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isSelected
                                                    ? isPositive
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-red-100 text-red-600'
                                                    : isPositive
                                                        ? 'bg-emerald-50 text-emerald-500'
                                                        : 'bg-red-50 text-red-500'
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
                                                    <span className={`font-semibold block truncate ${isSelected
                                                        ? isPositive ? 'text-emerald-900' : 'text-red-900'
                                                        : 'text-slate-700'
                                                        }`}>
                                                        {type.label}
                                                    </span>
                                                    <span className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                                                        {isPositive ? 'Evento Positivo' : 'Evento Negativo'}
                                                    </span>
                                                </div>

                                                {/* Selection indicator */}
                                                {isSelected && (
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'
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

                        {/* Date & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Data Evento</label>
                                <input
                                    type="date"
                                    value={eventForm.event_date}
                                    onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Note</label>
                                <input
                                    type="text"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Opzionale..."
                                />
                            </div>
                        </div>

                        {/* Submit Event */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${selectedType?.points > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? 'Salvataggio...' : 'Registra Evento'}
                        </button>
                    </form>
                ) : (
                    /* ═══════ LEAVE FORM ═══════ */
                    <form onSubmit={handleLeaveSubmit} className="space-y-6">
                        {/* Employee */}
                        <div>
                            <label className={labelClass}>Dipendente *</label>
                            <select
                                value={leaveForm.employee_id}
                                onChange={(e) => setLeaveForm(prev => ({ ...prev, employee_id: e.target.value }))}
                                className={inputClass}
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

                        {/* Leave Type - Radio Cards */}
                        <div>
                            <label className={labelClass}>Tipo Assenza *</label>
                            <div className="grid grid-cols-2 gap-3">
                                {LEAVE_TYPES.map(t => {
                                    const isSelected = leaveForm.leave_type === t.value;
                                    const activeColors = {
                                        blue: 'border-2 border-blue-500 bg-blue-50 text-blue-900',
                                        red: 'border-2 border-red-500 bg-red-50 text-red-900',
                                        purple: 'border-2 border-purple-500 bg-purple-50 text-purple-900',
                                        amber: 'border-2 border-amber-500 bg-amber-50 text-amber-900',
                                    };
                                    const iconColors = {
                                        blue: 'bg-blue-100 text-blue-600',
                                        red: 'bg-red-100 text-red-600',
                                        purple: 'bg-purple-100 text-purple-600',
                                        amber: 'bg-amber-100 text-amber-600',
                                    };
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setLeaveForm(prev => ({ ...prev, leave_type: t.value }))}
                                            className={`p-4 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer ${isSelected
                                                ? activeColors[t.color]
                                                : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? iconColors[t.color] : 'bg-slate-100 text-slate-400'}`}>
                                                <CalendarIcon />
                                            </div>
                                            <span className="font-semibold text-sm">{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                {isPermitType ? 'Data Permesso *' : 'Date Assenza *'}
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date().toLocaleDateString('en-CA');
                                    setLeaveForm(prev => ({ ...prev, start_date: today, end_date: today }));
                                }}
                                className="text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-medium cursor-pointer"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Solo Oggi
                            </button>
                        </div>

                        {isPermitType ? (
                            /* ── Permit: Data singola + Orari ── */
                            <>
                                <div>
                                    <label className={labelClass}>Giorno *</label>
                                    <input
                                        type="date"
                                        value={leaveForm.start_date}
                                        onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value, end_date: e.target.value }))}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className={labelClass}>Da Ora *</label>
                                        <input
                                            type="time"
                                            value={leaveForm.start_time}
                                            onChange={(e) => setLeaveForm(prev => ({ ...prev, start_time: e.target.value }))}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>A Ora *</label>
                                        <input
                                            type="time"
                                            value={leaveForm.end_time}
                                            onChange={(e) => setLeaveForm(prev => ({ ...prev, end_time: e.target.value }))}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                </div>
                                {leaveForm.start_date && permitHours > 0 && (
                                    <div className="mt-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
                                            {permitHours}h
                                        </div>
                                        <span className="text-purple-800 font-medium text-sm">
                                            Permesso di <strong>{permitHours} {permitHours === 1 ? 'ora' : 'ore'}</strong> — dalle {leaveForm.start_time} alle {leaveForm.end_time}
                                        </span>
                                    </div>
                                )}
                                {leaveForm.start_time && leaveForm.end_time && permitHours <= 0 && (
                                    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                                        ⚠️ L'ora di fine deve essere successiva all'ora di inizio
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Others: Date range ── */
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Dal *</label>
                                    <input
                                        type="date"
                                        value={leaveForm.start_date}
                                        onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Al *</label>
                                    <input
                                        type="date"
                                        value={leaveForm.end_date}
                                        onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <label className={labelClass}>Motivazione (opzionale)</label>
                            <textarea
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                                className={`${inputClass} resize-none`}
                                rows={3}
                                placeholder="Dettagli aggiuntivi..."
                            />
                        </div>

                        {/* Submit Leave */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvataggio...' : 'Invia Richiesta Assenza'}
                        </button>
                    </form>
                )}

                {/* Generic Error */}
                {error && (
                    <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
