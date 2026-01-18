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
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 h-full flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    📝 Ultimi Eventi
                </h3>
                <Link to="/hr/events" className="text-[10px] text-blue-400 hover:underline">Vedi Tutti</Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {events.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Nessun evento recente</p>
                ) : (
                    events.map(ev => (
                        <div key={ev.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-white">{ev.employee_name}</p>
                                    <p className="text-[10px] text-gray-400">
                                        <span className={`${ev.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ev.event_label}</span>
                                        <span className="ml-2 font-mono">{ev.points > 0 ? '+' : ''}{ev.points} pt</span>
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Creato da: <span className="text-purple-300">{ev.creator_name}</span>
                                        {ev.created_at && ` • ${format(parseISO(ev.created_at), 'dd/MM HH:mm')}`}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => handleDelete(ev.id)} className="w-7 h-7 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-500/40" title="Elimina">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
