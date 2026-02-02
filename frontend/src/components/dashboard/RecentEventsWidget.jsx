import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, employeesApi } from '../../api/client';
import { format, parseISO } from 'date-fns';

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

                // Sort by creation date descending and take last 3
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
            <div className="master-card p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    return (
        <div className="master-card p-5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-purple-400">📝</span> Ultimi Eventi
                </h3>
                <Link to="/hr/events" className="text-[10px] text-emerald-400 hover:text-emerald-300 transition">
                    Vedi Tutti →
                </Link>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {events.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">Nessun evento recente</p>
                ) : (
                    events.map(ev => (
                        <div key={ev.id} className="p-3 rounded-xl border border-white/5 bg-zinc-800/30 
                                                    hover:border-purple-500/20 hover:bg-zinc-800/50 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{ev.employee_name}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                        <span className={ev.points >= 0 ? 'neon-emerald' : 'neon-red'}>{ev.event_label}</span>
                                        <span className={`font-mono font-bold ${ev.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {ev.points > 0 ? '+' : ''}{ev.points} pt
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                        Creato da: <span className="text-purple-400/70">{ev.creator_name}</span>
                                        {ev.created_at && (
                                            <span className="ml-2 font-mono text-zinc-600">
                                                {format(parseISO(ev.created_at), 'dd/MM HH:mm')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                                    <button
                                        onClick={() => handleDelete(ev.id)}
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
