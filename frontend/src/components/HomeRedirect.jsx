/**
 * SL Enterprise - Smart Home Redirect
 * Redirects users to their appropriate home page based on role's default_home setting.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // No user = go to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Use default_home from role if available, otherwise fallback to role-based logic
    const defaultHome = user?.default_home || user?.role_home;

    if (defaultHome) {
        console.log("[HomeRedirect] Using role default_home:", defaultHome);
        return <Navigate to={defaultHome} replace />;
    }

    // Fallback: Role-based home page routing (legacy)
    const role = user?.role || '';
    console.log("[HomeRedirect] Fallback - using role:", role);

    // Mobile Operators (record_user) - ALWAYS go to mobile, no sidebar
    if (['record_user', 'operator'].includes(role)) {
        return <Navigate to="/mobile/dashboard" replace />;
    }

    // Coordinators go to Tasks
    if (['coordinator'].includes(role)) {
        return <Navigate to="/hr/tasks" replace />;
    }

    // Factory controllers go to Tasks (per user request)
    if (['factory_controller'].includes(role)) {
        return <Navigate to="/hr/tasks" replace />;
    }

    // Admins and managers go to Dashboard
    if (['super_admin', 'admin', 'hr_manager'].includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    // Magazzinieri (warehouse workers) go to Checklist
    if (['magazziniere', 'warehouse', 'forklift_operator'].includes(role)) {
        console.log("[HomeRedirect] Magazziniere detected - redirecting to /production/checklist");
        return <Navigate to="/production/checklist" replace />;
    }

    // Default fallback - go to tasks for safety
    return <Navigate to="/hr/tasks" replace />;
}
