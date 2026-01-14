import { useState } from 'react';
import { factoryApi } from '../../api/client';

export default function WorkloadWidget() {
    const [pieces, setPieces] = useState('');
    const [cycleTime, setCycleTime] = useState('');
    const [operators, setOperators] = useState(4);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        if (!pieces || !cycleTime) return;
        setLoading(true);
        try {
            const data = await factoryApi.estimateWorkload({
                total_pieces: parseInt(pieces),
                cycle_time_seconds: parseFloat(cycleTime),
                num_operators: parseInt(operators)
            });
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-white/10 shadow-lg">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-400">
                ⚡ Calcolatore Carico
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Pezzi Totali</label>
                    <input
                        type="number"
                        value={pieces}
                        onChange={(e) => setPieces(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="Es. 5000"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Sec/Pezzo</label>
                    <input
                        type="number"
                        value={cycleTime}
                        onChange={(e) => setCycleTime(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="Es. 20.5"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Operatori</label>
                    <input
                        type="number"
                        value={operators}
                        onChange={(e) => setOperators(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="Standard 4"
                    />
                </div>
            </div>

            <button
                onClick={handleCalculate}
                disabled={loading || !pieces || !cycleTime}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white transition disabled:opacity-50 mb-4"
            >
                {loading ? 'Calcolo...' : 'Stima Carico'}
            </button>

            {result && (
                <div className="bg-black/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white/5 rounded p-2">
                            <div className="text-gray-400 text-xs uppercase">Ore Stimate</div>
                            <div className="text-2xl font-bold text-white">{result.total_hours_needed} h</div>
                        </div>
                        <div className={`bg-white/5 rounded p-2 border ${result.shifts_needed > 1 ? 'border-red-500/50 bg-red-900/10' : 'border-green-500/50 bg-green-900/10'}`}>
                            <div className="text-gray-400 text-xs uppercase">Turni Nec.</div>
                            <div className="text-2xl font-bold text-white">{result.shifts_needed}</div>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-center text-gray-400">
                        Output: {result.pieces_per_hour_estimated} pz/h (Eff: {result.efficiency_pct}%)
                    </div>
                </div>
            )}
        </div>
    );
}
