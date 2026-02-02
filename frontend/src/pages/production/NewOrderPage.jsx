/**
 * Nuovo Ordine Blocco - Wizard Multi-Step (Mobile-First)
 * Step 1: Memory/Spugna
 * Step 2: Material (Memory) o Density+Color (Spugna)
 * Step 3: Dimensions + Trim
 * Step 4: Review & Submit
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pickingApi } from '../../api/client';
import toast from 'react-hot-toast';

// Step 1: Category Selector
const StepCategory = ({ onSelect }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold text-white text-center mb-6">Cosa ti serve?</h2>
        <button
            onClick={() => onSelect('memory')}
            className="w-full py-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white text-2xl font-bold shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
        >
            🧠 MEMORY
        </button>
        <button
            onClick={() => onSelect('sponge')}
            className="w-full py-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white text-2xl font-bold shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform"
        >
            🧽 SPUGNA
        </button>
    </div>
);

// Helper for Text Contrast
const getContrastColor = (hexColor) => {
    if (!hexColor) return 'white';
    // Remove hash
    const hex = hexColor.replace('#', '');
    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // YIQ equation
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
};

// Step 2A: Memory Material Grid - Enhanced Color Cards
const StepMemoryMaterial = ({ materials, onSelect }) => {
    // Generate gradient and glow from base color
    const getColorStyles = (hexColor) => {
        if (!hexColor) return {};
        // Darken color for gradient end
        const darken = (hex, percent) => {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
        };

        return {
            background: `linear-gradient(135deg, ${hexColor} 0%, ${darken(hexColor, 20)} 100%)`,
            boxShadow: `0 8px 32px ${hexColor}50, 0 4px 16px ${hexColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
        };
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white text-center mb-4">Scegli Memory</h2>
            <div className="grid grid-cols-1 gap-4">
                {materials.map(m => {
                    const textColor = getContrastColor(m.value);
                    const colorStyles = getColorStyles(m.value);
                    return (
                        <button
                            key={m.id}
                            onClick={() => onSelect(m)}
                            className="p-5 rounded-2xl font-bold text-lg transition-all duration-200 
                                       border border-white/20 relative overflow-hidden
                                       active:scale-[0.98] active:brightness-110
                                       hover:translate-y-[-2px] hover:shadow-2xl"
                            style={{
                                ...colorStyles,
                                color: textColor,
                                minHeight: '64px'
                            }}
                        >
                            {/* Shine effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            <span
                                className="relative z-10 drop-shadow-lg"
                                style={{
                                    textShadow: textColor === 'white'
                                        ? '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
                                        : '0 1px 2px rgba(255,255,255,0.3)'
                                }}
                            >
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Step 2B: Sponge - Density Selector
const StepSpongeDensity = ({ densities, onSelect }) => (
    <div>
        <h2 className="text-xl font-bold text-white text-center mb-4">Densità Spugna</h2>
        <div className="grid grid-cols-2 gap-3">
            {densities.map(d => (
                <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className="p-6 rounded-xl bg-slate-700 text-white font-bold text-2xl shadow-lg hover:bg-cyan-600 transition-colors border-2 border-white/10"
                >
                    {d.label}
                </button>
            ))}
        </div>
    </div>
);

// Step 2B2: Sponge - Color Selector - Enhanced Color Cards
const StepSpongeColor = ({ colors, onSelect }) => {
    // Generate gradient and glow from base color
    const getColorStyles = (hexColor) => {
        if (!hexColor) return {};
        const darken = (hex, percent) => {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
        };

        return {
            background: `linear-gradient(135deg, ${hexColor} 0%, ${darken(hexColor, 20)} 100%)`,
            boxShadow: `0 8px 32px ${hexColor}50, 0 4px 16px ${hexColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
        };
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white text-center mb-4">Colore Spugna</h2>
            <div className="grid grid-cols-1 gap-4">
                {colors.map(c => {
                    const textColor = getContrastColor(c.value);
                    const colorStyles = getColorStyles(c.value);
                    return (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c)}
                            className="p-5 rounded-2xl font-bold text-lg transition-all duration-200 
                                       border border-white/20 relative overflow-hidden
                                       active:scale-[0.98] active:brightness-110
                                       hover:translate-y-[-2px] hover:shadow-2xl"
                            style={{
                                ...colorStyles,
                                color: textColor,
                                minHeight: '64px'
                            }}
                        >
                            {/* Shine effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            <span
                                className="relative z-10 drop-shadow-lg"
                                style={{
                                    textShadow: textColor === 'white'
                                        ? '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
                                        : '0 1px 2px rgba(255,255,255,0.3)'
                                }}
                            >
                                {c.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Step 3: Dimensions + Trim
const StepDimensions = ({ formData, setFormData, onNext, dimensions = [] }) => {
    // Fallback if no dimensions loaded from API
    const displayDims = dimensions.length > 0 ? dimensions.map(d => d.label) : ['120x200', '160x190', '160x200', '180x200', '200x200'];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white text-center mb-4">Dimensioni & Opzioni</h2>

            {/* Dimension Buttons */}
            <div>
                <p className="text-gray-400 text-sm mb-2">1. Seleziona Misura</p>
                <div className="grid grid-cols-3 gap-3">
                    {displayDims.map(dim => (
                        <button
                            key={dim}
                            onClick={() => setFormData(prev => ({ ...prev, dimensions: dim }))}
                            className={`p-3 rounded-xl font-bold text-sm transition-all border-2 ${formData.dimensions === dim
                                ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                                : 'bg-slate-700 text-gray-300 border-white/10 hover:bg-slate-600'
                                }`}
                        >
                            {dim}
                        </button>
                    ))}
                </div>
            </div>

            {/* Block Type Row */}
            <div>
                <p className="text-gray-400 text-sm mb-2">2. Tipo di Blocco</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: false, customHeight: null }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 ${!formData.isPartial
                            ? 'bg-green-600 text-white border-green-400'
                            : 'bg-slate-800 text-gray-500 border-white/10'
                            }`}
                    >
                        📦 INTERO
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: true }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 ${formData.isPartial
                            ? 'bg-yellow-600 text-white border-yellow-400'
                            : 'bg-slate-800 text-gray-500 border-white/10'
                            }`}
                    >
                        ✂️ PARZIALE
                    </button>
                </div>
                {formData.isPartial && (
                    <div className="mt-3 animate-fadeIn">
                        <label className="text-xs text-yellow-400 mb-1 block">Inserisci Altezza (cm)</label>
                        <input
                            type="number"
                            placeholder="Es: 15"
                            value={formData.customHeight || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, customHeight: parseInt(e.target.value) || null }))}
                            className="w-full p-3 bg-slate-800 border-2 border-yellow-500/50 rounded-xl text-white text-center text-xl font-bold focus:border-yellow-400 outline-none"
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* Trim Row - Rifilatura */}
            <div>
                <p className="text-gray-400 text-sm mb-2">3. Rifilatura</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: false }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 ${!formData.isTrimmed
                            ? 'bg-slate-600 text-white border-slate-400'
                            : 'bg-slate-800 text-gray-500 border-white/10'
                            }`}
                    >
                        🔲 NON RIFILATO
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: true }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 ${formData.isTrimmed
                            ? 'bg-orange-600 text-white border-orange-400'
                            : 'bg-slate-800 text-gray-500 border-white/10'
                            }`}
                    >
                        🔷 RIFILARE
                    </button>
                </div>
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!formData.dimensions}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-cyan-500/20"
            >
                Avanti →
            </button>
        </div>
    );
};

