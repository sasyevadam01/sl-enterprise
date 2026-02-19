/**
 * SL Enterprise - Main Layout
 * v5.0 — Light Enterprise Theme
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../ui/CustomUI';

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
    const { toast } = useUI();
    const userInteracted = useRef(false);

    // ── Track user interaction (Chrome autoplay policy) ──
    useEffect(() => {
        const markInteracted = () => { userInteracted.current = true; };
        window.addEventListener('click', markInteracted, { once: true });
        window.addEventListener('touchstart', markInteracted, { once: true });
        window.addEventListener('keydown', markInteracted, { once: true });
        return () => {
            window.removeEventListener('click', markInteracted);
            window.removeEventListener('touchstart', markInteracted);
            window.removeEventListener('keydown', markInteracted);
        };
    }, []);

    // ── Notification Sound (Web Audio API — no files needed) ──
    const playNotificationSound = useCallback(() => {
        if (!userInteracted.current) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Primo tono (Do alto)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.value = 830;
            gain1.gain.setValueAtTime(0.3, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.3);
            // Secondo tono (Mi alto)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.value = 1050;
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.warn('[Sound] Audio non supportato:', e);
        }
    }, []);

    // ── Global WebSocket: Logistics notifications on ANY page ──
    useEffect(() => {
        if (!user) return;

        const wsUrl = `ws://${window.location.hostname}:8000/ws/logistics`;
        let ws;
        let reconnectTimer;

        const connect = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_request') {
                        playNotificationSound();
                        toast.info('📦 Nuova richiesta materiale in arrivo!');
                        console.log('[WS Global] 🔔 Notifica ricevuta: new_request');
                    }
                } catch (err) {
                    console.error('[WS Global] Parse error:', err);
                }
            };
            ws.onclose = () => {
                // Riconnessione automatica dopo 5 secondi
                reconnectTimer = setTimeout(connect, 5000);
            };
            ws.onerror = (err) => {
                console.warn('[WS Global] Errore connessione logistics:', err);
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
        };
    }, [user, playNotificationSound, toast]);

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
