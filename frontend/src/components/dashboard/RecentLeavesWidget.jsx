/**
 * RecentLeavesWidget — Ultime Assenze
 * v5.0 Premium Enterprise Light
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leavesApi, employeesApi } from '../../api/client';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ArrowRight, Pencil, Trash2 } from 'lucide-react';

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

                const sorted = (leavesData || [])
                    .sort((a, b) => new Date(b.created_at || b.requested_at) - new Date(a.created_at || a.requested_at))
                    .slice(0, 3)
                    .map(l => {
                        const emp = employees.find(e => e.id === l.employee_id);
                        return {
                            ...l,
                            employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Sconosciuto',
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
        if (!window.confirm("Sei sicuro di voler eliminare questa assenza?")) return;
        try {
            await leavesApi.deleteLeave(id);
            setLeaves(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            alert("Errore: " + err.message);
        }
    };

    const getLeaveStyle = (type) => {
        switch (type) {
            case 'vacation': return { label: 'Ferie', bg: 'bg-green-50', text: 'text-green-700' };
            case 'sick': return { label: 'Malattia', bg: 'bg-red-50', text: 'text-red-700' };
            case 'permit': return { label: 'Permesso', bg: 'bg-blue-50', text: 'text-blue-700' };
            case 'sudden_permit': return { label: 'Perm. Improv.', bg: 'bg-orange-50', text: 'text-orange-700' };
            default: return { label: type, bg: 'bg-slate-50', text: 'text-slate-600' };
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-green rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="dashboard-card bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Ultime Assenze</h3>
                </div>
                <Link to="/hr/leaves" className="flex items-center gap-1 text-xs text-brand-green hover:text-brand-green/80 font-medium transition-colors">
                    Tutte <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {leaves.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nessuna assenza recente</p>
                ) : (
                    leaves.map(l => {
                        const style = getLeaveStyle(l.leave_type);
                        return (
                            <div key={l.id} className="row-hover py-3.5 group -mx-1 px-1 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{l.employee_name}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`${style.bg} ${style.text} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                                                {style.label}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                                                {format(parseISO(l.start_date), 'dd/MM')} → {format(parseISO(l.end_date), 'dd/MM')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Coord: <span className="text-slate-600">{l.coordinator_name}</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                                        <Link
                                            to={`/hr/employees/${l.employee_id}?tab=absences`}
                                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                                            title="Dossier"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(l.id)}
                                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                                            title="Elimina"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
