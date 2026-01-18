import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../../api/client';
import { format } from 'date-fns';

export default function MyTasksWidget() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const myTasks = await tasksApi.getMyTasks();
                setTasks(Array.isArray(myTasks) ? myTasks.slice(0, 3) : []); // Limit to 3 as requested
                setLoading(false);
            } catch (err) {
                console.error("My Tasks Error", err);
                // setError(err.message || "Errore caricamento"); // Removed error msg on user request implication
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    // Checkbox REMOVED to prevent accidental completion

    if (loading) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    ✅ I Miei Task (Prioritari)
                </h3>
                {tasks.length > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{tasks.length}</span>}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="text-2xl mb-1">🎉</span>
                        <p className="text-xs">Nessun task in sospeso</p>
                        {/* Error hidden for cleanliness unless critical */}
                    </div>
                ) : (
                    tasks.map(task => (
                        <Link to={`/hr/tasks?open=${task.id}`} key={task.id} className="flex items-start gap-3 group p-2 hover:bg-white/5 rounded-lg transition border border-transparent hover:border-white/5">
                            {/* Read-only Icon instead of Checkbox */}
                            <div className="mt-1 text-slate-500">📌</div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-semibold text-gray-100 group-hover:text-white transition truncate">{task.title}</p>
                                    {task.priority >= 8 && <span className="text-[10px] text-red-400 font-bold ml-2">ALTA</span>}
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-snug">{task.description || "Nessuna descrizione"}</p>

                                <div className="flex items-center gap-2 mt-1.5">
                                    {task.due_date && (
                                        <span className="text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                                            📅 {format(new Date(task.due_date), 'dd/MM')}
                                        </span>
                                    )}
                                    {task.assigned_by_name && (
                                        <span className="text-[10px] text-gray-500">
                                            da: {task.author_name || "Admin"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            <Link
                to="/hr/tasks"
                className="w-full mt-4 text-xs text-center text-blue-400 hover:text-blue-300 py-2 border border-dashed border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition"
            >
                + Gestisci Task Board
            </Link>
        </div>
    );
}
