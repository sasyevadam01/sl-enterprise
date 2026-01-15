import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../../api/client';
import { format } from 'date-fns';

export default function MyTasksWidget() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const myTasks = await tasksApi.getMyTasks();
                setTasks(Array.isArray(myTasks) ? myTasks.slice(0, 5) : []); // Limit to 5
                setLoading(false);
            } catch (err) {
                console.error("My Tasks Error", err);
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const toggleTask = async (id, currentStatus) => {
        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== id));
        try {
            await tasksApi.updateTask(id, { status: 'completed' }); // Assuming check = complete
        } catch (err) {
            console.error("Task update failed", err);
            // Revert would be complex, just refresh
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
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    ✅ I Miei Task
                </h3>
                {tasks.length > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{tasks.length}</span>}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="text-2xl mb-1">🎉</span>
                        <p className="text-xs">Nessun task in sospeso</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 group p-2 hover:bg-white/5 rounded-lg transition">
                            <input
                                type="checkbox"
                                className="mt-1 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-blue-500 cursor-pointer"
                                onChange={() => toggleTask(task.id, task.status)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200 group-hover:text-white transition truncate font-medium">{task.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {task.due_date && (
                                        <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded font-mono">
                                            Scade: {format(new Date(task.due_date), 'dd/MM')}
                                        </span>
                                    )}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${task.priority === 'high' ? 'border-red-500/30 text-red-400' : 'border-slate-600 text-gray-500'}`}>
                                        {task.priority === 'high' ? 'Alta' : 'Normal'}
                                    </span>
                                </div>
                            </div>
                        </div>
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
