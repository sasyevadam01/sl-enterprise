import React from 'react';
import { Link } from 'react-router-dom';

export default function ActivityTimeline({ activities }) {
    const typeConfig = {
        leave: { icon: '🏖️', color: 'blue', label: 'Ferie' },
        event: { icon: '📝', color: 'purple', label: 'Evento HR' },
        expiry: { icon: '⚠️', color: 'orange', label: 'Scadenza' },
        shift: { icon: '📅', color: 'teal', label: 'Turno' }
    };

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden h-full shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    🗓️ Attività Recenti
                </h3>
            </div>
            <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <p>Nessuna attività recente</p>
                    </div>
                ) : (
                    <div className="relative p-6">
                        {/* Timeline line */}
                        <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-transparent"></div>

                        <div className="space-y-6">
                            {activities.map((activity, i) => {
                                const config = typeConfig[activity.type] || typeConfig.event;
                                return (
                                    <div key={i} className="relative pl-12 group">
                                        {/* Dot */}
                                        <div className={`absolute left-[13px] top-1.5 w-3 h-3 rounded-full bg-${config.color}-500 border-2 border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.3)] z-10 group-hover:scale-125 transition`}></div>

                                        <div className="">
                                            <div className="flex items-start justify-between mb-1">
                                                <p className="text-gray-200 text-sm font-medium leading-none group-hover:text-blue-400 transition">{activity.title}</p>
                                                <span className="text-[10px] text-gray-500 font-mono bg-slate-800 px-1.5 rounded">{activity.time}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{config.icon}</span>
                                                {activity.employee ? (
                                                    <Link
                                                        to={`/hr/employees/${activity.employee.id}`}
                                                        className="hover:text-white transition underline decoration-gray-700 underline-offset-2"
                                                    >
                                                        {activity.employee.name}
                                                    </Link>
                                                ) : (
                                                    <span>Sistema</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