// Step 4: Review & Submit
const StepReview = ({ formData, onSubmit, loading, suppliers = [] }) => {
    const isValid = formData.quantity > 0 && formData.clientRef && formData.clientRef.trim().length > 0;
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white text-center mb-4">Conferma Ordine</h2>

            <div className="bg-slate-800/80 rounded-xl p-4 border border-white/10 space-y-3 shadow-xl">
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Tipo:</span>
                    <span className="text-white font-bold text-lg">{formData.type === 'memory' ? '🧠 Memory' : '🧽 Spugna'}</span>
                </div>
                {formData.type === 'memory' ? (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Materiale:</span>
                        <span className="text-cyan-400 font-bold text-lg">{formData.materialLabel}</span>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Densità:</span>
                            <span className="text-cyan-400 font-bold text-lg">{formData.densityLabel}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Colore:</span>
                            <span className="text-white font-bold text-lg">{formData.colorLabel}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Dimensioni:</span>
                    <span className="text-white font-bold text-lg">{formData.dimensions}</span>
                </div>
                {formData.isPartial ? (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Taglio Parziale:</span>
                        <span className="text-yellow-400 font-bold text-lg">{formData.customHeight} cm</span>
                    </div>
                ) : (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Taglio:</span>
                        <span className="text-green-400 font-bold">Intero</span>
                    </div>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Rifilatura:</span>
                    <span className={formData.isTrimmed ? 'text-orange-400 font-bold' : 'text-gray-300'}>
                        {formData.isTrimmed ? '🔷 SI' : '🔲 NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400">Quantità:</span>
                    <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1">
                        <button
                            onClick={() => formData.setQuantity(Math.max(0, formData.quantity - 1))}
                            className="w-10 h-10 bg-slate-700 rounded-lg text-white font-bold text-2xl hover:bg-red-500 transition-colors"
                        >-</button>
                        <span className={`font-bold text-2xl w-8 text-center ${formData.quantity > 0 ? 'text-white' : 'text-red-500'}`}>
                            {formData.quantity}
                        </span>
                        <button
                            onClick={() => formData.setQuantity(formData.quantity + 1)}
                            className="w-10 h-10 bg-slate-700 rounded-lg text-white font-bold text-2xl hover:bg-green-500 transition-colors"
                        >+</button>
                    </div>
                </div>
            </div>

            {/* Client Reference - MANDATORY */}
            <div>
                <label className="text-sm font-bold text-white mb-2 block">
                    Riferimento Cliente <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    placeholder="Nome Cliente o Riferimento Obbligatorio"
                    value={formData.clientRef || ''}
                    maxLength={100}
                    onChange={(e) => formData.setClientRef(e.target.value)}
                    className={`w-full p-4 bg-slate-800 border-2 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none ${!formData.clientRef ? 'border-red-500/50 focus:border-red-500' : 'border-green-500/50 focus:border-green-500'
                        }`}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                    {(formData.clientRef || '').length}/100
                </div>
            </div>

            {/* Supplier Selection - Optional */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 border-2 border-dashed border-white/20 rounded-xl text-gray-300 font-medium transition-colors flex items-center justify-center gap-2"
                >
                    🏭 {formData.supplierLabel ? `Fornitore: ${formData.supplierLabel}` : 'Inserisci Fornitore Specifico (Opzionale)'}
                </button>
            </div>

            {/* Supplier Modal */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowSupplierModal(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Seleziona Fornitore</h3>
                        <div className="space-y-2">
                            {suppliers.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        formData.setSupplier(s);
                                        setShowSupplierModal(false);
                                    }}
                                    className={`w-full py-3 px-4 rounded-lg font-medium text-left transition-colors ${formData.supplierId === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    formData.setSupplier(null);
                                    setShowSupplierModal(false);
                                }}
                                className="w-full py-3 px-4 rounded-lg font-medium text-left bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors mt-2"
                            >
                                ❌ Nessun Fornitore
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSupplierModal(false)}
                            className="w-full mt-4 py-2 bg-slate-900 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message if Invalid */}
            {!isValid && (
                <div className="text-center text-red-400 text-sm animate-pulse">
                    {formData.quantity === 0 ? '⚠️ Seleziona almeno 1 quantità' : '⚠️ Inserisci il riferimento cliente'}
                </div>
            )}

            {/* Submit */}
            <button
                onClick={onSubmit}
                disabled={loading || !isValid}
                className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-xl shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
            >
                {loading ? 'Invio...' : '📤 INVIA RICHIESTA'}
            </button>
        </div>
    );
};

// Main Component
export default function NewOrderPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Config Data
    const [memoryMaterials, setMemoryMaterials] = useState([]);
    const [spongeDensities, setSpongeDensities] = useState([]);
    const [spongeColors, setSpongeColors] = useState([]);
    const [blockDimensions, setBlockDimensions] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        type: null,
        materialId: null,
        materialLabel: '',
        densityId: null,
        densityLabel: '',
        colorId: null,
        colorLabel: '',
        dimensions: '',
        isPartial: false,
        customHeight: null,
        isTrimmed: false,
        quantity: 0, // Start at 0
        clientRef: '',
        supplierId: null,
        supplierLabel: '',
        targetSector: null, // 'Pantografo' | 'Giostra'
    });

    // Sector Selection Modal State
    const [showSectorModal, setShowSectorModal] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const [memory, density, color, dims, supps] = await Promise.all([
                pickingApi.getConfig('memory'),
                pickingApi.getConfig('sponge_density'),
                pickingApi.getConfig('sponge_color'),
                pickingApi.getConfig('block_dimension'),
                pickingApi.getConfig('supplier'),
            ]);
            setMemoryMaterials(memory || []);
            setSpongeDensities(density || []);
            setSpongeColors(color || []);
            setBlockDimensions(dims || []);
            setSuppliers(supps || []);
        } catch (err) {
            console.error('Error loading config:', err);
            toast.error('Errore caricamento configurazione');
        }
    };

    const handleCategorySelect = (type) => {
        setFormData(prev => ({ ...prev, type }));
        setStep(2);
    };

    const handleMemorySelect = (material) => {
        setFormData(prev => ({
            ...prev,
            materialId: material.id,
            materialLabel: material.label
        }));
        setStep(3);
    };

    const handleDensitySelect = (density) => {
        setFormData(prev => ({
            ...prev,
            densityId: density.id,
            densityLabel: density.label
        }));
        setStep(2.5); // Show color picker
    };

    const handleColorSelect = (color) => {
        setFormData(prev => ({
            ...prev,
            colorId: color.id,
            colorLabel: color.label
        }));
        setStep(3);
    };

    const handleSubmit = async () => {
        // First, open Sector Selection Modal
        setShowSectorModal(true);
    };

    const confirmWithSector = async (sector) => {
        setShowSectorModal(false);
        setLoading(true);
        try {
            const payload = {
                request_type: formData.type,
                material_id: formData.materialId,
                density_id: formData.densityId,
                color_id: formData.colorId,
                dimensions: formData.dimensions,
                custom_height: formData.customHeight,
                is_trimmed: formData.isTrimmed,
                quantity: formData.quantity,
                client_ref: formData.clientRef || null,
                supplier_id: formData.supplierId || null,
                target_sector: sector, // 'Pantografo' | 'Giostra'
            };

            await pickingApi.createRequest(payload);
            toast.success('Richiesta inviata al Block Supply!');
            navigate('/production/orders');
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.detail || 'Errore invio richiesta');
        } finally {
            setLoading(false);
        }
    };

    // Step Navigation
    const goBack = () => {
        if (step === 2) setStep(1);
        else if (step === 2.5) setStep(2);
        else if (step === 3) setStep(formData.type === 'memory' ? 2 : 2.5);
        else if (step === 4) setStep(3);
        else navigate('/production/orders');
    };

    return (
        <div className="min-h-screen carbon-background p-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={goBack}
                    className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white"
                >
                    ←
                </button>
                <h1 className="text-xl font-bold text-white">Nuovo Ordine</h1>
                <span className="text-gray-500 text-sm ml-auto">Step {Math.ceil(step)}/4</span>
            </div>

            {/* Steps */}
            {step === 1 && <StepCategory onSelect={handleCategorySelect} />}
            {step === 2 && formData.type === 'memory' && (
                <StepMemoryMaterial materials={memoryMaterials} onSelect={handleMemorySelect} />
            )}
            {step === 2 && formData.type === 'sponge' && (
                <StepSpongeDensity densities={spongeDensities} onSelect={handleDensitySelect} />
            )}
            {step === 2.5 && (
                <StepSpongeColor colors={spongeColors} onSelect={handleColorSelect} />
            )}
            {step === 3 && (
                <StepDimensions
                    formData={formData}
                    setFormData={setFormData}
                    onNext={() => setStep(4)}
                    dimensions={blockDimensions}
                />
            )}
            {step === 4 && (
                <StepReview
                    formData={{
                        ...formData,
                        setQuantity: (q) => setFormData(prev => ({ ...prev, quantity: q })),
                        setClientRef: (r) => setFormData(prev => ({ ...prev, clientRef: r })),
                        setSupplier: (s) => setFormData(prev => ({ ...prev, supplierId: s?.id || null, supplierLabel: s?.label || '' })),
                    }}
                    suppliers={suppliers}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            )}

            {/* SECTOR SELECTION MODAL */}
            {showSectorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl border border-blue-500/30 p-8 max-w-md w-full shadow-2xl text-center">

                        <h2 className="text-2xl font-bold text-white mb-2">REPARTO DI DESTINAZIONE?</h2>
                        <p className="text-gray-400 mb-8">Specifica per chi è questo materiale per aiutare il magazzino.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => confirmWithSector('Pantografo')}
                                className="p-6 rounded-xl border-2 border-cyan-500/30 bg-cyan-900/20 hover:bg-cyan-900/40 hover:border-cyan-400 active:scale-95 transition-all group"
                            >
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✂️</div>
                                <div className="text-lg font-bold text-cyan-300">PANTOGRAFO</div>
                            </button>

                            <button
                                onClick={() => confirmWithSector('Giostra')}
                                className="p-6 rounded-xl border-2 border-purple-500/30 bg-purple-900/20 hover:bg-purple-900/40 hover:border-purple-400 active:scale-95 transition-all group"
                            >
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎢</div>
                                <div className="text-lg font-bold text-purple-300">GIOSTRA</div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowSectorModal(false)}
                            className="mt-8 text-gray-400 hover:text-white underline text-sm"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
