/**
 * SL Enterprise - Login Page
 * v5.2 — Premium Enterprise with Dynamic Effects
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Floating particle system — subtle ambient animation */
function FloatingParticles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);

        const count = 35;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.offsetWidth,
                y: Math.random() * canvas.offsetHeight,
                radius: Math.random() * 2 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.05,
                color: Math.random() > 0.6 ? '#E6620F' : '#2D8C0E',
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            particles.forEach((p, i) => {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.offsetWidth;
                if (p.x > canvas.offsetWidth) p.x = 0;
                if (p.y < 0) p.y = canvas.offsetHeight;
                if (p.y > canvas.offsetHeight) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();

                particles.forEach((p2, j) => {
                    if (i >= j) return;
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = '#2D8C0E';
                        ctx.globalAlpha = (1 - dist / 120) * 0.06;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });
            ctx.globalAlpha = 1;
            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />;
}

/* SVG Icons for bottom section */
const ShieldIcon = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);
const LockIcon = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);
const ServerIcon = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
    </svg>
);
const CopyrightIcon = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 8.625c-.621-.504-1.407-.813-2.25-.813a3.563 3.563 0 100 7.125c.843 0 1.629-.309 2.25-.812" />
    </svg>
);

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { login, error } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await login(username, password);
        setIsLoading(false);
        if (result.success) {
            if (result.pin_required) {
                navigate(result.has_pin ? '/pin-verify' : '/pin-setup');
            } else {
                navigate('/splash');
            }
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* ============================================ */}
            {/* LEFT PANEL — Brand Visual with Effects       */}
            {/* ============================================ */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
                style={{ background: 'linear-gradient(145deg, #0F1923 0%, #162A1E 40%, #1A2332 100%)' }}>

                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-[500px] h-[500px] -top-32 -left-32 rounded-full opacity-20 blur-[100px] animate-orb-1"
                        style={{ background: 'radial-gradient(circle, #2D8C0E 0%, transparent 70%)' }} />
                    <div className="absolute w-[400px] h-[400px] bottom-0 right-0 rounded-full opacity-15 blur-[80px] animate-orb-2"
                        style={{ background: 'radial-gradient(circle, #E6620F 0%, transparent 70%)' }} />
                    <div className="absolute w-[300px] h-[300px] top-1/2 left-1/3 rounded-full opacity-10 blur-[60px] animate-orb-3"
                        style={{ background: 'radial-gradient(circle, #2D8C0E 0%, transparent 70%)' }} />
                </div>

                <FloatingParticles />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Brand Content — Center */}
                <div className={`relative z-10 text-center px-12 max-w-lg transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {/* Company Logo — Dynamic */}
                    <div className="mb-10 relative flex items-center justify-center">
                        {/* Pulsing glow ring behind logo */}
                        <div className="absolute w-40 h-40 rounded-full animate-logo-glow"
                            style={{
                                background: 'radial-gradient(circle, rgba(45,140,14,0.25) 0%, rgba(230,98,15,0.1) 50%, transparent 70%)',
                                filter: 'blur(20px)',
                            }}
                        />
                        {/* Secondary counter-rotating glow */}
                        <div className="absolute w-32 h-32 rounded-full animate-logo-glow-alt"
                            style={{
                                background: 'radial-gradient(circle, rgba(230,98,15,0.2) 0%, rgba(45,140,14,0.08) 50%, transparent 70%)',
                                filter: 'blur(16px)',
                            }}
                        />
                        {/* The logo itself with float + shimmer */}
                        <div className="relative animate-logo-float">
                            <img
                                src="/logo-siervoplast.png"
                                alt="Siervo Plast"
                                className="h-16 mx-auto relative z-10"
                                style={{
                                    filter: 'drop-shadow(0 4px 24px rgba(45,140,14,0.35)) drop-shadow(0 0 40px rgba(45,140,14,0.15))',
                                }}
                            />
                            {/* Shimmer sweep overlay */}
                            <div className="absolute inset-0 z-20 overflow-hidden rounded-lg pointer-events-none">
                                <div className="absolute inset-0 animate-logo-shimmer"
                                    style={{
                                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
                                        transform: 'translateX(-100%)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gradient separator */}
                    <div className="w-20 h-[2px] mx-auto mb-8 rounded-full"
                        style={{ background: 'linear-gradient(90deg, transparent, #2D8C0E, #E6620F, transparent)' }} />

                    <p className="text-white/50 text-base leading-relaxed font-light tracking-wide">
                        Sistema Gestionale Aziendale
                    </p>

                    {/* Feature pills — Updated */}
                    <div className={`flex flex-wrap justify-center gap-2 mt-10 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {['Gestionale Produzione', 'HR Solutions', 'Coordinators Help Desk'].map((label, i) => (
                            <span
                                key={label}
                                className="px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide border transition-all duration-700"
                                style={{
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.45)',
                                    background: 'rgba(255,255,255,0.04)',
                                    transitionDelay: `${400 + i * 150}ms`,
                                    opacity: mounted ? 1 : 0,
                                    transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                                }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* =========================================== */}
                {/* BOTTOM SECTION — Enterprise Trust Badges     */}
                {/* =========================================== */}
                <div className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {/* Separator */}
                    <div className="mx-8 mb-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />

                    {/* Trust badges row */}
                    <div className="flex items-center justify-center gap-6 mb-4 px-8">
                        {/* Security Badge */}
                        <div className="flex items-center gap-1.5">
                            <ShieldIcon className="w-3.5 h-3.5 text-emerald-400/60" />
                            <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">BankServiceSecurity Laezza</span>
                        </div>
                        {/* Separator dot */}
                        <div className="w-1 h-1 rounded-full bg-white/15" />
                        {/* Encrypted */}
                        <div className="flex items-center gap-1.5">
                            <LockIcon className="w-3.5 h-3.5 text-emerald-400/60" />
                            <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">AES-256 Encrypted</span>
                        </div>
                        {/* Separator dot */}
                        <div className="w-1 h-1 rounded-full bg-white/15" />
                        {/* Hosting */}
                        <div className="flex items-center gap-1.5">
                            <ServerIcon className="w-3.5 h-3.5 text-emerald-400/60" />
                            <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">99.9% Uptime SLA</span>
                        </div>
                    </div>

                    {/* Copyright line */}
                    <div className="flex items-center justify-center gap-1.5 mb-4">
                        <CopyrightIcon className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] text-white/20 tracking-wide">2026 Salvatore Laezza — All Rights Reserved</span>
                    </div>

                    {/* Bottom brand accent line */}
                    <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #2D8C0E, #E6620F)' }} />
                </div>
            </div>

            {/* ============================================ */}
            {/* RIGHT PANEL — Login Form                     */}
            {/* ============================================ */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative" style={{ background: '#FAFBFC' }}>
                <div className={`w-full max-w-[400px] transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-10">
                        <img src="/logo-siervoplast.png" alt="Siervo Plast" className="h-10 mx-auto mb-4" />
                        <div className="w-12 h-0.5 mx-auto rounded-full" style={{ background: 'linear-gradient(90deg, #2D8C0E, #E6620F)' }} />
                    </div>

                    {/* SL Enterprise Badge */}
                    <div className="flex items-center gap-2 mb-8">
                        <img src="/logo-sl-enterprise.png" alt="SL Enterprise" className="w-8 h-8 opacity-60" />
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Enterprise Solutions</span>
                    </div>

                    {/* Welcome */}
                    <div className="mb-8">
                        <h2 className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">
                            Welcome
                        </h2>
                        <p className="text-gray-500 text-[15px]">
                            Accedi alla tua Area Personale
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3.5 rounded-xl mb-6 text-sm animate-slideUp">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-[13px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-[15px]"
                                placeholder="Inserisci il tuo username"
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-[13px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-[15px]"
                                placeholder="Inserisci la password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-6 text-white font-semibold rounded-xl shadow-lg shadow-brand-green/20 hover:shadow-xl hover:shadow-brand-green/30 focus:ring-2 focus:ring-brand-green/30 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-3 text-[15px] relative overflow-hidden group cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #2D8C0E, #35A012)' }}
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2 relative">
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Accesso in corso...
                                </span>
                            ) : (
                                <span className="relative">Accedi</span>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-gray-100">
                        <p className="text-center text-gray-400 text-[11px] tracking-wide">
                            SL Enterprise v5.0 — © 2026 Salvatore Laezza
                        </p>
                    </div>
                </div>

                {/* "Da un idea di" — Bottom right absolute */}
                <div className={`absolute bottom-5 left-0 right-0 text-center transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[11px] text-gray-300 tracking-widest uppercase font-light" style={{ letterSpacing: '0.2em' }}>
                        Da un'idea di <span className="font-medium text-gray-400">Salvatore Laezza</span>
                    </p>
                </div>
            </div>

            {/* CSS Animations for orbs */}
            <style>{`
                @keyframes orb1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, 50px) scale(1.1); }
                    50% { transform: translate(-20px, 30px) scale(0.95); }
                    75% { transform: translate(40px, -20px) scale(1.05); }
                }
                @keyframes orb2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(-40px, -30px) scale(1.05); }
                    50% { transform: translate(30px, -50px) scale(1.1); }
                    75% { transform: translate(-20px, 40px) scale(0.95); }
                }
                @keyframes orb3 {
                    0%, 100% { transform: translate(0, 0); }
                    33% { transform: translate(50px, 30px); }
                    66% { transform: translate(-30px, -40px); }
                }
                .animate-orb-1 { animation: orb1 20s ease-in-out infinite; }
                .animate-orb-2 { animation: orb2 25s ease-in-out infinite; }
                .animate-orb-3 { animation: orb3 18s ease-in-out infinite; }

                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes logoGlow {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.25); opacity: 1; }
                }
                @keyframes logoGlowAlt {
                    0%, 100% { transform: scale(1.15); opacity: 0.7; }
                    50% { transform: scale(0.9); opacity: 0.4; }
                }
                @keyframes logoShimmer {
                    0%, 80% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-logo-float { animation: logoFloat 4s ease-in-out infinite; }
                .animate-logo-glow { animation: logoGlow 3.5s ease-in-out infinite; }
                .animate-logo-glow-alt { animation: logoGlowAlt 4s ease-in-out infinite; }
                .animate-logo-shimmer { animation: logoShimmer 5s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
