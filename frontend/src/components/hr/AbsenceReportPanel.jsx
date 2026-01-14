/**
 * SL Enterprise - Absence Report Panel
 * Generates comprehensive absence reports with Bradford Factor and Pattern Detection
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

// Create axios instance with auth
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default function AbsenceReportPanel() {
    // Filter State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [departments, setDepartments] = useState([]);

    // Report State
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load Departments
    useEffect(() => {
        const loadDepts = async () => {
            try {
                const res = await api.get('/admin/departments');
                setDepartments(res.data || []);
            } catch (e) {
                console.error('Failed to load departments', e);
            }
        };
        loadDepts();
    }, []);

    // Generate Report
    const handleGenerateReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                start_date: startDate,
                end_date: endDate,
                department_id: selectedDepartment ? parseInt(selectedDepartment) : null
            };
            const res = await api.post('/reports/absences', payload);
            setReportData(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || 'Errore generazione report');
        } finally {
            setLoading(false);
        }
    };

    // Export Excel
    const handleExportExcel = async () => {
        try {
            const payload = {
                start_date: startDate,
                end_date: endDate,
                department_id: selectedDepartment ? parseInt(selectedDepartment) : null
            };
            const res = await api.post('/reports/absences/export/excel', payload, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_Assenze_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Errore export: ' + (e.response?.data?.detail || e.message));
        }
    };

    // Bradford Status Color
    const getBradfordColor = (score) => {
        if (score < 50) return 'text-emerald-400';
        if (score < 125) return 'text-yellow-400';
        if (score < 400) return 'text-orange-400';
        return 'text-red-400';
    };

    const getBradfordLabel = (score) => {
        if (score < 50) return 'Normale';
        if (score < 125) return 'Attenzione';
        if (score < 400) return 'Intervento';
        return 'CRITICO';
    };

    return (
        <div className="space-y-6">
            {/* FILTER PANEL */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    📊 Generatore Report Assenze
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Data Inizio</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:border-purple-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Data Fine</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:border-purple-400 outline-none"
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Reparto</label>
                        <select
                            value={selectedDepartment}
                            onChange={e => setSelectedDepartment(e.target.value)}
                            className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:border-purple-400 outline-none"
                        >
                            <option value="">Tutti i Reparti</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleGenerateReport}
                            disabled={loading}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Generazione...' : 'Genera Report'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* REPORT RESULTS */}
            {reportData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-4 text-center">
                            <div className="text-3xl font-black text-purple-400">{reportData.totals.total_days}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Giorni Assenza</div>
                        </div>
                        <div className="bg-slate-900/80 border border-blue-500/20 rounded-xl p-4 text-center">
                            <div className="text-3xl font-black text-blue-400">{reportData.totals.total_episodes}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Episodi</div>
                        </div>
                        <div className="bg-slate-900/80 border border-orange-500/20 rounded-xl p-4 text-center">
                            <div className="text-3xl font-black text-orange-400">{reportData.totals.avg_bradford}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Bradford Medio</div>
                        </div>
                        <div className="bg-slate-900/80 border border-red-500/20 rounded-xl p-4 text-center">
                            <div className="text-3xl font-black text-red-400">{reportData.patterns.suspicious_rate}%</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Lun/Ven Rate</div>
                        </div>
                    </div>

                    {/* YEAR COMPARISON */}
                    {reportData.year_comparison && (
                        <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-400">Confronto Anno Precedente</div>
                                <div className="text-xs text-gray-500">{reportData.year_comparison.previous_period}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-bold ${reportData.year_comparison.change_percent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {reportData.year_comparison.change_percent > 0 ? '+' : ''}{reportData.year_comparison.change_percent}%
                                </div>
                                <div className="text-xs text-gray-500">
                                    {reportData.year_comparison.previous_days} → {reportData.year_comparison.current_days} giorni
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DEPARTMENT BARS */}
                    <div className="bg-slate-900/80 border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            📈 Assenze per Reparto
                        </h3>
                        <div className="space-y-3">
                            {reportData.departments.map(dept => {
                                const maxDays = Math.max(...reportData.departments.map(d => d.total_days), 1);
                                const pct = (dept.total_days / maxDays) * 100;
                                return (
                                    <div key={dept.department_id} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white font-medium">{dept.department_name}</span>
                                            <span className="text-purple-400 font-mono">{dept.total_days} gg ({dept.avg_days_per_employee} media)</span>
                                        </div>
                                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* EMPLOYEE TABLE */}
                    <div className="bg-slate-900/80 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">👤 Dettaglio Dipendenti</h3>
                            <button
                                onClick={handleExportExcel}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold uppercase rounded-lg transition flex items-center gap-2"
                            >
                                📥 Scarica Excel
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="text-left p-3">Dipendente</th>
                                        <th className="text-left p-3">Reparto</th>
                                        <th className="text-center p-3">Giorni</th>
                                        <th className="text-center p-3">Episodi</th>
                                        <th className="text-center p-3">
                                            Bradford
                                            <span className="ml-1 text-[10px] text-purple-400 cursor-help" title="S² × D - Misura impatto assenze brevi frequenti">ⓘ</span>
                                        </th>
                                        <th className="text-center p-3">Lun/Ven</th>
                                        <th className="text-center p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {reportData.employees.map(emp => (
                                        <tr key={emp.employee_id} className="hover:bg-white/5">
                                            <td className="p-3 font-medium text-white">{emp.employee_name}</td>
                                            <td className="p-3 text-gray-400">{emp.department_name}</td>
                                            <td className="p-3 text-center font-mono text-purple-300">{emp.total_days}</td>
                                            <td className="p-3 text-center font-mono text-blue-300">{emp.absence_count}</td>
                                            <td className={`p-3 text-center font-bold font-mono ${getBradfordColor(emp.bradford_factor)}`}>
                                                {emp.bradford_factor}
                                            </td>
                                            <td className="p-3 text-center font-mono text-orange-300">{emp.monday_friday_count}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getBradfordColor(emp.bradford_factor)} bg-current/10`}>
                                                    {getBradfordLabel(emp.bradford_factor)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* BRADFORD EXPLANATION */}
                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4 text-sm">
                        <h4 className="font-bold text-purple-400 mb-2">ℹ️ Cos'è il Bradford Factor?</h4>
                        <p className="text-gray-400 mb-2">
                            Formula internazionale: <span className="font-mono text-purple-300">Bradford = S² × D</span> (S=episodi, D=giorni)
                        </p>
                        <p className="text-gray-400 mb-2">
                            Le assenze <strong>brevi e frequenti</strong> creano più disagi di una lunga. Chi si assenta 10 volte per 1 giorno ha Bradford <span className="text-red-400 font-mono">1000</span>,
                            chi 1 volta per 10 giorni ha Bradford <span className="text-emerald-400 font-mono">10</span>.
                        </p>
                        <div className="flex gap-4 text-xs mt-2">
                            <span className="text-emerald-400">● 0-49 Normale</span>
                            <span className="text-yellow-400">● 50-124 Attenzione</span>
                            <span className="text-orange-400">● 125-399 Intervento</span>
                            <span className="text-red-400">● 400+ Critico</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
