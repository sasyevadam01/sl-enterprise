import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval
} from 'date-fns';
import { it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function StylishCalendar({ selectedDate, onDateChange, isOpen, onClose }) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

    if (!isOpen) return null;

    const renderHeader = () => (
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
                <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-white capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h2>
            <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        return (
            <div className="grid grid-cols-7 gap-1 p-2">
                {calendarDays.map(day => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => {
                                onDateChange(day);
                                onClose();
                            }}
                            className={`
                                relative h-10 w-full rounded-xl flex items-center justify-center text-sm font-medium transition-all
                                ${!isCurrentMonth ? 'text-gray-600' : 'text-gray-300'}
                                ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold scale-105 z-10' : 'hover:bg-white/10'}
                                ${isToday && !isSelected ? 'text-blue-400 border border-blue-500/30' : ''}
                            `}
                        >
                            {format(day, 'd')}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-full mt-4 right-0 z-[100] w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {renderHeader()}
                <div className="p-2">
                    {renderDays()}
                    {renderCells()}
                </div>
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                    <button
                        onClick={() => { onDateChange(new Date()); onClose(); }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        VAI A OGGI
                    </button>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        CHIUDI
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
