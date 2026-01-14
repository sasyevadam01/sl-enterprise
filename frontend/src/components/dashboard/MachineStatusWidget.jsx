import React, { useState, useEffect } from 'react';
import { fleetApi } from '../../api/client';

export default function MachineStatusWidget() {
    const [status, setStatus] = useState({
        total: 0,
        active: 0,
        down: 0,
        loading: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fleetApi.getVehicles();
                const vehicles = Array.isArray(response) ? response : [];
                const total = vehicles.length;
                const down = vehicles.filter(v => v.status === 'breakdown' || v.status === 'maintenance').length;
                const active = total - down;

                setStatus({ total, active, down, loading: false });
            } catch (err) {
                console.error("Machine Status Error", err);
                setStatus(prev => ({ ...prev, loading: false }));
            }
        };
        fetchData();
    }, []);

    if (status.loading) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    const isAllOperational = status.down === 0;
    const uptime = status.total > 0 ? ((status.active / status.total) * 100).toFixed(1) : 0;

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col relative overflow-hidden group shadow-xl hover:bg-slate-800/50 transition">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                🏗️ Stato Linee
            </h3>

            <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${isAllOperational ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    {isAllOperational ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse"></div>
                    ) : (
                        <span className="text-2xl animate-bounce">🚨</span>
                    )}
                </div>
                <div>
                    <h4 className={`text-xl font-bold ${isAllOperational ? 'text-white' : 'text-red-400'}`}>
                        {isAllOperational ? 'Tutto Operativo' : `${status.down} Linee Ferme`}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono">
                        <span className="text-white font-bold">{status.active}</span>/{status.total} Macchine Attive
                    </p>
                </div>
            </div>

            <div className="mt-auto space-y-2">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                    <span>Disponibilità Flotta</span>
                    <span>{uptime}%</span>
                </div>
                <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden border border-white/5">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isAllOperational ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                        style={{ width: `${uptime}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
