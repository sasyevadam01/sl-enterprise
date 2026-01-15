import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const getPriorityColor = (p) => {
    if (p >= 8) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";
    if (p >= 5) return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
};

export default function TaskItem({ task, isSelected, onClick }) {
    const isUrgent = task.priority >= 8;
    const isCompleted = task.status === 'completed';

    return (
        <div
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-xl border transition-all cursor-pointer mb-3
                ${isSelected
                    ? 'bg-slate-800 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                    : 'bg-slate-900/40 border-white/5 hover:bg-slate-800 hover:border-white/10'
                }
                ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
            `}
        >
            {/* Left Priority Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getPriorityColor(task.priority)}`} />

            <div className="pl-5 pr-4 py-4">
                {/* Header: Badges & Date */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1.5 flex-wrap">
                        {isUrgent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20">
                                Urgent
                            </span>
                        )}
                        {task.category && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-gray-300 border border-white/5">
                                {task.category}
                            </span>
                        )}
                    </div>
                    {task.deadline && (
                        <span className={`text-xs font-mono font-bold ${new Date(task.deadline) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                            {format(new Date(task.deadline), 'd MMM', { locale: it })}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h4 className={`text-sm font-bold leading-tight mb-3 ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.title}
                </h4>

                {/* Footer: Avatar & Icons */}
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                        {/* Assignee Avatar (Initials) */}
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white border border-white/10 ring-2 ring-slate-900">
                            {task.assignee_name ? task.assignee_name.charAt(0) : '?'}
                        </div>
                        <span className="text-xs text-gray-400 truncate max-w-[80px]">
                            {task.assignee_name?.split(' ')[0]}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                        {task.attachments?.length > 0 && <span>📎 {task.attachments.length}</span>}
                        {task.checklist?.length > 0 && (
                            <span>
                                ☑️ {task.checklist.filter(i => i.done).length}/{task.checklist.length}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
