/**
 * SL Enterprise - Dashboard 4.0 (Redesigned)
 * Simplified & Functional Layout
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    leavesApi,
    employeesApi
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, parseISO } from 'date-fns';

// Components
import CommandCenter from '../../components/dashboard/CommandCenter';
import MyTasksWidget from '../../components/dashboard/MyTasksWidget';
import StaffingWidget from '../../components/dashboard/StaffingWidget';
import QuickActions from '../../components/dashboard/QuickActions';
import WeatherWidget from '../../components/dashboard/WeatherWidget';
import RecentLeavesWidget from '../../components/dashboard/RecentLeavesWidget';
import RecentEventsWidget from '../../components/dashboard/RecentEventsWidget';

export default function DashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data States
    const [stats, setStats] = useState({ totalEmployees: 0, permessiOggi: 0 });
    const [pendingCounts, setPendingCounts] = useState({ leaves: 0, events: 0 });

    // Fetch Effect
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Parallel Fetching
                const [employees, approvedLeaves] = await Promise.all([
                    employeesApi.getEmployees().catch(() => []),
                    leavesApi.getLeaves({ status_filter: 'approved' }).catch(() => [])
                ]);

                // Count "Permessi Oggi" (leaves that cover today and are type 'permit' or similar)
                const today = new Date();
                const permessiOggi = approvedLeaves.filter(l => {
                    const start = parseISO(l.start_date);
                    const end = parseISO(l.end_date);
                    const isTodayCovered = today >= start && today <= end;
                    // Consider 'permit' or 'permesso' as daily permits. Adjust regex if needed.
                    const isPermit = /permesso|permit/i.test(l.leave_type);
                    return isTodayCovered && isPermit;
                }).length;

                // Update Stats
                setStats({
                    totalEmployees: employees.length,
                    permessiOggi: permessiOggi
                });

                setPendingCounts({
                    leaves: 0, // Not used for header anymore
                    events: 0
                });

            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Container Animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="relative w-24 h-24">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/30 rounded-full animate-ping"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="pb-8 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. Header Command Center */}
            <motion.div variants={itemVariants}>
                <CommandCenter stats={stats} user={user} />
            </motion.div>

            {/* 2. Row 1: Weather + I Miei Task */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="md:col-span-1 h-80">
                    <WeatherWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="md:col-span-2 h-80">
                    <MyTasksWidget />
                </motion.div>
            </div>

            {/* 3. Row 2: Presenze Turno + Ultime Assenze + Ultimi Eventi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="h-80">
                    <StaffingWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="h-80">
                    <RecentLeavesWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="h-80">
                    <RecentEventsWidget />
                </motion.div>
            </div>

            {/* 4. Bottom: Quick Actions (Full Width) */}
            <motion.div variants={itemVariants}>
                <QuickActions pendingCounts={pendingCounts} />
            </motion.div>

        </motion.div>
    );
}
