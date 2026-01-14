/**
 * SL Enterprise - Leave Hours Widget
 * Mostra il monte ore permessi rimanente di un dipendente
 */
import { useState, useEffect } from 'react';
import { leavesApi } from '../api/client';

export default function LeaveHoursWidget({ employeeId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadHours = async () => {
            try {
                const result = await leavesApi.getEmployeeHours(employeeId);
                setData(result);
            } catch (err) {
                console.error('Error loading leave hours:', err);
                setError('Impossibile caricare monte ore');
            } finally {
                setLoading(false);
            }
        };

        if (employeeId) {
            loadHours();
        }
    }, [employeeId]);

    if (loading) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-slate-700 rounded w-16"></div>
            </div>
        );
    }

    if (error || !data) {
        return null; // Silently fail if no data
    }

    const percentage = data.percentuale_usata || 0;
    const isLow = data.ore_rimanenti < 50;
    const isExhausted = data.ore_rimanenti <= 0;

    return (
        <div className={`rounded-2xl p-5 border ${isExhausted ? 'bg-red-500/10 border-red-500/30' :
            isLow ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-emerald-500/10 border-emerald-500/30'
            }`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-400">⏰ Monte Ore Permessi {data.year}</h4>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isExhausted ? 'bg-red-500 text-white' :
                    isLow ? 'bg-amber-500 text-slate-900' :
                        'bg-emerald-500 text-white'
                    }`}>
                    {isExhausted ? '❌ Esaurito' : isLow ? '⚠️ Basso' : '✅ OK'}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${isExhausted ? 'bg-red-500' :
                        isLow ? 'bg-amber-500' :
                            'bg-emerald-500'
                        }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-2xl font-bold text-white">{data.ore_rimanenti}</p>
                    <p className="text-xs text-gray-400">Rimanenti</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-400">{data.ore_usate}</p>
                    <p className="text-xs text-gray-500">Usate</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-500">{data.ore_totali}</p>
                    <p className="text-xs text-gray-600">Totali</p>
                </div>
            </div>

            {/* Warning message if low */}
            {isLow && !isExhausted && (
                <p className="text-xs text-amber-400 mt-3 text-center">
                    ⚠️ Meno di 50 ore rimanenti
                </p>
            )}
            {isExhausted && (
                <p className="text-xs text-red-400 mt-3 text-center">
                    ❌ Monte ore esaurito per l'anno
                </p>
            )}
        </div>
    );
}
