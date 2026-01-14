/**
 * Factory Trend Page - Andamento Produzione nel Tempo
 * Grafico trend con filtro date e esclusione weekend
 */
import { useState, useEffect } from 'react';
import { kpiApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

// Formato data per API (YYYY-MM-DD)
const formatDateForApi = (date) => {
    return date.toISOString().split('T')[0];
};

// Default: ultimi 7 giorni
const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
};

export default function FactoryTrendPage() {
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(new Date());
    const [excludeWeekends, setExcludeWeekends] = useState(true);
    const [trendData, setTrendData] = useState([]);
    const [sectorData, setSectorData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useUI();

    useEffect(() => {
        loadTrend();
    }, [startDate, endDate, excludeWeekends]);

    const loadTrend = async () => {
        try {
            setLoading(true);
            const data = await kpiApi.getTrend(
                formatDateForApi(startDate),
                formatDateForApi(endDate),
                excludeWeekends
            );
            setTrendData(data.trend || []);
            setSectorData(data.sectors || []);
        } catch (error) {
            console.error(error);
            toast.error("Errore caricamento trend");
        } finally {
            setLoading(false);
        }
    };

    // Preset rapidi
    const setPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <div className="p-6 space-y-6 text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        📈 Trend Produzione
                    </h1>
                    <p className="text-gray-400 mt-1">Andamento nel tempo</p>
                </div>

                {/* Filtri Date */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Preset */}
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-white/10">
                        <button onClick={() => setPreset(7)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded">7g</button>
                        <button onClick={() => setPreset(14)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded">14g</button>
                        <button onClick={() => setPreset(30)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded">30g</button>
                        <button onClick={() => setPreset(90)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded">90g</button>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-2 border border-white/10">
                        <span className="text-gray-400 text-sm">Dal</span>
                        <input
                            type="date"
                            value={formatDateForApi(startDate)}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                            className="bg-transparent text-white px-2 py-1 outline-none text-sm"
                        />
                        <span className="text-gray-400 text-sm">Al</span>
                        <input
                            type="date"
                            value={formatDateForApi(endDate)}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                            className="bg-transparent text-white px-2 py-1 outline-none text-sm"
                        />
                    </div>

                    {/* Checkbox Weekend */}
                    <label className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2 border border-white/10 cursor-pointer hover:bg-white/5">
                        <input
                            type="checkbox"
                            checked={excludeWeekends}
                            onChange={(e) => setExcludeWeekends(e.target.checked)}
                            className="w-4 h-4 accent-purple-500"
                        />
                        <span className="text-sm text-gray-300">Escludi Sab/Dom</span>
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <>
                    {/* Grafico Trend Efficienza */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4">📊 Efficienza Giornaliera (%)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis stroke="#9CA3AF" domain={[0, 150]} unit="%" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="efficiency"
                                        stroke="#8B5CF6"
                                        fillOpacity={1}
                                        fill="url(#colorEff)"
                                        name="Efficienza %"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Grafico Trend Quantità */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4">📦 Quantità Prodotta (pezzi)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT')}
                                        formatter={(val) => val.toLocaleString('it-IT')}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="quantity"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Quantità"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Riepilogo Settori Periodo */}
                    <div className="bg-slate-800 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 bg-slate-900/50 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white">📋 Riepilogo Settori (Periodo Selezionato)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/30 text-gray-400 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="p-4">Settore</th>
                                        <th className="p-4 text-center">Totale Prodotto</th>
                                        <th className="p-4 text-center">Ore Lavorate</th>
                                        <th className="p-4 text-center">Qnt/Ora</th>
                                        <th className="p-4 text-center">Efficienza</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sectorData.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-white">{s.sector_name}</td>
                                            <td className="p-4 text-center text-white font-bold">{s.total_quantity?.toLocaleString('it-IT')}</td>
                                            <td className="p-4 text-center text-gray-300">{s.total_hours_net?.toFixed(1)}h</td>
                                            <td className="p-4 text-center text-gray-300 font-mono">{s.total_qty_per_hour?.toFixed(1)}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${s.efficiency >= 100 ? 'bg-green-500/20 text-green-400' :
                                                        s.efficiency >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {s.efficiency}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {sectorData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                Nessun dato KPI per il periodo selezionato
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
