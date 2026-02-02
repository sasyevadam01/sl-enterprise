/**
 * SL Enterprise - Command Palette
 * Ctrl+K global search and quick actions
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// All navigable routes with icons
const ROUTES = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', keywords: ['home', 'main', 'overview'] },
    { path: '/hr/employees', label: 'Dipendenti', icon: '👥', keywords: ['employees', 'staff', 'personale'] },
    { path: '/hr/approvals', label: 'Centro Approvazioni', icon: '✅', keywords: ['approvals', 'pending', 'requests'] },
    { path: '/hr/management', label: 'Gestione HR', icon: '🛡️', keywords: ['hr', 'management', 'risorse'] },
    { path: '/hr/calendar', label: 'Calendario', icon: '📅', keywords: ['calendar', 'events', 'schedule'] },
    { path: '/hr/security', label: 'Sicurezza RSPP', icon: '🦺', keywords: ['security', 'safety', 'rspp'] },
    { path: '/hr/events/new', label: 'Nuova Richiesta Evento', icon: '➕', keywords: ['new', 'event', 'request', 'assenza'] },
    { path: '/hr/tasks', label: 'Task Board', icon: '📋', keywords: ['tasks', 'todo', 'board'] },
    { path: '/hr/planner', label: 'Gestione Turni', icon: '🗓️', keywords: ['shifts', 'planner', 'turni'] },
    { path: '/hr/announcements', label: 'Bacheca Annunci', icon: '📢', keywords: ['announcements', 'annunci', 'news'] },
    { path: '/chat', label: 'Chat', icon: '💬', keywords: ['chat', 'messages', 'messaggi'] },
    { path: '/factory/dashboard', label: 'Dashboard Produzione', icon: '🏭', keywords: ['factory', 'production'] },
    { path: '/factory/maintenance', label: 'Manutenzioni', icon: '🔧', keywords: ['maintenance', 'manutenzioni'] },
    { path: '/factory/kpi', label: 'Inserimento KPI', icon: '⚙️', keywords: ['kpi', 'data', 'entry'] },
    { path: '/production/orders', label: 'Richiesta Blocchi', icon: '📦', keywords: ['blocks', 'orders', 'blocchi'] },
    { path: '/production/blocks', label: 'Lista Prelievi', icon: '🚚', keywords: ['picking', 'supply', 'prelievi'] },
    { path: '/logistics/request', label: 'Richiesta Materiale', icon: '📋', keywords: ['logistics', 'material', 'materiale'] },
    { path: '/logistics/pool', label: 'Gestione Magazzino', icon: '🚛', keywords: ['warehouse', 'magazzino', 'pool'] },
    { path: '/logistics/dashboard', label: 'Dashboard Logistica', icon: '📊', keywords: ['logistics', 'dashboard'] },
    { path: '/admin/users', label: 'Gestione Utenti', icon: '👤', keywords: ['users', 'admin', 'utenti'] },
    { path: '/admin/config', label: 'Configurazioni', icon: '🛠️', keywords: ['config', 'settings', 'impostazioni'] },
    { path: '/admin/logistics', label: 'Config. Logistica', icon: '📦', keywords: ['logistics', 'config'] },
    { path: '/admin/audit', label: 'Audit Log', icon: '📜', keywords: ['audit', 'log', 'history'] },
];

// Quick actions
const ACTIONS = [
    { id: 'new-leave', label: 'Nuova Richiesta Assenza', icon: '🏖️', path: '/hr/events/new', keywords: ['assenza', 'ferie', 'leave', 'permesso'] },
    { id: 'new-task', label: 'Nuovo Task', icon: '✏️', path: '/hr/tasks', action: 'create-task', keywords: ['task', 'todo', 'nuovo'] },
    { id: 'new-material', label: 'Richiesta Materiale', icon: '📦', path: '/logistics/request', keywords: ['materiale', 'logistics', 'richiesta'] },
];

export default function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // Filter results based on query
    const results = useMemo(() => {
        if (!query.trim()) {
            // Show quick actions first, then recent pages
            return [
                ...ACTIONS.slice(0, 3),
                ...ROUTES.slice(0, 5)
            ];
        }

        const q = query.toLowerCase();

        // Search in routes
        const matchedRoutes = ROUTES.filter(route =>
            route.label.toLowerCase().includes(q) ||
            route.keywords.some(k => k.includes(q))
        );

        // Search in actions
        const matchedActions = ACTIONS.filter(action =>
            action.label.toLowerCase().includes(q) ||
            action.keywords.some(k => k.includes(q))
        );

        return [...matchedActions, ...matchedRoutes];
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleSelect(results[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const handleSelect = (item) => {
        if (item.path) {
            navigate(item.path);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] command-palette-overlay flex items-start justify-center pt-[15vh]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="command-palette overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                🔍
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Cerca pagine, azioni..."
                                className="w-full command-palette-input py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 hidden sm:block">
                                ESC per chiudere
                            </span>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {results.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                Nessun risultato per "{query}"
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {/* Quick Actions Header */}
                                {!query && (
                                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Azioni Rapide
                                    </div>
                                )}

                                {results.map((item, index) => (
                                    <button
                                        key={item.path || item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full command-palette-item flex items-center gap-3 px-4 py-3 text-left ${index === selectedIndex ? 'active' : ''
                                            }`}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="text-white font-medium">{item.label}</span>
                                        {item.id && (
                                            <span className="ml-auto text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                                                Azione
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span>↑↓ naviga</span>
                            <span>↵ seleziona</span>
                        </div>
                        <span className="text-purple-400 font-mono">Ctrl+K</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
