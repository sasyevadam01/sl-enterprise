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

    const getLeaveNeon = (type) => {
        switch (type) {
            case 'vacation': return 'neon-emerald';
            case 'sick': return 'neon-red';
            case 'permit': return 'neon-purple';
            case 'sudden_permit': return 'neon-orange';
            default: return 'text-zinc-400';
        }
    };

    const getLeaveLabel = (type) => {
        switch (type) {
            case 'vacation': return 'Ferie';
            case 'sick': return 'Malattia';
            case 'permit': return 'Permesso';
            case 'sudden_permit': return 'Perm. Improv.';
            default: return type;
        }
    };

    if (loading) {
        return (
            <div className="master-card p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    return (
        <div className="master-card p-5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-emerald-400">🏖️</span> Ultime Assenze
                </h3>
                <Link to="/hr/leaves" className="text-[10px] text-emerald-400 hover:text-emerald-300 transition">
                    Vedi Tutte →
                </Link>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {leaves.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">Nessuna assenza recente</p>
                ) : (
                    leaves.map(l => (
                        <div key={l.id} className="p-3 rounded-xl border border-white/5 bg-zinc-800/30 
                                                   hover:border-emerald-500/20 hover:bg-zinc-800/50 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{l.employee_name}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        <span className={getLeaveNeon(l.leave_type)}>{getLeaveLabel(l.leave_type)}</span>
                                        <span className="mx-1">•</span>
                                        <span className="font-mono">{format(parseISO(l.start_date), 'dd/MM')} → {format(parseISO(l.end_date), 'dd/MM')}</span>
                                    </p>
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                        Coord: <span className="text-emerald-400/70">{l.coordinator_name}</span>
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                                    <Link
                                        to={`/hr/employees/${l.employee_id}?tab=absences`}
                                        className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 
                                                   text-cyan-400 flex items-center justify-center text-xs 
                                                   hover:bg-cyan-500/20 transition"
                                        title="Vai al Dossier"
                                    >✏️</Link>
                                    <button
                                        onClick={() => handleDelete(l.id)}
                                        className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 
                                                   text-red-400 flex items-center justify-center text-xs 
                                                   hover:bg-red-500/20 transition"
                                        title="Elimina"
                                    >🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
