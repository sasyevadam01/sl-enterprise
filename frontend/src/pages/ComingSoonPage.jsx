/**
 * SL Enterprise - Coming Soon Page
 * Placeholder for sections under development
 */
export default function ComingSoonPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="text-center max-w-lg">
                {/* Animated Icon */}
                <div className="text-8xl mb-6 animate-bounce">
                    🚧
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-white mb-4">
                    Coming Soon
                </h1>

                {/* Subtitle */}
                <p className="text-xl text-gray-400 mb-8">
                    Questa sezione è in fase di sviluppo e sarà disponibile a breve.
                </p>

                {/* Progress Bar Animation */}
                <div className="w-full bg-slate-800 rounded-full h-3 mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"
                        style={{ width: '60%' }}
                    />
                </div>

                {/* Back Button */}
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all transform hover:-translate-y-1 shadow-lg shadow-blue-500/30"
                >
                    ← Torna Indietro
                </button>
            </div>
        </div>
    );
}
