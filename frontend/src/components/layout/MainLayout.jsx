/**
 * SL Enterprise - Main Layout
 * v5.0 — Light Enterprise Theme
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';

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
        if (PAGE_TITLES[location.pathname]) {
            return PAGE_TITLES[location.pathname];
        }
        if (location.pathname.match(/\/hr\/employees\/\d+/)) {
            return 'Dettaglio Dipendente';
        }
        return 'SL Enterprise';
    };

    return (
        <div className="app-background">
            <Sidebar
                isOpen={desktopExpanded}
                onToggle={() => setDesktopExpanded(!desktopExpanded)}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-[105] md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className={`transition-all duration-300 ${desktopExpanded ? 'md:ml-64' : 'md:ml-20'} ml-0`}>
                {/* Top Bar — White */}
                <header className="top-bar sticky top-0 z-[100]">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-4">
                            {/* Hamburger (Mobile) */}
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="md:hidden p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />

                            {/* User */}
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-800">{user?.full_name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 pb-24">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
