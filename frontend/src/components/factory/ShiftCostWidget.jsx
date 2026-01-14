/**
 * SL Enterprise - Shift Cost Calculator Widget
 * Calcolatore rapido del costo turno basato su parametri configurabili.
 */
import { useState, useEffect } from 'react';
import { factoryApi } from '../../api/client';

export default function ShiftCostWidget() {
    const [operators, setOperators] = useState(0);
    const [coordinators, setCoordinators] = useState(0);
    const [hours, setHours] = useState(8);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const data = await factoryApi.getCostEstimate({
                num_operators: operators,
                num_coordinators: coordinators,
                hours: hours
            });
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calcola automaticamente al cambio input dopo breve delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if (operators > 0 || coordinators > 0) {
                handleCalculate();
            } else {
                setResult(null); // Reset se azzerato
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [operators, coordinators, hours]);

    return (
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                💰 Calcolatore Costo Turno
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Operatori</label>
                    <input
                        type="number"
                        min="0"
                        value={operators}
                        onChange={(e) => setOperators(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Coordinatori</label>
                    <input
                        type="number"
                        min="0"
                        value={coordinators}
                        onChange={(e) => setCoordinators(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Ore Turno</label>
                    <select
                        value={hours}
                        onChange={(e) => setHours(parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    >
                        <option value="7.75">7h 45m (Standard)</option>
                        <option value="8">8h (Centrale)</option>
                        <option value="4">4h (Part-time)</option>
                        <option value="6">6h (Ridotto)</option>
                    </select>
                </div>
            </div>

            {loading && !result && (
                <div className="text-center text-gray-500 py-4">Calcolo in corso...</div>
            )}

            {result && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-gray-400 text-xs">Costo Operatori</p>
                            <p className="text-white font-mono">€ {result.breakdown.operators_cost.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs">Costo Coordinatori</p>
                            <p className="text-white font-mono">€ {result.breakdown.coordinators_cost.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Totale Stimato</span>
                        <span className="text-2xl font-bold text-green-400">€ {result.total_cost.toFixed(2)}</span>
                    </div>
                    <p className="text-center text-gray-600 text-xs mt-2">
                        Basato su tariffa oraria {result.params.operator_rate}€/h
                    </p>
                </div>
            )}

            {!result && !loading && (
                <div className="text-center text-gray-500 text-sm py-4">
                    Inserisci i dati per calcolare i costi stimati del turno.
                </div>
            )}
        </div>
    );
}
