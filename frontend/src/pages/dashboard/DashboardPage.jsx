/**
 * SL Enterprise - Dashboard v5.0
 * Premium Enterprise Light Theme
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { leavesApi, employeesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { parseISO } from 'date-fns';

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
    const [stats, setStats] = useState({ totalEmployees: 0, permessiOggi: 0 });
    const [pendingCounts, setPendingCounts] = useState({ leaves: 0, events: 0 });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [employees, approvedLeaves] = await Promise.all([
                    employeesApi.getEmployees().catch(() => []),
                    leavesApi.getLeaves({ status_filter: 'approved' }).catch(() => [])
                ]);

                const today = new Date();
                const permessiOggi = approvedLeaves.filter(l => {
                    const start = parseISO(l.start_date);
                    const end = parseISO(l.end_date);
                    const isTodayCovered = today >= start && today <= end;
                    const isPermit = /permesso|permit/i.test(l.leave_type);
                    return isTodayCovered && isPermit;
                }).length;

                setStats({ totalEmployees: employees.length, permessiOggi });
                setPendingCounts({ leaves: 0, events: 0 });
            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
    };
    const itemVariants = {
        hidden: { y: 12, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-green rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">Caricamento...</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="pb-8 space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <CommandCenter stats={stats} user={user} />
            </motion.div>

            {/* Row 1: Weather (compact) + Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <motion.div variants={itemVariants} className="lg:col-span-4">
                    <WeatherWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="lg:col-span-8">
                    <MyTasksWidget />
                </motion.div>
            </div>

            {/* Row 2: Staffing + Leaves + Events */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={itemVariants}>
                    <StaffingWidget />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <RecentLeavesWidget />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <RecentEventsWidget />
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <QuickActions pendingCounts={pendingCounts} />
            </motion.div>
        </motion.div>
    );
}
