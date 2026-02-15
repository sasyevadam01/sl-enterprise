/**
 * SL Enterprise - Leave Calendar Page
 * v3.0 - Premium Enterprise Light Mode
 * Calendario visivo delle assenze con viste Giorno/Settimana/Mese
 */
import { useState, useEffect, useMemo } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { Calendar, ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react';

const WEEKDAYS = ['LU', 'MA', 'ME', 'GI', 'VE', 'SA', 'DO'];
const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const LEAVE_CODES = {
    vacation: { code: 'F', label: 'Ferie', color: 'bg-emerald-500', textColor: 'text-white', statText: 'text-emerald-600' },
    sick: { code: 'M', label: 'Malattia', color: 'bg-red-500', textColor: 'text-white', statText: 'text-red-600' },
    permit: { code: 'P', label: 'Permesso', color: 'bg-amber-500', textColor: 'text-black', statText: 'text-amber-600' },
    sudden_permit: { code: 'PI', label: 'Permesso Improvviso', color: 'bg-orange-500', textColor: 'text-white', statText: 'text-orange-600' },
};

function getDaysForView(viewType, date) {
    const days = [];
    const year = date.getFullYear();
    const month = date.getMonth();

    if (viewType === 'month') {
        const lastDay = new Date(year, month + 1, 0);
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const current = new Date(year, month, d);
            days.push({
                day: d,
                weekday: WEEKDAYS[current.getDay() === 0 ? 6 : current.getDay() - 1],
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                date: current
            });
        }
    } else if (viewType === 'week') {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const current = new Date(monday);
            current.setDate(monday.getDate() + i);
            days.push({
                day: current.getDate(),
                weekday: WEEKDAYS[current.getDay() === 0 ? 6 : current.getDay() - 1],
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                date: current
            });
        }
    } else if (viewType === 'day') {
        days.push({
            day: date.getDate(),
            weekday: WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1],
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            date: new Date(date)
        });
    }

    return days;
}

function calculateLeaveSegments(empLeaves, days) {
    const segments = {};

    empLeaves.forEach(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);

        const leaveConfig = LEAVE_CODES[leave.leave_type] || LEAVE_CODES.vacation;

        days.forEach((d, idx) => {
            const checkDate = new Date(d.date);
            checkDate.setHours(0, 0, 0, 0);

            if (checkDate >= leaveStart && checkDate <= leaveEnd) {
                const isStart = checkDate.getTime() === leaveStart.getTime();
                const isEnd = checkDate.getTime() === leaveEnd.getTime();
                const isSingle = isStart && isEnd;

                segments[idx] = {
                    config: leaveConfig,
                    isStart,
                    isEnd,
                    isSingle,
                    leaveId: leave.id
                };
            }
        });
    });

    return segments;
}

