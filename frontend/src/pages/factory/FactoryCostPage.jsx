import { useState, useEffect } from 'react';
import { factoryApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';

export default function FactoryCostPage() {
    const [dateRange, setDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
    });

    // Rates
    const [hourlyRate, setHourlyRate] = useState(18.00);
    const [saturdayRate, setSaturdayRate] = useState(11.00); // Standard reduced rate for Saturday

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Accordion State: storing open department names
    const [openDepartments, setOpenDepartments] = useState({});

    const { toast } = useUI();

    useEffect(() => {
        loadCosts();
    }, [dateRange]);

    const loadCosts = async () => {
        setLoading(true);
        try {
            const startStr = format(dateRange.start, 'yyyy-MM-dd');
            const endStr = format(dateRange.end, 'yyyy-MM-dd');

            const data = await factoryApi.getCostReport(startStr, endStr);
            setReportData(data);

            // Initialize all departments as open by default
            const initialOpenState = {};
            data.forEach(d => initialOpenState[d.department] = true);
            setOpenDepartments(initialOpenState);

        } catch (err) {
            console.error(err);
            toast.error("Errore caricamento costi.");
        } finally {
            setLoading(false);
        }
    };

    const toggleDepartment = (deptName) => {
        setOpenDepartments(prev => ({
            ...prev,
            [deptName]: !prev[deptName]
        }));
    };

    const handlePreviousWeek = () => {
        setDateRange(prev => ({
            start: subWeeks(prev.start, 1),
            end: subWeeks(prev.end, 1)
        }));
    };

    const handleNextWeek = () => {
        setDateRange(prev => ({
            start: addWeeks(prev.start, 1),
            end: addWeeks(prev.end, 1)
        }));
    };

    // --- CALCULATIONS ---
    // reportData struct: { department, total_hours_weekday, total_hours_saturday, employees: [ { name, hours_weekday, hours_saturday } ] }

    const totalHoursWeekday = reportData.reduce((sum, item) => sum + item.total_hours_weekday, 0);
    const totalHoursSaturday = reportData.reduce((sum, item) => sum + item.total_hours_saturday, 0);

    const costWeekday = totalHoursWeekday * hourlyRate;
    const costSaturday = totalHoursSaturday * saturdayRate;
    const grandTotalCost = costWeekday + costSaturday;

    return (
        <div className="p-6 space-y-6 text-white min-h-screen pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-white/10 shadow-xl">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        💰 Analisi Costi Reparto
                    </h1>
                    <p className="text-gray-400 mt-1">Stima costi settimanali (Lun-Ven + Sabato)</p>
                </div>

                {/* Date Controls */}
                <div className="flex items-center bg-slate-700/50 rounded-lg p-1 border border-white/5">
                    <button onClick={handlePreviousWeek} className="p-2 hover:bg-slate-600 rounded text-gray-300">◀</button>
                    <span className="px-3 text-sm font-mono border-l border-r border-white/10 min-w-[150px] text-center">
                        {format(dateRange.start, 'd MMM', { locale: it })} - {format(dateRange.end, 'd MMM yyyy', { locale: it })}
                    </span>
                    <button onClick={handleNextWeek} className="p-2 hover:bg-slate-600 rounded text-gray-300">▶</button>
                </div>
            </div>

            {/* Inputs & Big Totals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Rate: Weekday */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Tariffa Lun-Ven (€)</label>
                    <input
                        type="number" step="0.5"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xl font-bold text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* Rate: Saturday */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-orange-500/30 shadow-lg relative overflow-hidden">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Tariffa Sabato (€)</label>
                    <input
                        type="number" step="0.5"
                        value={saturdayRate}
                        onChange={(e) => setSaturdayRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xl font-bold text-orange-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>

                {/* Detail Totals */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-white/10 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Ore Feriali</span>
                        <span className="font-mono text-blue-300">{totalHoursWeekday.toLocaleString('it-IT')} h</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Ore Sabato</span>
                        <span className="font-mono text-orange-300">{totalHoursSaturday.toLocaleString('it-IT')} h</span>
                    </div>
                    <div className="h-px bg-white/10 my-2"></div>
                    <div className="text-xs text-gray-500 text-right">Totale Ore: {(totalHoursWeekday + totalHoursSaturday).toLocaleString('it-IT')}</div>
                </div>

                {/* GRAND TOTAL */}
                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-20"><span className="text-7xl">💶</span></div>
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider relative z-10">Costo Totale Settimana</span>
                    <div className="text-3xl font-bold text-white mt-1 relative z-10">
                        € {grandTotalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">Calcolo costi in corso...</div>
                ) : reportData.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 bg-slate-800 rounded-2xl">Nessun dato per questa settimana.</div>
                ) : (
                    reportData.map((deptData, idx) => {
                        const isOpen = openDepartments[deptData.department];
                        const deptCostWeekday = deptData.total_hours_weekday * hourlyRate;
                        const deptCostSaturday = deptData.total_hours_saturday * saturdayRate;
                        const deptTotalCost = deptCostWeekday + deptCostSaturday;

                        return (
                            <div key={idx} className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden shadow-lg transition-all">
                                {/* Header (Clickable) */}
                                <div
                                    onClick={() => toggleDepartment(deptData.department)}
                                    className="p-4 bg-slate-700/30 hover:bg-slate-700/50 cursor-pointer flex items-center justify-between border-b border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <button className={`w-6 h-6 rounded flex items-center justify-center bg-slate-600 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                            ▼
                                        </button>
                                        <div>
                                            <h2 className="font-bold text-white">{deptData.department}</h2>
                                            <p className="text-xs text-gray-400">
                                                {deptData.employees.length} Dipendenti
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dept Summary */}
                                    <div className="text-right">
                                        <div className="flex items-center gap-4 text-sm font-mono">
                                            <span className="text-gray-400 hidden md:inline">Lun-Ven: <b className="text-blue-300">{deptData.total_hours_weekday}h</b></span>
                                            <span className="text-gray-400 hidden md:inline">Sab: <b className="text-orange-300">{deptData.total_hours_saturday}h</b></span>
                                            <span className="text-lg font-bold text-green-400 bg-green-900/20 px-3 py-1 rounded">
                                                € {deptTotalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content (Collapsible) */}
                                {isOpen && (
                                    <div className="bg-slate-900/30">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="text-gray-500 border-b border-white/5">
                                                    <th className="p-3 pl-12 font-medium uppercase text-xs">Dipendente</th>
                                                    <th className="p-3 text-right font-medium uppercase text-xs text-blue-400/70">Ore Feriali</th>
                                                    <th className="p-3 text-right font-medium uppercase text-xs text-orange-400/70">Ore Sabato</th>
                                                    <th className="p-3 text-right font-medium uppercase text-xs">Costo Totale</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {deptData.employees.map(emp => {
                                                    const empCost = (emp.hours_weekday * hourlyRate) + (emp.hours_saturday * saturdayRate);
                                                    return (
                                                        <tr key={emp.id} className="hover:bg-white/5 transition">
                                                            <td className="p-3 pl-12 text-gray-300 font-medium">
                                                                {emp.name}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-blue-200">
                                                                {emp.hours_weekday > 0 ? emp.hours_weekday : '-'}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-orange-200">
                                                                {emp.hours_saturday > 0 ? emp.hours_saturday : '-'}
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-gray-300">
                                                                € {empCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
