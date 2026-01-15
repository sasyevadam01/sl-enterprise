import React from 'react';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Conferma", isDanger = false }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition">Annulla</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg font-bold text-white transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}
