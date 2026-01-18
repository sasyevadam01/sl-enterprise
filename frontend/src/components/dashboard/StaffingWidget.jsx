import React, { useState, useEffect } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Reparti da ESCLUDERE dal conteggio personale operativo
const EXCLUDED_DEPARTMENTS = ['Ufficio', 'Autisti', 'Dirigenza', 'Direzione'];

export default function StaffingWidget() {
    const [data, setData] = useState({
        absentees: [],
        totalOperativeStaff: 0,
        byType: {
            vacation: 0,
            sick: 0,
            permit: 0,
            sudden_permit: 0
        },
        loading: true
    });

    useEffect(() => {
        const fetchStaffing = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');

                const [leavesResponse, employees] = await Promise.all([
                    leavesApi.getLeaves({
                        status_filter: 'approved',
                        start_date: today,
                        end_date: today
                    }).catch(() => []),
                    employeesApi.getEmployees().catch(() => [])
                ]);

                const leaves = Array.isArray(leavesResponse) ? leavesResponse : [];

                // Filter operational employees (exclude ufficio, autisti, dirigenti)
                const operativeEmployees = employees.filter(e =>
                    e.is_active &&
                    !EXCLUDED_DEPARTMENTS.some(dept =>
                        e.department_name?.toLowerCase().includes(dept.toLowerCase())
                    )
                );

                // Filter leaves that cover today
                const todayLeaves = leaves.filter(l => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const t = new Date(today);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    t.setHours(12, 0, 0, 0);

                    // Only count if employee is operative
                    const emp = operativeEmployees.find(e => e.id === l.employee_id);
                    if (!emp) return false;

                    return t >= start && t <= end;
                }).map(l => {
                    const emp = employees.find(e => e.id === l.employee_id);
                    return {
                        ...l,
                        employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Dipendente'
                    };
                });

                // Count by type
                const byType = {
                    vacation: todayLeaves.filter(l => l.leave_type === 'vacation').length,
                    sick: todayLeaves.filter(l => l.leave_type === 'sick').length,
                    permit: todayLeaves.filter(l => l.leave_type === 'permit').length,
                    sudden_permit: todayLeaves.filter(l => l.leave_type === 'sudden_permit').length
                };

                setData({
                    absentees: todayLeaves,
                    totalOperativeStaff: operativeEmployees.length,
                    byType,
                    loading: false
                });

            } catch (err) {
                console.error("Staffing Widget Error", err);
                setData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchStaffing();
    }, []);

    if (data.loading) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    const totalAbsent = data.absentees.length;
    const absencePercent = data.totalOperativeStaff > 0
        ? Math.round((totalAbsent / data.totalOperativeStaff) * 100)
        : 0;

    // Color logic for absence percentage (inverted - lower is better)
    const absenceColor = absencePercent <= 5 ? 'text-green-400' : (absencePercent <= 15 ? 'text-orange-400' : 'text-red-400');

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 h-full flex flex-col relative overflow-hidden shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                📊 Assenze Oggi
            </h3>

            {/* Absence Type Breakdown Grid */}
            <div className="grid grid-cols-5 gap-2 mb-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-blue-400">{data.byType.vacation}</span>
                    <p className="text-[9px] text-blue-300/70 uppercase">Ferie</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-red-400">{data.byType.sick}</span>
                    <p className="text-[9px] text-red-300/70 uppercase">Malattia</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-purple-400">{data.byType.permit}</span>
                    <p className="text-[9px] text-purple-300/70 uppercase">Permesso</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-yellow-400">{data.byType.sudden_permit}</span>
                    <p className="text-[9px] text-yellow-300/70 uppercase">Improv.</p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-white">{totalAbsent}</span>
                    <p className="text-[9px] text-gray-400 uppercase">Totale</p>
                </div>
            </div>

            {/* Absence Percentage */}
            <div className="flex items-center justify-between mb-4 py-2 px-3 bg-slate-900/50 rounded-lg border border-white/5">
                <span className="text-xs text-gray-400">% Assenza su {data.totalOperativeStaff} operativi</span>
                <span className={`text-xl font-bold ${absenceColor}`}>{absencePercent}%</span>
            </div>

            {/* Absentee List - Simplified */}
            <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Lista Assenti</h4>
            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {data.absentees.length === 0 ? (
                    <p className="text-xs text-green-400 text-center py-2">Tutti Presenti! 🎉</p>
                ) : (
                    data.absentees.map((leave, i) => (
                        <Link
                            key={i}
                            to={`/hr/employees/${leave.employee_id}?tab=absences`}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer group"
                        >
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-gray-300 font-bold border border-white/10">
                                {leave.employee_name?.substring(0, 2)?.toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-gray-200 group-hover:text-blue-300 transition">
                                {leave.employee_name}
                            </p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
