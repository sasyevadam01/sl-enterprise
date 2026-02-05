/**
 * Calcolo Blocchi Page
 * Calculator for block cutting optimization
 * Mobile-first, touch-friendly interface
 */
import { useState, useEffect, useCallback } from 'react';
import { Calculator, Package, ArrowLeft, Layers, Info, Printer, Plus, Trash2, ChevronRight, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../components/ui/CustomUI';
import { blockCalculatorApi, pickingApi } from '../../api/client';

export default function CalcoloBlocchiPage() {
    const navigate = useNavigate();
    const { toast } = useUI();

    // Tab state
    const [activeTab, setActiveTab] = useState('lastre'); // 'lastre' | 'future'

    // Step state
    const [step, setStep] = useState(1);

    // Form data
    const [materialType, setMaterialType] = useState(''); // 'sponge' | 'memory'
    const [selectedMaterial, setSelectedMaterial] = useState(null); // density or memory type
    const [selectedColor, setSelectedColor] = useState(null); // for sponge only
    const [selectedDimension, setSelectedDimension] = useState('');
    const [sheetThickness, setSheetThickness] = useState('');
    const [quantity, setQuantity] = useState('');
    const [blockHeight, setBlockHeight] = useState('');

    // Data from API
    const [densities, setDensities] = useState([]);
    const [colors, setColors] = useState([]);
    const [memoryTypes, setMemoryTypes] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [savedHeights, setSavedHeights] = useState([]);
    const [recoveryRules, setRecoveryRules] = useState([]);

    // Calculation result
    const [result, setResult] = useState(null);
    const [calculating, setCalculating] = useState(false);

    // UI state
    const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
    const [loading, setLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Load initial data and seed recoveries if needed
    useEffect(() => {
        loadConfigData();
        // Try to seed recovery rules on first load (admin only, will fail silently for others)
        blockCalculatorApi.seedRecoveries()
            .then(res => {
                if (res?.count > 0) {
                    toast.success(`Tabella recuperi inizializzata (${res.count} regole)`);
                }
            })
            .catch(() => { }); // Silently ignore errors
    }, []);

    // Load heights when material changes
    useEffect(() => {
        if (materialType && selectedMaterial) {
            loadHeights();
            loadRecoveries();
        }
    }, [materialType, selectedMaterial]);

    const loadConfigData = async () => {
        setLoading(true);
        try {
            const [densitiesData, colorsData, memoryData, dimensionsData] = await Promise.all([
                pickingApi.getConfig('sponge_density'),
                pickingApi.getConfig('sponge_color'),
                pickingApi.getConfig('memory'),
                pickingApi.getConfig('block_dimension')
            ]);
            setDensities(densitiesData || []);
            setColors(colorsData || []);
            setMemoryTypes(memoryData || []);
            setDimensions(dimensionsData || []);
        } catch (err) {
            console.error('Failed to load config:', err);
            toast.error('Errore caricamento configurazione');
        } finally {
            setLoading(false);
        }
    };

    const loadHeights = async () => {
        try {
            const data = await blockCalculatorApi.getHeights(materialType, selectedMaterial?.id);
            setSavedHeights(data || []);
        } catch (err) {
            console.error('Failed to load heights:', err);
        }
    };

    const loadRecoveries = async () => {
        try {
            const data = await blockCalculatorApi.getRecoveries(materialType, selectedMaterial?.id);
            setRecoveryRules(data || []);

            // Auto-seed if no rules exist (first time setup)
            if ((!data || data.length === 0) && step === 1) {
                try {
                    const seedResult = await blockCalculatorApi.seedRecoveries();
                    if (seedResult?.count > 0) {
                        toast.success(`Tabella recuperi inizializzata (${seedResult.count} regole)`);
                        // Reload after seeding
                        const newData = await blockCalculatorApi.getRecoveries(materialType, selectedMaterial?.id);
                        setRecoveryRules(newData || []);
                    }
                } catch (seedErr) {
                    // Ignore - user may not be admin or already seeded
                    console.log('Seed skipped:', seedErr.response?.data?.detail);
                }
            }
        } catch (err) {
            console.error('Failed to load recoveries:', err);
        }
    };

    const saveCurrentHeight = async () => {
        if (!blockHeight || !materialType) return;
        try {
            await blockCalculatorApi.saveHeight({
                material_category: materialType,
                material_id: selectedMaterial?.id,
                height_cm: parseFloat(blockHeight)
            });
            toast.success('Altezza salvata');
            loadHeights();
        } catch (err) {
            toast.error('Errore salvataggio');
        }
    };

    const deleteHeight = async (id) => {
        try {
            await blockCalculatorApi.deleteHeight(id);
            toast.success('Altezza eliminata');
            loadHeights();
        } catch (err) {
            toast.error('Errore eliminazione');
        }
    };

    const handleCalculate = async () => {
        if (!sheetThickness || !quantity || !blockHeight) {
            toast.error('Compila tutti i campi');
            return;
        }

        setCalculating(true);
        try {
            const res = await blockCalculatorApi.calculate(
                materialType,
                parseFloat(sheetThickness),
                parseInt(quantity),
                parseFloat(blockHeight)
            );
            setResult(res);
            setStep(4); // Move to results
        } catch (err) {
            console.error('Calculation error:', err);
            toast.error(err.response?.data?.detail || 'Errore nel calcolo');
        } finally {
            setCalculating(false);
        }
    };

    const getSuggestedRecovery = (remainderCm) => {
        if (!recoveryRules.length || !remainderCm) return null;

        // 1. Exact match
        const exactMatch = recoveryRules.find(r => r.thickness_cm === remainderCm);
        if (exactMatch) return exactMatch;

        // 2. Close match (within 0.5cm)
        const closeMatch = recoveryRules.find(r =>
            Math.abs(r.thickness_cm - remainderCm) <= 0.5
        );
        if (closeMatch) return closeMatch;

        // 3. Try combinations (e.g., 8cm = 2x4cm)
        const sortedRules = [...recoveryRules].sort((a, b) => b.thickness_cm - a.thickness_cm);
        for (const rule of sortedRules) {
            if (rule.thickness_cm <= remainderCm) {
                const count = Math.floor(remainderCm / rule.thickness_cm);
                const leftover = remainderCm - (count * rule.thickness_cm);
                if (count >= 1 && leftover < 1) {
                    // Good combination found
                    return {
                        ...rule,
                        _combination: true,
                        _count: count,
                        _leftover: leftover
                    };
                }
            }
        }

        // 4. Fallback: largest rule that fits
        const fittingRule = sortedRules.find(r => r.thickness_cm <= remainderCm);
        if (fittingRule) {
            return {
                ...fittingRule,
                _combination: true,
                _count: Math.floor(remainderCm / fittingRule.thickness_cm),
                _leftover: remainderCm % fittingRule.thickness_cm
            };
        }

        return null;
    };

    const resetCalculator = () => {
        setStep(1);
        setMaterialType('');
        setSelectedMaterial(null);
        setSelectedColor(null);
        setSelectedDimension('');
        setSheetThickness('');
        setQuantity('');
        setBlockHeight('');
        setResult(null);
        setAiSuggestion(null);
    };

    const askAi = async () => {
        if (!result?.remainder_per_block || !selectedMaterial) return;

        setLoadingAi(true);
        setAiSuggestion(null);

        try {
            const materialName = materialType === 'sponge'
                ? `${selectedMaterial.label} ${selectedColor?.label || ''}`.trim()
                : selectedMaterial.label;

            const res = await blockCalculatorApi.getAiSuggestion(
                materialType,
                materialName,
                result.remainder_per_block
            );
            setAiSuggestion(res.suggestion);
        } catch (err) {
            console.error('AI suggestion error:', err);
            toast.error('Errore nel suggerimento IA');
        } finally {
            setLoadingAi(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Progress indicator
    const ProgressBar = () => (
        <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                        ${step >= s ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                        {step > s ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 4 && (
                        <div className={`w-8 h-1 mx-1 rounded ${step > s ? 'bg-violet-500' : 'bg-zinc-800'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-6 print:bg-white print:text-black">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30">
                        <Calculator className="w-7 h-7 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Calcolo Blocchi</h1>
                        <p className="text-sm text-zinc-500">Ottimizzazione taglio</p>
                    </div>
                </div>
                <button
                    onClick={resetCalculator}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    title="Ricomincia"
                >
                    <RefreshCw className="w-5 h-5 text-zinc-400" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 print:hidden">
                <button
                    onClick={() => setActiveTab('lastre')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all text-center
                        ${activeTab === 'lastre'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-zinc-900/50 text-zinc-500 border border-white/5'}`}
                >
                    Lastre Lisce
                </button>
                <button
                    onClick={() => setActiveTab('future')}
                    disabled
                    className="flex-1 py-3 px-4 rounded-xl font-medium transition-all text-center
                        bg-zinc-900/30 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                >
                    Prossimamente...
                </button>
            </div>

            {activeTab === 'lastre' && (
                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                    <ProgressBar />

                    {/* STEP 1: Material Type */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Seleziona Materiale</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setMaterialType('sponge');
                                        setStep(2);
                                    }}
                                    className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 
                                        hover:from-blue-500/30 hover:to-cyan-500/30 transition-all text-center group"
                                >
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-500/20 flex items-center justify-center
                                        group-hover:scale-110 transition-transform">
                                        <Layers className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <span className="text-lg font-bold text-white">SPUGNA</span>
                                    <p className="text-sm text-zinc-400 mt-1">D23, D25, D30...</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setMaterialType('memory');
                                        setStep(2);
                                    }}
                                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 
                                        hover:from-purple-500/30 hover:to-pink-500/30 transition-all text-center group"
                                >
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-purple-500/20 flex items-center justify-center
                                        group-hover:scale-110 transition-transform">
                                        <Package className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <span className="text-lg font-bold text-white">MEMORY</span>
                                    <p className="text-sm text-zinc-400 mt-1">Viscoflex, Aloe...</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Material Selection */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">
                                    {materialType === 'sponge' ? 'Seleziona Densità e Colore' : 'Seleziona Tipo Memory'}
                                </h2>
                                <button onClick={() => setStep(1)} className="text-sm text-zinc-400 hover:text-white">
                                    ← Indietro
                                </button>
                            </div>

                            {materialType === 'sponge' ? (
                                <>
                                    {/* Densities */}
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">Densità</label>
                                        <div className="flex flex-wrap gap-2">
                                            {densities.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setSelectedMaterial(d)}
                                                    className={`px-4 py-3 rounded-xl font-medium transition-all
                                                        ${selectedMaterial?.id === d.id
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Colors */}
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">Colore</label>
                                        <div className="flex flex-wrap gap-2">
                                            {colors.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedColor(c)}
                                                    className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                                                        ${selectedColor?.id === c.id
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                                >
                                                    {c.value && (
                                                        <div className="w-4 h-4 rounded-full border border-white/30"
                                                            style={{ backgroundColor: c.value }} />
                                                    )}
                                                    {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Memory Types */
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {memoryTypes.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMaterial(m)}
                                            className={`px-4 py-3 rounded-xl font-medium transition-all text-sm
                                                ${selectedMaterial?.id === m.id
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedMaterial || (materialType === 'sponge' && !selectedColor)}
                                className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold
                                    disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-600 hover:to-purple-700 transition-all
                                    flex items-center justify-center gap-2"
                            >
                                Continua <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Dimensions & Height */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Dimensioni e Altezza</h2>
                                <button onClick={() => setStep(2)} className="text-sm text-zinc-400 hover:text-white">
                                    ← Indietro
                                </button>
                            </div>

                            {/* Selected material summary */}
                            <div className="bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${materialType === 'sponge' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                                    {materialType === 'sponge' ? <Layers className="w-5 h-5 text-blue-400" /> : <Package className="w-5 h-5 text-purple-400" />}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{selectedMaterial?.label}</p>
                                    {selectedColor && <p className="text-sm text-zinc-400">{selectedColor.label}</p>}
                                </div>
                            </div>

                            {/* Dimension */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Misura Blocco</label>
                                <div className="flex flex-wrap gap-2">
                                    {dimensions.map(d => (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDimension(d.label)}
                                            className={`px-4 py-3 rounded-xl font-medium transition-all
                                                ${selectedDimension === d.label
                                                    ? 'bg-violet-500 text-white'
                                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sheet thickness */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Spessore Lastra (cm)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={sheetThickness}
                                    onChange={(e) => setSheetThickness(e.target.value)}
                                    placeholder="Es: 10.5"
                                    className="w-full px-4 py-4 rounded-xl bg-zinc-800 border border-white/10 text-white text-lg
                                        placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Quantità Pezzi</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Es: 50"
                                    className="w-full px-4 py-4 rounded-xl bg-zinc-800 border border-white/10 text-white text-lg
                                        placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {/* Block Height */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">
                                    Altezza Lavorabile (cm) <span className="text-zinc-600">- bucce già scalate</span>
                                </label>

                                {/* Quick select saved heights */}
                                {savedHeights.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {savedHeights.slice(0, 5).map(h => (
                                            <button
                                                key={h.id}
                                                onClick={() => setBlockHeight(String(h.height_cm))}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1
                                                    ${parseFloat(blockHeight) === h.height_cm
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                            >
                                                {h.height_cm} cm
                                                <span className="text-xs opacity-60">({h.usage_count}x)</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={blockHeight}
                                        onChange={(e) => setBlockHeight(e.target.value)}
                                        placeholder="Es: 98"
                                        className="flex-1 px-4 py-4 rounded-xl bg-zinc-800 border border-white/10 text-white text-lg
                                            placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                                    />
                                    <button
                                        onClick={saveCurrentHeight}
                                        disabled={!blockHeight}
                                        className="px-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30
                                            disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500/30 transition-all"
                                        title="Salva questa altezza"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={!selectedDimension || !sheetThickness || !quantity || !blockHeight || calculating}
                                className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold
                                    disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-teal-700 transition-all
                                    flex items-center justify-center gap-2"
                            >
                                {calculating ? (
                                    <>Calcolo in corso...</>
                                ) : (
                                    <>
                                        <Calculator className="w-5 h-5" />
                                        CALCOLA
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Results */}
                    {step === 4 && result && (
                        <div className="space-y-5 print:space-y-3">
                            {/* Print header (only visible in print) */}
                            <div className="hidden print:block mb-4">
                                <h1 className="text-2xl font-bold">Calcolo Blocchi - SL Enterprise</h1>
                                <p className="text-sm text-gray-500">Data: {new Date().toLocaleDateString('it-IT')}</p>
                            </div>

                            <div className="flex items-center justify-between print:hidden">
                                <h2 className="text-lg font-semibold text-white">Risultato</h2>
                                <button onClick={() => setStep(3)} className="text-sm text-zinc-400 hover:text-white">
                                    ← Modifica
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 print:bg-gray-100 print:border print:border-gray-300">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400 print:text-gray-600">Materiale:</span>
                                    <span className="text-white font-medium print:text-black">
                                        {selectedMaterial?.label} {selectedColor ? `- ${selectedColor.label}` : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400 print:text-gray-600">Misura:</span>
                                    <span className="text-white font-medium print:text-black">{selectedDimension}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400 print:text-gray-600">Spessore Lastra:</span>
                                    <span className="text-white font-medium print:text-black">{result.input.sheet_thickness} cm</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400 print:text-gray-600">Quantità Ordine:</span>
                                    <span className="text-white font-medium print:text-black">{result.input.quantity} pz</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400 print:text-gray-600">Altezza Blocco:</span>
                                    <span className="text-white font-medium print:text-black">{result.input.block_height} cm</span>
                                </div>
                            </div>

                            {/* Main Result */}
                            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/30 p-6 text-center
                                print:bg-green-50 print:border-green-300">
                                <p className="text-emerald-400 text-sm uppercase tracking-wider mb-2 print:text-green-600">Blocchi Necessari</p>
                                <p className="text-5xl font-bold text-white print:text-black">{result.blocks_needed}</p>
                                <p className="text-zinc-400 mt-2 print:text-gray-600">
                                    {result.sheets_per_block} lastre per blocco
                                </p>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center print:bg-gray-100 print:border print:border-gray-300">
                                    <p className="text-sm text-zinc-400 print:text-gray-600">Totale Lastre</p>
                                    <p className="text-2xl font-bold text-white print:text-black">{result.total_sheets}</p>
                                </div>
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center print:bg-gray-100 print:border print:border-gray-300">
                                    <p className="text-sm text-zinc-400 print:text-gray-600">Lastre Extra</p>
                                    <p className="text-2xl font-bold text-blue-400 print:text-blue-600">+{result.extra_sheets}</p>
                                </div>
                            </div>

                            {/* Remainder & Recovery */}
                            <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-4 print:bg-yellow-50 print:border-yellow-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 print:text-yellow-600" />
                                    <div className="flex-1">
                                        <p className="text-amber-400 font-medium print:text-yellow-700">
                                            Rimanenza: {result.remainder_per_block} cm per blocco
                                        </p>
                                        {(() => {
                                            const recovery = getSuggestedRecovery(result.remainder_per_block);
                                            if (recovery) {
                                                const isCombination = recovery._combination && recovery._count > 1;
                                                return (
                                                    <p className="text-sm text-zinc-400 mt-1 print:text-gray-600">
                                                        💡 Suggerimento: <span className="text-white print:text-black font-medium">
                                                            {isCombination ? (
                                                                <>{recovery._count} x {recovery.thickness_cm}cm = {recovery.product_type}</>
                                                            ) : (
                                                                <>{recovery.thickness_cm}cm = {recovery.product_type}</>
                                                            )}
                                                        </span>
                                                        {recovery.notes && (
                                                            <span className="text-zinc-500"> ({recovery.notes})</span>
                                                        )}
                                                        {isCombination && recovery._leftover > 0 && (
                                                            <span className="text-zinc-600"> + {recovery._leftover.toFixed(1)}cm scarto</span>
                                                        )}
                                                    </p>
                                                );
                                            } else {
                                                return (
                                                    <p className="text-sm text-zinc-500 mt-1 print:text-gray-500">
                                                        Nessun recupero standard trovato - chiedi al coordinatore
                                                    </p>
                                                );
                                            }
                                        })()}

                                        {/* AI Suggestion Button */}
                                        <div className="mt-3 print:hidden">
                                            <button
                                                onClick={askAi}
                                                disabled={loadingAi}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 
                                                    text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-purple-700
                                                    transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingAi ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Analisi in corso...
                                                    </>
                                                ) : (
                                                    <>
                                                        ✨ Chiedi all'IA
                                                    </>
                                                )}
                                            </button>

                                            {aiSuggestion && (
                                                <div className="mt-3 p-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 
                                                    rounded-lg border border-violet-500/30">
                                                    <p className="text-sm text-violet-300 font-medium mb-1">🤖 Suggerimento IA:</p>
                                                    <p className="text-sm text-white">{aiSuggestion}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recovery Rules Table */}
                            {recoveryRules.length > 0 && (
                                <div className="print:hidden">
                                    <button
                                        onClick={() => setShowRecoveryPanel(!showRecoveryPanel)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-xl 
                                            hover:bg-zinc-800 transition-all text-zinc-300"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Info className="w-4 h-4" />
                                            Tabella Recuperi
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showRecoveryPanel ? 'rotate-90' : ''}`} />
                                    </button>

                                    {showRecoveryPanel && (
                                        <div className="mt-2 bg-zinc-800/30 rounded-xl border border-white/5 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-zinc-900/50 text-zinc-400">
                                                        <th className="px-4 py-2 text-left">Spessore</th>
                                                        <th className="px-4 py-2 text-left">Prodotto</th>
                                                        <th className="px-4 py-2 text-left">Note</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {/* Deduplicate by thickness+product */}
                                                    {[...new Map(recoveryRules.map(r =>
                                                        [`${r.thickness_cm}-${r.product_type}`, r]
                                                    )).values()].map(r => (
                                                        <tr key={`${r.thickness_cm}-${r.product_type}`} className="text-zinc-300">
                                                            <td className="px-4 py-2 font-medium">{r.thickness_cm} cm</td>
                                                            <td className="px-4 py-2">{r.product_type}</td>
                                                            <td className="px-4 py-2 text-zinc-500">{r.notes || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 print:hidden">
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-4 rounded-xl bg-zinc-800 text-white font-medium
                                        hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    Stampa
                                </button>
                                <button
                                    onClick={resetCalculator}
                                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold
                                        hover:from-violet-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Nuovo Calcolo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Coming Soon Tab */}
            {activeTab === 'future' && (
                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-800 flex items-center justify-center">
                        <Package className="w-10 h-10 text-zinc-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Funzionalità in Arrivo</h2>
                    <p className="text-zinc-400">Questa sezione sarà disponibile prossimamente.</p>
                </div>
            )}
        </div>
    );
}
