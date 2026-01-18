import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leavesApi, employeesApi } from '../../api/client';
import { format, parseISO } from 'date-fns';

export default function RecentLeavesWidget() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leavesData, employees] = await Promise.all([
                    leavesApi.getLeaves({ status_filter: 'approved' }),
                    employeesApi.getEmployees()
                ]);

                // Sort by creation date descending and take last 3
                const sorted = (leavesData || [])
                    .sort((a, b) => new Date(b.created_at || b.requested_at) - new Date(a.created_at || a.requested_at))
                    .slice(0, 3)
                    .map(l => {
                        const emp = employees.find(e => e.id === l.employee_id);
                        return {
                            ...l,
                            employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Sconosciuto',
                            requester_name: l.requester?.full_name || 'N/A',
                            coordinator_name: l.reviewer?.full_name || l.requester?.full_name || 'Admin'
                        };
                    });

                setLeaves(sorted);
            } catch (err) {
                console.error("RecentLeavesWidget Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questa assenza?")) return;
        try {
            await leavesApi.deleteLeave(id);
            setLeaves(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            alert("Errore: " + err.message);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 h-full flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    🏖️ Ultime Assenze
                </h3>
                <Link to="/hr/leaves" className="text-[10px] text-blue-400 hover:underline">Vedi Tutte</Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {leaves.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Nessuna assenza recente</p>
                ) : (
                    leaves.map(l => (
                        <div key={l.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-white">{l.employee_name}</p>
                                    <p className="text-[10px] text-gray-400">
                                        <span className="text-blue-300">{
                                            l.leave_type === 'vacation' ? 'Ferie' :
                                                l.leave_type === 'sick' ? 'Malattia' :
                                                    l.leave_type === 'permit' ? 'Permesso' :
                                                        l.leave_type === 'sudden_permit' ? 'Perm. Improv.' :
                                                            l.leave_type
                                        }</span> • {format(parseISO(l.start_date), 'dd/MM')} → {format(parseISO(l.end_date), 'dd/MM')}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Richiesto da: <span className="text-gray-300">{l.requester_name}</span> | Coord: <span className="text-emerald-400">{l.coordinator_name}</span>
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <Link to={`/hr/employees/${l.employee_id}?tab=absences`} className="w-7 h-7 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs hover:bg-blue-500/40" title="Vai al Dossier per Modificare">✏️</Link>
                                    <button onClick={() => handleDelete(l.id)} className="w-7 h-7 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-500/40" title="Elimina Definitivamente">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
