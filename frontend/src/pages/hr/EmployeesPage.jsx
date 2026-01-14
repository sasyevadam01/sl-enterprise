/**
 * SL Enterprise - Employees Page
 * Gestione anagrafica dipendenti.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/client';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';

// Helper Component for 3-Dot Menu
const ActionMenu = ({ employeeId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handlers
    const handleNewAbsence = () => {
        navigate(`/hr/events/new?employee=${employeeId}&tab=leave`);
    };

    const handleNewEvent = () => {
        navigate(`/hr/events/new?employee=${employeeId}`);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                    <div className="py-1">
                        <Link
                            to={`/hr/employees/${employeeId}`}
                            className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Dettagli Dossier
                        </Link>
                        <button
                            onClick={handleNewEvent}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white text-left"
                        >
                            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Nuovo Evento
                        </button>
                        <div className="border-t border-white/5 my-1"></div>
                        <button
                            onClick={handleNewAbsence}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left"
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            Segna Assenza
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const [stats, setStats] = useState({ total: 0, active: 0, absent: 0, expiring: 0 });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await employeesApi.getEmployees();

                // Robustness check: Ensure response is an array
                let safeData = [];
                if (Array.isArray(response)) {
                    safeData = response;
                } else if (response && Array.isArray(response.data)) {
                    safeData = response.data;
                } else if (response && Array.isArray(response.items)) {
                    safeData = response.items;
                }

                setEmployees(safeData);

                // Stats Logic
                const total = safeData.length;
                const active = safeData.length > 0 ? safeData.filter(e => e.is_active).length : 0;

                setStats({
                    total: total,
                    active: active,
                    absent: 0, // Real logic needed later
                    expiring: 0 // Real logic needed later
                });
            } catch (error) {
                console.error("API ERROR:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    // Close filter dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = `${emp.last_name} ${emp.first_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (emp.fiscal_code && emp.fiscal_code.toLowerCase().includes(search.toLowerCase()));

        const matchesDept = deptFilter === 'all' || emp.department_name === deptFilter;
        const matchesRole = roleFilter === 'all' || emp.current_role === roleFilter;

        return matchesSearch && matchesDept && matchesRole;
    });

    // Unique Departments/Roles for dropdowns
    const departments = [...new Set(employees.map(e => e.department_name).filter(Boolean))];
    const roles = [...new Set(employees.map(e => e.current_role).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dipendenti</h1>
                    <p className="text-slate-400 mt-1">Gestione completa del personale e monitoraggio.</p>
                </div>
                <Link
                    to="/hr/employees/new"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuovo Dipendente
                </Link>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Totale" value={stats.total} color="blue"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <StatCard
                    title="In Servizio" value={stats.active} color="green" trend="up" trendValue="+2"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    title="Assenti" value={stats.absent} color="red" trend="down" trendValue="+1"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>}
                />
                <StatCard
                    title="Scadenze" value={stats.expiring} color="yellow"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>

            {/* Laser Search Bar & Filter */}
            <div className="flex gap-4 z-20 relative">
                {/* Laser Effect Container */}
                <div className="flex-1 relative group rounded-xl p-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent bg-[length:400%_100%] animate-[shimmer_4s_infinite]">
                    <div className="bg-slate-900 rounded-xl w-full h-full flex items-center relative overflow-hidden">
                        <input
                            type="text"
                            placeholder="Cerca per nome, reparto o ruolo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:bg-slate-800/50 transition-colors"
                        />
                        <svg className="absolute left-4 w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Filter Button & Popover */}
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`px-4 h-full bg-slate-800 border border-white/10 rounded-xl hover:bg-slate-700 transition flex items-center justify-center ${isFilterOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                    >
                        <svg className={`w-6 h-6 ${isFilterOpen ? 'text-blue-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    </button>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-white/10 rounded-xl shadow-2xl p-4 z-30">
                            <h3 className="text-sm font-bold text-white mb-3">Filtri Avanzati</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Reparto</label>
                                    <select
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="all">Tutti i reparti</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Ruolo</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="all">Tutti i ruoli</option>
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => { setDeptFilter('all'); setRoleFilter('all'); setSearch(''); }}
                                    className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white border border-dashed border-white/10 hover:border-white/30 rounded"
                                >
                                    Resetta Filtri
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Table (Glassmorphism) */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl relative overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-slate-900/30 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-5 rounded-tl-2xl">Nome</th>
                            <th className="px-6 py-5">Reparto</th>
                            <th className="px-6 py-5">Ruolo</th>
                            <th className="px-6 py-5">Stato</th>
                            <th className="px-6 py-5 text-right w-24 rounded-tr-2xl">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                                    <span className="block text-4xl mb-2 opacity-50">🕵️‍♂️</span>
                                    Nessun dipendente trovato
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map((emp, index) => (
                                <tr
                                    key={emp.id}
                                    className={`group hover:bg-white/[0.03] transition-colors relative ${index === filteredEmployees.length - 1 ? 'rounded-b-2xl' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <Link to={`/hr/employees/${emp.id}`} className="block">
                                            <p className="text-white font-semibold text-base hover:text-blue-400 transition-colors">
                                                {emp.last_name} {emp.first_name}
                                            </p>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/5 text-blue-400 border border-blue-500/10">
                                            {emp.department_name || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {emp.current_role || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={emp.is_active ? 'active' : 'terminated'} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ActionMenu employeeId={emp.id} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Info */}
            <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                <span>Visualizzando {filteredEmployees.length} di {employees.length} dipendenti</span>
                <span></span>
            </div>
        </div>
    );
}
