/**
 * SL Enterprise - Leave Calendar Page
 * Calendario visivo delle assenze con viste Giorno/Settimana/Mese
 */
import { useState, useEffect, useMemo } from 'react';
import { leavesApi, employeesApi } from '../../api/client';

// Helper per giorni della settimana
const WEEKDAYS = ['LU', 'MA', 'ME', 'GI', 'VE', 'SA', 'DO'];
const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

// Codici assenza
const LEAVE_CODES = {
    vacation: { code: 'F', label: 'Ferie', color: 'bg-green-500', textColor: 'text-white' },
    sick: { code: 'M', label: 'Malattia', color: 'bg-red-500', textColor: 'text-white' },
    permit: { code: 'P', label: 'Permesso', color: 'bg-yellow-500', textColor: 'text-black' },
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
        // Trova il lunedì della settimana corrente
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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

export default function LeaveCalendarPage() {
    const [viewType, setViewType] = useState('month'); // 'day', 'week', 'month'
    const [currentDate, setCurrentDate] = useState(new Date());

    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterCoordinator, setFilterCoordinator] = useState('');

    // Fetch data
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

    // Giorni visualizzati
    const days = useMemo(() => getDaysForView(viewType, currentDate), [viewType, currentDate]);

    // Coordinatori (Manager)
    const coordinators = useMemo(() => {
        const managerIds = new Set(employees.flatMap(e => [e.manager_id, e.co_manager_id]).filter(Boolean));
        return employees.filter(e => managerIds.has(e.id)).sort((a, b) => a.last_name.localeCompare(b.last_name));
    }, [employees]);

    // Costruisci matrice assenze
    const calendarMatrix = useMemo(() => {
        const matrix = {};

        // 1. Filtra dipendenti
        let filteredEmps = employees;
        if (filterDepartment) {
            filteredEmps = filteredEmps.filter(e => e.department_name === filterDepartment);
        }
        if (filterCoordinator) {
            const coordId = parseInt(filterCoordinator);
            filteredEmps = filteredEmps.filter(e => e.manager_id === coordId || e.co_manager_id === coordId);
        }

        filteredEmps.forEach(emp => {
            matrix[emp.id] = {
                name: `${emp.last_name} ${emp.first_name}`,
                role: emp.current_role,
                days: {}
            };

            // Trova assenze per questo dipendente
            const empLeaves = leaves.filter(l => l.employee_id === emp.id);

            empLeaves.forEach(leave => {
                const start = new Date(leave.start_date);
                const end = new Date(leave.end_date);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);

                const leaveConfig = LEAVE_CODES[leave.leave_type] || LEAVE_CODES.other;

                // Per ogni giorno visualizzato
                days.forEach(d => {
                    const checkDate = new Date(d.date);
                    checkDate.setHours(0, 0, 0, 0);

                    if (checkDate >= start && checkDate <= end) {
                        matrix[emp.id].days[d.date.getTime()] = leaveConfig;
                    }
                });
            });
        });

        return matrix;
    }, [employees, leaves, days, filterDepartment, filterCoordinator]);

    // Lista unica reparti
    const departments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department_name).filter(Boolean));
        return Array.from(depts).sort();
    }, [employees]);

    // Navigazione
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

        // Week label: "DD Gen - DD Gen"
        const start = days[0].date;
        const end = days[days.length - 1].date;
        return `${start.getDate()} ${MONTHS[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const employeeIds = Object.keys(calendarMatrix).sort((a, b) => {
        const nameA = calendarMatrix[a].name.toLowerCase();
        const nameB = calendarMatrix[b].name.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">🗓️ Calendario</h1>
                <p className="text-gray-400 mt-1">Gestione turni e assenze</p>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 bg-slate-800/50 rounded-xl p-4 border border-white/10">
                {/* View Selector & Navigation */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-slate-700 rounded-lg p-1">
                        <button onClick={() => setViewType('day')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewType === 'day' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}>Giorno</button>
                        <button onClick={() => setViewType('week')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewType === 'week' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}>Settimana</button>
                        <button onClick={() => setViewType('month')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewType === 'month' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}>Mese</button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition">←</button>
                        <span className="min-w-[150px] text-center font-semibold text-white px-2 cursor-default">{getLabel()}</span>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition">→</button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 flex-wrap xl:ml-auto">
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Tutti i Reparti</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <select
                        value={filterCoordinator}
                        onChange={(e) => setFilterCoordinator(e.target.value)}
                        className="bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Tutti i Coordinatori</option>
                        {coordinators.map(coord => (
                            <option key={coord.id} value={coord.id}>{coord.last_name} {coord.first_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 bg-slate-800/30 rounded-xl p-3 border border-white/5">
                {Object.entries(LEAVE_CODES).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${config.color} ${config.textColor}`}>
                            {config.code}
                        </span>
                        <span className="text-gray-400 text-sm">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-auto max-h-[70vh] custom-scrollbar"> {/* Fix: Added max-h and scroll */}
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-indigo-600 to-purple-600">
                                <th className="sticky left-0 z-20 bg-indigo-700 text-white text-left px-4 py-3 min-w-[200px] border-r border-white/20 shadow-lg">
                                    Dipendente
                                </th>
                                {days.map(day => (
                                    <th
                                        key={day.date.toISOString()}
                                        className={`text-white text-center px-1 py-2 text-xs border-r border-white/10 ${viewType === 'day' ? 'w-full' : 'min-w-[40px]'} ${day.isWeekend ? 'bg-indigo-800' : ''
                                            }`}
                                    >
                                        <div className="font-bold text-lg">{day.day}</div>
                                        <div className="font-normal opacity-70 uppercase">{day.weekday}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employeeIds.length === 0 ? (
                                <tr>
                                    <td colSpan={days.length + 1} className="text-center py-12 text-gray-500">
                                        Nessun dipendente trovato con i filtri selezionati
                                    </td>
                                </tr>
                            ) : (
                                employeeIds.map((empId, idx) => {
                                    const emp = calendarMatrix[empId];
                                    return (
                                        <tr
                                            key={empId}
                                            className={`${idx % 2 === 0 ? 'bg-slate-700/30' : 'bg-slate-800/30'} hover:bg-white/5 transition-colors`}
                                        >
                                            <td className="sticky left-0 z-10 bg-slate-800/95 px-4 py-3 border-r border-white/10 shadow-lg">
                                                <div className="text-white font-medium">{emp.name}</div>
                                                <div className="text-gray-500 text-xs truncate max-w-[180px]">{emp.role || '-'}</div>
                                            </td>
                                            {days.map(day => {
                                                const leave = emp.days[day.date.getTime()];
                                                return (
                                                    <td
                                                        key={day.date.toISOString()}
                                                        className={`text-center p-1 border-r border-white/5 ${day.isWeekend ? 'bg-slate-900/40' : ''}`}
                                                    >
                                                        {leave ? (
                                                            <div
                                                                className={`h-8 mx-auto rounded-md flex items-center justify-center text-xs font-bold shadow-sm ${leave.color} ${leave.textColor} ${viewType === 'day' ? 'w-full' : 'w-8'}`}
                                                                title={leave.label}
                                                            >
                                                                {viewType === 'day' ? leave.label : leave.code}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-700">·</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
