import React, { useState, useEffect } from 'react';
import { kpiApi } from '../../api/client';
import { format } from 'date-fns';

export default function DepartmentEfficiencyWidget() {
    const [sectors, setSectors] = useState({ top: null, flop: null, loading: true });

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const report = await kpiApi.getDailyReport(today);

                const calculated = report.sectors.map(s => {
                    let eff = 0;
                    if (s.total_hours_net > 0 && s.kpi_target_8h > 0) {
                        const hourlyTarget = s.kpi_target_8h / 8;
                        const expected = hourlyTarget * s.total_hours_net;
                        eff = Math.round((s.total_quantity / expected) * 100);
                    }
                    return { name: s.sector_name, eff };
                }).filter(s => s.eff > 0); // Include only active

                // Sort
                calculated.sort((a, b) => b.eff - a.eff);

                setSectors({
                    top: calculated[0] || null,
                    flop: calculated.length > 1 ? calculated[calculated.length - 1] : null,
                    loading: false
                });

            } catch (err) {
                console.error("Dept Eff Error", err);
                setSectors(prev => ({ ...prev, loading: false }));
            }
        };
        fetchSectors();
    }, []);

    if (sectors.loading) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col relative overflow-hidden shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                📊 Top & Flop Reparti
            </h3>

            <div className="space-y-4 flex-1">
                {/* Winner */}
                {sectors.top ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-xl">🏆</div>
                            <div>
                                <p className="text-sm font-bold text-white leading-tight">{sectors.top.name}</p>
                                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Best Performance</p>
                            </div>
                        </div>
                        <span className="text-xl font-black text-green-400">{sectors.top.eff}%</span>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-2">Nessun dato Top</p>
                )}

                {/* Loser */}
                {sectors.flop ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-xl">⚠️</div>
                            <div>
                                <p className="text-sm font-bold text-white leading-tight">{sectors.flop.name}</p>
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">Attenzione</p>
                            </div>
                        </div>
                        <span className="text-xl font-black text-red-400">{sectors.flop.eff}%</span>
                    </div>
                ) : (
                    !(sectors.top) && <p className="text-xs text-gray-600 text-center">In attesa di dati produzione...</p>
                )}
            </div>
        </div>
    );
}
