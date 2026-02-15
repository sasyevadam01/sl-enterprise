/**
 * RecentEventsWidget — Ultimi Eventi
 * v5.0 Premium Enterprise Light
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, employeesApi } from '../../api/client';
import { format, parseISO } from 'date-fns';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';

export default function RecentEventsWidget() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventsData, employees] = await Promise.all([
                    eventsApi.getEvents(),
                    employeesApi.getEmployees()
                ]);

                const sorted = (eventsData || [])
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 3)
                    .map(ev => {
                        const emp = employees.find(e => e.id === ev.employee_id);
                        return {
                            ...ev,
                            employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Sconosciuto',
                            creator_name: ev.creator?.full_name || 'Sistema'
                        };
                    });
                setEvents(sorted);
            } catch (err) {
                console.error("RecentEventsWidget Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Eliminare questo evento?")) return;
        try {
            await eventsApi.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert("Errore: " + err.message);
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
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Ultimi Eventi</h3>
                </div>
                <Link to="/hr/events" className="flex items-center gap-1 text-xs text-brand-green hover:text-brand-green/80 font-medium transition-colors">
                    Tutti <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {events.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nessun evento recente</p>
                ) : (
                    events.map(ev => (
                        <div key={ev.id} className="row-hover py-3.5 group -mx-1 px-1 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-800 truncate">{ev.employee_name}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[11px] text-slate-500">{ev.event_label}</span>
                                        <span className={`text-[11px] font-bold tabular-nums ${ev.points >= 0
                                            ? 'bg-green-50 text-green-700 px-1.5 py-0.5 rounded'
                                            : 'bg-red-50 text-red-700 px-1.5 py-0.5 rounded'
                                            }`}>
                                            {ev.points > 0 ? '+' : ''}{ev.points} pt
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Creato da: <span className="text-slate-600">{ev.creator_name}</span>
                                        {ev.created_at && (
                                            <span className="ml-2 font-mono tabular-nums text-slate-400">
                                                {format(parseISO(ev.created_at), 'dd/MM HH:mm')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                                    <button
                                        onClick={() => handleDelete(ev.id)}
                                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                                        title="Elimina"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
