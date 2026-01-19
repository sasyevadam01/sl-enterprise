/**
 * SL Enterprise - Permission Route
 * Verifica che l'utente abbia il permesso richiesto per accedere alla rotta.
 * Se non ha il permesso, mostra una pagina di accesso negato.
 */
import { useAuth } from '../context/AuthContext';

export default function PermissionRoute({ children, permission }) {
    const { hasPermission, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Se non è specificato un permesso, permetti l'accesso (es. Chat)
    if (!permission) {
        return children;
    }

    // Verifica il permesso
    const checkAccess = (perm) => {
        if (Array.isArray(perm)) {
            return perm.some(p => hasPermission(p));
        }
        return hasPermission(perm);
    };

    if (!checkAccess(permission)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="bg-slate-800 rounded-2xl border border-red-500/30 p-8 max-w-md text-center shadow-2xl">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Accesso Negato</h1>
                    <p className="text-gray-400 mb-6">
                        Non hai i permessi necessari per accedere a questa sezione.
                    </p>
                    <p className="text-xs text-gray-500 mb-6 font-mono bg-slate-900 p-2 rounded">
                        Permesso richiesto: <span className="text-red-400">{permission}</span>
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                    >
                        ← Torna Indietro
                    </button>
                </div>
            </div>
        );
    }

    return children;
}
