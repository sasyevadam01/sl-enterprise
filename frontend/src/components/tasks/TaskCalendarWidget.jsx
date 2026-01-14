import React, { useState } from 'react';

export default function TaskCalendarWidget({ tasks, onDateSelect, selectedDate }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay: firstDay === 0 ? 6 : firstDay - 1 }; // Mon start
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Filter out completed tasks and map to dates
    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const tasksByDate = activeTasks.reduce((acc, task) => {
        if (task.deadline) {
            const d = new Date(task.deadline).toDateString();
            if (!acc[d]) acc[d] = [];
            acc[d].push(task);
        }
        return acc;
    }, {});

    // Check if date is today
    const isToday = (dateObj) => dateObj.toDateString() === today.toDateString();

    // Check if date is selected
    const isSelected = (dateObj) => selectedDate && dateObj.toDateString() === selectedDate.toDateString();

    const renderDays = () => {
        const dayCells = [];
        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
        }

        // Days
        for (let d = 1; d <= days; d++) {
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const dateStr = dateObj.toDateString();
            const dayTasks = tasksByDate[dateStr] || [];
            const taskCount = dayTasks.length;

            // Priority Check
            const hasHighPriority = dayTasks.some(t => t.priority >= 8);
            const hasMediumPriority = dayTasks.some(t => t.priority >= 5 && t.priority < 8);

            let dotClass = '';
            if (hasHighPriority) dotClass = 'bg-red-500';
            else if (hasMediumPriority) dotClass = 'bg-yellow-500';
            else if (taskCount > 0) dotClass = 'bg-blue-500';

            // Classes for different states
            const isTodayDate = isToday(dateObj);
            const isSelectedDate = isSelected(dateObj);

            dayCells.push(
                <button
                    key={d}
                    onClick={() => onDateSelect(dateObj)}
                    className={`h-10 w-10 flex flex-col items-center justify-center rounded-lg relative transition text-sm font-medium
                        ${isTodayDate ? 'bg-blue-600 text-white ring-2 ring-blue-400' : ''}
                        ${isSelectedDate && !isTodayDate ? 'bg-purple-600 text-white' : ''}
                        ${!isTodayDate && !isSelectedDate ? 'text-gray-300 hover:bg-white/10' : ''}
                        ${taskCount > 0 && !isTodayDate && !isSelectedDate ? 'bg-white/5' : ''}
                    `}
                    title={taskCount > 0 ? `${taskCount} task in scadenza` : ''}
                >
                    <span>{d}</span>
                    {taskCount > 0 && (
                        <div className="flex items-center gap-0.5 absolute -bottom-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
                            {taskCount > 1 && (
                                <span className="text-[8px] text-gray-400">{taskCount}</span>
                            )}
                        </div>
                    )}
                </button>
            );
        }
        return dayCells;
    };

    // Count total active tasks with deadlines
    const totalTasksWithDeadline = activeTasks.filter(t => t.deadline).length;

    return (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-full max-w-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition">◀</button>
                <h3 className="text-white font-bold capitalize">{monthName}</h3>
                <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition">▶</button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs text-gray-500 font-bold">
                <div>Lun</div><div>Mar</div><div>Mer</div><div>Gio</div><div>Ven</div><div>Sab</div><div>Dom</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {renderDays()}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex gap-3 justify-center text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Urgente</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Normale</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Bassa</div>
                </div>

                {/* Stats */}
                <div className="text-center mt-2 text-xs text-gray-500">
                    📋 {totalTasksWithDeadline} task con scadenza
                </div>

                {/* Selected date info */}
                {selectedDate && (
                    <div className="mt-2 text-center">
                        <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                            📅 Filtro: {selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

