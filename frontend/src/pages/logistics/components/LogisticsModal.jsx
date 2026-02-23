import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import MaterialIcon from './MaterialIcon';

export default function LogisticsModal({
    isOpen,
    onClose,
    title,
    icon = null,
    children,
    maxWidth = 'max-w-md'
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop + Modal Container */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center p-4 pt-16 overflow-y-auto"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={e => e.stopPropagation()}
                            className={`relative w-full ${maxWidth} bg-white
                            border border-slate-200 rounded-2xl shadow-xl overflow-hidden`}
                        >
                            {/* Top accent line */}
                            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-green/40 to-transparent" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-50"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-8 relative z-10">
                                {/* Header */}
                                {(title || icon) && (
                                    <div className="text-center mb-8">
                                        {icon && (
                                            <div className="mb-4 flex justify-center">
                                                {typeof icon === 'string' ? (
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                        <MaterialIcon emoji={icon} size={32} className="text-brand-green" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                        {icon}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {title && (
                                            <h3 className="text-2xl font-bold text-slate-800 tracking-wide">
                                                {title}
                                            </h3>
                                        )}
                                    </div>
                                )}

                                {/* Body */}
                                <div>
                                    {children}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
