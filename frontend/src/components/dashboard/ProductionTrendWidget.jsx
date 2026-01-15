import React from 'react';
import { Link } from 'react-router-dom';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function ProductionTrendWidget({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 border-dashed overflow-hidden flex flex-col items-center justify-center p-8 h-full min-h-[200px]">
                <span className="text-4xl mb-2 opacity-30">📉</span>
                <p className="text-gray-500 text-sm">Dati produzione insufficienti</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden h-full flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                <Link to="/factory/trend" className="group">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-blue-400 transition">
                        Trend Settimanale <span className="text-[10px] font-normal text-gray-500 opacity-0 group-hover:opacity-100 transition">→ Dettagli</span>
                    </h3>
                </Link>
                <select className="bg-slate-900 border border-white/10 rounded-lg text-xs text-gray-400 px-2 py-1 outline-none">
                    <option>Ultimi 7 Giorni</option>
                    <option>Questo Mese</option>
                </select>
            </div>
            <div className="p-4 flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorEffWidget" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 10, fill: '#6B7280' }}
                            tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151', color: '#fff', fontSize: '12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT')}
                            formatter={(value) => [value + '%', 'Efficienza']}
                            itemStyle={{ color: '#60A5FA' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="efficiency"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorEffWidget)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
