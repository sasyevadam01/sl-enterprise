import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecurityConfirmModal({ isOpen, onClose, onConfirm, title, message, itemName }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop with Heavy Blur & Noise */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                        onClick={onClose}
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    </motion.div>

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-slate-900 border border-red-500/50 rounded-2xl p-0 overflow-hidden shadow-[0_0_60px_rgba(220,38,38,0.3)]"
                    >
                        {/* Red Hazard Striped Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(0,0,0,0.2)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2)_75%,transparent_75%,transparent)] animate-[pulse_4s_ease-in-out_infinite]"></div>

                        <div className="p-8 text-center">
                            {/* Animated Icon */}
                            <div className="mx-auto w-20 h-20 mb-6 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping"></div>
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-3xl border border-red-500 mb-0">
                                    ⚠️
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                                {title || "CONFERMA ELIMINAZIONE"}
                            </h2>
                            <p className="text-gray-400 text-sm font-mono mb-6">
                                {message || "Questa operazione è irreversibile e verrà registrata nei log di sistema."}
                                {itemName && <br />}
                                {itemName && <span className="text-white font-bold block mt-2 p-2 bg-red-900/20 rounded border border-red-500/30">Target: {itemName}</span>}
                            </p>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition font-bold uppercase text-xs tracking-wider"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition font-black uppercase text-xs tracking-widest border border-red-400 flex items-center gap-2 group"
                                >
                                    <span>CONFERMA</span>
                                    <span className="group-hover:translate-x-1 transition">➜</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer Security ID */}
                        <div className="bg-black/40 border-t border-white/5 py-2 px-4 flex justify-between items-center">
                            <span className="text-[10px] text-gray-600 font-mono">SECURE-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                            <span className="text-[10px] text-red-500/50 font-black uppercase">Admin Authorized</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
