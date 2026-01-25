/**
 * SL Enterprise - Sidebar Layout
 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrStatsApi, chatApi, pickingApi, logisticsApi } from '../../api/client';
import OnlineUsersWidget from '../ui/OnlineUsersWidget';

// Menu items builder function - now uses hasPermission function
const getMenuItems = (hasPermission) => {
    const items = [];

    // Determine view mode with 3 tiers:
    // 1. HR Suite: Admin/HR users with manage_employees or admin_users
    // 2. Coordinator Suite: Users with view_coordinator_suite OR manage_shifts/manage_tasks
    // 3. Operativity Suite: Users with view_operativity_suite OR production permissions
    const isHRView = hasPermission('admin_users') || hasPermission('manage_employees');
    const isCoordinatorView = !isHRView && (hasPermission('view_coordinator_suite') || hasPermission('manage_shifts') || hasPermission('manage_tasks'));
    const isOperativityView = !isHRView && !isCoordinatorView && (hasPermission('view_operativity_suite') || hasPermission('create_production_orders') || hasPermission('manage_production_supply'));

    const showDashboard = hasPermission('view_dashboard');
    const showAdmin = hasPermission('admin_users');

    // Determine suite name and icon
    let suiteName = 'HR Suite';
    let suiteIcon = '👥';
    let isAnimated = false;

    if (isCoordinatorView) {
        suiteName = 'Coordinator Suite';
        suiteIcon = '🎯';
        isAnimated = true;
    } else if (isOperativityView) {
        suiteName = 'Operativity Suite';
        suiteIcon = '⚡';
        isAnimated = true;
    }

    // Dashboard - Based on permission
    if (showDashboard) {
        items.push({
            title: 'Dashboard',
            path: '/dashboard',
            icon: '📊',
            permission: 'view_dashboard'
        });
    }

    // Main Suite Section - Content depends on user type
    items.push({
        title: suiteName,
        icon: suiteIcon,
        isAnimated: isAnimated,
        // No parent permission - visibility determined by children's permissions
        children: [
            { title: '👥 Dipendenti', path: '/hr/employees', permission: 'manage_employees' },
            { title: '✅ Centro Approvazioni', path: '/hr/approvals', permission: 'view_approvals' },
            { title: '🛡️ Gestione HR', path: '/hr/management', permission: 'view_hr_management' },
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

    // LIVE PRODUCTION - Sezione per Gestione Blocchi
    items.push({
        title: 'Live Production',
        icon: '🔴',
        permission: null, // Will be checked per-child
        children: [
            { type: 'divider', label: 'Logistica Taglio' },
            { title: '📦 Richiesta Blocchi', path: '/production/orders', permission: 'create_production_orders' },
            { title: '🚚 Lista Prelievi', path: '/production/blocks', permission: 'manage_production_supply' },
            { title: '⚙️ Config. Blocchi', path: '/admin/production/config', permission: 'manage_production_config' },
            { title: '📊 Report Forniture Blocchi', path: '/admin/production/reports', permission: 'view_production_reports' },
            { type: 'divider', label: 'Logistica Materiali' }, // Visual separator
            { title: '📋 Richiesta Materiali', path: '/logistics/request', permission: 'request_logistics' },
            { title: '🚛 Gestione Richieste', path: '/logistics/pool', permission: 'manage_logistics_pool' },
            { title: '📊 Mappa Richieste', path: '/logistics/dashboard', permission: 'supervise_logistics' },
            { title: '📦 Config. Logistica', path: '/admin/logistics', permission: 'manage_logistics_config' },
            { type: 'divider', label: 'Check List Obbligatorie' },
            { title: '🚜 Check List Carrelli', path: '/production/checklist', permission: 'perform_checklists' },
            { title: '📜 Storico Check Carrelli', path: '/production/checklist/history', permission: 'view_checklist_history' },
        ],
    });

    // Logistics
    // items.push({
    //     title: 'Logistica',
    //     icon: '📦',
    //     permission: 'access_logistics',
    //     children: [
    //         { title: '↩️ Gestione Resi', path: '/ops/returns', permission: 'access_logistics' },
    //     ],
    // });

    // Admin - Based on permission
    if (showAdmin) {
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

function SidebarItem({ item, isOpen, pendingCounts, onItemClick, onResetBadge }) {
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
                            {(item.title === 'Live Production') && (pendingCounts.productionSupply + (pendingCounts.logisticsPending || 0)) > 0 && (
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
                        {item.children.map((child, idx) => {
                            // Handle divider items
                            if (child.type === 'divider') {
                                return (
                                    <div key={`divider-${idx}`} className="py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-px bg-white/20"></div>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{child.label}</span>
                                            <div className="flex-1 h-px bg-white/20"></div>
                                        </div>
                                    </div>
                                );
                            }
                            // Normal menu item
                            return (
                                <Link
                                    key={child.path}
                                    to={child.path}
                                    onClick={() => {
                                        if (onItemClick) onItemClick();
                                        if (child.path === '/production/blocks' && onResetBadge) onResetBadge();
                                    }}
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
                                    {child.path === '/production/blocks' && item.title === 'Live Production' && (
                                        // Calculate badge
                                        (() => {
                                            const count = Math.max(0, (pendingCounts.productionSupply || 0) - (pendingCounts.acknowledgedSupply || 0));
                                            return count > 0 ? (
                                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {count}
                                                </span>
                                            ) : null;
                                        })()
                                    )}
                                    {child.path === '/logistics/pool' && pendingCounts.logisticsPending > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {pendingCounts.logisticsPending}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Badge Logic for Production
    let badgeCount = 0;
    if (item.path === '/production/blocks' && pendingCounts.productionSupply) {
        badgeCount = Math.max(0, (pendingCounts.productionSupply || 0) - (pendingCounts.acknowledgedSupply || 0));
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
                {item.path === '/chat' && pendingCounts.chat > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                )}
                {item.path === '/production/blocks' && badgeCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                )}
            </span>
            {isOpen && <span>{item.title}</span>}
            {isOpen && item.path === '/chat' && pendingCounts.chat > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCounts.chat}
                </span>
            )}
            {isOpen && item.path === '/production/blocks' && badgeCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {badgeCount}
                </span>
            )}
            {isOpen && item.path === '/logistics/pool' && pendingCounts.logisticsPending > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCounts.logisticsPending}
                </span>
            )}
        </Link>
    );
}

function RealTimeClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <span className="text-xs text-blue-400 font-mono">
            {time.toLocaleTimeString('it-IT')}
        </span>
    );
}

export default function Sidebar({ isOpen, onToggle, mobileOpen, setMobileOpen }) {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [pendingCounts, setPendingCounts] = useState({ events: 0, leaves: 0, chat: 0 });

    useEffect(() => {
        console.log("🚀 SL ENTERPRISE SIDEBAR v2.0 LOADED - Notifiche attive");
    }, []);

    // Get menu items based on permissions (not hardcoded roles)
    const menuItems = getMenuItems(hasPermission);

    useEffect(() => {
        const fetchPending = async () => {
            let newCounts = { events: 0, leaves: 0, chat: 0 };

            // HR Stats
            if (hasPermission('manage_attendance') || hasPermission('manage_employees')) {
                try {
                    const counts = await hrStatsApi.getPendingCounts();
                    newCounts = { ...newCounts, ...counts };
                } catch (err) {
                    console.error("Failed to fetch pending counts", err);
                }
            }

            // Chat Stats
            try {
                const chatData = await chatApi.getNotificationsSummary();
                newCounts.chat = chatData.total_unread || 0;
            } catch (err) {
                console.error("Failed to fetch chat counts", err);
            }

            // Production Supply Stats (for warehouse/admins)
            if (hasPermission('manage_production_supply') || hasPermission('admin_users')) {
                try {
                    // Fetch pending blocks
                    const blocksData = await pickingApi.getRequests('pending', 100);
                    const pending = Array.isArray(blocksData) ? blocksData.filter(b => b.status === 'pending') : [];
                    newCounts.productionSupply = pending.length;
                } catch (err) {
                    console.error("Failed to fetch production counts", err);
                }
            }

            // Logistics Stats (Pending Requests for Warehouse)
            if (hasPermission('manage_logistics_pool') || hasPermission('supervise_logistics')) {
                try {
                    const logData = await logisticsApi.getRequests({ status: 'pending' });
                    // logData.items is array, or logData itself if not paginated? 
                    // Client usually returns { items: [], total: ... }
                    const items = logData.items || [];
                    newCounts.logisticsPending = items.length;
                } catch (err) {
                    console.error("Failed to fetch logistics counts", err);
                }
            }

            setPendingCounts(prev => ({ ...prev, ...newCounts }));
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
        <aside className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-white/10 transition-all duration-300 z-50 flex flex-col
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isOpen ? 'md:w-64' : 'md:w-20'} 
            w-64`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                {isOpen && (
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-white">SL Enterprise</h1>
                        <RealTimeClock />
                    </div>
                )}

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
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {menuItems.map((item) => {
                    // Filter Parent by permission
                    if (item.permission && !hasPermission(item.permission)) return null;

                    // Filter Children and Handle Dividers
                    const filteredItem = { ...item };
                    if (item.children) {
                        // 1. Filter out items user doesn't have permission for
                        let visibleChildren = item.children.filter(child =>
                            !child.permission || hasPermission(child.permission)
                        );

                        // 2. Remove Dividers that are at the end or followed by another divider
                        // We iterate backwards to easily remove trailing dividers
                        for (let i = visibleChildren.length - 1; i >= 0; i--) {
                            const child = visibleChildren[i];
                            const isDivider = child.type === 'divider';

                            // If it's a divider and it's the last item OR followed by another divider
                            if (isDivider) {
                                const nextItem = visibleChildren[i + 1];
                                if (!nextItem || nextItem.type === 'divider') {
                                    visibleChildren.splice(i, 1);
                                }
                            }
                        }

                        // 3. Remove leading divider if exists (optional, but good for cleanup)
                        if (visibleChildren.length > 0 && visibleChildren[0].type === 'divider') {
                            visibleChildren.splice(0, 1);
                        }

                        if (visibleChildren.length === 0) return null;
                        filteredItem.children = visibleChildren;
                    }

                    return (
                        <div key={item.title}>
                            <SidebarItem
                                item={filteredItem}
                                isOpen={isOpen || mobileOpen}
                                pendingCounts={pendingCounts}
                                onItemClick={() => setMobileOpen && setMobileOpen(false)}
                                onResetBadge={() => setPendingCounts(prev => ({
                                    ...prev,
                                    acknowledgedSupply: prev.productionSupply
                                }))}
                            />
                        </div>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className={`p-4 border-t border-white/10 md:pb-4 pb-24 bg-slate-900 flex-none`}>
                {(isOpen || mobileOpen) && user && (
                    <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
                        <p className="text-white font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-blue-400">{user.role_label || user.role}</p>
                    </div>
                )}
                <div className={`flex items-center gap-2 ${!isOpen && !mobileOpen ? 'flex-col' : 'flex-row'}`}>
                    <button
                        onClick={handleLogout}
                        className="flex-1 w-full flex items-center justify-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Esci"
                    >
                        <span>🚪</span>
                        {(isOpen || mobileOpen) && <span>Esci</span>}
                    </button>

                    {/* Online Users Widget - Sidebar Variant */}
                    <OnlineUsersWidget variant="sidebar" />
                </div>
            </div>
        </aside>
    );
}
