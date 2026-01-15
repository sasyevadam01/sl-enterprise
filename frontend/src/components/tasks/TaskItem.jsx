import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const getPriorityColor = (p) => {
    if (p >= 8) return "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]";
    if (p >= 5) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
};

export default function TaskItem({ task, isSelected, onClick, currentUserId }) {
    const isUrgent = task.priority >= 8;
    const isCompleted = task.status === 'completed';
    const isMine = String(task.assigned_to) === String(currentUserId);
    const isDelegated = String(task.author_id) === String(currentUserId) && !isMine;

    // Dynamic Border/Background based on ownership
    let cardStyle = "border-white/5 bg-slate-900/40"; // Default
    if (isMine) cardStyle = "border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20";
    if (isDelegated) cardStyle = "border-purple-500/30 bg-purple-900/10 hover:bg-purple-900/20";
    if (isSelected) cardStyle = "bg-slate-800 border-blue-500 shadow-lg ring-1 ring-blue-500/50";

    return (
        <div
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-xl border transition-all cursor-pointer mb-3
                ${cardStyle}
                ${isCompleted ? 'opacity-60 grayscale-[0.5]' : 'hover:scale-[1.01]'}
            `}
        >
            {/* Left Priority Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getPriorityColor(task.priority)}`} />

            <div className="pl-5 pr-4 py-4">
                {/* Header: Badges & Date */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1.5 flex-wrap items-center">
                        {/* Priority Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${task.priority >= 8 ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-slate-700/50'}`}>
                            P{task.priority}
                        </span>

                        {isUrgent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20 animate-pulse">
                                URGENT
                            </span>
                        )}
                        {task.category && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-gray-300 border border-white/5">
                                {task.category}
                            </span>
                        )}
                        {isMine && <span className="text-[10px] text-blue-400 font-bold border border-blue-500/30 px-1 rounded">MIO</span>}
                        {isDelegated && <span className="text-[10px] text-purple-400 font-bold border border-purple-500/30 px-1 rounded">DELEGATO</span>}
                    </div>
                    {task.deadline && (
                        <span className={`text-xs font-mono font-bold ${new Date(task.deadline) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                            {format(new Date(task.deadline), 'd MMM', { locale: it })}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h4 className={`text-base font-bold leading-tight mb-4 ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.title}
                </h4>

                {/* Footer: Avatar & Icons */}
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        {/* Assignee Avatar (Initials) */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-white/10 ring-2 ring-slate-900 shadow-md">
                            {task.assignee_name ? task.assignee_name.charAt(0) : '?'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Assegnato a</span>
                            <span className="text-sm font-bold text-gray-200 leading-none">
                                {task.assignee_name || "Nessuno"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500 text-xs">
                        {task.attachments?.length > 0 && <span>📎 {task.attachments.length}</span>}
                        {task.checklist?.length > 0 && (
                            <span className={task.checklist.every(i => i.done) ? 'text-emerald-400' : ''}>
                                ☑️ {task.checklist.filter(i => i.done).length}/{task.checklist.length}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
