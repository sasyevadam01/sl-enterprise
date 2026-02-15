/**
 * MyTasksWidget — Premium Enterprise with Color
 * v5.1 Colored priority borders and vivid badges
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../../api/client';
import { format } from 'date-fns';
import { CheckCircle2, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';

export default function MyTasksWidget() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const myTasks = await tasksApi.getMyTasks();
                setTasks(Array.isArray(myTasks) ? myTasks.slice(0, 4) : []);
            } catch (err) {
                console.error("My Tasks Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-green rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="dashboard-card bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">I Miei Task</h3>
                </div>
                {tasks.length > 0 && (
                    <span className="bg-brand-green text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center shadow-sm">
                        {tasks.length}
                    </span>
                )}
            </div>

            {/* Task List */}
            <div className="space-y-2 flex-1 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6 text-green-300" />
                        </div>
                        <p className="text-sm font-medium">Nessun task in sospeso</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <Link
                            to={`/hr/tasks?open=${task.id}`}
                            key={task.id}
                            className={`row-hover flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 group ${task.priority >= 8
                                ? 'border-red-200 bg-red-50/30'
                                : 'border-slate-100 bg-slate-50/30'
                                }`}
                        >
                            {/* Priority indicator */}
                            <div className="mt-0.5">
                                {task.priority >= 8 ? (
                                    <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900 truncate">
                                        {task.title}
                                    </p>
                                    {task.priority >= 8 && (
                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                            Alta
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                    {task.description || "Nessuna descrizione"}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    {task.due_date && (
                                        <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(task.due_date), 'dd/MM')}
                                        </span>
                                    )}
                                    {task.author_name && (
                                        <span className="text-[11px] text-slate-400">da {task.author_name}</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Footer */}
            <Link
                to="/hr/tasks"
                className="flex items-center justify-center gap-2 mt-4 py-2.5 text-sm font-medium text-brand-green
                           bg-brand-green/5 hover:bg-brand-green/10 rounded-xl transition-colors"
            >
                Gestisci Task Board
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}
