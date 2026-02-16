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

// SVG Icon Components
const IconMemory = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
        <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
    </svg>
);
const IconSponge = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
);
const IconCube = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);
const IconScissors = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
);
const IconSquare = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
);
const IconDiamond = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0z" />
    </svg>
);
const IconBuilding = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
        <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
    </svg>
);
const IconSend = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
const IconRotate = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" />
    </svg>
);

// Step 1: Category Selector
const StepCategory = ({ onSelect }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Cosa ti serve?</h2>
        <button
            onClick={() => onSelect('memory')}
            className="w-full py-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl text-white text-2xl font-bold shadow-lg shadow-purple-500/20 hover:scale-105 hover:shadow-xl transition-all cursor-pointer"
        >
            <span className="flex items-center justify-center gap-3"><IconMemory className="w-8 h-8" /> MEMORY</span>
        </button>
        <button
            onClick={() => onSelect('sponge')}
            className="w-full py-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white text-2xl font-bold shadow-lg shadow-orange-500/20 hover:scale-105 hover:shadow-xl transition-all cursor-pointer"
        >
            <span className="flex items-center justify-center gap-3"><IconSponge className="w-8 h-8" /> SPUGNA</span>
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
            <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Scegli Memory</h2>
            <div className="grid grid-cols-1 gap-4">
                {materials.map(m => {
                    const textColor = getContrastColor(m.value);
                    const colorStyles = getColorStyles(m.value);
                    return (
                        <button
                            key={m.id}
                            onClick={() => onSelect(m)}
                            className="p-5 rounded-2xl font-bold text-lg transition-all duration-200 
                                       border border-slate-200 relative overflow-hidden shadow-sm
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
        <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Densità Spugna</h2>
        <div className="grid grid-cols-2 gap-3">
            {densities.map(d => (
                <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className="p-6 rounded-xl bg-white text-slate-800 font-bold text-2xl shadow-sm hover:bg-emerald-50 hover:border-emerald-400 transition-colors border-2 border-slate-200 cursor-pointer"
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
            <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Colore Spugna</h2>
            <div className="grid grid-cols-1 gap-4">
                {colors.map(c => {
                    const textColor = getContrastColor(c.value);
                    const colorStyles = getColorStyles(c.value);
                    return (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c)}
                            className="p-5 rounded-2xl font-bold text-lg transition-all duration-200 
                                       border border-slate-200 relative overflow-hidden shadow-sm
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
            <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Dimensioni & Opzioni</h2>

            {/* Dimension Buttons */}
            <div>
                <p className="text-slate-500 text-sm mb-2 font-medium">1. Seleziona Misura</p>
                <div className="grid grid-cols-3 gap-3">
                    {displayDims.map(dim => (
                        <button
                            key={dim}
                            onClick={() => setFormData(prev => ({ ...prev, dimensions: dim }))}
                            className={`p-3 rounded-xl font-bold text-sm transition-all border-2 cursor-pointer ${formData.dimensions === dim
                                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                        >
                            {dim}
                        </button>
                    ))}
                </div>
            </div>

            {/* Block Type Row */}
            <div>
                <p className="text-slate-500 text-sm mb-2 font-medium">2. Tipo di Blocco</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: false, customHeight: null }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 cursor-pointer ${!formData.isPartial
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2"><IconCube /> INTERO</span>
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isPartial: true }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 cursor-pointer ${formData.isPartial
                            ? 'bg-amber-500 text-white border-amber-400'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2"><IconScissors /> PARZIALE</span>
                    </button>
                </div>
                {formData.isPartial && (
                    <div className="mt-3 animate-fadeIn">
                        <label className="text-xs text-amber-600 mb-1 block font-semibold">Inserisci Altezza (cm)</label>
                        <input
                            type="number"
                            placeholder="Es: 15"
                            value={formData.customHeight || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, customHeight: parseInt(e.target.value) || null }))}
                            className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl text-slate-800 text-center text-xl font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none shadow-sm"
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* Trim Row - Rifilatura */}
            <div>
                <p className="text-slate-500 text-sm mb-2 font-medium">3. Rifilatura</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: false }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 cursor-pointer ${!formData.isTrimmed
                            ? 'bg-slate-600 text-white border-slate-500'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2"><IconSquare /> NON RIFILATO</span>
                    </button>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, isTrimmed: true }))}
                        className={`flex-1 py-4 rounded-xl font-bold transition-all border-2 cursor-pointer ${formData.isTrimmed
                            ? 'bg-orange-500 text-white border-orange-400'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2"><IconDiamond /> RIFILARE</span>
                    </button>
                </div>
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!formData.dimensions}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-emerald-500/20 cursor-pointer hover:shadow-xl transition-shadow"
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
            <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Conferma Ordine</h2>

            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tipo:</span>
                    <span className="text-slate-800 font-bold text-lg flex items-center gap-2">{formData.type === 'memory' ? <><IconMemory className="w-5 h-5 text-purple-500" /> Memory</> : <><IconSponge className="w-5 h-5 text-amber-500" /> Spugna</>}</span>
                </div>
                {formData.type === 'memory' ? (
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-gray-400">Materiale:</span>
                        <span className="text-emerald-600 font-bold text-lg">{formData.materialLabel}</span>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-gray-400">Densità:</span>
                            <span className="text-emerald-600 font-bold text-lg">{formData.densityLabel}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-gray-400">Colore:</span>
                            <span className="text-slate-800 font-bold text-lg">{formData.colorLabel}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Dimensioni:</span>
                    <span className="text-slate-800 font-bold text-lg">{formData.dimensions}</span>
                </div>
                {formData.isPartial ? (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Taglio Parziale:</span>
                        <span className="text-amber-600 font-bold text-lg">{formData.customHeight} cm</span>
                    </div>
                ) : (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Taglio:</span>
                        <span className="text-emerald-600 font-bold">Intero</span>
                    </div>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Rifilatura:</span>
                    <span className={formData.isTrimmed ? 'text-orange-600 font-bold' : 'text-slate-400'}>
                        <span className="flex items-center gap-1">{formData.isTrimmed ? <><IconDiamond className="w-4 h-4" /> SI</> : <><IconSquare className="w-4 h-4" /> NO</>}</span>
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400">Quantità:</span>
                    <div className="flex items-center gap-4 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => formData.setQuantity(Math.max(0, formData.quantity - 1))}
                            className="w-10 h-10 bg-white rounded-lg text-slate-600 font-bold text-2xl hover:bg-red-500 hover:text-white transition-colors border border-slate-200 cursor-pointer"
                        >-</button>
                        <span className={`font-bold text-2xl w-8 text-center ${formData.quantity > 0 ? 'text-slate-800' : 'text-red-500'}`}>
                            {formData.quantity}
                        </span>
                        <button
                            onClick={() => formData.setQuantity(formData.quantity + 1)}
                            className="w-10 h-10 bg-white rounded-lg text-slate-600 font-bold text-2xl hover:bg-emerald-500 hover:text-white transition-colors border border-slate-200 cursor-pointer"
                        >+</button>
                    </div>
                </div>
            </div>

            {/* Client Reference - MANDATORY */}
            <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                    Riferimento Cliente <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    placeholder="Nome Cliente o Riferimento Obbligatorio"
                    value={formData.clientRef || ''}
                    maxLength={100}
                    onChange={(e) => formData.setClientRef(e.target.value)}
                    className={`w-full p-4 bg-white border-2 rounded-xl text-slate-800 text-lg placeholder-slate-400 focus:outline-none shadow-sm ${!formData.clientRef ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                        }`}
                />
                <div className="text-right text-xs text-slate-400 mt-1">
                    {(formData.clientRef || '').length}/100
                </div>
            </div>

            {/* Supplier Selection - Optional */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <IconBuilding className="w-5 h-5" /> {formData.supplierLabel ? `Fornitore: ${formData.supplierLabel}` : 'Inserisci Fornitore Specifico (Opzionale)'}
                </button>
            </div>

            {/* Supplier Modal */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSupplierModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Seleziona Fornitore</h3>
                        <div className="space-y-2">
                            {suppliers.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        formData.setSupplier(s);
                                        setShowSupplierModal(false);
                                    }}
                                    className={`w-full py-3 px-4 rounded-lg font-medium text-left transition-colors cursor-pointer ${formData.supplierId === s.id ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    formData.setSupplier(null);
                                    setShowSupplierModal(false);
                                }}
                                className="w-full py-3 px-4 rounded-lg font-medium text-left bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors mt-2 cursor-pointer"
                            >
                                ✕ Nessun Fornitore
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSupplierModal(false)}
                            className="w-full mt-4 py-2 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message if Invalid */}
            {!isValid && (
                <div className="text-center text-red-500 text-sm animate-pulse font-medium">
                    {formData.quantity === 0 ? 'Seleziona almeno 1 quantità' : 'Inserisci il riferimento cliente'}
                </div>
            )}

            {/* Submit */}
            <button
                onClick={onSubmit}
                disabled={loading || !isValid}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-bold text-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-xl transition-all cursor-pointer"
            >
                {loading ? 'Invio...' : <span className="flex items-center justify-center gap-2"><IconSend /> INVIA RICHIESTA</span>}
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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={goBack}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors"
                >
                    ←
                </button>
                <h1 className="text-xl font-bold text-slate-800">Nuovo Ordine</h1>
                <span className="text-slate-400 text-sm ml-auto font-medium">Step {Math.ceil(step)}/4</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-xl text-center">

                        <h2 className="text-2xl font-bold text-slate-800 mb-2">REPARTO DI DESTINAZIONE?</h2>
                        <p className="text-slate-500 mb-8">Specifica per chi è questo materiale per aiutare il magazzino.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => confirmWithSector('Pantografo')}
                                className="p-6 rounded-xl border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 active:scale-95 transition-all group cursor-pointer"
                            >
                                <div className="mb-3 group-hover:scale-110 transition-transform text-cyan-600"><IconScissors className="w-10 h-10 mx-auto" /></div>
                                <div className="text-lg font-bold text-cyan-700">PANTOGRAFO</div>
                            </button>

                            <button
                                onClick={() => confirmWithSector('Giostra')}
                                className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 active:scale-95 transition-all group cursor-pointer"
                            >
                                <div className="mb-3 group-hover:scale-110 transition-transform text-purple-600"><IconRotate className="w-10 h-10 mx-auto" /></div>
                                <div className="text-lg font-bold text-purple-700">GIOSTRA</div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowSectorModal(false)}
                            className="mt-8 text-slate-400 hover:text-slate-700 underline text-sm cursor-pointer"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
