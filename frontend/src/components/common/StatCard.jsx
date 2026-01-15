/**
 * SL Enterprise - Stat Card Component (Refined)
 * Glassmorphism style + Cleaner Icons
 */
export default function StatCard({ title, value, icon, trend, trendValue, color = "blue", loading = false }) {

    const colorStyles = {
        blue: { icon: "text-blue-400 bg-blue-500/10", glow: "from-blue-500/20" },
        green: { icon: "text-emerald-400 bg-emerald-500/10", glow: "from-emerald-500/20" },
        red: { icon: "text-rose-400 bg-rose-500/10", glow: "from-rose-500/20" },
        yellow: { icon: "text-amber-400 bg-amber-500/10", glow: "from-amber-500/20" },
        purple: { icon: "text-purple-400 bg-purple-500/10", glow: "from-purple-500/20" },
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div className={`
            relative rounded-2xl p-6 
            bg-slate-800/40 backdrop-blur-md border border-white/5 
            shadow-[0_8px_30px_rgb(0,0,0,0.12)]
            hover:border-white/10 transition-all duration-300 group
        `}>
            {/* Dynamic Glow Gradient */}
            <div className={`absolute -inset-0.5 bg-gradient-to-br ${style.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-lg pointer-events-none`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-400/80 mb-2">{title}</p>
                        {loading ? (
                            <div className="h-9 w-24 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <h3 className="text-4xl font-bold text-white tracking-tighter drop-shadow-sm">{value}</h3>
                        )}
                    </div>

                    {/* Icon Container with subtle glass effect */}
                    <div className={`p-3.5 rounded-xl ${style.icon} backdrop-blur-sm shadow-inner`}>
                        {/* Using passed icon directly */}
                        {icon}
                    </div>
                </div>

                {/* Footer Info */}
                {(trend || trendValue) && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        {trend === 'up' && (
                            <span className="flex items-center text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/10">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                {trendValue}
                            </span>
                        )}
                        {trend === 'down' && (
                            <span className="flex items-center text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/10">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                {trendValue}
                            </span>
                        )}
                        {trend === 'neutral' && (
                            <span className="flex items-center text-slate-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                {trendValue}
                            </span>
                        )}
                        <span className="text-slate-500/80">vs mese precedente</span>
                    </div>
                )}
            </div>
        </div>
    );
}
