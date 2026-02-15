/**
 * StaffingWidget — Assenze Oggi
 * v5.0 Premium Enterprise Light
 */
import { useState, useEffect } from 'react';
import { leavesApi, employeesApi } from '../../api/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { UserMinus, Users } from 'lucide-react';

const EXCLUDED_DEPARTMENTS = ['Ufficio', 'Autisti', 'Dirigenza', 'Direzione'];

export default function StaffingWidget() {
    const [data, setData] = useState({
        absentees: [],
        totalOperativeStaff: 0,
        byType: { vacation: 0, sick: 0, permit: 0, sudden_permit: 0 },
        loading: true
    });

    useEffect(() => {
        const fetchStaffing = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const [leavesResponse, employees] = await Promise.all([
                    leavesApi.getLeaves({ status_filter: 'approved', start_date: today, end_date: today }).catch(() => []),
                    employeesApi.getEmployees().catch(() => [])
                ]);

                const leaves = Array.isArray(leavesResponse) ? leavesResponse : [];
                const operativeEmployees = employees.filter(e =>
                    e.is_active && !EXCLUDED_DEPARTMENTS.some(dept => e.department_name?.toLowerCase().includes(dept.toLowerCase()))
                );

                const todayLeaves = leaves.filter(l => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const t = new Date(today);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    t.setHours(12, 0, 0, 0);
                    const emp = operativeEmployees.find(e => e.id === l.employee_id);
                    if (!emp) return false;
                    return t >= start && t <= end;
                }).map(l => {
                    const emp = employees.find(e => e.id === l.employee_id);
                    return { ...l, employee_name: emp ? `${emp.last_name} ${emp.first_name}` : 'Dipendente' };
                });

                setData({
                    absentees: todayLeaves,
                    totalOperativeStaff: operativeEmployees.length,
                    byType: {
                        vacation: todayLeaves.filter(l => l.leave_type === 'vacation').length,
                        sick: todayLeaves.filter(l => l.leave_type === 'sick').length,
                        permit: todayLeaves.filter(l => l.leave_type === 'permit').length,
                        sudden_permit: todayLeaves.filter(l => l.leave_type === 'sudden_permit').length
                    },
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-green rounded-full animate-spin" />
            </div>
        );
    }

    const totalAbsent = data.absentees.length;
    const absencePercent = data.totalOperativeStaff > 0 ? Math.round((totalAbsent / data.totalOperativeStaff) * 100) : 0;

    const typeColors = [
        { key: 'vacation', label: 'Ferie', value: data.byType.vacation, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
        { key: 'sick', label: 'Malattia', value: data.byType.sick, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
        { key: 'permit', label: 'Permesso', value: data.byType.permit, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
        { key: 'sudden_permit', label: 'Improv.', value: data.byType.sudden_permit, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    ];

    return (
        <div className="dashboard-card bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                    <UserMinus className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Assenze Oggi</h3>
            </div>

            {/* Type breakdown */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {typeColors.map(t => (
                    <div key={t.key} className={`text-center py-2.5 px-1 rounded-xl ${t.bg} border-2 ${t.border}`}>
                        <span className={`text-lg font-bold ${t.text} tabular-nums`}>{t.value}</span>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5 font-medium">{t.label}</p>
                    </div>
                ))}
            </div>

            {/* Absence rate */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                <span className="text-xs text-slate-500">% Assenza su {data.totalOperativeStaff} operativi</span>
                <span className={`text-xl font-bold tabular-nums ${absencePercent <= 5 ? 'text-green-600' : absencePercent <= 15 ? 'text-orange-600' : 'text-red-600'}`}>
                    {absencePercent}%
                </span>
            </div>

            {/* Absentee list */}
            <h4 className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Lista Assenti</h4>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {data.absentees.length === 0 ? (
                    <p className="text-sm text-green-600 text-center py-3 font-medium">Tutti Presenti</p>
                ) : (
                    data.absentees.map((leave, i) => (
                        <Link
                            key={i}
                            to={`/hr/employees/${leave.employee_id}?tab=absences`}
                            className="row-hover flex items-center gap-2.5 py-2.5 -mx-1 px-1 rounded-lg group"
                        >
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                                {leave.employee_name?.substring(0, 2)?.toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                                {leave.employee_name}
                            </p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
