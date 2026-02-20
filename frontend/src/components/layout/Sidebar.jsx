/**
 * SL Enterprise - Sidebar Layout
 * v5.0 — Dark Sidebar with Brand Green Accents
 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrStatsApi, chatApi, pickingApi, logisticsApi, ovenApi } from '../../api/client';
import OnlineUsersWidget from '../ui/OnlineUsersWidget';
import {
    LayoutDashboard, Users, CheckCircle, Shield, Calendar, HardHat,
    Plus, ClipboardList, CalendarDays, Megaphone, MessageSquare,
    Factory, Wrench, Calculator, Settings, Radio, Package, Truck,
    FileText, BarChart3, ClipboardCheck, History, UserCog, FileSearch,
    LogOut, ChevronDown, ChevronRight
} from 'lucide-react';

// Icon mapping for menu items
const iconMap = {
    '👥': Users,
    '✅': CheckCircle,
    '🛡️': Shield,
    '📅': Calendar,
    '🦺': HardHat,
    '➕': Plus,
    '📋': ClipboardList,
    '🗓️': CalendarDays,
    '📢': Megaphone,
    '💬': MessageSquare,
    '🏭': Factory,
    '🔧': Wrench,
    '💰': Calculator,
    '⚙️': Settings,
    '🔴': Radio,
    '📦': Package,
    '🚚': Truck,
    '🚛': Truck,
    '📊': BarChart3,
    '🚜': ClipboardCheck,
    '📜': History,
    '👤': UserCog,
    '🎯': LayoutDashboard,
    '⚡': Radio,
    '🚪': LogOut,
};

// Helper to get icon component
const getIcon = (emoji, className = "w-5 h-5") => {
    const IconComponent = iconMap[emoji] || LayoutDashboard;
    return <IconComponent className={className} />;
};

// Menu items builder function - now uses hasPermission function
const getMenuItems = (hasPermission) => {
    const items = [];

    // Determine view mode with 3 tiers:
    // 1. HR Suite: Admin/HR users with manage_employees or admin_users
    // 2. Coordinator Suite: Users with view_coordinator_suite OR manage_shifts/manage_tasks
    // 3. Operativity Suite: Users with view_operativity_suite OR any production/logistics permissions
    const isHRView = hasPermission('admin_users') || hasPermission('manage_employees');
    const isCoordinatorView = !isHRView && (hasPermission('view_coordinator_suite') || hasPermission('manage_shifts') || hasPermission('manage_tasks'));
    const isOperativityView = !isHRView && !isCoordinatorView && (
        hasPermission('view_operativity_suite') ||
        hasPermission('create_production_orders') ||   // Richiesta Blocchi
        hasPermission('manage_production_supply') ||   // Prelievo Blocchi
        hasPermission('use_oven') ||                   // Il Forno
        hasPermission('perform_checklists') ||         // Checklist Carrelli
        hasPermission('manage_logistics_pool') ||      // Gestione Richieste Materiali
        hasPermission('request_logistics')             // Richiesta Materiali
    );

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
            { title: 'Dipendenti', path: '/hr/employees', permission: 'manage_employees', icon: '👥' },
            { title: 'Centro Approvazioni', path: '/hr/approvals', permission: 'view_approvals', icon: '✅' },
            { title: 'Gestione HR', path: '/hr/management', permission: 'view_hr_management', icon: '🛡️' },
            { title: 'Calendario', path: '/hr/calendar', permission: 'view_hr_calendar', icon: '📅' },
            { title: 'Sicurezza RSPP', path: '/hr/security', permission: 'manage_employees', icon: '🦺' },
            { title: 'Nuova Richiesta', path: '/hr/events/new', permission: 'request_events', icon: '➕' },
            { title: 'Task Board', path: '/hr/tasks', permission: 'manage_tasks', icon: '📋' },
            { title: 'Gestione Turni', path: '/hr/planner', permission: 'manage_shifts', icon: '🗓️' },
            { title: 'Bacheca Annunci', path: '/hr/announcements', permission: 'view_announcements', icon: '📢' },
            { title: 'Chat', path: '/chat', permission: null, icon: '💬' },  // Visibile a tutti
        ],
    });

    // Factory Monitor - Only for those with access
    items.push({
        title: 'Factory Monitor',
        icon: '🏭',
        permission: 'access_factory',
        children: [
            { title: 'Dashboard Produzione', path: '/factory/dashboard', permission: 'access_factory', icon: '📊' },
            { title: 'Manutenzioni', path: '/factory/maintenance', permission: 'access_factory', icon: '🔧' },
            { title: 'Calcolo Costi', path: '/factory/costs', permission: 'manage_kpi', icon: '💰' },
            { title: 'Inserimento Dati KPI', path: '/factory/kpi', permission: 'access_factory', icon: '⚙️' },
            { title: 'Configurazione KPI', path: '/factory/kpi/setup', permission: 'manage_kpi', icon: '📋' },
        ],
    });

    // MONITOR SPOSTAMENTI - Control Room Admin
    items.push({
        title: 'Monitor Spostamenti',
        icon: '📡',
        permission: 'admin_users',
        titleColor: '#ef4444',
        children: [
            { title: 'Control Room', path: '/logistics/control-room', permission: 'admin_users', icon: '🎯' },
        ],
    });

    // LIVE PRODUCTION - Sezione per Gestione Blocchi
    items.push({
        title: 'Live Production',
        icon: '🔴',
        permission: null, // Will be checked per-child
        children: [
            { type: 'divider', label: 'Logistica Taglio' },
            { title: 'Richiesta Blocchi', path: '/production/orders', permission: 'create_production_orders', icon: '📦' },
            { title: 'Lista Prelievi', path: '/production/blocks', permission: 'manage_production_supply', icon: '🚚' },
            { title: 'Il Forno', path: '/production/oven', permission: 'use_oven', icon: '🔥' },
            { title: 'Calcolo Blocchi', path: '/production/calcolo', permission: 'access_block_calculator', icon: '📐' },
            { title: 'Config. Blocchi', path: '/admin/production/config', permission: 'manage_production_config', icon: '⚙️' },
            { title: 'Report Forniture Blocchi', path: '/admin/production/reports', permission: 'view_production_reports', icon: '📊' },
            { type: 'divider', label: 'Logistica Materiali' }, // Visual separator
            { title: 'Richiesta Materiali', path: '/logistics/request', permission: 'request_logistics', icon: '📋' },
            { title: 'Gestione Richieste', path: '/logistics/pool', permission: 'manage_logistics_pool', icon: '🚛', titleColor: '#0ea5e9' },
            { title: 'Mappa Richieste', path: '/logistics/dashboard', permission: 'supervise_logistics', icon: '📊' },
            { title: 'Config. Logistica', path: '/admin/logistics', permission: 'manage_logistics_config', icon: '📦' },
            { type: 'divider', label: 'Check List Obbligatorie' },
            { title: 'Check List Carrelli', path: '/production/checklist', permission: 'perform_checklists', icon: '🚜' },
            { title: 'Storico Check Carrelli', path: '/production/checklist/history', permission: 'view_checklist_history', icon: '📜' },
        ],
    });

    // Admin - Based on permission
    if (showAdmin) {
        items.push({
            title: 'Admin',
            icon: '⚙️',
            permission: 'admin_users',
            children: [
                { title: 'Gestione Utenti', path: '/admin/users', permission: 'admin_users', icon: '👤' },
                { title: 'Configurazioni', path: '/admin/config', permission: 'admin_users', icon: '⚙️' },
                { title: 'Audit Log', path: '/admin/audit', permission: 'admin_audit', icon: '📜' },
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
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group
                        ${expanded ? 'bg-brand-green/10' : 'hover:bg-brand-green/10'}`}
                >
                    <span className="flex items-center gap-3">
                        <span className={`relative text-slate-500 group-hover:text-brand-green transition-colors ${item.isAnimated ? 'text-brand-green' : ''}`}>
                            {item.isAnimated && (
                                <span className="absolute inset-0 rounded-full bg-brand-green/10 blur-md" />
                            )}
                            <span className="relative">
                                {getIcon(item.icon)}
                            </span>
                            {(item.title === 'HR Suite' || item.title === 'Coordinator Suite') && (pendingCounts.events + pendingCounts.leaves) > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-sidebar" />
                            )}
                            {(item.title === 'Live Production') && (pendingCounts.productionSupply + (pendingCounts.logisticsPending || 0) + (pendingCounts.ovenActive || 0)) > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-sidebar" />
                            )}
                        </span>
                        {isOpen && (
                            <span className={`text-sm font-medium transition-colors
                                ${item.isAnimated ? 'text-brand-green' : 'text-slate-800 group-hover:text-brand-green'}`}
                                style={item.titleColor ? { color: item.titleColor, fontWeight: 800 } : undefined}
                            >
                                {item.title}
                            </span>
                        )}
                    </span>
                    {isOpen && (
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    )}
                </button>
                {expanded && isOpen && (
                    <div className="ml-4 mt-1 pl-4 border-l border-slate-200 space-y-0.5">
                        {item.children.map((child, idx) => {
                            // Handle divider items
                            if (child.type === 'divider') {
                                return (
                                    <div key={`divider-${idx}`} className="py-3">
                                        <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-medium">
                                            {child.label}
                                        </span>
                                    </div>
                                );
                            }
                            // Normal menu item
                            const isChildActive = location.pathname === child.path;
                            return (
                                <Link
                                    key={child.path}
                                    to={child.path}
                                    onClick={() => {
                                        if (onItemClick) onItemClick();
                                        if (child.path === '/production/blocks' && onResetBadge) onResetBadge();
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200
                                        ${isChildActive
                                            ? 'bg-brand-green/10 text-brand-green font-semibold border-l-2 border-brand-green -ml-[2px] pl-[14px]'
                                            : 'text-slate-600 hover:bg-brand-green/10 hover:text-brand-green'
                                        }`}
                                >
                                    <span className={`${isChildActive ? 'text-brand-green' : 'text-slate-400'}`}>
                                        {getIcon(child.icon, "w-4 h-4")}
                                    </span>
                                    <span className="flex-1" style={child.titleColor ? { color: child.titleColor, fontWeight: 700 } : undefined}>{child.title}</span>
                                    {child.path === '/hr/approvals' && (pendingCounts.leaves + pendingCounts.events) > 0 && (
                                        <span className="bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                            {pendingCounts.leaves + pendingCounts.events}
                                        </span>
                                    )}
                                    {child.path === '/production/blocks' && item.title === 'Live Production' && (
                                        // Calculate badge
                                        (() => {
                                            const count = Math.max(0, (pendingCounts.productionSupply || 0) - (pendingCounts.acknowledgedSupply || 0));
                                            return count > 0 ? (
                                                <span className="bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                    {count}
                                                </span>
                                            ) : null;
                                        })()
                                    )}
                                    {child.path === '/logistics/pool' && pendingCounts.logisticsPending > 0 && (
                                        <span className="bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                            {pendingCounts.logisticsPending}
                                        </span>
                                    )}
                                    {child.path === '/production/oven' && pendingCounts.ovenActive > 0 && (
                                        <span className="bg-red-500/20 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                            🔥 {pendingCounts.ovenActive}
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
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                ${isActive
                    ? 'bg-brand-green/10 text-brand-green font-semibold border-l-2 border-brand-green'
                    : 'text-slate-600 hover:bg-brand-green/10 hover:text-brand-green border-l-2 border-transparent'
                }`}
        >
            <span className={`relative ${isActive ? 'text-brand-green' : 'text-slate-400'}`}>
                {getIcon(item.icon)}
                {item.path === '/dashboard' && (pendingCounts.events + pendingCounts.leaves) > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-sidebar" />
                )}
                {item.path === '/chat' && pendingCounts.chat > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-sidebar" />
                )}
                {item.path === '/production/blocks' && badgeCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-sidebar" />
                )}
            </span>
            {isOpen && <span className="text-sm font-medium">{item.title}</span>}
            {isOpen && item.path === '/chat' && pendingCounts.chat > 0 && (
                <span className="ml-auto bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {pendingCounts.chat}
                </span>
            )}
            {isOpen && item.path === '/production/blocks' && badgeCount > 0 && (
                <span className="ml-auto bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {badgeCount}
                </span>
            )}
            {isOpen && item.path === '/logistics/pool' && pendingCounts.logisticsPending > 0 && (
                <span className="ml-auto bg-brand-orange/20 text-brand-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
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
        <div className="mt-2.5 flex items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_4px_rgba(45,140,14,0.5)] animate-pulse" />
            <span className="text-[11px] text-slate-600 font-mono tabular-nums tracking-wider">
                {time.toLocaleTimeString('it-IT')}
            </span>
        </div>
    );
}

export default function Sidebar({ isOpen, onToggle, mobileOpen, setMobileOpen }) {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [pendingCounts, setPendingCounts] = useState({ events: 0, leaves: 0, chat: 0 });

    useEffect(() => {
        console.log("🚀 SL ENTERPRISE SIDEBAR v5.0 LOADED - Light Enterprise");
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
                    const blocksData = await pickingApi.getRequests('pending');
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

            // Oven Active Items
            if (hasPermission('use_oven') || hasPermission('admin_users')) {
                try {
                    const ovenItems = await ovenApi.getItems();
                    const activeItems = Array.isArray(ovenItems) ? ovenItems : [];
                    newCounts.ovenActive = activeItems.length;
                } catch (err) {
                    console.error("Failed to fetch oven counts", err);
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
        <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-[110] flex flex-col
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isOpen ? 'md:w-64' : 'md:w-20'} 
            w-64`}>
            {/* Header — Company Logo */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    {(isOpen || mobileOpen) ? (
                        <div className="flex flex-col items-center w-full">
                            <div
                                className="relative cursor-pointer group transition-all duration-200 ease-out"
                                style={{
                                    transform: 'translateY(0px)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0px)'; }}
                                onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
                                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            >
                                <div
                                    className="px-4 py-2 rounded-xl transition-shadow duration-200"
                                    style={{
                                        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                                        boxShadow: `
                                            0 1px 0 0 rgba(255,255,255,0.9) inset,
                                            0 -1px 0 0 rgba(0,0,0,0.04) inset,
                                            0 4px 8px -2px rgba(0,0,0,0.12),
                                            0 2px 4px -1px rgba(0,0,0,0.06),
                                            0 -1px 2px 0 rgba(45,140,14,0.08)
                                        `,
                                        border: '1px solid rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <img
                                        src="/logo-siervoplast.png"
                                        alt="Siervo Plast"
                                        className="h-9 object-contain relative z-10"
                                        style={{
                                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
                                        }}
                                    />
                                </div>
                                {/* Subtle green accent line under logo */}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-[2px] bg-gradient-to-r from-transparent via-brand-green/40 to-transparent rounded-full" />
                            </div>
                            <RealTimeClock />
                        </div>
                    ) : (
                        <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-sm">SL</span>
                        </div>
                    )}
                </div>

                {/* Desktop Toggle */}
                <button onClick={onToggle} className="hidden md:flex p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200">
                    <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Close Button */}
                <button onClick={() => setMobileOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-700 transition-all duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Menu */}
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
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

            {/* User Footer */}
            <div className={`p-4 border-t border-slate-200 md:pb-4 pb-24 bg-white flex-none`}>
                {(isOpen || mobileOpen) && user && (
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-green/15 flex items-center justify-center">
                            <span className="text-sm font-medium text-brand-green">
                                {user.full_name?.charAt(0)?.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{user.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{user.role_label || user.role}</p>
                        </div>
                    </div>
                )}
                <div className={`flex items-center gap-2 ${!isOpen && !mobileOpen ? 'flex-col' : 'flex-row'}`}>
                    <button
                        onClick={handleLogout}
                        className="flex-1 w-full flex items-center justify-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Esci"
                    >
                        <LogOut className="w-5 h-5" />
                        {(isOpen || mobileOpen) && <span className="text-sm font-medium">Esci</span>}
                    </button>

                    {/* Online Users Widget - Sidebar Variant */}
                    <OnlineUsersWidget variant="sidebar" />
                </div>
            </div>
        </aside >
    );
}
