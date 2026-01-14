/**
 * SL Enterprise - Smart Home Redirect
 * Redirects users to their appropriate home page based on role.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
    const { user, loading } = useAuth();

    // Debug: Log what role we're seeing
    console.log("[HomeRedirect] User:", user);
    console.log("[HomeRedirect] Role:", user?.role);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // No user = go to login
    if (!user) {
        console.log("[HomeRedirect] No user, redirecting to login");
        return <Navigate to="/login" replace />;
    }

    // Role-based home page routing
    const role = user?.role || '';
    console.log("[HomeRedirect] Detected role:", role);

    // Mobile Operators (record_user)
    if (['record_user', 'operator'].includes(role)) {
        console.log("[HomeRedirect] Operator detected, going to /mobile/dashboard");
        return <Navigate to="/mobile/dashboard" replace />;
    }

    // Coordinators go to Tasks
    if (['coordinator'].includes(role)) {
        console.log("[HomeRedirect] Coordinator detected, going to /hr/tasks");
        return <Navigate to="/hr/tasks" replace />;
    }

    // Admins and managers go to Dashboard
    if (['super_admin', 'admin', 'factory_controller', 'hr_manager'].includes(role)) {
        console.log("[HomeRedirect] Admin/Manager detected, going to /dashboard");
        return <Navigate to="/dashboard" replace />;
    }

    // Default fallback - go to tasks for safety
    console.log("[HomeRedirect] Unknown role, defaulting to /hr/tasks");
    return <Navigate to="/hr/tasks" replace />;
}
