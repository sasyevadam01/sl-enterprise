/**
 * SL Enterprise - Login Page
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import DecryptedText from '../../components/ui/DecryptedText';
import FaultyTerminal from '../../components/ui/FaultyTerminal';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login(username, password);

        setIsLoading(false);
        if (result.success) {
            // Navigate to root - HomeRedirect will handle role-based routing
            navigate('/');
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-900">
            {/* Background Effect */}
            <div className="absolute inset-0 z-0">
                <FaultyTerminal
                    scale={1.5}
                    gridMul={[2, 1]}
                    digitSize={1.2}
                    timeScale={0.5}
                    pause={false}
                    scanlineIntensity={0.5}
                    glitchAmount={1}
                    flickerAmount={1}
                    noiseAmp={1}
                    chromaticAberration={0}
                    dither={0}
                    curvature={0.1}
                    tint="#A7EF9E"
                    mouseReact={true}
                    mouseStrength={0.5}
                    pageLoadAnimation={true}
                    brightness={0.6}
                />
            </div>

            {/* Overlay Gradient for readability */}
            <div className="absolute inset-0 z-10 bg-slate-900/60 transition-opacity"></div>

            {/* Content */}
            <div className="relative z-20 min-h-screen flex items-center justify-center flex-col p-4">
                <div className="max-w-md w-full">
                    {/* Welcome Text */}
                    <div className="text-center mb-6">
                        <h4 className="text-emerald-400 font-mono text-sm tracking-[0.3em] uppercase mb-4 animate-pulse">
                            Welcome to the Future
                        </h4>

                        <h1 className="text-5xl font-black text-white mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                            <DecryptedText
                                text="SL Enterprise"
                                speed={70}
                                maxIterations={20}
                                animateOn="view"
                                revealDirection="center"
                            />
                        </h1>
                        <p className="text-blue-200/80 font-medium tracking-wide">Sistema Gestionale Aziendale</p>
                    </div>

                    {/* Card Login */}
                    <div className="bg-[#0f172a]/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <h2 className="text-2xl font-bold text-white mb-8 text-center relative z-10">Accedi al Portale</h2>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-medium relative z-10">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                    placeholder="Inserisci username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                    placeholder="Inserisci password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Accesso...
                                    </span>
                                ) : (
                                    'ACCEDI'
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-8 font-mono">
                        SL Enterprise v4.1 - System Online
                    </p>
                </div>

                {/* Copyright Footer */}
                <div className="mt-16 text-emerald-500/60 text-[10px] font-mono tracking-[0.2em] uppercase">
                    <DecryptedText
                        text="Copyright © 2026 by Salvatore Laezza"
                        speed={50}
                        maxIterations={15}
                        animateOn="view"
                        characters="01"
                        sequential={true}
                    />
                </div>
            </div>
        </div>
    );
}
