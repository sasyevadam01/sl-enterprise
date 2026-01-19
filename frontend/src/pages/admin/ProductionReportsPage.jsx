import React, { useState, useEffect } from 'react';
import { useUI } from '../../components/ui/CustomUI';
import { pickingApi } from '../../api/client';
import {
    Download, Calendar, Clock, BarChart2, PieChart as PieIcon, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28', '#F0F'];

import { toast } from 'react-hot-toast';

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

    // Prepare Chart Data
    const materialData = stats ? Object.entries(stats.by_type).map(([name, value]) => ({ name, value })) : [];
    const userPerfData = stats ? Object.entries(stats.user_perf).map(([name, value]) => ({ name, value })) : [];
    const supplyPerfData = stats ? Object.entries(stats.supply_perf).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BarChart2 className="text-blue-400" size={32} />
                        Report Produzione
                    </h1>
                    <p className="text-gray-400">Analisi performance e download log</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center bg-slate-800 p-2 rounded-xl border border-white/10">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-3 py-2 text-white text-sm"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-3 py-2 text-white text-sm"
                    />
                    <select
                        value={shiftType}
                        onChange={e => setShiftType(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-3 py-2 text-white text-sm"
                    >
                        <option value="all">Tutti i Turni</option>
                        <option value="morning">Mattina (06-14)</option>
                        <option value="afternoon">Pomeriggio (14-22)</option>
                        <option value="night">Notte (22-06)</option>
                    </select>

                    <button
                        onClick={loadData}
                        className="p-2 text-gray-400 hover:text-white transition"
                        title="Aggiorna"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg shadow-lg hover:shadow-green-500/20 transition-all active:scale-95"
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-white/10 relative overflow-hidden group hover:border-blue-500/50 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BarChart2 size={64} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Totale Blocchi</h3>
                            <div className="text-4xl font-bold text-white">{stats.total_blocks}</div>
                            <div className="mt-2 text-xs text-blue-400">Nel periodo selezionato</div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-white/10 relative overflow-hidden group hover:border-orange-500/50 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock size={64} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Attesa Media</h3>
                            <div className="text-4xl font-bold text-white">{stats.avg_wait_min} <span className="text-lg text-gray-500">min</span></div>
                            <div className="mt-2 text-xs text-orange-400">Dalla richiesta alla presa in carico</div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-white/10 relative overflow-hidden group hover:border-green-500/50 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock size={64} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Lavorazione Media</h3>
                            <div className="text-4xl font-bold text-white">{stats.avg_work_min} <span className="text-lg text-gray-500">min</span></div>
                            <div className="mt-2 text-xs text-green-400">Dalla presa in carico alla consegna</div>
                        </div>
                    </div>

                    {/* Charts Row 1: Material Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <PieIcon size={20} className="text-purple-400" /> Distribuzione Materiali
                            </h3>
                            <div className="h-[300px] w-full">
                                {materialData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={materialData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {materialData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">Nessun dato</div>
                                )}
                            </div>
                        </div>

                        {/* Chart: Top Pantografisti */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart2 size={20} className="text-blue-400" /> Top Richiedenti (Pantorgrafo/Giostra)
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

                    {/* Dimensions Detail Table */}
                    <div className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-gray-700 font-bold text-white">Dettaglio Misure</div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-gray-400 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="p-3">Misura</th>
                                        <th className="p-3 text-right">Quantità</th>
                                        <th className="p-3">Percentuale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {Object.entries(stats.by_dims)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([dim, count]) => (
                                            <tr key={dim} className="hover:bg-white/5">
                                                <td className="p-3 text-white font-mono">{dim}</td>
                                                <td className="p-3 text-right text-blue-400 font-bold">{count}</td>
                                                <td className="p-3 text-gray-500 text-sm">
                                                    {((count / stats.total_blocks) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
