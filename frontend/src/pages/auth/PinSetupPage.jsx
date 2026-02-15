/**
 * SL Enterprise - PIN Setup Page
 * v5.0 — Light Enterprise Theme
 * Input type="tel" + autocomplete="one-time-code" impediscono a Chrome di salvare.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

export default function PinSetupPage() {
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef([]);
    const confirmRefs = useRef([]);
    const navigate = useNavigate();
    const { confirmPinVerified } = useAuth();

    useEffect(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, []);

    useEffect(() => {
        if (step === 2 && confirmRefs.current[0]) confirmRefs.current[0].focus();
    }, [step]);

    const handleDigitChange = (index, value, isConfirm = false) => {
        if (!/^\d?$/.test(value)) return;
        const refs = isConfirm ? confirmRefs : inputRefs;
        const setter = isConfirm ? setConfirmPin : setPin;
        const current = isConfirm ? [...confirmPin] : [...pin];
        current[index] = value;
        setter(current);
        setError('');
        if (value && index < 3) refs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e, isConfirm = false) => {
        const refs = isConfirm ? confirmRefs : inputRefs;
        const current = isConfirm ? confirmPin : pin;
        if (e.key === 'Backspace' && !current[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            if (!isConfirm && step === 1 && pin.every(d => d !== '')) handleNextStep();
            else if (isConfirm && confirmPin.every(d => d !== '')) handleSubmit();
        }
    };

    const handlePaste = (e, isConfirm = false) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (pasted.length === 4) {
            const digits = pasted.split('');
            if (isConfirm) setConfirmPin(digits);
            else setPin(digits);
        }
    };

    const handleNextStep = () => {
        if (pin.some(d => d === '')) {
            setError('Inserisci tutte e 4 le cifre');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async () => {
        if (confirmPin.some(d => d === '')) {
            setError('Inserisci tutte e 4 le cifre di conferma');
            return;
        }
        const pinString = pin.join('');
        const confirmString = confirmPin.join('');
        if (pinString !== confirmString) {
            setError('I PIN non corrispondono. Riprova.');
            setConfirmPin(['', '', '', '']);
            confirmRefs.current[0]?.focus();
            return;
        }
        setIsLoading(true);
        try {
            await authApi.setupPin(pinString);
            setSuccess(true);
            confirmPinVerified();
            setTimeout(() => navigate('/splash'), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Errore nella configurazione del PIN');
            setIsLoading(false);
        }
    };

    const renderPinInputs = (values, refs, isConfirm = false) => (
        <div className="flex justify-center gap-4" onPaste={(e) => handlePaste(e, isConfirm)}>
            {values.map((digit, i) => (
                <input
                    key={i}
                    ref={el => refs.current[i] = el}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value, isConfirm)}
                    onKeyDown={e => handleKeyDown(i, e, isConfirm)}
                    className={`
                        w-16 h-20 text-center text-3xl font-bold rounded-2xl
                        bg-white border-2 text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green
                        transition-all duration-200
                        ${digit ? 'border-brand-green shadow-sm' : 'border-gray-300'}
                        ${error ? 'border-red-400 animate-shake' : ''}
                    `}
                    style={{ caretColor: 'transparent' }}
                />
            ))}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-100 p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-green/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Configura PIN</h1>
                    <p className="text-gray-500 text-sm">
                        {step === 1
                            ? 'Scegli un PIN a 4 cifre per proteggere il tuo accesso'
                            : 'Conferma il tuo PIN per completare la configurazione'}
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
                            <h3 className="text-lg font-bold text-brand-green mb-1">PIN Configurato!</h3>
                            <p className="text-gray-500 text-sm">Reindirizzamento in corso...</p>
                        </div>
                    ) : (
                        <>
                            {/* Step indicator */}
                            <div className="flex justify-center gap-3 mb-6">
                                <div className={`w-2.5 h-2.5 rounded-full transition-all ${step >= 1 ? 'bg-brand-green' : 'bg-gray-200'}`} />
                                <div className={`w-2.5 h-2.5 rounded-full transition-all ${step >= 2 ? 'bg-brand-green' : 'bg-gray-200'}`} />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <div className="mb-8">
                                <p className="text-center text-gray-600 text-xs font-semibold uppercase tracking-wider mb-5">
                                    {step === 1 ? 'Inserisci PIN' : 'Conferma PIN'}
                                </p>
                                {step === 1
                                    ? renderPinInputs(pin, inputRefs)
                                    : renderPinInputs(confirmPin, confirmRefs, true)
                                }
                            </div>

                            <button
                                onClick={step === 1 ? handleNextStep : handleSubmit}
                                disabled={isLoading || (step === 1 ? pin.some(d => d === '') : confirmPin.some(d => d === ''))}
                                className="w-full py-3.5 px-6 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Configurazione...
                                    </span>
                                ) : step === 1 ? 'Avanti' : 'Conferma PIN'}
                            </button>

                            {step === 2 && (
                                <button
                                    onClick={() => { setStep(1); setConfirmPin(['', '', '', '']); setError(''); }}
                                    className="w-full mt-3 py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
                                >
                                    ← Torna indietro
                                </button>
                            )}
                        </>
                    )}
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">
                    Il PIN non verrà salvato dal browser
                </p>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </div>
    );
}
