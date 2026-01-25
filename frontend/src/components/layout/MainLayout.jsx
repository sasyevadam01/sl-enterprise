/**
 * SL Enterprise - Main Layout
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
// UsageGuide removed per user request
import { useAuth } from '../../context/AuthContext';
// UsageGuide removed per user request

// Page titles based on route
const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/hr/employees': 'Dipendenti',
    '/hr/employees/new': 'Nuovo Dipendente',
    '/hr/leaves': 'Ferie & Permessi',
    '/hr/calendar': 'Calendario Assenze',
    '/hr/expiries': 'Scadenze',
    '/hr/events/new': 'Nuovo Evento',
    '/hr/events/pending': 'Approvazione Eventi',
    '/hr/tasks': 'Task Board',
    '/hr/org-chart': 'Organigramma',
    '/hr/announcements': 'Bacheca Annunci',
    '/factory/machines': 'Macchinari',
    '/factory/production': 'Produzione',
    '/factory/kpi': 'KPI',
    '/ops/returns': 'Gestione Resi',
    '/admin/audit': 'Audit Log',
};

export default function MainLayout() {
    const [desktopExpanded, setDesktopExpanded] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user } = useAuth();
    const location = useLocation();

    const getPageTitle = () => {
        // Check exact match first
        if (PAGE_TITLES[location.pathname]) {
            return PAGE_TITLES[location.pathname];
        }
        // Check for employee detail page
        if (location.pathname.match(/\/hr\/employees\/\d+/)) {
            return 'Dettaglio Dipendente';
        }
        return 'SL Enterprise';
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar
                isOpen={desktopExpanded}
                onToggle={() => setDesktopExpanded(!desktopExpanded)}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className={`transition-all duration-300 ${desktopExpanded ? 'md:ml-64' : 'md:ml-20'} ml-0`}>
                {/* Top Bar */}
                <header className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            {/* Hamburger Menu (Mobile Only) */}
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="md:hidden p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-semibold text-white">{getPageTitle()}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <NotificationBell />

                            {/* User */}
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-white">{user?.full_name}</p>
                                    <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    <Outlet />
                </div>
            </main>


            {/* Live Widget - Moved to Sidebar */}


        </div>
    );
}

