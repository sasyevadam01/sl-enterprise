import React, { useState, useEffect } from 'react';
import { kpiApi } from '../../api/client';
import { format } from 'date-fns';

export default function PerformanceGauge() {
    const [data, setData] = useState({
        efficiency: 0,
        trend: 0,
        qty: 0,
        loading: true
    });

    useEffect(() => {
        const fetchKPI = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const report = await kpiApi.getDailyReport(today);

                // Calculate totals
                let totalQty = 0;
                let totalTargetNet = 0; // Target prorated on actual hours

                report.sectors.forEach(s => {
                    totalQty += s.total_quantity;
                    // Simplify: Assume full target for now or use reported calc
                    // If we have total_hours_net and target_8h
                    if (s.total_hours_net > 0 && s.kpi_target_8h > 0) {
                        const hourlyTarget = s.kpi_target_8h / 8;
                        totalTargetNet += hourlyTarget * s.total_hours_net;
                    }
                });

                const efficiency = totalTargetNet > 0 ? Math.round((totalQty / totalTargetNet) * 100) : 0;

                setData({
                    efficiency,
                    trend: 0, // Need yesterday to calc diff, skipping for speed
                    qty: totalQty,
                    loading: false
                });

            } catch (err) {
                console.error("KPI Gauge Error", err);
                setData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchKPI();
    }, []);

    // Color logic
    const getColor = (eff) => {
        if (eff >= 95) return 'text-green-400 border-green-500';
        if (eff >= 80) return 'text-blue-400 border-blue-500';
        return 'text-red-400 border-red-500';
    };

    const colorClass = getColor(data.efficiency);
    const strokeColor = data.efficiency >= 80 ? '#3B82F6' : '#EF4444';

    // SVG Arc Params
    const radius = 60;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - ((Math.min(data.efficiency, 100) / 100) * circumference);

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col items-center justify-center relative overflow-hidden shadow-xl hover:bg-slate-800/50 transition duration-500">
            <h3 className="absolute top-4 left-4 text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                ⚡ Efficienza Global
            </h3>

            {/* SVG Ring Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center mt-2 group">
                {/* Background Circle */}
                <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                    <circle
                        stroke="#1e293b"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Progress Circle */}
                    <circle
                        stroke={strokeColor}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute flex flex-col items-center animate-fadeIn">
                    <span className={`text-4xl font-black ${colorClass.split(' ')[0]} drop-shadow-xl`}>
                        {data.loading ? '--' : data.efficiency}%
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-1">OEE LIVE</span>
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-2 text-center font-mono">
                Pezzi Prodotti: <span className="text-white font-bold">{data.qty.toLocaleString()}</span>
            </p>
        </div>
    );
}
