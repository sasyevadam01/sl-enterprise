import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChecklistRenderer } from './ChecklistRenderer';
import TaskComments from './TaskComments';
import TaskAttachments from './TaskAttachments';

export default function TaskDetailPanel({ task, onClose, onUpdate, onDelete, canAct, isManager, currentUser }) {
    if (!task) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-10 text-center">
            <div className="text-6xl mb-4 opacity-20">👋</div>
            <p className="text-lg font-medium">Seleziona un task per vedere i dettagli</p>
        </div>
    );

    const [tab, setTab] = useState('details'); // details | chat

    // Determine status color
    const statusColors = {
        pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        acknowledged: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    const statusLabels = {
        pending: 'Da Fare',
        in_progress: 'In Corso',
        completed: 'Completato',
        acknowledged: 'Visto'
    };

    const handleChecklistToggle = async (index, newVal) => {
        const newChecklist = [...task.checklist];
        newChecklist[index].done = newVal;
        await onUpdate(task.id, { checklist: newChecklist });
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white">
                        ←
                    </button>
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${statusColors[task.status] || statusColors.pending}`}>
                        {statusLabels[task.status] || task.status}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Action Buttons */}
                    {canAct && task.status !== 'completed' && (
                        <button
                            onClick={() => onUpdate(task.id, 'completed')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20"
                        >
                            ✓ Completa
                        </button>
                    )}
                    {(isManager || canAct) && (
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-white/5">
                            {/* Minimal Actions Menu could go here */}
                            {isManager && (
                                <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-white/5" title="Elimina">
                                    🗑️
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Title & Desc */}
                <h1 className="text-2xl font-bold text-white mb-2 leading-tight">{task.title}</h1>
                <div className="flex flex-wrap gap-2 mb-6">
                    {task.priority >= 8 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold">URGENTE ({task.priority})</span>}
                    {task.category && <span className="text-xs bg-slate-800 text-gray-300 px-2 py-0.5 rounded border border-white/5">{task.category}</span>}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        📅 Scadenza: <span className={task.deadline && new Date(task.deadline) < new Date() ? 'text-red-400 font-bold' : ''}>
                            {task.deadline ? format(new Date(task.deadline), 'd MMMM yyyy HH:mm', { locale: it }) : 'Nessuna'}
                        </span>
                    </span>
                </div>

                <div className="prose prose-invert max-w-none text-gray-300 text-sm mb-8 whitespace-pre-wrap leading-relaxed">
                    {task.description || <em className="text-gray-600">Nessuna descrizione fornita.</em>}
                </div>

                {/* Checklist Section */}
                <div className="mb-8 bg-slate-800/30 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        ☑️ Checklist ({task.checklist?.filter(i => i.done).length || 0}/{task.checklist?.length || 0})
                    </h3>
                    <ChecklistRenderer
                        items={task.checklist || []}
                        onToggle={handleChecklistToggle}
                        readOnly={!canAct || task.status === 'completed'}
                    />
                </div>

                {/* Tabs for Comments / Attachments */}
                <div className="border-t border-white/10 pt-6">
                    <div className="flex gap-4 mb-4 border-b border-white/5 pb-2">
                        <button
                            onClick={() => setTab('details')}
                            className={`pb-2 text-sm font-bold ${tab === 'details' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            💬 Commenti
                        </button>
                        <button
                            onClick={() => setTab('files')}
                            className={`pb-2 text-sm font-bold ${tab === 'files' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            📎 Allegati ({task.attachments?.length || 0})
                        </button>
                    </div>

                    {tab === 'details' ? (
                        <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-white/5 min-h-[300px]">
                            <TaskComments taskId={task.id} currentUser={currentUser} />
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                            <TaskAttachments
                                taskId={task.id}
                                attachments={task.attachments || []}
                                onUpload={async (file) => {
                                    // Handle via parent or local logic? Usually passed down
                                    // For now just refresh via onUpdate would depend on implementation
                                }}
                                onDelete={async (fileId) => { }}
                                readOnly={!canAct}
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">Gestione allegati semplificata in questa view.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
