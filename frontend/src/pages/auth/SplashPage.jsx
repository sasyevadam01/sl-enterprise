/**
 * SL Enterprise — Splash Screen
 * Shows "Da un'idea di Salvatore Laezza ©" with a premium fade animation,
 * then seamlessly transitions into the main application.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashPage() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState('enter'); // enter → hold → exit

    useEffect(() => {
        // Phase timeline: enter(0→800ms) → hold(800→2800ms) → exit(2800→3600ms) → navigate
        const holdTimer = setTimeout(() => setPhase('hold'), 800);
        const exitTimer = setTimeout(() => setPhase('exit'), 2800);
        const navTimer = setTimeout(() => navigate('/', { replace: true }), 3600);

        return () => {
            clearTimeout(holdTimer);
            clearTimeout(exitTimer);
            clearTimeout(navTimer);
        };
    }, [navigate]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-800 ease-in-out ${phase === 'exit' ? 'opacity-0' : 'opacity-100'
                }`}
            style={{
                background: 'linear-gradient(145deg, #F8FAFB 0%, #FFFFFF 50%, #F5F7FA 100%)',
            }}
        >
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06] blur-[120px]"
                    style={{ background: 'radial-gradient(circle, #2D8C0E 0%, transparent 70%)' }}
                />
                <div
                    className="absolute w-[400px] h-[400px] top-1/3 left-1/3 rounded-full opacity-[0.04] blur-[80px]"
                    style={{ background: 'radial-gradient(circle, #E6620F 0%, transparent 70%)' }}
                />
            </div>

            {/* Content */}
            <div className="relative text-center">
                {/* Thin accent line above */}
                <div
                    className={`w-12 h-[1.5px] mx-auto mb-8 rounded-full transition-all duration-1000 ease-out ${phase === 'enter' ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                        }`}
                    style={{
                        background: 'linear-gradient(90deg, #2D8C0E, #E6620F)',
                        transitionDelay: '200ms',
                    }}
                />

                {/* Main text */}
                <p
                    className={`text-[15px] tracking-[0.25em] uppercase font-light transition-all duration-1000 ease-out ${phase === 'enter' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
                        }`}
                    style={{ color: '#94A3B8', transitionDelay: '300ms' }}
                >
                    Da un'idea di
                </p>

                {/* Name */}
                <h1
                    className={`text-[28px] sm:text-[34px] font-bold tracking-tight mt-3 transition-all duration-1000 ease-out ${phase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                        }`}
                    style={{ color: '#1E293B', transitionDelay: '500ms' }}
                >
                    Salvatore Laezza
                </h1>

                {/* Copyright symbol */}
                <div
                    className={`flex items-center justify-center gap-2 mt-4 transition-all duration-1000 ease-out ${phase === 'enter' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
                        }`}
                    style={{ transitionDelay: '700ms' }}
                >
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 8.625c-.621-.504-1.407-.813-2.25-.813a3.563 3.563 0 100 7.125c.843 0 1.629-.309 2.25-.812" />
                    </svg>
                    <span className="text-[11px] text-slate-300 tracking-wider uppercase">
                        2026 — All Rights Reserved
                    </span>
                </div>

                {/* Thin accent line below */}
                <div
                    className={`w-12 h-[1.5px] mx-auto mt-8 rounded-full transition-all duration-1000 ease-out ${phase === 'enter' ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                        }`}
                    style={{
                        background: 'linear-gradient(90deg, #E6620F, #2D8C0E)',
                        transitionDelay: '400ms',
                    }}
                />
            </div>

            {/* Custom transition duration */}
            <style>{`
                .duration-800 {
                    transition-duration: 800ms;
                }
            `}</style>
        </div>
    );
}
