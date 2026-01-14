/**
 * Factory Dashboard - Visualizzazione Report Produzione KPI
 * Dashboard principale per Factory Controller
 */
import { useState, useEffect } from 'react';
import { kpiApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

// Formato data per API (YYYY-MM-DD)
const formatDateForApi = (date) => {
    return date.toISOString().split('T')[0];
};

// --- SUBS ---
const getEfficiencyColor = (efficiency) => {
    if (!efficiency) return 'text-gray-400';
    if (efficiency >= 100) return 'text-green-400';
    if (efficiency >= 80) return 'text-yellow-400';
    return 'text-red-400';
};

const getEfficiencyBg = (efficiency) => {
    if (!efficiency) return 'bg-gray-500/10';
    if (efficiency >= 100) return 'bg-green-500/20';
    if (efficiency >= 80) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
};

// Card Statistica
const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => {
    const colors = {
        blue: 'from-blue-600 to-cyan-600',
        green: 'from-green-600 to-emerald-600',
        yellow: 'from-yellow-600 to-orange-600',
        purple: 'from-purple-600 to-pink-600',
        red: 'from-red-600 to-rose-600'
    };

    return (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
                        {value}
                    </p>
                    {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
                </div>
                <span className="text-3xl">{icon}</span>
            </div>
        </div>
    );
};

// Modal Report Avanzato
const AdvancedReportModal = ({ isOpen, onClose, sectors }) => {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedSector, setSelectedSector] = useState('');
    const { toast } = useUI();
    const [loading, setLoading] = useState(false);

    const setToday = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        setStartDate(today);
        setEndDate(today);
    };

    if (!isOpen) return null;

    const handleDownload = async () => {
        try {
            setLoading(true);
            const blob = await kpiApi.getAdvancedPdfReport(startDate, endDate, selectedSector || null);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_avanzato_${startDate}_${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("PDF Avanzato scaricato!");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Errore download PDF");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-white">📄 Report Avanzato</h3>
                    <button onClick={setToday} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition">Resetta a Oggi</button>
                </div>
                <p className="text-gray-400 text-sm mb-6">Seleziona i filtri per generare il PDF</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Dal</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Al</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Reparto (Opzionale)</label>
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Tutti i Reparti</option>
                            {sectors.map((s, idx) => (
                                <option key={idx} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-medium flex justify-center items-center gap-2"
                        >
                            {loading ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div> : '📥 Scarica PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// MAIN COMPONENT
export default function FactoryDashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtri Dashboard
    const [dashboardSector, setDashboardSector] = useState(''); // "" = Tutto
    const [availableSectors, setAvailableSectors] = useState([]);

    // Modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const { toast } = useUI();

    useEffect(() => {
        loadAllData();
    }, [selectedDate, dashboardSector]);

    const loadAllData = async () => {
        try {
            setLoading(true);

            // 1. Load Daily Report (Tabella + Cards)
            // L'endpoint daily report forse non supporta filtro settore backend? 
            // In base al piano non l'ho modificato. Lo filtro client-side per coerenza? 
            // O meglio, `getDailyReport` restituisce tutto.
            const dailyData = await kpiApi.getDailyReport(formatDateForApi(selectedDate));

            // Estrai settori unici per i dropdown
            if (dailyData?.sectors) {
                const sectors = dailyData.sectors.map(s => s.sector_name);
                // Aggiorna solo se la lista è vuota o cambia drasticamente
                if (availableSectors.length === 0) setAvailableSectors(sectors);
            }

            // Filtro Client Side del Daily Report se c'è un settore selezionato
            let filteredDaily = dailyData;
            if (dashboardSector && dailyData?.sectors) {
                // Filtro i settori
                const filteredSectors = dailyData.sectors.filter(s => s.sector_name === dashboardSector);
                filteredDaily = { ...dailyData, sectors: filteredSectors };
            }
            setReportData(filteredDaily);

            // 2. Load Trend Data (Ultimi 7 gg)
            const trendRes = await kpiApi.getTrend(
                format(addDays(selectedDate, -6), 'yyyy-MM-dd'),
                format(selectedDate, 'yyyy-MM-dd'),
                true, // Exclude Weekends
                dashboardSector || null // Filtro Settore Backend
            );
            setTrendData(trendRes.trend || []);

        } catch (error) {
            console.error(error);
            toast.error("Errore caricamento dati dashboard");
        } finally {
            setLoading(false);
        }
    };

    // Calcola totali (basati su reportData filtrato)
    const totals = reportData?.sectors?.reduce((acc, s) => ({
        quantity: acc.quantity + (s.total_quantity || 0),
        hours: acc.hours + (s.total_hours || 0),
        downtime: acc.downtime + (s.total_downtime || 0),
        sectors: acc.sectors + 1
    }), { quantity: 0, hours: 0, downtime: 0, sectors: 0 }) || { quantity: 0, hours: 0, downtime: 0, sectors: 0 };

    const avgEfficiency = totals.hours > 0 && totals.quantity > 0
        ? Math.round(
            reportData.sectors.reduce((acc, s) => {
                // Weighted or simple avg? Simple avg of efficiencies for now or recalculate based on total target
                // Better: Recalculate total target
                const target = (s.kpi_target_8h * ((s.total_hours - s.total_downtime) / 8));
                return acc + (target > 0 ? target : 0);
            }, 0) > 0
                ? (totals.quantity / reportData.sectors.reduce((acc, s) => acc + (s.kpi_target_8h * ((s.total_hours - s.total_downtime) / 8)), 0)) * 100
                : 0
        )
        : 0;

    // Fix Avg Efficiency Display logic above is complex inline: simplified
    // Se non voglio impazzire, faccio media delle efficienze dei settori visualizzati
    const simpleAvgEff = reportData?.sectors?.length > 0
        ? Math.round(reportData.sectors.reduce((acc, s) => {
            // Calculate eff for sector
            const net = s.total_hours - s.total_downtime;
            const target = s.kpi_target_8h * (net / 8);
            const eff = target > 0 ? (s.total_quantity / target) * 100 : 0;
            return acc + eff;
        }, 0) / reportData.sectors.length)
        : 0;


    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <div className="p-6 space-y-6 text-white pb-24 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        🏭 Dashboard Produzione
                    </h1>
                    <p className="text-gray-400 mt-1">Monitoraggio KPI e Performance</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Filtro Settore */}
                    <div className="relative group">
                        <select
                            value={dashboardSector}
                            onChange={(e) => setDashboardSector(e.target.value)}
                            className="appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-8 text-white outline-none focus:border-blue-500 min-w-[200px]"
                        >
                            <option value="">🏗️ Tutti i Reparti</option>
                            {availableSectors.map((s, idx) => (
                                <option key={idx} value={s}>{s}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                    </div>

                    {/* Bottone Report Avanzato */}
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-2 border border-white/10"
                    >
                        <span>📄</span> Report Avanzato
                    </button>

                    {/* Date Navigator */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => changeDate(-1)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                        >
                            ◀
                        </button>
                        <input
                            type="date"
                            value={formatDateForApi(selectedDate)}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="bg-transparent text-white px-2 py-1 outline-none text-center font-medium w-32"
                        />
                        <button
                            onClick={() => changeDate(1)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                        >
                            ▶
                        </button>
                    </div>

                    <button
                        onClick={() => { setSelectedDate(new Date()); setDashboardSector(''); }}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        title="Reset Filtri"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Produzione Totale"
                            value={totals.quantity.toLocaleString('it-IT')}
                            subtitle="Pezzi prodotti oggi"
                            icon="📦"
                            color="blue"
                        />
                        <StatCard
                            title="Efficienza Media"
                            value={`${simpleAvgEff}%`}
                            subtitle="Media reparti filtrati"
                            icon="⚡"
                            color={simpleAvgEff >= 100 ? 'green' : simpleAvgEff >= 80 ? 'yellow' : 'red'}
                        />
                        <StatCard
                            title="Ore Lavorate"
                            value={`${totals.hours}h`}
                            subtitle={`Su ${totals.sectors} reparti attivi`}
                            icon="⏱️"
                            color="purple"
                        />
                        <StatCard
                            title="Ore Fermo"
                            value={`${totals.downtime}h`}
                            subtitle="Improduttività totale"
                            icon="⚠️"
                            color={totals.downtime === 0 ? 'green' : 'red'}
                        />
                    </div>

                    {/* CHARTS ROW (50/50 Layout) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
                        {/* 1. Target vs Real (Del Giorno Selezionato) */}
                        <div className="bg-slate-800 rounded-2xl border border-white/10 p-4 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4">🎯 Target vs Reale (Oggi)</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData?.sectors || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="sector_name"
                                            stroke="#94a3b8"
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="kpi_target_8h" name="Target (8h teorico)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar dataKey="total_quantity" name="Reale" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Trend Efficienza (Ultimi 7 gg) */}
                        <div className="bg-slate-800 rounded-2xl border border-white/10 p-4 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4">📈 Trend Efficienza (7 Giorni)</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                        />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} unit="%" domain={[0, 150]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="efficiency"
                                            name="Efficienza %"
                                            stroke="#f59e0b"
                                            fill="#f59e0b"
                                            fillOpacity={0.2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Tables Row */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Tabella Dettaglio (Filtrata) */}
                        <div className="bg-slate-800 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="p-4 bg-slate-900/50 border-b border-white/10">
                                <h3 className="text-lg font-bold text-white">📋 Dettaglio Produzione</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left bg-slate-800">
                                    <thead className="bg-slate-900/30 text-gray-400 uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="p-4">Settore</th>
                                            <th className="p-4 text-center">Target</th>
                                            <th className="p-4 text-center">Prodotto</th>
                                            <th className="p-4 text-center">Ore Lav.</th>
                                            <th className="p-4 text-center">Ore Fermo</th>
                                            <th className="p-4 text-center">Efficienza</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {reportData?.sectors?.map((s, idx) => {
                                            // Calc efficienza riga
                                            const net = s.total_hours - s.total_downtime;
                                            const target = s.kpi_target_8h * (net / 8);
                                            const eff = target > 0 ? Math.round((s.total_quantity / target) * 100) : 0;

                                            return (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-medium text-white">{s.sector_name}</td>
                                                    <td className="p-4 text-center text-gray-400">{Math.round(target)} <span className="text-xs ml-1">(su {net}h)</span></td>
                                                    <td className="p-4 text-center font-bold text-white">{s.total_quantity}</td>
                                                    <td className="p-4 text-center text-gray-300">{s.total_hours}h</td>
                                                    <td className="p-4 text-center text-orange-400">{s.total_downtime > 0 ? s.total_downtime + 'h' : '-'}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-sm font-bold ${getEfficiencyColor(eff)} ${getEfficiencyBg(eff)}`}>
                                                            {eff}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!reportData?.sectors || reportData.sectors.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">Nessun dato per i filtri selezionati</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            <AdvancedReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                sectors={availableSectors}
            />
        </div>
    );
}
