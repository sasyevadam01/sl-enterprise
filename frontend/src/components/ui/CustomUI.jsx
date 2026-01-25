/**
 * Custom UI Components - Modals & Toasts
 * Replaces ugly native browser dialogs
 */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// ============================================================
// CONFIRM MODAL COMPONENT
// ============================================================
export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Conferma Azione",
    message = "Sei sicuro di voler procedere?",
    confirmText = "Conferma",
    cancelText = "Annulla",
    type = "warning" // warning, danger, info
}) {
    if (!isOpen) return null;

    const typeStyles = {
        warning: {
            icon: '⚠️',
            iconBg: 'bg-orange-500/20',
            button: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
        },
        danger: {
            icon: '🗑️',
            iconBg: 'bg-red-500/20',
            button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
        },
        info: {
            icon: 'ℹ️',
            iconBg: 'bg-blue-500/20',
            button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
        }
    };

    const style = typeStyles[type] || typeStyles.warning;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-md w-full transform animate-scaleIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Icon */}
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full ${style.iconBg} flex items-center justify-center text-3xl mb-4`}>
                        {style.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-gray-400">{message}</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 p-4 border-t border-white/10 bg-slate-900/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition ${style.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================
function Toast({ id, message, type, onRemove }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(id), 4000);
        return () => clearTimeout(timer);
    }, [id, onRemove]);

    const typeStyles = {
        success: {
            icon: '✓',
            border: 'border-l-green-500',
            iconBg: 'bg-green-500',
            bg: 'bg-green-500/10'
        },
        error: {
            icon: '✕',
            border: 'border-l-red-500',
            iconBg: 'bg-red-500',
            bg: 'bg-red-500/10'
        },
        warning: {
            icon: '!',
            border: 'border-l-orange-500',
            iconBg: 'bg-orange-500',
            bg: 'bg-orange-500/10'
        },
        info: {
            icon: 'i',
            border: 'border-l-blue-500',
            iconBg: 'bg-blue-500',
            bg: 'bg-blue-500/10'
        }
    };

    const style = typeStyles[type] || typeStyles.info;

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border-l-4 ${style.border} ${style.bg} bg-slate-800/95 backdrop-blur-xl shadow-xl animate-slideIn`}>
            <div className={`w-6 h-6 rounded-full ${style.iconBg} flex items-center justify-center text-white text-sm font-bold`}>
                {style.icon}
            </div>
            <p className="text-white flex-1">{message}</p>
            <button
                onClick={() => onRemove(id)}
                className="text-gray-500 hover:text-white transition"
            >
                ✕
            </button>
        </div>
    );
}

// ============================================================
// TOAST CONTAINER
// ============================================================
function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-4 right-4 z-[101] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast {...toast} onRemove={removeToast} />
                </div>
            ))}
        </div>
    );
}

// ============================================================
// CONTEXT FOR GLOBAL ACCESS
// ============================================================
const UIContext = createContext(null);

export function UIProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        resolve: null,
        props: {}
    });

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showConfirm = useCallback((props) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                resolve,
                props
            });
        });
    }, []);

    const handleConfirmClose = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState({ isOpen: false, resolve: null, props: {} });
    }, [confirmState]);

    const handleConfirmOk = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState({ isOpen: false, resolve: null, props: {} });
    }, [confirmState]);

    // Shorthand methods
    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info')
    };

    return (
        <UIContext.Provider value={{ toast, showConfirm }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={handleConfirmClose}
                onConfirm={handleConfirmOk}
                {...confirmState.props}
            />
        </UIContext.Provider>
    );
}

// ============================================================
// STANDARD MODAL (GENERIC)
// ============================================================
export function StandardModal({ title, isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full transform animate-scaleIn flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
                        ×
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Hook for easy access
export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within UIProvider');
    }
    return context;
}

// ============================================================
// CSS ANIMATIONS (add to index.css)
// ============================================================
export const customAnimationsCSS = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
}

.animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
}

.animate-scaleIn {
    animation: scaleIn 0.2s ease-out;
}

.animate-slideIn {
    animation: slideIn 0.3s ease-out;
}
`;
