/**
 * TaskSearchBar - Smart Search with Autocomplete
 * Cerca in: titolo, descrizione, assegnatario, autore, allegati
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

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate suggestions based on query
    useEffect(() => {
        if (!value || value.length < 2) {
            setSuggestions({ people: [], tasks: [], attachments: [] });
            return;
        }

        const q = value.toLowerCase();

        // Find matching people (assignees/authors)
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

        // Find matching tasks by title
        const matchingTasks = tasks
            .filter(t => t.title?.toLowerCase().includes(q))
            .slice(0, 5)
            .map(t => ({ id: t.id, title: t.title, status: t.status }));

        // Find matching attachments
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => value.length >= 2 && setShowSuggestions(true)}
                    placeholder="Cerca task, persone, allegati..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {value && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && hasSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">

                    {/* People */}
                    {suggestions.people.length > 0 && (
                        <div className="p-2 border-b border-white/5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">👤 Persone</p>
                            {suggestions.people.map((p, i) => (
                                <button
                                    key={`person-${i}`}
                                    onClick={() => handleSelectPerson(p)}
                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition flex items-center justify-between"
                                >
                                    <span className="text-white">{p.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {p.type === 'assignee' ? 'Assegnatario' : 'Autore'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tasks */}
                    {suggestions.tasks.length > 0 && (
                        <div className="p-2 border-b border-white/5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">📋 Task</p>
                            {suggestions.tasks.map((t, i) => (
                                <button
                                    key={`task-${i}`}
                                    onClick={() => handleSelectTask(t)}
                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition flex items-center justify-between"
                                >
                                    <span className="text-white truncate">{t.title}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '▶️' : '○'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Attachments */}
                    {suggestions.attachments.length > 0 && (
                        <div className="p-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">📎 Allegati</p>
                            {suggestions.attachments.map((a, i) => (
                                <button
                                    key={`attach-${i}`}
                                    onClick={() => handleSelectTask({ title: a.taskTitle })}
                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition"
                                >
                                    <span className="text-white">{a.filename}</span>
                                    <span className="text-xs text-gray-500 block truncate">in: {a.taskTitle}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
