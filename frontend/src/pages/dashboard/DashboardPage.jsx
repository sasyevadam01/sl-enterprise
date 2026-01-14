/**
 * SL Enterprise - Dashboard 3.0 (Premium)
 * Re-tooled with "Control Room" Philosophy
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    expiriesApi,
    eventsApi,
    leavesApi,
    employeesApi,
    kpiApi
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { format, addDays, startOfWeek } from 'date-fns';

// Components
import CommandCenter from '../../components/dashboard/CommandCenter';
import PerformanceGauge from '../../components/dashboard/PerformanceGauge';
import MachineStatusWidget from '../../components/dashboard/MachineStatusWidget';
import DepartmentEfficiencyWidget from '../../components/dashboard/DepartmentEfficiencyWidget';
import MyTasksWidget from '../../components/dashboard/MyTasksWidget';
import StaffingWidget from '../../components/dashboard/StaffingWidget';
import ProductionTrendWidget from '../../components/dashboard/ProductionTrendWidget';
import QuickActions from '../../components/dashboard/QuickActions';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';

export default function DashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data States
    const [stats, setStats] = useState({ totalEmployees: 0, pendingLeaves: 0, pendingEvents: 0 });
    const [trendData, setTrendData] = useState([]);
    const [activities, setActivities] = useState([]);
    const [pendingCounts, setPendingCounts] = useState({ leaves: 0, events: 0, expiries: 0 });
    const [expiries, setExpiries] = useState({});

    // Fetch Effect
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Parallel Fetching
                const [
                    employees,
                    pendingLeaves,
                    pendingEvents,
                    expiriesData,
                    trendResult
                ] = await Promise.all([
                    employeesApi.getEmployees().catch(() => []),
                    leavesApi.getPending().catch(() => []),
                    eventsApi.getPending().catch(() => []),
                    expiriesApi.getExpiries().catch(() => ({})),
                    kpiApi.getTrend(
                        format(addDays(new Date(), -7), 'yyyy-MM-dd'),
                        format(new Date(), 'yyyy-MM-dd'),
                        true
                    ).catch(() => ({ trend: [] }))
                ]);

                // Update Stats
                setStats({
                    totalEmployees: employees.length,
                    pendingLeaves: pendingLeaves.length,
                    pendingEvents: pendingEvents.length
                });

                setPendingCounts({
                    leaves: pendingLeaves.length,
                    events: pendingEvents.length,
                    expiries: expiriesData.total_urgent || 0
                });

                setExpiries(expiriesData);
                setTrendData(trendResult?.trend || []);

                // Build Activities Timeline
                const acts = [];
                // Leaves
                pendingLeaves.slice(0, 3).forEach(l => acts.push({
                    type: 'leave',
                    title: `Richiesta ${l.leave_type}`,
                    employee: { id: l.employee_id, name: l.employee_name || 'Dipendente' },
                    time: format(new Date(l.created_at), 'HH:mm')
                }));
                // Events
                pendingEvents.slice(0, 3).forEach(e => acts.push({
                    type: 'event',
                    title: e.event_label || 'Evento HR',
                    employee: { id: e.employee_id, name: e.employee_name || 'Dipendente' },
                    time: format(new Date(e.created_at), 'HH:mm')
                }));
                // Expiries
                if (expiriesData.total_urgent > 0) {
                    acts.push({ type: 'expiry', title: `${expiriesData.total_urgent} Scadenze Urgenti`, time: 'Oggi' });
                }
                setActivities(acts);

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
                staggerChildren: 0.1
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

            {/* 2. Factory Pulse Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-64 h-auto">
                <motion.div variants={itemVariants} className="h-full">
                    <PerformanceGauge />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <ProductionTrendWidget data={trendData} />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <MachineStatusWidget />
                </motion.div>
            </div>

            {/* 3. HR & Productivity Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-80 h-auto">
                <motion.div variants={itemVariants} className="h-full">
                    <StaffingWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <DepartmentEfficiencyWidget />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <MyTasksWidget />
                </motion.div>
            </div>

            {/* 4. Action & Timeline Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-80 h-auto">
                <motion.div variants={itemVariants} className="md:col-span-2 h-full">
                    <QuickActions pendingCounts={pendingCounts} />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <ActivityTimeline activities={activities} />
                </motion.div>
            </div>

        </motion.div>
    );
}
