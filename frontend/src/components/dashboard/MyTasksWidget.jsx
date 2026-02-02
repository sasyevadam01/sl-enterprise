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
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    if (loading) {
        return (
            <div className="master-card p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    return (
        <div className="master-card p-6 h-full flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> I Miei Task
                </h3>
                {tasks.length > 0 && (
                    <span className="neon-red text-sm font-bold">{tasks.length}</span>
                )}
            </div>

            {/* Task List */}
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <span className="text-3xl mb-2">🎉</span>
                        <p className="text-xs">Nessun task in sospeso</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <Link
                            to={`/hr/tasks?open=${task.id}`}
                            key={task.id}
                            className="block p-3 rounded-xl border border-white/5 hover:border-emerald-500/20 
                                       bg-zinc-800/30 hover:bg-zinc-800/50 transition-all duration-200 group"
                        >
                            <div className="flex items-start gap-3">
                                {/* Priority indicator */}
                                <div className="mt-1">
                                    {task.priority >= 8 ? (
                                        <span className="status-dot status-high"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                                            {task.title}
                                        </p>
                                        {task.priority >= 8 && (
                                            <span className="text-[10px] neon-red font-bold ml-2 shrink-0">ALTA</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                                        {task.description || "Nessuna descrizione"}
                                    </p>

                                    <div className="flex items-center gap-2 mt-2">
                                        {task.due_date && (
                                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-mono">
                                                📅 {format(new Date(task.due_date), 'dd/MM')}
                                            </span>
                                        )}
                                        {task.assigned_by_name && (
                                            <span className="text-[10px] text-zinc-600">
                                                da: {task.author_name || "Admin"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Footer Link */}
            <Link
                to="/hr/tasks"
                className="w-full mt-4 text-xs text-center text-emerald-400 hover:text-emerald-300 py-2.5 
                           border border-dashed border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 
                           transition-all duration-200 font-medium"
            >
                + Gestisci Task Board
            </Link>
        </div>
    );
}
