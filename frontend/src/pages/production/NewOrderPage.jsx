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

// Step 2A: Memory Material Grid
const StepMemoryMaterial = ({ materials, onSelect }) => (
    <div>
        <h2 className="text-xl font-bold text-white text-center mb-4">Scegli Memory</h2>
        <div className="grid grid-cols-2 gap-3">
            {materials.map(m => (
                <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className="p-4 rounded-xl text-white font-bold text-sm shadow-lg hover:scale-105 transition-transform border-2 border-white/20"
                    style={{ backgroundColor: m.value || '#6B7280' }}
                >
                    {m.label}
                </button>
            ))}
        </div>
    </div>
);

// Step 2B: Sponge - Density Selector
const StepSpongeDensity = ({ densities, onSelect }) => (
    <div>
        <h2 className="text-xl font-bold text-white text-center mb-4">Densità Spugna</h2>
        <div className="grid grid-cols-4 gap-3">
            {densities.map(d => (
                <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className="p-4 rounded-xl bg-slate-700 text-white font-bold text-lg shadow-lg hover:bg-cyan-600 transition-colors border-2 border-white/10"
                >
                    {d.label}
                </button>
            ))}
        </div>
    </div>
);

// Step 2B2: Sponge - Color Selector
const StepSpongeColor = ({ colors, onSelect }) => (
    <div>
        <h2 className="text-xl font-bold text-white text-center mb-4">Colore Spugna</h2>
        <div className="grid grid-cols-3 gap-3">
            {colors.map(c => (
                <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="p-4 rounded-xl text-white font-bold text-xs shadow-lg hover:scale-105 transition-transform border-2 border-white/30"
                    style={{ backgroundColor: c.value || '#6B7280' }}
                >
                    {c.label}
                </button>
            ))}
        </div>
    </div>
);

// Step 3: Dimensions + Trim
const StepDimensions = ({ formData, setFormData, onNext }) => {
    const DIMENSIONS = ['120x200', '160x190', '160x200', '180x200', '200x200'];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white text-center mb-4">Dimensioni</h2>

            {/* Dimension Buttons */}
            <div className="grid grid-cols-3 gap-3">
                {DIMENSIONS.map(dim => (
                    <button
                        key={dim}
                        onClick={() => setFormData(prev => ({ ...prev, dimensions: dim }))}
                        className={`p-3 rounded-xl font-bold text-sm transition-all border-2 ${formData.dimensions === dim
                                ? 'bg-cyan-600 text-white border-cyan-400'
                                : 'bg-slate-700 text-gray-300 border-white/10 hover:bg-slate-600'
                            }`}
                    >
                        {dim}
                    </button>
                ))}
            </div>

            {/* Block Type Toggle */}
            <div>
                <p className="text-gray-400 text-sm mb-2">Tipo di Blocco</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: false, customHeight: null }))}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${!formData.isPartial ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        📦 INTERO
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: true }))}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.isPartial ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        ✂️ PARZIALE
                    </button>
                </div>
                {formData.isPartial && (
                    <input
                        type="number"
                        placeholder="Altezza (cm)"
                        value={formData.customHeight || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customHeight: parseInt(e.target.value) || null }))}
                        className="w-full mt-3 p-3 bg-slate-800 border border-white/20 rounded-xl text-white text-center text-lg"
                    />
                )}
            </div>

            {/* Trim Toggle */}
            <div>
                <p className="text-gray-400 text-sm mb-2">Rifilatura</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: true }))}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.isTrimmed ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        ✂️ RIFILARE
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: false }))}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${!formData.isTrimmed ? 'bg-slate-600 text-white' : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        📦 NON RIFILATO
                    </button>
                </div>
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!formData.dimensions}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Avanti →
            </button>
        </div>
    );
};

// Step 4: Review & Submit
const StepReview = ({ formData, onSubmit, loading }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center mb-4">Conferma Ordine</h2>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex justify-between">
                <span className="text-gray-400">Tipo:</span>
                <span className="text-white font-bold">{formData.type === 'memory' ? '🧠 Memory' : '🧽 Spugna'}</span>
            </div>
            {formData.type === 'memory' ? (
                <div className="flex justify-between">
                    <span className="text-gray-400">Materiale:</span>
                    <span className="text-white font-bold">{formData.materialLabel}</span>
                </div>
            ) : (
                <>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Densità:</span>
                        <span className="text-white font-bold">{formData.densityLabel}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Colore:</span>
                        <span className="text-white font-bold">{formData.colorLabel}</span>
                    </div>
                </>
            )}
            <div className="flex justify-between">
                <span className="text-gray-400">Dimensioni:</span>
                <span className="text-white font-bold">{formData.dimensions}</span>
            </div>
            {formData.customHeight && (
                <div className="flex justify-between">
                    <span className="text-gray-400">Altezza Taglio:</span>
                    <span className="text-white font-bold">{formData.customHeight} cm</span>
                </div>
            )}
            <div className="flex justify-between">
                <span className="text-gray-400">Rifilatura:</span>
                <span className={formData.isTrimmed ? 'text-orange-400 font-bold' : 'text-gray-300'}>
                    {formData.isTrimmed ? '✂️ Sì' : '❌ No'}
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-400">Quantità:</span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => formData.setQuantity(Math.max(1, formData.quantity - 1))}
                        className="w-10 h-10 bg-slate-700 rounded-full text-white font-bold text-xl"
                    >-</button>
                    <span className="text-white font-bold text-xl w-8 text-center">{formData.quantity}</span>
                    <button
                        onClick={() => formData.setQuantity(formData.quantity + 1)}
                        className="w-10 h-10 bg-slate-700 rounded-full text-white font-bold text-xl"
                    >+</button>
                </div>
            </div>
        </div>

        {/* Client Reference */}
        <input
            type="text"
            placeholder="Riferimento Cliente (opzionale)"
            value={formData.clientRef || ''}
            onChange={(e) => formData.setClientRef(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-white/20 rounded-xl text-white"
        />

        {/* Submit */}
        <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-xl shadow-lg shadow-green-500/30 disabled:opacity-50"
        >
            {loading ? 'Invio...' : '📤 INVIA RICHIESTA'}
        </button>
    </div>
);

// Main Component
export default function NewOrderPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Config Data
    const [memoryMaterials, setMemoryMaterials] = useState([]);
    const [spongeDensities, setSpongeDensities] = useState([]);
    const [spongeColors, setSpongeColors] = useState([]);

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
        quantity: 1,
        clientRef: '',
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const [memory, density, color] = await Promise.all([
                pickingApi.getConfig('memory'),
                pickingApi.getConfig('sponge_density'),
                pickingApi.getConfig('sponge_color'),
            ]);
            setMemoryMaterials(memory || []);
            setSpongeDensities(density || []);
            setSpongeColors(color || []);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
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
                />
            )}
            {step === 4 && (
                <StepReview
                    formData={{
                        ...formData,
                        setQuantity: (q) => setFormData(prev => ({ ...prev, quantity: q })),
                        setClientRef: (r) => setFormData(prev => ({ ...prev, clientRef: r })),
                    }}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            )}
        </div>
    );
}