export default function LeaveCalendarPage() {
    const [viewType, setViewType] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterCoordinator, setFilterCoordinator] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leavesData, empsData] = await Promise.all([
                    leavesApi.getLeaves({ status_filter: 'approved' }),
                    employeesApi.getEmployees()
                ]);
                setLeaves(leavesData);
                setEmployees(empsData.filter(e => e.is_active));
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const days = useMemo(() => getDaysForView(viewType, currentDate), [viewType, currentDate]);

    const coordinators = useMemo(() => {
        const managerIds = new Set(employees.flatMap(e => [e.manager_id, e.co_manager_id]).filter(Boolean));
        return employees.filter(e => managerIds.has(e.id)).sort((a, b) => a.last_name.localeCompare(b.last_name));
    }, [employees]);

    const timelineData = useMemo(() => {
        const data = [];

        let filteredEmps = employees;
        if (filterDepartment) {
            filteredEmps = filteredEmps.filter(e => e.department_name === filterDepartment);
        }
        if (filterCoordinator) {
            const coordId = parseInt(filterCoordinator);
            filteredEmps = filteredEmps.filter(e => e.manager_id === coordId || e.co_manager_id === coordId);
        }

        filteredEmps = [...filteredEmps].sort((a, b) =>
            `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        );

        filteredEmps.forEach(emp => {
            const empLeaves = leaves.filter(l => l.employee_id === emp.id);
            const segments = calculateLeaveSegments(empLeaves, days);
            const totalAbsenceDays = Object.keys(segments).length;

            data.push({
                id: emp.id,
                name: `${emp.last_name} ${emp.first_name}`,
                role: emp.current_role,
                department: emp.department_name,
                segments,
                totalAbsenceDays
            });
        });

        return data;
    }, [employees, leaves, days, filterDepartment, filterCoordinator]);

    const departments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department_name).filter(Boolean));
        return Array.from(depts).sort();
    }, [employees]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (viewType === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (viewType === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const getLabel = () => {
        if (viewType === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (viewType === 'day') return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const start = days[0]?.date;
        const end = days[days.length - 1]?.date;
        if (!start || !end) return '';
        return `${start.getDate()} ${MONTHS[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const gridTemplate = `224px repeat(${days.length}, 1fr)`;

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Calendario Assenze</h1>
                        <p className="text-slate-500 text-sm">Vista Timeline • {timelineData.length} dipendenti</p>
                    </div>
                </div>
                <a
                    href="/hr/events/new?tab=leave"
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all cursor-pointer text-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuova Richiesta
                </a>
            </div>

            {/* ── Controls Bar ── */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setViewType('day')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${viewType === 'day' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Giorno</button>
                        <button onClick={() => setViewType('week')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${viewType === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Settimana</button>
                        <button onClick={() => setViewType('month')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${viewType === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Mese</button>
                    </div>

                    {/* Date Navigator */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button onClick={handlePrev} className="p-2 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 transition-all cursor-pointer">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="min-w-[160px] text-center font-semibold text-slate-900 px-3">{getLabel()}</span>
                        <button onClick={handleNext} className="p-2 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 transition-all cursor-pointer">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap xl:ml-auto">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                    >
                        <option value="">Tutti i Reparti</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <select
                        value={filterCoordinator}
                        onChange={(e) => setFilterCoordinator(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                    >
                        <option value="">Tutti i Coordinatori</option>
                        {coordinators.map(coord => (
                            <option key={coord.id} value={coord.id}>{coord.last_name} {coord.first_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex flex-wrap gap-5 bg-white rounded-xl p-3 px-5 border border-slate-200 shadow-sm">
                {Object.entries(LEAVE_CODES).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${config.color}`}></div>
                        <span className="text-slate-600 text-sm font-medium">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Timeline Grid ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Row */}
                <div
                    className="grid border-b border-slate-200 bg-slate-50"
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    <div className="px-4 py-3 border-r border-slate-300 flex items-center gap-2 text-slate-500 text-sm font-semibold">
                        <Users className="w-4 h-4" />
                        Dipendente
                    </div>
                    {days.map((day) => (
                        <div
                            key={day.date.toISOString()}
                            className={`text-center py-2 border-r border-slate-300 last:border-r-0
                                ${day.isWeekend ? 'bg-amber-100' : ''}`}
                        >
                            <div className="text-xs font-semibold text-slate-700">{day.day}</div>
                            <div className="text-[10px] text-slate-400 uppercase">{day.weekday}</div>
                        </div>
                    ))}
                </div>

                {/* Data Rows */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {timelineData.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            Nessun dipendente trovato con i filtri selezionati
                        </div>
                    ) : (
                        timelineData.map((emp, idx) => (
                            <div
                                key={emp.id}
                                className={`grid border-b border-slate-300 last:border-b-0 hover:bg-blue-50/30 transition-colors
                                    ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                style={{ gridTemplateColumns: gridTemplate }}
                            >
                                {/* Employee Info */}
                                <div className="px-4 py-3 border-r border-slate-300 bg-white">
                                    <div className="text-slate-800 font-semibold text-sm truncate">{emp.name}</div>
                                    <div className="text-slate-400 text-xs truncate">{emp.role || emp.department || '-'}</div>
                                </div>

                                {/* Day Cells with Gantt Bars */}
                                {days.map((day, dayIdx) => {
                                    const segment = emp.segments[dayIdx];

                                    return (
                                        <div
                                            key={day.date.toISOString()}
                                            className={`relative h-14 border-r border-slate-300 last:border-r-0 flex items-center
                                                ${day.isWeekend ? 'bg-amber-100' : ''}`}
                                        >
                                            {segment ? (
                                                <div
                                                    className={`absolute top-1/2 -translate-y-1/2 h-7 ${segment.config.color}
                                                        flex items-center justify-center
                                                        ${segment.isSingle ? 'left-1 right-1 rounded-md' : ''}
                                                        ${segment.isStart && !segment.isSingle ? 'left-1 right-0 rounded-l-md' : ''}
                                                        ${segment.isEnd && !segment.isSingle ? 'left-0 right-1 rounded-r-md' : ''}
                                                        ${!segment.isStart && !segment.isEnd ? 'left-0 right-0' : ''}
                                                        shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                                                    title={segment.config.label}
                                                >
                                                    {(segment.isStart || segment.isSingle) && (
                                                        <span className={`text-[10px] font-bold ${segment.config.textColor}`}>
                                                            {segment.config.code}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Stats Footer ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(LEAVE_CODES).map(([key, config]) => {
                    const count = timelineData.reduce((sum, emp) =>
                        sum + Object.values(emp.segments).filter(s => s.config.code === config.code).length
                        , 0);
                    return (
                        <div key={key} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded ${config.color}`}></div>
                                <span className="text-slate-500 text-sm font-medium">{config.label}</span>
                            </div>
                            <div className={`text-2xl font-bold ${config.statText}`}>{count}</div>
                            <div className="text-slate-400 text-xs">giorni totali</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
