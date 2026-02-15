/**
 * SL Enterprise - PIN Verify Page
 * v5.0 — Light Enterprise Theme
 * Dopo 3 tentativi errati → logout automatico.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

export default function PinVerifyPage() {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const { logout, user, confirmPinVerified } = useAuth();

    const MAX_ATTEMPTS = 3;

    useEffect(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, []);

    const handleDigitChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError('');
        if (value && index < 3) inputRefs.current[index + 1]?.focus();
        if (value && index === 3 && newPin.every(d => d !== '')) {
            handleSubmit(newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (pasted.length === 4) {
            setPin(pasted.split(''));
            handleSubmit(pasted);
        }
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSubmit = async (pinString) => {
        if (!pinString || pinString.length !== 4) return;
        setIsLoading(true);
        try {
            await authApi.verifyPin(pinString);
            setSuccess(true);
            localStorage.setItem('pinVerified', 'true');
            confirmPinVerified();
            setTimeout(() => navigate('/splash'), 800);
        } catch {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
                setError('Troppi tentativi errati. Disconnessione...');
                setTimeout(() => { logout(); navigate('/login'); }, 2000);
            } else {
                setError(`PIN errato. ${MAX_ATTEMPTS - newAttempts} tentativi rimasti.`);
                triggerShake();
                setPin(['', '', '', '']);
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
            }
            setIsLoading(false);
        }
    };

    const handleContactAdmin = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-100 p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${success ? 'bg-green-50' : 'bg-brand-green/10'
                        }`}>
                        {success ? (
                            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Inserisci PIN</h1>
                    <p className="text-gray-500 text-sm">
                        {user?.full_name ? `Ciao ${user.full_name.split(' ')[0]}, ` : ''}inserisci il tuo PIN per continuare
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl p-8 shadow-card border border-gray-200">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                                <svg className="w-7 h-7 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-brand-green">Accesso Confermato</h3>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-6 border ${attempts >= MAX_ATTEMPTS
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                    }`}>
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <div className="mb-6" onPaste={handlePaste}>
                                <div className={`flex justify-center gap-4 ${isShaking ? 'animate-shake' : ''}`}>
                                    {pin.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={el => inputRefs.current[i] = el}
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={1}
                                            value={digit ? '●' : ''}
                                            onChange={e => {
                                                const val = e.target.value.replace('●', '');
                                                handleDigitChange(i, val.slice(-1));
                                            }}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            disabled={isLoading || attempts >= MAX_ATTEMPTS}
                                            className={`
                                                w-16 h-20 text-center text-3xl font-bold rounded-2xl
                                                bg-white border-2 text-gray-900
                                                focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green
                                                transition-all duration-200
                                                disabled:opacity-40 disabled:cursor-not-allowed
                                                ${digit ? 'border-brand-green shadow-sm' : 'border-gray-300'}
                                                ${error && !isLoading ? 'border-red-400' : ''}
                                            `}
                                            style={{ caretColor: 'transparent' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Attempt dots */}
                            <div className="flex justify-center gap-2 mb-6">
                                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full transition-all ${i < attempts ? 'bg-red-400' : 'bg-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleContactAdmin}
                                className="w-full py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
                            >
                                Non ricordo il PIN — Contatta l&apos;amministratore
                            </button>
                        </>
                    )}
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">
                    SL Enterprise — Accesso Protetto
                </p>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
                    20%, 40%, 60%, 80% { transform: translateX(6px); }
                }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </div>
    );
}
