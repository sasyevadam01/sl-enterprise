/**
 * SL Enterprise - Auth Context
 * Gestione stato autenticazione globale
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Carica utente da localStorage all'avvio
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            setError(null);
            const data = await authApi.login(username, password);
            localStorage.setItem('token', data.access_token);

            // Ottieni dati utente
            const userData = await authApi.getMe();
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (err) {
            const message = err.response?.data?.detail || 'Errore di login';
            setError(message);
            return { success: false, error: message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isAdmin = () => {
        return user?.role === 'super_admin' || user?.role === 'hr_manager';
    };

    const hasPermission = (code) => {
        // Super admin bypass
        if (user?.role === 'super_admin') return true;
        // Check permissions array
        return user?.permissions?.includes(code) || false;
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAdmin,
        hasPermission,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
