import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`relative w-full ${maxWidth} bg-[#121212] 
                        border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-[101] overflow-hidden`}
                    >
                        {/* Glass / Glow Effects */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/40 to-transparent" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors z-50"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 relative z-10">
                            {/* Header */}
                            {(title || icon) && (
                                <div className="text-center mb-8">
                                    {icon && <div className="text-5xl mb-4 drop-shadow-lg">{icon}</div>}
                                    {title && (
                                        <h3 className="text-2xl font-bold text-white tracking-wide">
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
                </>
            )}
        </AnimatePresence>
    );
}
