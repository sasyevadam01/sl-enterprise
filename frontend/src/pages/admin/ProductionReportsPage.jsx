import React, { useState, useEffect } from 'react';
import { useUI } from '../../components/ui/CustomUI';
import { pickingApi } from '../../api/client';
import {
    Download, Calendar, Clock, BarChart2, PieChart as PieIcon, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2D8C0E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A855F7'];

import toast from 'react-hot-toast';

/* Light-theme tooltip style for Recharts */
const tooltipStyle = {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    color: '#1F2937',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};
const tooltipItemStyle = { color: '#374151' };
const tooltipCursor = { fill: 'rgba(0,0,0,0.04)' };

export default function ProductionReportsPage() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [shiftType, setShiftType] = useState('all');

    useEffect(() => {
        loadData();
    }, [startDate, endDate, shiftType]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await pickingApi.getReports(startDate, endDate, shiftType);
            setStats(data);
        } catch (error) {
            console.error(error);
            toast.error("Errore caricamento report");
        } finally {
            setLoading(false);
        }
    };

    const changeDay = (days) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setDate(start.getDate() + days);
        end.setDate(end.getDate() + days);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleDownload = async () => {
        try {
            toast.loading("Generazione Excel...");
            const response = await pickingApi.downloadReport(startDate, endDate, shiftType);
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_Produzione_${startDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.dismiss();
            toast.success("Download completato");
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Errore download excel");
        }
    };

    const prepareMaterialData = () => {
        if (!stats || !stats.by_type) return [];
        const entries = Object.entries(stats.by_type);
        entries.sort((a, b) => b[1] - a[1]);
        const topItems = entries.slice(0, 10).map(([name, value]) => ({ name, value }));
        const othersTotal = entries.slice(10).reduce((sum, [, value]) => sum + value, 0);
        if (othersTotal > 0) {
            topItems.push({ name: 'Altri', value: othersTotal });
        }
        return topItems;
    };

    const materialData = prepareMaterialData();

    return (
        <div className="space-y-6 pb-20 animate-fadeIn">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="page-header-icon">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Report Produzione</h1>
                        <p className="text-slate-500 text-sm">Analisi performance e download log</p>
                    </div>
                </div>

                <div className="master-card flex flex-wrap gap-2 items-center p-3">
                    <button
                        onClick={() => changeDay(-1)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all active:scale-95 cursor-pointer"
                        title="Giorno precedente"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />

                    <button
                        onClick={() => changeDay(1)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all active:scale-95 cursor-pointer"
                        title="Giorno successivo"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="h-6 w-px bg-slate-200"></div>

                    <select
                        value={shiftType}
                        onChange={e => setShiftType(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="all">Tutti i Turni</option>
                        <option value="morning">Mattina (06-14)</option>
                        <option value="afternoon">Pomeriggio (14-22)</option>
                        <option value="night">Notte (22-06)</option>
                    </select>

                    <button
                        onClick={loadData}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title="Aggiorna"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>

                    <div className="h-6 w-px bg-slate-200"></div>

                    <button
                        onClick={handleDownload}
                        className="action-btn action-btn-primary cursor-pointer"
                    >
                        <Download size={18} />
                        Excel
                    </button>
                </div>
            </div>

            {loading && !stats ? (
                <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">Caricamento dati...</div>
            ) : stats && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="master-card p-5 dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Totale Blocchi</h3>
                                    <div className="text-3xl font-bold text-slate-800">{stats.total_blocks}</div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <BarChart2 className="text-blue-600" size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="master-card p-5 dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Attesa Media</h3>
                                    <div className="text-3xl font-bold text-slate-800">{stats.avg_wait_min}<span className="text-sm text-slate-400 ml-1">min</span></div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                                    <Clock className="text-orange-500" size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="master-card p-5 dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Lavorazione Media</h3>
                                    <div className="text-3xl font-bold text-slate-800">{stats.avg_work_min}<span className="text-sm text-slate-400 ml-1">min</span></div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Clock className="text-emerald-600" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Memory vs Spugna and Trimmed Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Memory Count */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <span className="text-purple-600 font-bold text-sm">M</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Memory</p>
                                    <p className="text-2xl font-bold text-slate-800">{stats.memory_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Sponge Count */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                                    <span className="text-cyan-600 font-bold text-sm">S</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Spugna</p>
                                    <p className="text-2xl font-bold text-slate-800">{stats.sponge_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Trimmed Count */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Rifilati</p>
                                    <p className="text-2xl font-bold text-slate-800">{stats.trimmed_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Trimmed Percentage */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <span className="text-emerald-600 font-bold text-sm">%</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">% Rifilati</p>
                                    <p className="text-2xl font-bold text-slate-800">{stats.trimmed_percentage || 0}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Cancellation Rate */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Cancellati</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {stats.cancelled_count || 0}
                                        <span className="text-sm text-red-500 ml-1">({stats.cancelled_percentage || 0}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Urgent Blocks */}
                        <div className="master-card p-4 dashboard-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase">Urgenti</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {stats.urgent_count || 0}
                                        <span className="text-sm text-orange-500 ml-1">({stats.urgent_percentage || 0}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 1: Material Distribution + Top Richiedenti */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <PieIcon size={18} className="text-purple-600" /> Distribuzione Materiali
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="h-[200px] w-[200px] flex-shrink-0">
                                    {materialData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={materialData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {materialData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={tooltipStyle}
                                                    itemStyle={tooltipItemStyle}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">Nessun dato</div>
                                    )}
                                </div>
                                {/* Custom Compact Legend */}
                                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                                    {materialData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center gap-2 text-xs">
                                            <div
                                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span className="text-slate-600 truncate" title={entry.name}>{entry.name}</span>
                                            <span className="text-slate-800 font-bold ml-auto">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Chart: Top Pantografisti */}
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <BarChart2 size={18} className="text-blue-600" /> Top Richiedenti
                            </h3>
                            <div className="h-[300px] w-full">
                                {stats.user_perf && Object.keys(stats.user_perf).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={Object.entries(stats.user_perf).map(([name, value]) => ({ name, value }))} layout="vertical">
                                            <XAxis type="number" stroke="#94a3b8" />
                                            <YAxis dataKey="name" type="category" width={120} stroke="#64748b" fontSize={12} />
                                            <RechartsTooltip
                                                cursor={tooltipCursor}
                                                contentStyle={tooltipStyle}
                                                itemStyle={tooltipItemStyle}
                                            />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Nessun dato</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Dimensions + Top Supply Operators */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-[18px] h-[18px] text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Top 6 Misure
                            </h3>
                            <div className="h-[200px]">
                                {stats.by_dims && Object.keys(stats.by_dims).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={Object.entries(stats.by_dims)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 6)
                                                .map(([name, value]) => ({ name: name.replace(' (Rifilato)', ''), value }))}
                                            layout="vertical"
                                        >
                                            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                                            <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={11} />
                                            <RechartsTooltip
                                                contentStyle={tooltipStyle}
                                                itemStyle={tooltipItemStyle}
                                            />
                                            <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Nessun dato</div>
                                )}
                            </div>
                        </div>

                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-[18px] h-[18px] text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Top Magazzinieri
                            </h3>
                            <div className="h-[200px]">
                                {stats.supply_perf && Object.keys(stats.supply_perf).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={Object.entries(stats.supply_perf)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 5)
                                                .map(([name, value]) => ({ name, value }))}
                                            layout="vertical"
                                        >
                                            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                                            <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={11} />
                                            <RechartsTooltip
                                                contentStyle={tooltipStyle}
                                                itemStyle={tooltipItemStyle}
                                            />
                                            <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Nessun dato</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
