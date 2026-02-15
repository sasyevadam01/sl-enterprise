/**
 * SL Enterprise - Auth Context
 * Gestione stato autenticazione globale con PIN security
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pinStatus, setPinStatus] = useState(null); // { has_pin, pin_required }
    const [pinVerified, setPinVerified] = useState(false);

    // Carica utente da localStorage all'avvio
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
                // PIN verificato SOLO nella sessione corrente del browser (sessionStorage)
                // e legato all'utente specifico
                const userPinKey = `pinVerified_${parsed.id}`;
                if (sessionStorage.getItem(userPinKey) === 'true') {
                    setPinVerified(true);
                }
                // Carica stato PIN dal profilo utente salvato
                setPinStatus({
                    has_pin: parsed.has_pin || false,
                    pin_required: parsed.pin_required !== false // default true
                });
            } catch (e) {
                console.error("AuthContext: Failed to parse user JSON", e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            setError(null);
            const data = await authApi.login(username, password);
            localStorage.setItem('token', data.access_token);

            // Salva stato PIN dalla risposta del login
            const pinInfo = {
                has_pin: data.has_pin || false,
                pin_required: data.pin_required !== false
            };
            setPinStatus(pinInfo);
            setPinVerified(false);
            // Pulisci tutti i pinVerified precedenti da sessionStorage
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('pinVerified_')) sessionStorage.removeItem(key);
            });

            // Ottieni dati utente
            const userData = await authApi.getMe();
            userData.has_pin = pinInfo.has_pin;
            userData.pin_required = pinInfo.pin_required;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return {
                success: true,
                has_pin: pinInfo.has_pin,
                pin_required: pinInfo.pin_required
            };
        } catch (err) {
            const message = err.response?.data?.detail || 'Errore di login';
            setError(message);
            return { success: false, error: message };
        }
    };

    const confirmPinVerified = () => {
        setPinVerified(true);
        // Salva in sessionStorage legato all'utente corrente
        const userId = user?.id || JSON.parse(localStorage.getItem('user') || '{}').id;
        if (userId) {
            sessionStorage.setItem(`pinVerified_${userId}`, 'true');
        }
        // Aggiorna anche has_pin nel pinStatus (dopo setup)
        setPinStatus(prev => {
            const updated = { ...prev, has_pin: true };
            // Aggiorna anche il localStorage user
            try {
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                userData.has_pin = true;
                localStorage.setItem('user', JSON.stringify(userData));
            } catch { /* ignore */ }
            return updated;
        });
    };

    const logout = () => {
        // Pulisci pinVerified da sessionStorage per l'utente corrente
        if (user?.id) {
            sessionStorage.removeItem(`pinVerified_${user.id}`);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setPinVerified(false);
        setPinStatus(null);
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

    // PIN è necessario se pin_required è true
    const needsPin = () => {
        if (!pinStatus) return false;
        return pinStatus.pin_required === true;
    };

    // PIN deve essere configurato (primo accesso)
    const needsPinSetup = () => {
        return needsPin() && pinStatus && !pinStatus.has_pin;
    };

    // PIN deve essere verificato (accessi successivi)
    const needsPinVerify = () => {
        return needsPin() && pinStatus && pinStatus.has_pin && !pinVerified;
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
        // PIN
        pinStatus,
        pinVerified,
        confirmPinVerified,
        needsPin,
        needsPinSetup,
        needsPinVerify,
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
