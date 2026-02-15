/**
 * SL Enterprise - Employees Page
 * Premium Enterprise Light Mode — Directory dei Dipendenti
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { employeesApi, usersApi } from '../../api/client';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';

// ============================================================
// DEPARTMENT COLOR MAP — Soft Badges (Light Mode)
// ============================================================
const DEPARTMENT_COLORS = {
    'Coordinamento': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Incollaggio': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Magazzinieri': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Sartoria': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'Autista': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    'Taglio Poliuretano': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Bordatura': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'Ufficio': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    'default': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
};

// ============================================================
// ROLE ICONS — SVG per ogni tipo di ruolo
// ============================================================
const RoleIcon = ({ role }) => {
    const iconClass = "w-4 h-4 mr-2 flex-shrink-0";
    const r = (role || '').toLowerCase();

    if (r.includes('coordinat')) return (
        <svg className={`${iconClass} text-purple-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
    if (r.includes('magazzin') || r.includes('carrellista')) return (
        <svg className={`${iconClass} text-emerald-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
    );
    if (r.includes('autista')) return (
        <svg className={`${iconClass} text-sky-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    );
    if (r.includes('sart') || r.includes('cuci')) return (
        <svg className={`${iconClass} text-pink-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    );
    if (r.includes('pantograf') || r.includes('taglio') || r.includes('giostra')) return (
        <svg className={`${iconClass} text-orange-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
    );
    if (r.includes('bordat') || r.includes('prepara')) return (
        <svg className={`${iconClass} text-rose-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
    );
    if (r.includes('ufficio') || r.includes('admin') || r.includes('impiegat')) return (
        <svg className={`${iconClass} text-slate-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
    if (r.includes('incolla') || r.includes('vernicia')) return (
        <svg className={`${iconClass} text-amber-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    );

    // Default: operaio generico
    return (
        <svg className={`${iconClass} text-blue-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );
};

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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                        <Link
                            to={`/hr/employees/${employeeId}`}
                            className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Dettagli Dossier
                        </Link>
                        <button
                            onClick={handleNewEvent}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                        >
                            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Nuovo Evento
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button
                            onClick={handleNewAbsence}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-left cursor-pointer"
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

    // Online users tracking
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'asc' });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await employeesApi.getEmployees();
                let safeData = [];
                if (Array.isArray(response)) {
                    safeData = response;
                } else if (response && Array.isArray(response.data)) {
                    safeData = response.data;
                } else if (response && Array.isArray(response.items)) {
                    safeData = response.items;
                }
                setEmployees(safeData);
                const total = safeData.length;
                const active = safeData.length > 0 ? safeData.filter(e => e.is_active).length : 0;
                setStats({ total, active, absent: 0, expiring: 0 });
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

    // Fetch online users periodically
    useEffect(() => {
        const fetchOnlineUsers = async () => {
            try {
                const response = await usersApi.getOnlineUsers();
                const ids = new Set((response.data || response || []).map(u => u.id || u.user_id));
                setOnlineUserIds(ids);
            } catch (err) {
                console.log("Online users fetch error (non-critical):", err);
            }
        };
        fetchOnlineUsers();
        const interval = setInterval(fetchOnlineUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sorting handler
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = `${emp.last_name} ${emp.first_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (emp.fiscal_code && emp.fiscal_code.toLowerCase().includes(search.toLowerCase()));
        const matchesDept = deptFilter === 'all' || emp.department_name === deptFilter;
        const matchesRole = roleFilter === 'all' || emp.current_role === roleFilter;
        return matchesSearch && matchesDept && matchesRole;
    });

    // Apply sorting
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        const aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        const bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dipendenti</h1>
                    <p className="text-slate-500 mt-1">Gestione completa del personale e monitoraggio.</p>
                </div>
                <Link
                    to="/hr/employees/new"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-medium transition-all hover:shadow-md active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuovo Dipendente
                </Link>
            </div>

            {/* Dashboard Grid — White Cards */}
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

            {/* Search Bar — Clean Light Input */}
            <div className="flex gap-4 z-20 relative">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Cerca per nome, reparto o ruolo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Filter Button & Popover */}
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`px-4 h-full bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition flex items-center justify-center shadow-sm cursor-pointer ${isFilterOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    >
                        <svg className={`w-6 h-6 ${isFilterOpen ? 'text-blue-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    </button>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-30">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Filtri Avanzati</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Reparto</label>
                                    <select
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">Tutti i reparti</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Ruolo</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">Tutti i ruoli</option>
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => { setDeptFilter('all'); setRoleFilter('all'); setSearch(''); }}
                                    className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded cursor-pointer transition"
                                >
                                    Resetta Filtri
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* White Table — Enterprise Light */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-slate-800 transition-colors group"
                                onClick={() => handleSort('last_name')}
                            >
                                <span className="flex items-center gap-2">
                                    Nome
                                    <svg className={`w-3 h-3 transition-transform ${sortConfig.key === 'last_name' ? 'text-blue-600' : 'text-slate-300'} ${sortConfig.key === 'last_name' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </span>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-slate-800 transition-colors"
                                onClick={() => handleSort('department_name')}
                            >
                                <span className="flex items-center gap-2">
                                    Reparto
                                    <svg className={`w-3 h-3 transition-transform ${sortConfig.key === 'department_name' ? 'text-blue-600' : 'text-slate-300'} ${sortConfig.key === 'department_name' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </span>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-slate-800 transition-colors"
                                onClick={() => handleSort('current_role')}
                            >
                                <span className="flex items-center gap-2">
                                    Ruolo
                                    <svg className={`w-3 h-3 transition-transform ${sortConfig.key === 'current_role' ? 'text-blue-600' : 'text-slate-300'} ${sortConfig.key === 'current_role' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </span>
                            </th>
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4 text-right w-24">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {sortedEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Nessun dipendente trovato
                                </td>
                            </tr>
                        ) : (
                            sortedEmployees.map((emp) => {
                                const deptColors = DEPARTMENT_COLORS[emp.department_name] || DEPARTMENT_COLORS['default'];
                                const isOnline = onlineUserIds.has(emp.user_id);

                                return (
                                    <tr
                                        key={emp.id}
                                        className="group hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <Link to={`/hr/employees/${emp.id}`} className="flex items-center gap-3">
                                                {/* Avatar */}
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                                                        {emp.last_name?.charAt(0)}{emp.first_name?.charAt(0)}
                                                    </div>
                                                    {isOnline && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="Online"></span>
                                                    )}
                                                </div>
                                                <p className="text-slate-800 font-semibold text-base group-hover:text-blue-600 transition-colors">
                                                    {emp.last_name} {emp.first_name}
                                                </p>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${deptColors.bg} ${deptColors.text} border ${deptColors.border}`}>
                                                {emp.department_name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center text-slate-600">
                                                <RoleIcon role={emp.current_role} />
                                                {emp.current_role || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={emp.is_active ? 'active' : 'terminated'} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ActionMenu employeeId={emp.id} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Info */}
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                <span>Visualizzando {filteredEmployees.length} di {employees.length} dipendenti</span>
                <span></span>
            </div>
        </div>
    );
}
