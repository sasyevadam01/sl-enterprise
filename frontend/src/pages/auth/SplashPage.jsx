import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashPage() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState('loading'); // loading -> reveal -> exit
    const [progress, setProgress] = useState(0);

    // Timeline di montaggio e animazione
    useEffect(() => {
        // Simula caricamento assets (0-100%)
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                // Ease-out step: accelera all'inizio, frena alla fine
                return p + Math.random() * 15;
            });
        }, 80);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (progress >= 100) {
            // Fase di "scoperta" gloriosa del brand
            setTimeout(() => setPhase('reveal'), 400);

            // Fade-out per entrare nell'app vera e propria
            setTimeout(() => setPhase('exit'), 3200);

            // Redirect effettivo
            setTimeout(() => navigate('/', { replace: true }), 4000);
        }
    }, [progress, navigate]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 transition-all duration-1000 overflow-hidden ${phase === 'exit' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                }`}
        >
            {/* Sfondo Animato - Maglia e Raggi di luce dinamici */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Raggio verde */}
                <div
                    className={`absolute w-[800px] h-[800px] top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 rounded-full blur-[150px] transition-all duration-[2000ms] ${phase === 'reveal' ? 'opacity-30 scale-150 rotate-45' : 'opacity-10 scale-75'
                        }`}
                    style={{ background: 'radial-gradient(circle, #2D8C0E 0%, transparent 60%)' }}
                />

                {/* Raggio arancio */}
                <div
                    className={`absolute w-[800px] h-[800px] bottom-1/4 right-1/4 translate-y-1/4 translate-x-1/4 rounded-full blur-[120px] transition-all duration-[2500ms] ${phase === 'reveal' ? 'opacity-20 scale-[2] -rotate-12' : 'opacity-0 scale-50'
                        }`}
                    style={{ background: 'radial-gradient(circle, #E6620F 0%, transparent 70%)' }}
                />

                {/* Grid di sfondo (Cyberpunk/Luxury texture) */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik00MCAwSDBWMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJNMCAwbDQwIDQwTTAgNDBsNDAtNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==')] opacity-40 mix-blend-overlay" />
            </div>

            {/* Particelle Fluttuanti (CSS puro) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white rounded-full animate-float-particle"
                        style={{
                            width: ((i % 4) + 1) + 'px',
                            height: ((i % 4) + 1) + 'px',
                            left: ((i * 17) % 100) + '%',
                            top: ((i * 23) % 100) + '%',
                            opacity: ((i % 3) * 0.1) + 0.1,
                            animationDelay: `${(i % 5)}s`,
                            animationDuration: `${(i % 5) + 5}s`
                        }}
                    />
                ))}
            </div>

            {/* Contenitore Principale Centrale */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">

                {/* Elemento / Logo Primario */}
                <div className={`relative w-64 h-24 mb-6 transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${phase === 'reveal'
                    ? 'scale-100 rotate-0 opacity-100 translate-y-0 filter-none'
                    : 'scale-90 opacity-0 translate-y-8 blur-md'
                    }`}>

                    {/* Glowing background behind the logo */}
                    <div className="absolute inset-x-4 inset-y-2 bg-slate-100/10 blur-xl rounded-full" />

                    {/* The Logo */}
                    <img
                        src="/logo-siervoplast.png"
                        alt="Siervoplast Logo"
                        className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-[2000ms] hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                        style={{ filter: phase === 'reveal' ? 'brightness(1.1) contrast(1.1)' : 'brightness(0)' }}
                    />
                </div>

                {/* Linea decorativa Intro */}
                <div className={`flex items-center gap-4 mb-6 transition-all duration-[1200ms] delay-100 ${phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-emerald-500/50" />
                    <span className="text-emerald-400/80 text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-lg">
                        Inizializzazione Sistema
                    </span>
                    <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-amber-500/50" />
                </div>

                {/* Testo Principale (Ora Rimosso) - Era il nome dell'autore */}
                <div className="relative overflow-hidden mb-2 px-6">
                    {/* Aggiunto un sottile riflesso o motto geometrico opzionale invece del nome */}
                    <h2 className={`text-xl sm:text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-amber-200 tracking-widest transition-all duration-[1500ms] ease-out delay-200 shadow-xl ${phase === 'reveal' ? 'transform-none opacity-100 blur-none' : 'translate-y-[80%] opacity-0 blur-lg'
                        }`}>
                        SISTEMA GESTIONALE
                    </h2>
                </div>

                {/* Sottotitolo / Versione */}
                <p className={`text-slate-400 text-sm md:text-base font-medium tracking-[0.2em] uppercase transition-all duration-[1200ms] delay-500 mt-4 ${phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                    SL Enterprise <span className="text-amber-500">v5.0</span>
                </p>

                {/* Copyright info */}
                <div className={`flex items-center gap-3 mt-12 transition-all duration-[1000ms] delay-[800ms] ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'
                    }`}>
                    <div className="h-[1px] w-4 bg-slate-700" />
                    <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                        © 2026 All Rights Reserved
                    </span>
                    <div className="h-[1px] w-4 bg-slate-700" />
                </div>

            </div>

            {/* Barra di caricamento (mostrata solo in fase 'loading') */}
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-slate-800 transition-opacity duration-500 ${phase === 'loading' ? 'opacity-100' : 'opacity-0'
                }`}>
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 shadow-[0_0_10px_rgba(45,140,14,0.6)] rounded-r-full transition-all duration-75 ease-out"
                    style={{ width: `${Math.min(100, progress)}%` }}
                />
            </div>

            <style>{`
                @keyframes float-particle {
                    0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
                    20% { opacity: var(--opacity, 0.5); }
                    80% { opacity: var(--opacity, 0.5); }
                    100% { transform: translateY(-100px) translateX(20px) scale(0); opacity: 0; }
                }
                .animate-float-particle {
                    animation-name: float-particle;
                    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    animation-iteration-count: infinite;
                }
            `}</style>
        </div>
    );
}
