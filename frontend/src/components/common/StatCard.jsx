/**
 * SL Enterprise - Stat Card Component
 * Premium Enterprise Light Mode
 */
export default function StatCard({ title, value, icon, trend, trendValue, color = "blue", loading = false }) {

    const colorStyles = {
        blue: { icon: "text-blue-600 bg-blue-50", border: "border-blue-100" },
        green: { icon: "text-emerald-600 bg-emerald-50", border: "border-emerald-100" },
        red: { icon: "text-rose-600 bg-rose-50", border: "border-rose-100" },
        yellow: { icon: "text-amber-600 bg-amber-50", border: "border-amber-100" },
        purple: { icon: "text-purple-600 bg-purple-50", border: "border-purple-100" },
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div className={`
            relative rounded-xl p-6 
            bg-white border border-slate-200 
            shadow-sm hover:shadow-md transition-all duration-300 group
        `}>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">{title}</p>
                        {loading ? (
                            <div className="h-9 w-24 bg-slate-100 rounded animate-pulse" />
                        ) : (
                            <h3 className="text-4xl font-bold text-slate-900 tracking-tighter">{value}</h3>
                        )}
                    </div>

                    {/* Icon Container */}
                    <div className={`p-3.5 rounded-xl ${style.icon}`}>
                        {icon}
                    </div>
                </div>

                {/* Footer Info */}
                {(trend || trendValue) && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        {trend === 'up' && (
                            <span className="flex items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                {trendValue}
                            </span>
                        )}
                        {trend === 'down' && (
                            <span className="flex items-center text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                {trendValue}
                            </span>
                        )}
                        {trend === 'neutral' && (
                            <span className="flex items-center text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                {trendValue}
                            </span>
                        )}
                        <span className="text-slate-400">vs mese precedente</span>
                    </div>
                )}
            </div>
        </div>
    );
}
