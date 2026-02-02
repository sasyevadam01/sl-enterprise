/**
 * SL Enterprise - Leave Calendar Page
 * v2.1 - Gantt Timeline View (Fixed Layout)
 * Calendario visivo delle assenze con viste Giorno/Settimana/Mese
 */
import { useState, useEffect, useMemo } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { Calendar, ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react';

// Helper per giorni della settimana
const WEEKDAYS = ['LU', 'MA', 'ME', 'GI', 'VE', 'SA', 'DO'];
const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

// Codici assenza con colori Gantt-friendly
const LEAVE_CODES = {
    vacation: { code: 'F', label: 'Ferie', color: 'bg-emerald-500', textColor: 'text-white' },
    sick: { code: 'M', label: 'Malattia', color: 'bg-red-500', textColor: 'text-white' },
    permit: { code: 'P', label: 'Permesso', color: 'bg-amber-500', textColor: 'text-black' },
    sudden_permit: { code: 'PI', label: 'Permesso Improvviso', color: 'bg-orange-500', textColor: 'text-white' },
};

// Genera array di giorni in base alla vista
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

// Helper: Calcola i segmenti di assenza per cella
function calculateLeaveSegments(empLeaves, days) {
    const segments = {}; // key: dayIndex, value: { config, isStart, isEnd, isMiddle }

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

    // Build timeline data with segments per day
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Dynamic grid template
    const gridTemplate = `224px repeat(${days.length}, 1fr)`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Calendario Assenze</h1>
                    <p className="text-zinc-400 text-sm">Vista Timeline • {timelineData.length} dipendenti</p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-zinc-800 rounded-xl p-1">
                        <button onClick={() => setViewType('day')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewType === 'day' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-zinc-400 hover:text-white'}`}>Giorno</button>
                        <button onClick={() => setViewType('week')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewType === 'week' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-zinc-400 hover:text-white'}`}>Settimana</button>
                        <button onClick={() => setViewType('month')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewType === 'month' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-zinc-400 hover:text-white'}`}>Mese</button>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1">
                        <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="min-w-[160px] text-center font-semibold text-white px-3">{getLabel()}</span>
                        <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap xl:ml-auto">
                    <Filter className="w-4 h-4 text-zinc-500" />
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="bg-zinc-800 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                        <option value="">Tutti i Reparti</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <select
                        value={filterCoordinator}
                        onChange={(e) => setFilterCoordinator(e.target.value)}
                        className="bg-zinc-800 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                        <option value="">Tutti i Coordinatori</option>
                        {coordinators.map(coord => (
                            <option key={coord.id} value={coord.id}>{coord.last_name} {coord.first_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                {Object.entries(LEAVE_CODES).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${config.color} shadow-sm`}></div>
                        <span className="text-zinc-400 text-sm">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Timeline Grid */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                {/* Header Row */}
                <div
                    className="grid border-b border-white/10 bg-zinc-800/50"
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    <div className="px-4 py-3 border-r border-white/5 flex items-center gap-2 text-zinc-400 text-sm font-medium">
                        <Users className="w-4 h-4" />
                        Dipendente
                    </div>
                    {days.map((day) => (
                        <div
                            key={day.date.toISOString()}
                            className={`text-center py-2 border-r border-white/5 last:border-r-0
                                ${day.isWeekend ? 'bg-zinc-700/30' : ''}`}
                        >
                            <div className="text-xs font-medium text-zinc-300">{day.day}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">{day.weekday}</div>
                        </div>
                    ))}
                </div>

                {/* Data Rows */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {timelineData.length === 0 ? (
                        <div className="text-center py-16 text-zinc-500">
                            Nessun dipendente trovato con i filtri selezionati
                        </div>
                    ) : (
                        timelineData.map((emp, idx) => (
                            <div
                                key={emp.id}
                                className={`grid border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors
                                    ${idx % 2 === 0 ? '' : 'bg-zinc-800/20'}`}
                                style={{ gridTemplateColumns: gridTemplate }}
                            >
                                {/* Employee Info */}
                                <div className="px-4 py-3 border-r border-white/5 bg-zinc-900/50">
                                    <div className="text-white font-medium text-sm truncate">{emp.name}</div>
                                    <div className="text-zinc-500 text-xs truncate">{emp.role || emp.department || '-'}</div>
                                    {emp.totalAbsenceDays > 0 && (
                                        <div className="mt-1 text-[10px] text-emerald-500/70">
                                            {emp.totalAbsenceDays} giorni
                                        </div>
                                    )}
                                </div>

                                {/* Day Cells with Gantt Bars */}
                                {days.map((day, dayIdx) => {
                                    const segment = emp.segments[dayIdx];

                                    return (
                                        <div
                                            key={day.date.toISOString()}
                                            className={`relative h-14 border-r border-white/5 last:border-r-0 flex items-center
                                                ${day.isWeekend ? 'bg-zinc-800/30' : ''}`}
                                        >
                                            {segment ? (
                                                <div
                                                    className={`absolute top-1/2 -translate-y-1/2 h-7 ${segment.config.color}
                                                        flex items-center justify-center
                                                        ${segment.isSingle ? 'left-1 right-1 rounded-md' : ''}
                                                        ${segment.isStart && !segment.isSingle ? 'left-1 right-0 rounded-l-md' : ''}
                                                        ${segment.isEnd && !segment.isSingle ? 'left-0 right-1 rounded-r-md' : ''}
                                                        ${!segment.isStart && !segment.isEnd ? 'left-0 right-0' : ''}
                                                        shadow-md hover:shadow-lg transition-shadow cursor-pointer`}
                                                    title={segment.config.label}
                                                >
                                                    {(segment.isStart || segment.isSingle) && (
                                                        <span className={`text-[10px] font-bold ${segment.config.textColor}`}>
                                                            {segment.config.code}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="w-full text-center text-zinc-700">·</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(LEAVE_CODES).map(([key, config]) => {
                    const count = timelineData.reduce((sum, emp) =>
                        sum + Object.values(emp.segments).filter(s => s.config.code === config.code).length
                        , 0);
                    return (
                        <div key={key} className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded ${config.color}`}></div>
                                <span className="text-zinc-400 text-sm">{config.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{count}</div>
                            <div className="text-zinc-500 text-xs">giorni totali</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
