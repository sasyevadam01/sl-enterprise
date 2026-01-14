/**
 * SL Enterprise - Sidebar Layout
 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrStatsApi } from '../../api/client';

// Menu items builder function - takes user role to customize
const getMenuItems = (userRole, isAdmin) => {
    const items = [];

    // Dashboard - ONLY FOR ADMINS
    if (isAdmin) {
        items.push({
            title: 'Dashboard',
            path: '/dashboard',
            icon: '📊',
            permission: 'view_dashboard'
        });
    }

    // HR Suite / Coordinator Suite
    items.push({
        title: isAdmin ? 'HR Suite' : 'Coordinator Suite',
        icon: isAdmin ? '👥' : '🎯', // Different icon for coordinators
        isAnimated: !isAdmin, // Flag for animated glow effect
        // No parent permission - visibility determined by children's permissions
        children: [
            { title: '👥 Dipendenti', path: '/hr/employees', permission: 'manage_employees' },
            { title: '✅ Centro Approvazioni', path: '/hr/approvals', permission: 'manage_attendance' },
            { title: '🛡️ Gestione HR', path: '/hr/management', permission: 'manage_employees' },
            { title: '📅 Calendario', path: '/hr/calendar', permission: 'view_hr_calendar' },
            { title: '🦺 Sicurezza RSPP', path: '/hr/security', permission: 'manage_employees' },
            { title: '➕ Nuova Richiesta', path: '/hr/events/new', permission: 'request_events' },
            { title: '📋 Task Board', path: '/hr/tasks', permission: 'manage_tasks' },
            { title: '🗓️ Gestione Turni', path: '/hr/planner', permission: 'manage_shifts' },
            { title: '📢 Bacheca Annunci', path: '/hr/announcements', permission: 'view_announcements' },
            { title: '💬 Chat', path: '/chat', permission: null },  // Visibile a tutti
        ],
    });

    // Factory Monitor - Only for those with access
    items.push({
        title: 'Factory Monitor',
        icon: '🏭',
        permission: 'access_factory',
        children: [
            { title: '📊 Dashboard Produzione', path: '/factory/dashboard', permission: 'access_factory' },
            { title: '🔧 Manutenzioni', path: '/factory/maintenance', permission: 'access_factory' },
            { title: '💰 Calcolo Costi', path: '/factory/costs', permission: 'manage_kpi' },
            { title: '⚙️ Inserimento Dati KPI', path: '/factory/kpi', permission: 'access_factory' },
            { title: '📋 Configurazione KPI', path: '/factory/kpi/setup', permission: 'manage_kpi' },
        ],
    });

    // Logistics
    items.push({
        title: 'Logistica',
        icon: '📦',
        permission: 'access_logistics',
        children: [
            { title: '↩️ Gestione Resi', path: '/ops/returns', permission: 'access_logistics' },
        ],
    });

    // Admin - Only for admins
    if (isAdmin) {
        items.push({
            title: 'Admin',
            icon: '⚙️',
            permission: 'admin_users',
            children: [
                { title: '👤 Gestione Utenti', path: '/admin/users', permission: 'admin_users' },
                { title: '🛠️ Configurazioni', path: '/admin/config', permission: 'admin_users' },
                { title: '📜 Audit Log', path: '/admin/audit', permission: 'admin_audit' },
            ],
        });
    }

    return items;
};

function SidebarItem({ item, isOpen, pendingCounts, onItemClick }) {
    const location = useLocation();
    const [expanded, setExpanded] = useState(false);
    const isActive = item.path === location.pathname;
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
        return (
            <div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white/10 rounded-lg transition ${expanded ? 'bg-white/5' : ''}`}
                >
                    <span className="flex items-center gap-3">
                        <span className={`text-xl relative ${item.isAnimated ? 'animate-pulse' : ''}`}>
                            {item.isAnimated && (
                                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 blur-md animate-spin-slow" style={{ animationDuration: '3s' }} />
                            )}
                            <span className="relative">{item.icon}</span>
                            {(item.title === 'HR Suite' || item.title === 'Coordinator Suite') && (pendingCounts.events + pendingCounts.leaves) > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                            )}
                        </span>
                        {isOpen && (
                            <span className={item.isAnimated ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-semibold' : ''}>
                                {item.title}
                            </span>
                        )}
                    </span>
                    {isOpen && (
                        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>
                {expanded && isOpen && (
                    <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                            <Link
                                key={child.path}
                                to={child.path}
                                onClick={onItemClick}
                                className={`block px-4 py-2 text-sm rounded-lg transition ${location.pathname === child.path
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {child.title}
                                {child.path === '/hr/approvals' && (pendingCounts.leaves + pendingCounts.events) > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {pendingCounts.leaves + pendingCounts.events}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            to={item.path}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-white/10'
                }`}
        >
            <span className="text-xl relative">
                {item.icon}
                {item.path === '/dashboard' && (pendingCounts.events + pendingCounts.leaves) > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                )}
            </span>
            {isOpen && <span>{item.title}</span>}
        </Link>
    );
}

export default function Sidebar({ isOpen, onToggle, mobileOpen, setMobileOpen }) {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [pendingCounts, setPendingCounts] = useState({ events: 0, leaves: 0 });

    // Determine if user is admin
    const isAdmin = ['super_admin', 'admin', 'hr_manager', 'factory_controller'].includes(user?.role);

    // Get menu items based on role
    const menuItems = getMenuItems(user?.role, isAdmin);

    useEffect(() => {
        const fetchPending = async () => {
            if (hasPermission('manage_attendance') || hasPermission('manage_employees')) {
                try {
                    const counts = await hrStatsApi.getPendingCounts();
                    setPendingCounts(counts);
                } catch (err) {
                    console.error("Failed to fetch pending counts", err);
                }
            }
        };

        fetchPending();
        const interval = setInterval(fetchPending, 5000);
        return () => clearInterval(interval);
    }, [user, hasPermission]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <aside className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-white/10 transition-all duration-300 z-50
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isOpen ? 'md:w-64' : 'md:w-20'} 
            w-64`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                {isOpen && <h1 className="text-xl font-bold text-white">SL Enterprise</h1>}

                {/* Desktop Toggle */}
                <button onClick={onToggle} className="hidden md:block p-2 text-gray-400 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                    </svg>
                </button>

                {/* Mobile Close Button */}
                <button onClick={() => setMobileOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Menu */}
            <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                    // Filter Parent by permission
                    if (item.permission && !hasPermission(item.permission)) return null;

                    // Filter Children
                    const filteredItem = { ...item };
                    if (item.children) {
                        filteredItem.children = item.children.filter(child =>
                            !child.permission || hasPermission(child.permission)
                        );
                        if (filteredItem.children.length === 0) return null;
                    }

                    return (
                        <div key={item.title}>
                            <SidebarItem
                                item={filteredItem}
                                isOpen={isOpen || mobileOpen}
                                pendingCounts={pendingCounts}
                                onItemClick={() => setMobileOpen && setMobileOpen(false)}
                            />
                        </div>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 md:pb-4 pb-24 bg-slate-900`}>
                {(isOpen || mobileOpen) && user && (
                    <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
                        <p className="text-white font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-blue-400">{user.role_label || user.role}</p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                    <span>🚪</span>
                    {(isOpen || mobileOpen) && <span>Esci</span>}
                </button>
            </div>
        </aside>
    );
}
