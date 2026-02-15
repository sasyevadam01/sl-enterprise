/**
 * Calcolo Blocchi Page
 * Calculator for block cutting optimization
 * Mobile-first, touch-friendly interface
 */
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Calculator, Package, ArrowLeft, Layers, Info, Printer, Plus, Trash2, ChevronRight, Check, RefreshCw, AlertCircle, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../components/ui/CustomUI';
import { blockCalculatorApi, pickingApi } from '../../api/client';

// Lazy load 3D viewer for better performance
const Block3DViewer = lazy(() => import('../../components/production/Block3DViewer'));

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
    const [show3D, setShow3D] = useState(false);

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
                        ${step >= s ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
                        {step > s ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 4 && (
                        <div className={`w-8 h-1 mx-1 rounded ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-6 print:bg-white print:text-black">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="page-header-icon">
                        <Calculator className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Calcolo Blocchi</h1>
                        <p className="text-sm text-gray-500">Ottimizzazione taglio</p>
                    </div>
                </div>
                <button
                    onClick={resetCalculator}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                    title="Ricomincia"
                >
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 print:hidden">
                <button
                    onClick={() => setActiveTab('lastre')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all text-center
                        ${activeTab === 'lastre'
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                >
                    Lastre Lisce
                </button>
                <button
                    onClick={() => setActiveTab('future')}
                    disabled
                    className="flex-1 py-3 px-4 rounded-xl font-medium transition-all text-center
                        bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50"
                >
                    Prossimamente...
                </button>
            </div>

            {activeTab === 'lastre' && (
                <div className="master-card p-6">
                    <ProgressBar />

                    {/* STEP 1: Material Type */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleziona Materiale</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setMaterialType('sponge');
                                        setStep(2);
                                    }}
                                    className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 
                                        hover:border-blue-400 hover:shadow-md transition-all text-center group"
                                >
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-100 flex items-center justify-center
                                        group-hover:scale-110 transition-transform">
                                        <Layers className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">SPUGNA</span>
                                    <p className="text-sm text-gray-500 mt-1">D23, D25, D30...</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setMaterialType('memory');
                                        setStep(2);
                                    }}
                                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 
                                        hover:border-purple-400 hover:shadow-md transition-all text-center group"
                                >
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-purple-100 flex items-center justify-center
                                        group-hover:scale-110 transition-transform">
                                        <Package className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">MEMORY</span>
                                    <p className="text-sm text-gray-500 mt-1">Viscoflex, Aloe...</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Material Selection */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {materialType === 'sponge' ? 'Seleziona Densità e Colore' : 'Seleziona Tipo Memory'}
                                </h2>
                                <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-900">
                                    ← Indietro
                                </button>
                            </div>

                            {materialType === 'sponge' ? (
                                <>
                                    {/* Densities */}
                                    <div>
                                        <label className="text-sm text-gray-600 font-medium mb-2 block">Densità</label>
                                        <div className="flex flex-wrap gap-2">
                                            {densities.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setSelectedMaterial(d)}
                                                    className={`px-4 py-3 rounded-xl font-medium transition-all
                                                        ${selectedMaterial?.id === d.id
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Colors */}
                                    <div>
                                        <label className="text-sm text-gray-600 font-medium mb-2 block">Colore</label>
                                        <div className="flex flex-wrap gap-2">
                                            {colors.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedColor(c)}
                                                    className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                                                        ${selectedColor?.id === c.id
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                                                >
                                                    {c.value && (
                                                        <div className="w-4 h-4 rounded-full border border-gray-300"
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
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedMaterial || (materialType === 'sponge' && !selectedColor)}
                                className="w-full mt-4 py-4 rounded-xl bg-green-600 text-white font-bold shadow-sm
                                    disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-all
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
                                <h2 className="text-lg font-semibold text-gray-900">Dimensioni e Altezza</h2>
                                <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-900">
                                    ← Indietro
                                </button>
                            </div>

                            {/* Selected material summary */}
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-200">
                                <div className={`p-2 rounded-lg ${materialType === 'sponge' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                    {materialType === 'sponge' ? <Layers className="w-5 h-5 text-blue-600" /> : <Package className="w-5 h-5 text-purple-600" />}
                                </div>
                                <div>
                                    <p className="text-gray-900 font-medium">{selectedMaterial?.label}</p>
                                    {selectedColor && <p className="text-sm text-gray-500">{selectedColor.label}</p>}
                                </div>
                            </div>

                            {/* Dimension */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium mb-2 block">Misura Blocco</label>
                                <div className="flex flex-wrap gap-2">
                                    {dimensions.map(d => (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDimension(d.label)}
                                            className={`px-4 py-3 rounded-xl font-medium transition-all
                                                ${selectedDimension === d.label
                                                    ? 'bg-green-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sheet thickness */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium mb-2 block">Spessore Lastra (cm)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={sheetThickness}
                                    onChange={(e) => setSheetThickness(e.target.value)}
                                    placeholder="Es: 10.5"
                                    className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 text-lg
                                        placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium mb-2 block">Quantità Pezzi</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Es: 50"
                                    className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 text-lg
                                        placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                                />
                            </div>

                            {/* Block Height */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium mb-2 block">
                                    Altezza Lavorabile (cm) <span className="text-gray-400">- bucce già scalate</span>
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
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
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
                                        className="flex-1 px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 text-lg
                                            placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                                    />
                                    <button
                                        onClick={saveCurrentHeight}
                                        disabled={!blockHeight}
                                        className="px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-300
                                            disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-100 transition-all"
                                        title="Salva questa altezza"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={!selectedDimension || !sheetThickness || !quantity || !blockHeight || calculating}
                                className="w-full mt-4 py-4 rounded-xl bg-green-600 text-white font-bold shadow-sm
                                    disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-all
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
                                <h2 className="text-lg font-semibold text-gray-900">Risultato</h2>
                                <button onClick={() => setStep(3)} className="text-sm text-gray-500 hover:text-gray-900">
                                    ← Modifica
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200 print:bg-gray-100 print:border print:border-gray-300">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 print:text-gray-600">Materiale:</span>
                                    <span className="text-gray-900 font-medium print:text-black">
                                        {selectedMaterial?.label} {selectedColor ? `- ${selectedColor.label}` : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 print:text-gray-600">Misura:</span>
                                    <span className="text-gray-900 font-medium print:text-black">{selectedDimension}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 print:text-gray-600">Spessore Lastra:</span>
                                    <span className="text-gray-900 font-medium print:text-black">{result.input.sheet_thickness} cm</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 print:text-gray-600">Quantità Ordine:</span>
                                    <span className="text-gray-900 font-medium print:text-black">{result.input.quantity} pz</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 print:text-gray-600">Altezza Blocco:</span>
                                    <span className="text-gray-900 font-medium print:text-black">{result.input.block_height} cm</span>
                                </div>
                            </div>

                            {/* Main Result */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6 text-center
                                print:bg-green-50 print:border-green-300">
                                <p className="text-green-700 text-sm uppercase tracking-wider mb-2 font-semibold print:text-green-600">Blocchi Necessari</p>
                                <p className="text-5xl font-bold text-gray-900 print:text-black">{result.blocks_needed}</p>
                                <p className="text-gray-500 mt-2 print:text-gray-600">
                                    {result.sheets_per_block} lastre per blocco
                                </p>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200 print:bg-gray-100 print:border print:border-gray-300">
                                    <p className="text-sm text-gray-500 print:text-gray-600">Totale Lastre</p>
                                    <p className="text-2xl font-bold text-gray-900 print:text-black">{result.total_sheets}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200 print:bg-gray-100 print:border print:border-gray-300">
                                    <p className="text-sm text-gray-500 print:text-gray-600">Lastre Extra</p>
                                    <p className="text-2xl font-bold text-blue-600 print:text-blue-600">+{result.extra_sheets}</p>
                                </div>
                            </div>

                            {/* Remainder & Recovery */}
                            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 print:bg-yellow-50 print:border-yellow-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 print:text-yellow-600" />
                                    <div className="flex-1">
                                        <p className="text-amber-700 font-medium print:text-yellow-700">
                                            Rimanenza: {result.remainder_per_block} cm per blocco
                                        </p>
                                        {(() => {
                                            const recovery = getSuggestedRecovery(result.remainder_per_block);
                                            if (recovery) {
                                                const isCombination = recovery._combination && recovery._count > 1;
                                                return (
                                                    <p className="text-sm text-gray-600 mt-1 print:text-gray-600">
                                                        💡 Suggerimento: <span className="text-gray-900 print:text-black font-medium">
                                                            {isCombination ? (
                                                                <>{recovery._count} x {recovery.thickness_cm}cm = {recovery.product_type}</>
                                                            ) : (
                                                                <>{recovery.thickness_cm}cm = {recovery.product_type}</>
                                                            )}
                                                        </span>
                                                        {recovery.notes && (
                                                            <span className="text-gray-400"> ({recovery.notes})</span>
                                                        )}
                                                        {isCombination && recovery._leftover > 0 && (
                                                            <span className="text-gray-400"> + {recovery._leftover.toFixed(1)}cm scarto</span>
                                                        )}
                                                    </p>
                                                );
                                            } else {
                                                return (
                                                    <p className="text-sm text-gray-500 mt-1 print:text-gray-500">
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
                                                    text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-purple-700 shadow-sm
                                                    transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingAi ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                        Analisi in corso...
                                                    </>
                                                ) : (
                                                    <>
                                                        ✨ Chiedi all'IA
                                                    </>
                                                )}
                                            </button>

                                            {aiSuggestion && (
                                                <div className="mt-3 p-3 bg-violet-50 
                                                    rounded-lg border border-violet-200">
                                                    <p className="text-sm text-violet-700 font-medium mb-1">🤖 Suggerimento IA:</p>
                                                    <p className="text-sm text-gray-800">{aiSuggestion}</p>
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
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl 
                                            hover:bg-gray-100 transition-all text-gray-600 border border-gray-200"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Info className="w-4 h-4" />
                                            Tabella Recuperi
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showRecoveryPanel ? 'rotate-90' : ''}`} />
                                    </button>

                                    {showRecoveryPanel && (
                                        <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-500">
                                                        <th className="px-4 py-2 text-left">Spessore</th>
                                                        <th className="px-4 py-2 text-left">Prodotto</th>
                                                        <th className="px-4 py-2 text-left">Note</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {/* Deduplicate by thickness+product */}
                                                    {[...new Map(recoveryRules.map(r =>
                                                        [`${r.thickness_cm}-${r.product_type}`, r]
                                                    )).values()].map(r => (
                                                        <tr key={`${r.thickness_cm}-${r.product_type}`} className="text-gray-700 hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-medium">{r.thickness_cm} cm</td>
                                                            <td className="px-4 py-2">{r.product_type}</td>
                                                            <td className="px-4 py-2 text-gray-400">{r.notes || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3D Visualization Button */}
                            <button
                                onClick={() => setShow3D(true)}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 
                                    text-white font-bold text-lg hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 
                                    transition-all flex items-center justify-center gap-3 shadow-md
                                    print:hidden"
                            >
                                <Box className="w-6 h-6" />
                                🎬 MOSTRA 3D
                            </button>

                            {/* Actions */}
                            <div className="flex gap-3 print:hidden">
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-4 rounded-xl bg-white text-gray-700 font-medium border border-gray-200
                                        hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Printer className="w-5 h-5" />
                                    Stampa
                                </button>
                                <button
                                    onClick={resetCalculator}
                                    className="flex-1 py-4 rounded-xl bg-green-600 text-white font-bold
                                        hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"
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
                <div className="master-card p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Funzionalità in Arrivo</h2>
                    <p className="text-gray-500">Questa sezione sarà disponibile prossimamente.</p>
                </div>
            )}

            {/* 3D Viewer Modal */}
            {show3D && result && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-700 text-lg">Caricamento Vista 3D...</p>
                        </div>
                    </div>
                }>
                    <Block3DViewer
                        isOpen={show3D}
                        onClose={() => setShow3D(false)}
                        blockHeight={parseFloat(blockHeight)}
                        sheetThickness={parseFloat(sheetThickness)}
                        totalSheets={result.sheets_per_block}
                        remainder={result.remainder_per_block}
                        materialName={
                            materialType === 'sponge'
                                ? `${selectedMaterial?.label || ''} ${selectedColor?.label || ''}`.trim()
                                : selectedMaterial?.label || 'Memory'
                        }
                    />
                </Suspense>
            )}
        </div>
    );
}
