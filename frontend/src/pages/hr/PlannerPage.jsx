/**
 * SL Enterprise - Shift Planner V2 (Refactored)
 * Gestione visiva dei turni con logica API ottimizzata.
 * Premium Enterprise Light Mode
 */
import { useState, useEffect, useMemo } from 'react';
import { shiftsApi, factoryApi, leavesApi, employeesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { format, startOfWeek, endOfWeek, addDays, subDays, isSameDay, isSunday, getYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUI } from '../../components/ui/CustomUI';
import TodayAbsencesPanel from '../../components/hr/TodayAbsencesPanel';
import { Calendar, ChevronLeft, ChevronRight, Search, Copy, FileText, Palmtree, Sun, Moon, Sunset, Wrench, BedDouble, X } from 'lucide-react';

// --- HOLIDAY LOGIC (PRESERVED) ---
const getItalianHolidays = (year) => {
    const fixed = [
        new Date(year, 0, 1),   // Capodanno
        new Date(year, 0, 6),   // Epifania
        new Date(year, 3, 25),  // Liberazione
        new Date(year, 4, 1),   // Festa del Lavoro
        new Date(year, 5, 2),   // Festa della Repubblica
        new Date(year, 7, 15),  // Ferragosto
        new Date(year, 10, 1),  // Tutti i Santi
        new Date(year, 11, 8),  // Immacolata
        new Date(year, 11, 25), // Natale
        new Date(year, 11, 26), // Santo Stefano
    ];

    // Easter Calculation
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(year, month, day);
    const easterMonday = addDays(easter, 1);

    return [...fixed, easter, easterMonday];
};

const isHolidayOrSunday = (date, holidays) => {
    if (isSunday(date)) return true;
    // Check if the date (formatted as 'yyyy-MM-dd') exists as a key in the holidays object
    return holidays[format(date, 'yyyy-MM-dd')] !== undefined;
};

export default function PlannerPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [team, setTeam] = useState([]); // List of employees
    const [shifts, setShifts] = useState([]); // List of shift assignments
    const [loading, setLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [coordinatorFilter, setCoordinatorFilter] = useState('all');
    const [nameFilter, setNameFilter] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null); // { employee, date, currentShift }
    const [leaves, setLeaves] = useState([]); // Approved leaves for the week
    const [error, setError] = useState(null);
    const [holidays, setHolidays] = useState({}); // { 'yyyy-mm-dd': 'Nome' }
    const [departments, setDepartments] = useState([]);
    const { showConfirm, toast } = useUI();

    // Calculated state
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    // const year = getYear(currentDate); // No longer needed for local holiday calculation
    // const holidays = useMemo(() => [...getItalianHolidays(year), ...getItalianHolidays(year + 1)], [year]); // No longer needed

    // Data Fetching
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get Team
            const teamRes = await shiftsApi.getMyTeam();
            setTeam(teamRes);

            // Extract Departments
            const depts = [...new Set(teamRes.map(e => e.department_name).filter(Boolean))];
            setDepartments(depts);

            // 2. Get Shifts for range
            const startStr = format(weekStart, 'yyyy-MM-dd');
            const endStr = format(weekEnd, 'yyyy-MM-dd');
            const shiftsRes = await shiftsApi.getShifts(startStr, endStr);
            setShifts(shiftsRes);

            // 3. Get Approved Leaves for range
            try {
                const leaveRes = await leavesApi.getLeaves();
                const approved = leaveRes.filter(l => l.status === 'approved');
                setLeaves(approved);
            } catch (leaveErr) {
                console.warn('Could not load leaves:', leaveErr);
                setLeaves([]);
            }

            // 4. Holidays
            const year = getYear(weekStart);
            const hRes = await shiftsApi.getHolidays(year);
            // If week spans two years (Dec-Jan), fetch next year too?
            // Simplified: fetch current week year
            setHolidays(hRes);

        } catch (err) {
            console.error("Planner Load Error:", err);
            setError("Impossibile caricare i dati dei turni.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentDate]);

    // Derived Data
    // Derived Data
    // const departments = useMemo -> Moved to state set in loadData

    const coordinators = useMemo(() => {
        const coordMap = new Map();

        team.forEach(e => {
            if (e.manager_id && e.manager_name) {
                // Ensure we prefer 'Last Name First Name' format if that's what backend sends
                coordMap.set(e.manager_id, { id: e.manager_id, name: e.manager_name });
            }
            if (e.co_manager_id && e.co_manager_name) {
                coordMap.set(e.co_manager_id, { id: e.co_manager_id, name: e.co_manager_name });
            }
        });

        return Array.from(coordMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [team]);

    const filteredTeam = useMemo(() => {
        let result = team;
        if (departmentFilter !== 'all') {
            result = result.filter(e => e.department_name === departmentFilter);
        }
        if (coordinatorFilter !== 'all') {
            const coordId = parseInt(coordinatorFilter);
            result = result.filter(e => e.manager_id === coordId || e.co_manager_id === coordId);
        }
        if (nameFilter.trim()) {
            const search = nameFilter.toLowerCase().trim();
            result = result.filter(e =>
                (e.first_name?.toLowerCase().includes(search)) ||
                (e.last_name?.toLowerCase().includes(search)) ||
                (`${e.last_name} ${e.first_name}`.toLowerCase().includes(search))
            );
        }
        return result.sort((a, b) => a.last_name.localeCompare(b.last_name));
    }, [team, departmentFilter, coordinatorFilter, nameFilter]);

    // Helpers
    const getShift = (empId, date) => {
        return shifts.find(s =>
            s.employee_id === empId &&
            isSameDay(new Date(s.work_date), date)
        );
    };

    const getShiftStyle = (shift) => {
        if (!shift) return 'bg-slate-50/50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-400';
        switch (shift.shift_type) {
            case 'morning': return 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm shadow-blue-200/50';
            case 'afternoon': return 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm shadow-amber-200/50';
            case 'night': return 'bg-violet-100 border-violet-300 text-violet-800 shadow-sm shadow-violet-200/50';
            case 'manual': return 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm shadow-emerald-200/50';
            case 'off': return 'bg-slate-100 border-slate-300 text-slate-600';
            default: return 'bg-slate-50/50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-400';
        }
    };

    const getShiftLabel = (shift) => {
        if (!shift) return '';
        if (shift.shift_type === 'morning') return '06-14';
        if (shift.shift_type === 'afternoon') return '14-22';
        if (shift.shift_type === 'night') return '22-06';
        if (shift.shift_type === 'manual') return `${shift.start_time?.slice(0, 5)}-${shift.end_time?.slice(0, 5)}`;
        if (shift.shift_type === 'off') return 'RIP';
        return '?';
    };

    // Check if employee has approved leave for a given date
    const getLeaveForEmployee = (empId, date) => {
        return leaves.find(leave => {
            if (leave.employee_id !== empId) return false;
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            // Reset time parts for date comparison
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            const checkDate = new Date(date);
            checkDate.setHours(12, 0, 0, 0); // Midday to avoid timezone issues
            return checkDate >= leaveStart && checkDate <= leaveEnd;
        });
    };

    // Actions
    const handleCopyWeek = async () => {
        const confirmed = await showConfirm({
            title: "Copia Settimana",
            message: "Copiare i turni dalla settimana precedente? Verranno sovrascritti i turni esistenti della settimana corrente.",
            type: "warning",
            confirmText: "Procedi con la Copia"
        });
        if (!confirmed) return;

        try {
            const res = await shiftsApi.copyPreviousWeek(format(weekStart, 'yyyy-MM-dd'));
            toast.success(`Copia completata: ${res.copied} turni copiati.`);
            loadData();
        } catch (err) {
            toast.error("Errore durante la copia dei turni.");
        }
    };

    const handleExportPdf = async () => {
        try {
            // Risolvi ID reparto se filtro attivo
            let deptId = null;
            if (departmentFilter !== 'all') {
                const emp = team.find(e => e.department_name === departmentFilter);
                if (emp) deptId = emp.department_id;
            }

            // Risolvi ID coordinatore se filtro attivo
            let coordId = null;
            if (coordinatorFilter !== 'all') {
                coordId = parseInt(coordinatorFilter);
            }

            const res = await shiftsApi.exportShiftsPdf(
                format(weekStart, 'yyyy-MM-dd'),
                format(weekEnd, 'yyyy-MM-dd'),
                deptId,
                coordId  // NEW: Pass coordinator filter
            );

            // Crea Blob e Link per download
            // 'res' è già il blob grazie all'interceptor (response.data) + responseType: 'blob'
            const blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Turni_${format(weekStart, 'yyyy-MM-dd')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("PDF Export Error", err);
            toast.error("Errore durante la generazione del PDF.");
        }
    };


    // --- COORDINATOR RESTRICTION ---
    const { user } = useAuth();
    const isCoordinator = user?.role === 'coordinator';

    const canNavigateNext = useMemo(() => {
        if (!isCoordinator) return true;
        const today = new Date();
        const nextWeekLimit = addDays(today, 10);
        return weekStart < nextWeekLimit;
    }, [weekStart, isCoordinator]);

    // Navigation Handlers
    const handleNextWeek = () => {
        if (canNavigateNext) {
            setCurrentDate(addDays(currentDate, 7));
        } else {
            toast.warning("Limite di pianificazione raggiunto.");
        }
    };

    const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
    const handleNextDay = () => {
        const nextDay = addDays(currentDate, 1);
        // Coordinator Check logic could be applied here too if strict, but week check covers mostly
        setCurrentDate(nextDay);
    };

    // Mobile Specific: Active Day Data
    const isMobileToday = isSameDay(currentDate, new Date());
    const mobileHoliday = isHolidayOrSunday(currentDate, holidays) ? holidays[format(currentDate, 'yyyy-MM-dd')] || (isSunday(currentDate) ? 'Domenica' : null) : null;

    return (
        <div className="space-y-4 pb-24 md:pb-20">
            {/* --- ABSENCES PANEL (for coordinators) --- */}
            <TodayAbsencesPanel />

            {/* --- HEADER CONTROLS --- */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20 md:static">

                {/* Title & Navigation */}
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div className="hidden md:flex items-center gap-2.5">
                        <Calendar className="w-5 h-5 text-brand-green" />
                        <h1 className="text-xl font-bold text-slate-800">Gestione Turni</h1>
                    </div>

                    {/* MOBILE NAVIGATOR (< Day >) */}
                    <div className="flex md:hidden items-center justify-between w-full bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button onClick={handlePrevDay} className="p-3 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-slate-800 font-bold text-lg capitalize">
                                {format(currentDate, 'EEEE d MMM', { locale: it })}
                            </span>
                            {mobileHoliday && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{mobileHoliday}</span>}
                        </div>
                        <button onClick={handleNextDay} className="p-3 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* DESKTOP NAVIGATOR (< Week >) */}
                    <div className="hidden md:flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="p-2 hover:bg-slate-100 rounded text-slate-600 px-3 transition">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 text-slate-800 font-mono font-bold text-sm bg-white mx-1 rounded border border-slate-200 flex items-center">
                            {format(weekStart, 'd MMM', { locale: it })} - {format(weekEnd, 'd MMM yyyy', { locale: it })}
                        </span>
                        <button onClick={handleNextWeek} className={`p-2 hover:bg-slate-100 rounded text-slate-600 px-3 transition ${!canNavigateNext ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex gap-2 items-center flex-wrap justify-center w-full md:w-auto">
                    <div className="relative w-full md:w-44">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={nameFilter}
                            onChange={e => setNameFilter(e.target.value)}
                            placeholder="Cerca..."
                            className="bg-white text-slate-800 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none w-full placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <select
                            value={departmentFilter}
                            onChange={e => setDepartmentFilter(e.target.value)}
                            className="hidden md:block bg-white text-slate-700 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                        >
                            <option value="all">Reparti</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select
                            value={coordinatorFilter}
                            onChange={e => setCoordinatorFilter(e.target.value)}
                            className="bg-white text-slate-700 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none flex-1 md:flex-none"
                        >
                            <option value="all">Coordinatori</option>
                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Mobile Actions */}
                        <button onClick={handleCopyWeek} className="md:hidden bg-white text-slate-600 px-3 py-2 rounded-lg text-sm border border-slate-300 hover:bg-slate-50 transition">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={handleExportPdf} className="md:hidden bg-white text-red-600 px-3 py-2 rounded-lg text-sm border border-slate-300 hover:bg-red-50 transition">
                            <FileText className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="hidden md:flex gap-2">
                        <button onClick={handleCopyWeek} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm transition font-medium border border-slate-300 flex items-center gap-2">
                            <Copy className="w-4 h-4" /> Copia Sett.
                        </button>

                        <button onClick={handleExportPdf} className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm transition font-medium flex items-center gap-2 border border-slate-300">
                            <FileText className="w-4 h-4" /> PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    {error}
                </div>
            )}

            {/* --- DESKTOP VIEW (TABLE) --- */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-300 overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-b-2 border-brand-green">
                                <th className="p-4 text-left font-bold sticky left-0 bg-slate-700 z-10 w-48 border-r border-slate-600 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                                    DIPENDENTE
                                </th>
                                {weekDays.map(day => {
                                    const isHoliday = isHolidayOrSunday(day, holidays);
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <th key={day.toISOString()} className={`p-3 text-center min-w-[110px] border-r border-slate-600 ${isToday ? 'bg-brand-green/20' : ''} ${isHoliday ? 'bg-red-500/20' : ''}`}>
                                            <div className={`text-xs font-bold uppercase ${isHoliday ? 'text-red-300' : 'text-slate-300'}`}>
                                                {format(day, 'EEE', { locale: it })}
                                            </div>
                                            <div className={`text-lg font-semibold ${isHoliday ? 'text-red-300' : 'text-white'}`}>
                                                {format(day, 'd')}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-400 animate-pulse">Caricamento...</td></tr>
                            ) : filteredTeam.length === 0 ? (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-400">Nessun dipendente trovato.</td></tr>
                            ) : (
                                filteredTeam.map((emp, idx) => (
                                    <tr key={emp.id} className={`group hover:bg-blue-50/60 transition-colors ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.06)] transition-colors border-l-4 border-l-brand-green ${idx % 2 === 1 ? 'bg-slate-50 group-hover:bg-blue-50/60' : 'bg-white group-hover:bg-blue-50/60'}`}>
                                            <div className="font-bold text-slate-800 truncate">{emp.last_name}</div>
                                            <div className="text-slate-400 text-xs truncate">{emp.first_name}</div>
                                            {emp.department_name !== 'N/D' && (
                                                <div className="text-[10px] text-brand-green mt-0.5 truncate">{emp.department_name}</div>
                                            )}
                                        </td>
                                        {weekDays.map(day => {
                                            const dayKey = format(day, 'yyyy-MM-dd');

                                            // Holiday Logic
                                            const holidayName = holidays[dayKey];
                                            if (holidayName) {
                                                return (
                                                    <td key={dayKey} className="p-2 border-r border-slate-200 bg-red-50 relative h-16 pointer-events-none">
                                                        <div className="flex items-center justify-center h-full text-red-500 font-bold text-xs uppercase tracking-wider">
                                                            {holidayName}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            const shift = getShift(emp.id, day);
                                            const leave = getLeaveForEmployee(emp.id, day);

                                            // Non-breaking check for sunday style
                                            const isSunday = day.getDay() === 0;

                                            return (
                                                <td key={dayKey} className={`p-1.5 border-r border-slate-200 relative ${isSunday ? 'bg-red-50/30' : ''}`}>

                                                    {/* Leave Indicator */}
                                                    {leave && (
                                                        <div
                                                            className="absolute top-0.5 right-0.5 z-10"
                                                            title={`${leave.leave_type}: ${leave.employee_name || ''}`}
                                                        >
                                                            <span className="bg-sky-100 text-sky-600 text-[8px] px-1 py-0.5 rounded font-bold flex items-center">
                                                                <Palmtree className="w-2.5 h-2.5" />
                                                            </span>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => setSelectedSlot({ employee: emp, date: day, currentShift: shift, weekDays })}
                                                        className={`w-full h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-[1.03] ${leave ? 'bg-sky-100 border-sky-300 text-sky-700 shadow-sm shadow-sky-200/50' : getShiftStyle(shift)} relative z-0`}
                                                    >
                                                        {leave ? (
                                                            <>
                                                                <Palmtree className="w-4 h-4" />
                                                                <span className="text-[10px] opacity-70 truncate max-w-full px-1">
                                                                    {leave.leave_type === 'vacation' ? 'Ferie' :
                                                                        leave.leave_type === 'sick' ? 'Malattia' :
                                                                            leave.leave_type === 'permit' ? 'Permesso' :
                                                                                leave.leave_type === 'sudden_permit' ? 'Improv.' :
                                                                                    leave.leave_type?.slice(0, 6) || 'Assenza'}
                                                                </span>
                                                            </>
                                                        ) : shift ? (
                                                            <>
                                                                <span className="font-bold text-sm leading-none">
                                                                    {shift.shift_type === 'morning' && 'M'}
                                                                    {shift.shift_type === 'afternoon' && 'P'}
                                                                    {shift.shift_type === 'night' && 'N'}
                                                                    {shift.shift_type === 'manual' && 'C'}
                                                                    {shift.shift_type === 'off' && '—'}
                                                                </span>
                                                                <span className="text-[10px] opacity-60 leading-none">{getShiftLabel(shift)}</span>
                                                                {shift.banchina_code && (
                                                                    <span className="text-[9px] font-mono text-cyan-700 leading-none mt-0.5 border border-cyan-200 px-1 rounded bg-cyan-50">
                                                                        {shift.banchina_code}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xl opacity-0 group-hover:opacity-30 hover:!opacity-60 transition text-slate-400">+</span>
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MOBILE VIEW (LIST) --- */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 animate-pulse">Caricamento...</div>
                ) : filteredTeam.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">Nessuno trovato.</div>
                ) : (
                    filteredTeam.map(emp => {
                        const shift = getShift(emp.id, currentDate);
                        const leave = getLeaveForEmployee(emp.id, currentDate);

                        return (
                            <div
                                key={emp.id}
                                onClick={() => setSelectedSlot({ employee: emp, date: currentDate, currentShift: shift, weekDays })}
                                className="bg-white rounded-xl p-4 border border-slate-200 shadow-card active:scale-[0.98] transition-transform flex items-center justify-between gap-4 cursor-pointer"
                            >
                                {/* User Info */}
                                <div className="min-w-0">
                                    <h3 className="text-slate-800 font-bold text-lg truncate pr-2">
                                        {emp.last_name} {emp.first_name}
                                    </h3>
                                    <p className="text-brand-green text-xs truncate">{emp.department_name || 'N/D'}</p>
                                </div>

                                {/* Status Indicator */}
                                <div className={`shrink-0 px-4 py-2 rounded-lg border min-w-[90px] text-center flex flex-col items-center justify-center ${leave ? 'bg-sky-50 border-sky-200 text-sky-700' : getShiftStyle(shift)
                                    }`}>
                                    {leave ? (
                                        <>
                                            <Palmtree className="w-5 h-5" />
                                            <span className="text-[10px] font-bold uppercase">{leave.leave_type === 'vacation' ? 'Ferie' : 'Assenza'}</span>
                                        </>
                                    ) : shift ? (
                                        <>
                                            <span className="text-lg font-black block">
                                                {shift.shift_type === 'morning' && '06-14'}
                                                {shift.shift_type === 'afternoon' && '14-22'}
                                                {shift.shift_type === 'night' && '22-06'}
                                                {shift.shift_type === 'manual' && 'Custom'}
                                                {shift.shift_type === 'off' && 'Riposo'}
                                            </span>
                                            {shift.shift_type === 'manual' && <span className="text-[10px]">{getShiftLabel(shift)}</span>}
                                            {shift.banchina_code && (
                                                <span className="text-[9px] font-mono font-bold text-cyan-700 mt-1 block">
                                                    {shift.banchina_code}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-slate-400 font-bold text-sm">+ Assegna</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {
                selectedSlot && (
                    <AssignShiftModal
                        slot={selectedSlot}
                        team={team}
                        leaves={leaves}
                        onClose={() => setSelectedSlot(null)}
                        onSuccess={() => { setSelectedSlot(null); loadData(); }}
                    />
                )
            }
        </div >
    );
}

function AssignShiftModal({ slot, team, leaves = [], onClose, onSuccess }) {
    const { showConfirm, toast } = useUI();
    const [type, setType] = useState(slot.currentShift?.shift_type || 'morning');
    const [start, setStart] = useState(slot.currentShift?.start_time || '08:00');
    const [end, setEnd] = useState(slot.currentShift?.end_time || '17:00');

    // Split State: Banchina & Requirement
    const [selectedBanchinaId, setSelectedBanchinaId] = useState('');
    const [requirementId, setRequirementId] = useState(slot.currentShift?.requirement_id || '');

    const [notes, setNotes] = useState(slot.currentShift?.notes || '');
    const [allWeek, setAllWeek] = useState(true);
    const [loading, setLoading] = useState(false);

    // Get Coordinator Name
    const coordinator = useMemo(() => {
        const mgrId = slot.employee.manager_id || slot.employee.co_manager_id;
        if (!mgrId) return null;
        return team?.find(e => e.id === mgrId);
    }, [slot.employee, team]);

    // Data State
    const [banchine, setBanchine] = useState([]);
    const [requirements, setRequirements] = useState([]);

    const [debugError, setDebugError] = useState(null);

    // Load Data
    useEffect(() => {
        Promise.all([
            employeesApi.getBanchine(),
            factoryApi.getRequirements()
        ]).then(([banchineData, reqsData]) => {
            setBanchine(banchineData);
            setRequirements(reqsData);

            // Auto-Assignment Logic (only for NEW shifts)
            if (!slot.currentShift) {
                // 1. Determine Banchina
                let targetBanchinaId = '';
                if (slot.employee.default_banchina_id) {
                    targetBanchinaId = slot.employee.default_banchina_id;
                } else {
                    // Fallback to "Cortile"
                    const cortile = banchineData.find(b => b.code === 'CORTILE');
                    if (cortile) targetBanchinaId = cortile.id;
                }

                if (targetBanchinaId) {
                    setSelectedBanchinaId(String(targetBanchinaId));

                    // 2. Determine Role/Requirement (if Banchina set)
                    // Try current_role first, then secondary_role
                    const employeeRole = slot.employee.current_role || slot.employee.secondary_role;
                    if (employeeRole) {
                        // First try exact match, then partial match (for coordinators)
                        let match = reqsData.find(r =>
                            parseInt(r.banchina_id) === parseInt(targetBanchinaId) &&
                            r.role_name.toLowerCase() === employeeRole.toLowerCase()
                        );

                        // If no exact match, try partial match (role contains or is contained in employee role)
                        if (!match) {
                            const roleLower = employeeRole.toLowerCase();
                            match = reqsData.find(r =>
                                parseInt(r.banchina_id) === parseInt(targetBanchinaId) &&
                                (roleLower.includes(r.role_name.toLowerCase()) ||
                                    r.role_name.toLowerCase().includes(roleLower))
                            );
                        }

                        if (match) setRequirementId(String(match.id));
                    }
                }
            } else if (slot.currentShift.requirement_id) {
                // Edit Mode: Find Banchina from existing Requirement
                const existReq = reqsData.find(r => r.id === slot.currentShift.requirement_id);
                if (existReq) {
                    setSelectedBanchinaId(existReq.banchina_id);
                }
            } else {
                // Edit Mode (Legacy/Missing Requirement): Default to Employee Banchina or Cortile
                let targetBanchinaId = '';
                if (slot.employee.default_banchina_id) {
                    targetBanchinaId = slot.employee.default_banchina_id;
                } else {
                    const cortile = banchineData.find(b => b.code === 'CORTILE');
                    if (cortile) targetBanchinaId = cortile.id;
                }
                if (targetBanchinaId) setSelectedBanchinaId(String(targetBanchinaId));
            }
        }).catch(console.error);
    }, []); // End mount effect

    // Auto-Select Role when Banchina changes (or is set initially)
    useEffect(() => {
        if (!selectedBanchinaId || requirementId || !slot?.employee) return;

        const employeeRole = slot.employee.current_role || slot.employee.secondary_role;
        if (!employeeRole) return;

        const roleLower = employeeRole.toLowerCase();

        // Filter reqs for this banchina
        const candidates = requirements.filter(r => String(r.banchina_id) === String(selectedBanchinaId));

        // 1. Exact Match
        let match = candidates.find(r => r.role_name.toLowerCase() === roleLower);

        // 2. Partial Match
        if (!match) {
            match = candidates.find(r =>
                roleLower.includes(r.role_name.toLowerCase()) ||
                r.role_name.toLowerCase().includes(roleLower)
            );
        }

        // 3. Singular/Plural Naive (remove last char)
        if (!match) {
            const roleStem = roleLower.length > 3 ? roleLower.slice(0, -1) : roleLower;
            match = candidates.find(r => {
                const rName = r.role_name.toLowerCase();
                const rStem = rName.length > 3 ? rName.slice(0, -1) : rName;
                return roleStem.includes(rStem) || rStem.includes(roleStem);
            });
        }

        // 4. Fallback: If no match, pick "Magazziniere" or "Operatore" or First Available
        if (!match && candidates.length > 0) {
            match = candidates.find(r =>
                r.role_name.toLowerCase().includes('magazziniere') ||
                r.role_name.toLowerCase().includes('operatore')
            );
            // If still no match (e.g. only "Coordinatore"), take the first one?
            // Better to take the first one than nothing, to unblock the user.
            if (!match) match = candidates[0];
        }

        if (match) {
            setRequirementId(String(match.id));
        }

    }, [selectedBanchinaId, requirements, slot]);

    // Force check allWeek on mount (User Feedback Fix)
    useEffect(() => {
        setAllWeek(true);
    }, []);

    // Filtered Requirements based on Selected Banchina
    const filteredRequirements = useMemo(() => {
        if (!selectedBanchinaId) return [];
        return requirements.filter(r => String(r.banchina_id) === String(selectedBanchinaId));
    }, [selectedBanchinaId, requirements]);

    // Validation
    const isValid = useMemo(() => {
        if (type === 'off') return true;

        // Validation: Must select Banchina AND Role (if not off)
        if (!selectedBanchinaId) return false;

        // Assuming every role needs a requirement ID if not 'off'
        return !!requirementId;
    }, [type, selectedBanchinaId, requirementId]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payloadBase = {
                employee_id: slot.employee.id,
                shift_type: type,
                start_time: type === 'manual' ? start : null,
                end_time: type === 'manual' ? end : null,
                requirement_id: requirementId ? parseInt(requirementId) : null,
                notes: notes
            };

            // Helper to check if employee has leave on a specific date
            const hasLeaveOnDate = (date) => {
                return leaves.some(leave => {
                    if (leave.employee_id !== slot.employee.id) return false;
                    const leaveStart = new Date(leave.start_date);
                    const leaveEnd = new Date(leave.end_date);
                    leaveStart.setHours(0, 0, 0, 0);
                    leaveEnd.setHours(23, 59, 59, 999);
                    const checkDate = new Date(date);
                    checkDate.setHours(12, 0, 0, 0);
                    return checkDate >= leaveStart && checkDate <= leaveEnd;
                });
            };

            if (allWeek && slot.weekDays) {
                // Filter out Sundays (0), SATURDAYS (6), and days with approved leaves
                const daysToAssign = slot.weekDays.filter(d => {
                    const dayNum = d.getDay();
                    const isWeekend = dayNum === 0 || dayNum === 6; // 0=Sun, 6=Sat
                    return !isWeekend && !hasLeaveOnDate(d);
                });
                const skippedLeaves = slot.weekDays.filter(d => {
                    const dayNum = d.getDay();
                    return (dayNum !== 0 && dayNum !== 6) && hasLeaveOnDate(d);
                }).length;

                for (const d of daysToAssign) {
                    await shiftsApi.assignShift({ ...payloadBase, work_date: format(d, 'yyyy-MM-dd') });
                }

                if (skippedLeaves > 0) {
                    toast.warning(`Turni assegnati! ${skippedLeaves} giorno/i saltato/i perché in ferie/permesso.`);
                }
            } else {
                // Single day - warn if on leave but allow
                if (hasLeaveOnDate(slot.date)) {
                    const confirmed = await showConfirm({
                        title: "Attenzione: Assenza presente",
                        message: "Questo dipendente ha già un permesso/feria approvata per questo giorno. Vuoi comunque assegnare il turno?",
                        type: "warning",
                        confirmText: "Assegna Comunque",
                        cancelText: "Annulla"
                    });
                    if (!confirmed) {
                        setLoading(false);
                        return;
                    }
                }
                await shiftsApi.assignShift({ ...payloadBase, work_date: format(slot.date, 'yyyy-MM-dd') });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error("Errore durante il salvataggio.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-50 rounded-2xl w-full max-w-md shadow-2xl shadow-slate-900/20 max-h-[90vh] overflow-y-auto border border-slate-300" onClick={e => e.stopPropagation()}>

                {/* ── Dark Header Strip ── */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {slot.employee.first_name} {slot.employee.last_name}
                            </h3>
                            <div className="text-xs mt-1.5 space-y-0.5">
                                <p><span className="text-slate-400">Reparto:</span> <span className="text-emerald-300 font-medium">{slot.employee.department_name || 'N/D'}</span></p>
                                <p>
                                    <span className="text-slate-400">Coord:</span>
                                    <span className="text-amber-300 ml-1 font-medium">
                                        {coordinator ? `${coordinator.last_name} ${coordinator.first_name}` : 'Nessuno'}
                                    </span>
                                </p>
                            </div>
                            <p className="text-emerald-300 text-sm capitalize mt-2 border-t border-white/10 pt-2 font-medium">{format(slot.date, 'EEEE d MMMM', { locale: it })}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-5 space-y-4">

                    {/* All Week Toggle */}
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={allWeek} onChange={e => setAllWeek(e.target.checked)} className="w-5 h-5 accent-brand-green rounded" />
                            <span className="text-sm font-semibold text-blue-800">Applica a tutta la settimana</span>
                        </label>
                        <p className="text-xs text-blue-600 mt-1 ml-8">Esclude automaticamente <b>Sabato</b> e <b>Domenica</b>.</p>
                    </div>

                    {/* Shift Type Grid — Radio Cards */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'morning', label: 'Mattina', sub: '06-14', icon: Sun, activeBg: 'bg-blue-100', activeBorder: 'border-blue-500', activeText: 'text-blue-800' },
                            { id: 'afternoon', label: 'Pomeriggio', sub: '14-22', icon: Sunset, activeBg: 'bg-amber-100', activeBorder: 'border-amber-500', activeText: 'text-amber-800' },
                            { id: 'night', label: 'Notte', sub: '22-06', icon: Moon, activeBg: 'bg-violet-100', activeBorder: 'border-violet-500', activeText: 'text-violet-800' },
                        ].map(opt => {
                            const Icon = opt.icon;
                            const isActive = type === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setType(opt.id)}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${isActive
                                        ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-md`
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                                >
                                    <Icon className={`w-4 h-4 mb-1 ${isActive ? '' : 'text-slate-400'}`} />
                                    <div className="font-bold text-sm">{opt.label}</div>
                                    <div className="text-[10px] opacity-60">{opt.sub}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setType('manual')}
                            className={`p-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${type === 'manual'
                                ? 'bg-emerald-100 border-emerald-500 text-emerald-800 shadow-md'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                            <Wrench className="w-4 h-4" />
                            <span className="font-bold text-sm">Custom</span>
                        </button>
                        <button
                            onClick={() => setType('off')}
                            className={`p-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${type === 'off'
                                ? 'bg-slate-200 border-slate-500 text-slate-800 shadow-md'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                            <BedDouble className="w-4 h-4" />
                            <span className="font-bold text-sm">Riposo</span>
                        </button>
                    </div>

                    {/* SATURDAY PRESET */}
                    <button
                        onClick={() => { setType('manual'); setStart('07:30'); setEnd('12:00'); }}
                        className="w-full p-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                        <Sun className="w-4 h-4" />
                        Sabato (07:30 - 12:00)
                    </button>

                    {/* Manual Time Inputs */}
                    {type === 'manual' && (
                        <div className="flex gap-4 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <div className="flex-1">
                                <label className="text-xs text-emerald-700 block mb-1 font-medium">Inizio</label>
                                <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-white border-2 border-emerald-200 rounded-lg p-2 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none" />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-emerald-700 block mb-1 font-medium">Fine</label>
                                <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-white border-2 border-emerald-200 rounded-lg p-2 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none" />
                            </div>
                        </div>
                    )}

                    {/* Banchina Select */}
                    <div>
                        <label className="text-xs text-slate-600 block mb-1.5 ml-1 font-semibold uppercase tracking-wider">Banchina <span className="text-red-500">*</span></label>
                        <select
                            value={String(selectedBanchinaId)}
                            onChange={e => {
                                setSelectedBanchinaId(e.target.value);
                                setRequirementId('');
                            }}
                            className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                        >
                            <option value="">-- Seleziona Banchina --</option>
                            {banchine.map(b => (
                                <option key={b.id} value={String(b.id)}>Banchina {b.code}</option>
                            ))}
                        </select>
                    </div>

                    {/* Machine/Role Select (Filtered) */}
                    <div>
                        <label className="text-xs text-slate-600 block mb-1.5 ml-1 font-semibold uppercase tracking-wider">Macchina / Ruolo <span className="text-red-500">*</span></label>
                        <select
                            value={requirementId}
                            onChange={e => setRequirementId(e.target.value)}
                            disabled={!selectedBanchinaId}
                            className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                            <option value="">-- Seleziona Ruolo --</option>
                            {filteredRequirements.map(r => (
                                <option key={r.id} value={r.id}>{r.role_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs text-slate-600 block mb-1.5 ml-1 font-semibold uppercase tracking-wider">Note</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Note opzionali..."
                            className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-slate-800 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* ── Footer — Dark Bar ── */}
                <div className="bg-slate-800 rounded-b-2xl p-4 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-400 transition font-semibold text-sm">
                        Annulla
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !isValid}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-base uppercase tracking-wide transition-all ${isValid && !loading
                            ? 'text-white shadow-lg shadow-green-900/40 hover:brightness-110'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'}`}
                        style={isValid && !loading ? { backgroundColor: '#16a34a' } : {}}
                    >
                        {loading ? '...' : (isValid ? '✓ Salva Turno' : 'Compila campi')}
                    </button>
                </div>
            </div>
        </div>
    );
}
