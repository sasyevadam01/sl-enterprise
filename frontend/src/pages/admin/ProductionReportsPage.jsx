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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A855F7'];

import toast from 'react-hot-toast';

export default function ProductionReportsPage() {
    // const { toast } = useUI(); // Removed to use direct import
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [shiftType, setShiftType] = useState('all'); // morning, afternoon, night, all

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

    // Day navigation functions
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

            // Create download link
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

    // Prepare Chart Data - Show more materials now that we have space
    const prepareMaterialData = () => {
        if (!stats || !stats.by_type) return [];
        const entries = Object.entries(stats.by_type);
        // Sort by value descending
        entries.sort((a, b) => b[1] - a[1]);
        // Take top 10, group rest as "Altri"
        const topItems = entries.slice(0, 10).map(([name, value]) => ({ name, value }));
        const othersTotal = entries.slice(10).reduce((sum, [, value]) => sum + value, 0);
        if (othersTotal > 0) {
            topItems.push({ name: 'Altri', value: othersTotal });
        }
        return topItems;
    };

    const materialData = prepareMaterialData();
    const userPerfData = stats ? Object.entries(stats.user_perf).map(([name, value]) => ({ name, value })) : [];
    const supplyPerfData = stats ? Object.entries(stats.supply_perf).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="min-h-screen carbon-background p-6 space-y-8 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BarChart2 className="text-blue-400" size={32} />
                        Report Produzione
                    </h1>
                    <p className="text-gray-400">Analisi performance e download log</p>
                </div>

                <div className="master-card flex flex-wrap gap-2 items-center p-3">
                    {/* Day Navigation Arrows */}
                    <button
                        onClick={() => changeDay(-1)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
                        title="Giorno precedente"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />

                    <button
                        onClick={() => changeDay(1)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
                        title="Giorno successivo"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="h-6 w-px bg-white/10"></div>

                    <select
                        value={shiftType}
                        onChange={e => setShiftType(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Tutti i Turni</option>
                        <option value="morning">Mattina (06-14)</option>
                        <option value="afternoon">Pomeriggio (14-22)</option>
                        <option value="night">Notte (22-06)</option>
                    </select>

                    <button
                        onClick={loadData}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Aggiorna"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>

                    <div className="h-6 w-px bg-white/10"></div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-green-500/20 transition-all active:scale-95"
                    >
                        <Download size={18} />
                        Excel
                    </button>
                </div>
            </div>

            {loading && !stats ? (
                <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse">Caricamento dati...</div>
            ) : stats && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="master-card p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Totale Blocchi</h3>
                                    <div className="text-3xl font-bold text-white">{stats.total_blocks}</div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <BarChart2 className="text-blue-400" size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="master-card p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Attesa Media</h3>
                                    <div className="text-3xl font-bold text-white">{stats.avg_wait_min}<span className="text-sm text-gray-500 ml-1">min</span></div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                    <Clock className="text-orange-400" size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="master-card p-5 relative overflow-hidden group hover:border-green-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Lavorazione Media</h3>
                                    <div className="text-3xl font-bold text-white">{stats.avg_work_min}<span className="text-sm text-gray-500 ml-1">min</span></div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <Clock className="text-green-400" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Memory vs Spugna and Trimmed Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Memory Count */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <span className="text-purple-400 font-bold text-sm">M</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">Memory</p>
                                    <p className="text-2xl font-bold text-white">{stats.memory_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Sponge Count */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                    <span className="text-cyan-400 font-bold text-sm">S</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">Spugna</p>
                                    <p className="text-2xl font-bold text-white">{stats.sponge_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Trimmed Count */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">Rifilati</p>
                                    <p className="text-2xl font-bold text-white">{stats.trimmed_count || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Trimmed Percentage */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <span className="text-emerald-400 font-bold text-sm">%</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">% Rifilati</p>
                                    <p className="text-2xl font-bold text-white">{stats.trimmed_percentage || 0}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Cancellation Rate */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">Cancellati</p>
                                    <p className="text-2xl font-bold text-white">
                                        {stats.cancelled_count || 0}
                                        <span className="text-sm text-red-400 ml-1">({stats.cancelled_percentage || 0}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Urgent Blocks */}
                        <div className="master-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                    <span className="text-orange-400 text-lg">🔥</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase">Urgenti</p>
                                    <p className="text-2xl font-bold text-white">
                                        {stats.urgent_count || 0}
                                        <span className="text-sm text-orange-400 ml-1">({stats.urgent_percentage || 0}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 1: Material Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <PieIcon size={18} className="text-purple-400" /> Distribuzione Materiali
                            </h3>
                            <div className="flex items-center gap-6">
                                {/* Chart */}
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
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-500">Nessun dato</div>
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
                                            <span className="text-gray-300 truncate" title={entry.name}>{entry.name}</span>
                                            <span className="text-white font-bold ml-auto">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Chart: Top Pantografisti */}
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart2 size={18} className="text-blue-400" /> Top Richiedenti
                            </h3>
                            <div className="h-[300px] w-full">
                                {userPerfData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={userPerfData} layout="vertical">
                                            <XAxis type="number" stroke="#94a3b8" />
                                            <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" fontSize={12} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                            />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">Nessun dato</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Dimensions + Top Supply Operators */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Dimensions - Horizontal Bar */}
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-white mb-4">Top 6 Misure</h3>
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
                                            <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={11} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">Nessun dato</div>
                                )}
                            </div>
                        </div>

                        {/* Top Supply Operators */}
                        <div className="master-card p-5">
                            <h3 className="text-base font-bold text-white mb-4">Top Magazzinieri</h3>
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
                                            <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" fontSize={11} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">Nessun dato</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
