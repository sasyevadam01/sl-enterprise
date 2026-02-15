/**
 * TaskSearchBar - Smart Search with Autocomplete
 * v3.0 - Premium Enterprise Light Mode
 */
import { useState, useEffect, useRef } from 'react';

export default function TaskSearchBar({
    value,
    onChange,
    tasks = [],
    users = [],
    onSelectSuggestion
}) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState({ people: [], tasks: [], attachments: [] });
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value || value.length < 2) {
            setSuggestions({ people: [], tasks: [], attachments: [] });
            return;
        }

        const q = value.toLowerCase();

        const peopleSet = new Set();
        tasks.forEach(t => {
            if (t.assignee_name?.toLowerCase().includes(q)) {
                peopleSet.add(JSON.stringify({ id: t.assigned_to, name: t.assignee_name, type: 'assignee' }));
            }
            if (t.author_name?.toLowerCase().includes(q)) {
                peopleSet.add(JSON.stringify({ id: t.created_by, name: t.author_name, type: 'author' }));
            }
        });
        const people = [...peopleSet].map(p => JSON.parse(p)).slice(0, 5);

        const matchingTasks = tasks
            .filter(t => t.title?.toLowerCase().includes(q))
            .slice(0, 5)
            .map(t => ({ id: t.id, title: t.title, status: t.status }));

        const matchingAttachments = [];
        tasks.forEach(t => {
            t.attachments?.forEach(a => {
                if (a.filename?.toLowerCase().includes(q)) {
                    matchingAttachments.push({
                        taskId: t.id,
                        taskTitle: t.title,
                        filename: a.filename
                    });
                }
            });
        });

        setSuggestions({
            people: people,
            tasks: matchingTasks.slice(0, 5),
            attachments: matchingAttachments.slice(0, 3)
        });
    }, [value, tasks]);

    const handleInputChange = (e) => {
        onChange(e.target.value);
        setShowSuggestions(true);
    };

    const handleSelectPerson = (person) => {
        if (onSelectSuggestion) {
            onSelectSuggestion({ type: 'person', ...person });
        }
        setShowSuggestions(false);
    };

    const handleSelectTask = (task) => {
        onChange(task.title);
        setShowSuggestions(false);
    };

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    const hasSuggestions = suggestions.people.length > 0 ||
        suggestions.tasks.length > 0 ||
        suggestions.attachments.length > 0;

    return (
        <div ref={containerRef} className="relative flex-grow">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => value.length >= 2 && setShowSuggestions(true)}
                    placeholder="Cerca task, persone, allegati..."
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
                {value && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && hasSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">

                    {/* People */}
                    {suggestions.people.length > 0 && (
                        <div className="p-2 border-b border-slate-100">
                            <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-1">Persone</p>
                            {suggestions.people.map((p, i) => (
                                <button
                                    key={`person-${i}`}
                                    onClick={() => handleSelectPerson(p)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition flex items-center justify-between cursor-pointer"
                                >
                                    <span className="text-slate-800 font-medium">{p.name}</span>
                                    <span className="text-xs text-slate-400">
                                        {p.type === 'assignee' ? 'Assegnatario' : 'Autore'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tasks */}
                    {suggestions.tasks.length > 0 && (
                        <div className="p-2 border-b border-slate-100">
                            <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-1">Task</p>
                            {suggestions.tasks.map((t, i) => (
                                <button
                                    key={`task-${i}`}
                                    onClick={() => handleSelectTask(t)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition flex items-center justify-between cursor-pointer"
                                >
                                    <span className="text-slate-800 truncate">{t.title}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {t.status === 'completed' ? '✓ Fatto' : t.status === 'in_progress' ? 'In Corso' : 'Da fare'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Attachments */}
                    {suggestions.attachments.length > 0 && (
                        <div className="p-2">
                            <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-1">Allegati</p>
                            {suggestions.attachments.map((a, i) => (
                                <button
                                    key={`attach-${i}`}
                                    onClick={() => handleSelectTask({ title: a.taskTitle })}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                                >
                                    <span className="text-slate-800">{a.filename}</span>
                                    <span className="text-xs text-slate-400 block truncate">in: {a.taskTitle}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
