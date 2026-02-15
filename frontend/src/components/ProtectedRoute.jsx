/**
 * SL Enterprise - Protected Route
 * Protegge le rotte che richiedono autenticazione + PIN verificato.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading, needsPinSetup, needsPinVerify } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // PIN flow: redirect se PIN non ancora configurato/verificato
    if (needsPinSetup()) {
        return <Navigate to="/pin-setup" replace />;
    }

    if (needsPinVerify()) {
        return <Navigate to="/pin-verify" replace />;
    }

    return children;
}
