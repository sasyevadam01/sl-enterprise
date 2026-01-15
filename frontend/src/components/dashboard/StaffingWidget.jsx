import React, { useState, useEffect } from 'react';
import { kpiApi, leavesApi } from '../../api/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function StaffingWidget() {
    const [data, setData] = useState({
        present: 0,
        required: 0,
        absentees: [],
        coverage: 0,
        loading: true
    });

    useEffect(() => {
        const fetchStaffing = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');

                // Fetch Staffing Numbers (Present/Required)
                const panoramica = await kpiApi.getPanoramica(today) || {};

                // Fetch Absentees Details (Approved Leaves for Today)
                const response = await leavesApi.getLeaves({
                    status_filter: 'approved',
                    start_date: today,
                    end_date: today
                });
                const leaves = Array.isArray(response) ? response : [];

                // Filter leaves that actually cover today (double check as API range match might be inclusive)
                const todayLeaves = leaves.filter(l => {
                    const start = new Date(l.start_date);
                    const end = new Date(l.end_date);
                    const t = new Date(today);
                    return t >= start && t <= end;
                });

                // Use panoramica stats
                // Assuming panoramica returns objects like { total_staffing: { present, required } } or similar
                // If not, we might need to sum up sector requirements.
                // Let's assume panoramica.staffing_summary exists based on my previous analysis or I calculate it from sectors.

                let present = 0;
                let required = 0;

                if (panoramica.sectors) {
                    panoramica.sectors.forEach(s => {
                        present += s.operators_present || 0;
                        required += s.operators_required || 0;
                    });
                }

                const coverage = required > 0 ? Math.round((present / required) * 100) : 0;

                setData({
                    present,
                    required,
                    absentees: todayLeaves,
                    coverage,
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

    // Color logic for coverage
    const coverageColor = data.coverage >= 95 ? 'text-green-400' : (data.coverage >= 80 ? 'text-orange-400' : 'text-red-400');

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full flex flex-col relative overflow-hidden shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                👥 Presenze Turno
            </h3>

            <div className="flex items-end justify-between mb-6 pb-4 border-b border-white/5">
                <div>
                    <span className="text-3xl font-bold text-white">{data.present}</span>
                    <span className="text-sm text-gray-400"> / {data.required} Need</span>
                </div>
                <div className="text-right">
                    <span className={`text-xl font-bold ${coverageColor}`}>{data.coverage}%</span>
                    <p className="text-[10px] text-gray-500 uppercase">Copertura</p>
                </div>
            </div>

            <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Assenti Oggi ({data.absentees.length})</h4>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {data.absentees.length === 0 ? (
                    <p className="text-xs text-green-400">Tutti Presenti! 🎉</p>
                ) : (
                    data.absentees.map((leave, i) => (
                        <Link
                            key={i}
                            to={`/hr/employees/${leave.employee_id}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-gray-300 font-bold border border-white/10">
                                    {leave.employee_name?.substring(0, 2)?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-200 group-hover:text-blue-300 transition">{leave.employee_name}</p>
                                    <p className="text-[10px] text-gray-500">{leave.leave_type}</p>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
