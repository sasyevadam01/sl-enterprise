import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fleetApi } from '../../api/client';
import { useUI, StandardModal } from '../../components/ui/CustomUI';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
// date-fns removed: shift-info endpoint handles date logic server-side
import {
    Car,
    CheckCircle2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    ClipboardCheck,
    Clock,
    User,
    ArrowRight,
    Settings,
    Plus,
    Pencil,
    Trash2,
    Truck,
    Tablet,
    Camera,
    Upload
} from 'lucide-react';

const ForkliftIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 16V18H2V16H4ZM4 16H6V12H2V16H4Z" fill={color} />
        <path d="M12 5V18H10V5H12ZM14 18H18C19.1 18 20 17.1 20 16V9L15 6H14V18ZM15 8L18.5 10V16H14V8H15Z" fill={color} />
        <path d="M6 18H8V5H6V18Z" fill={color} />
        <path d="M22 18H20V16H22V18Z" fill={color} />
        <circle cx="7" cy="19" r="2" fill={color} />
        <circle cx="17" cy="19" r="2" fill={color} />
        <rect x="2" y="14" width="8" height="2" fill={color} />
    </svg>
);

const CHECKS = [
    { key: "plastiche_integre", label: "Plastiche protez. e carter integri" },
    { key: "lampeggiante", label: "Lampeggiante funzionante" },
    { key: "blue_spot", label: "Blue spot / Segnal. luminose" },
    { key: "specchietto", label: "Specchietto integro e regolato" },
    { key: "cabina_pulita", label: "Cabina / Vano puliti e in ordine" },
    { key: "clacson", label: "Clacson / Avvisatore acustico" },
    { key: "sterzo", label: "Sterzo e comandi di marcia" },
    { key: "freni", label: "Freni e Freno Stazionamento" },
    { key: "leve_idrauliche", label: "Leve Idrauliche (Sollev./Brandeggio)" },
    { key: "catene", label: "Catene, mast e parti sollevamento" },
    { key: "tubazioni", label: "Staffe, tubazioni e manicotti" },
    { key: "perdite", label: "Assenza perdite (olio, acido)" },
    { key: "batteria_fissaggio", label: "Molla e fissaggio batteria" },
    { key: "batteria_carica", label: "Controllo carica / Stato batteria" },
    { key: "pulizia_carro", label: "Pulizia Carro - Ponte" },
    { key: "pulizia_ruote", label: "Pulizia Ruote" }
];

export default function VehicleChecklistPage() {
    const { toast } = useUI();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Select, 2: Check, 3: Success
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [loading, setLoading] = useState(true);

    // Checklist State
    const [checks, setChecks] = useState({}); // { key: true/false }
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState('all'); // all, forklift, transpallet, etc
    const [hideCompleted, setHideCompleted] = useState(false);

    const [reportingIssue, setReportingIssue] = useState(null); // { key, label, note, photo, photoPreview }

    // Tablet Check State
    const [tabletStatus, setTabletStatus] = useState('ok'); // ok, broken
    const [tabletPhoto, setTabletPhoto] = useState(null); // File object
    const [photoPreview, setPhotoPreview] = useState(null);
    const [tabletNote, setTabletNote] = useState("");

    // Vehicle Photo State
    const [vehiclePhoto, setVehiclePhoto] = useState(null);
    const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(null);

    // Feature: Disable checked vehicles
    const [checkedVehicles, setCheckedVehicles] = useState({}); // { vehicle_id: { operator, tabletStatus, time } }

    // Shift State
    const [shiftInfo, setShiftInfo] = useState({ shift: null, label: '', available: false, message: null });

    // TAB STATE
    const [activeView, setActiveView] = useState('checklist'); // checklist, management
    const canManageFleet = user?.permissions?.includes('manage_fleet') || user?.permissions?.includes('*');

    // Management State
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [vehicleToEdit, setVehicleToEdit] = useState(null);
    const [vehicleForm, setVehicleForm] = useState({
        vehicle_type: 'forklift',
        brand: '',
        model: '',
        internal_code: '',
        banchina_id: null,
        assigned_operator: '',
        is_4_0: false,
        status: 'operational'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vData, shiftData] = await Promise.all([
                fleetApi.getVehicles({ status: 'operational' }),
                fleetApi.getShiftInfo()
            ]);

            setVehicles(vData);
            setShiftInfo(shiftData);
            setCheckedVehicles(shiftData.checked_vehicles || {});

        } catch (err) {
            console.error(err);
            toast.error("Errore caricamento mezzi");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVehicle = async () => {
        if (!vehicleForm.internal_code || !vehicleForm.vehicle_type) {
            toast.error("Codice e Tipo sono obbligatori");
            return;
        }

        try {
            if (vehicleToEdit) {
                await fleetApi.updateVehicle(vehicleToEdit.id, vehicleForm);
                toast.success("Mezzo aggiornato");
            } else {
                await fleetApi.createVehicle(vehicleForm);
                toast.success("Mezzo aggiunto");
            }
            setShowVehicleModal(false);
            setVehicleToEdit(null);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error("Errore salvataggio mezzo");
        }
    };

    const handleDeleteVehicle = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo mezzo?")) return;
        try {
            await fleetApi.deleteVehicle(id);
            toast.success("Mezzo eliminato");
            loadData();
        } catch (err) {
            console.error(err);
            toast.error("Errore eliminazione mezzo");
        }
    };

    const openEditModal = (v) => {
        setVehicleToEdit(v);
        setVehicleForm({
            vehicle_type: v.vehicle_type,
            brand: v.brand || '',
            model: v.model || '',
            internal_code: v.internal_code || '',
            banchina_id: v.banchina_id,
            assigned_operator: v.assigned_operator || '',
            is_4_0: v.is_4_0,
            status: v.status
        });
        setShowVehicleModal(true);
    };

    const openAddModal = () => {
        setVehicleToEdit(null);
        setVehicleForm({
            vehicle_type: 'forklift',
            brand: '',
            model: '',
            internal_code: '',
            banchina_id: null,
            assigned_operator: '',
            is_4_0: false,
            status: 'operational'
        });
        setShowVehicleModal(true);
    };

    const [confirmVehicle, setConfirmVehicle] = useState(null);

    const handleSelectVehicle = (v) => {
        if (checkedVehicles[v.id]) return;
        setConfirmVehicle(v);
    };

    const confirmSelection = () => {
        if (confirmVehicle) {
            setSelectedVehicle(confirmVehicle);
            setStep(2);
            setChecks({});
            setNotes("");
            // Reset Tablet State
            setTabletStatus('ok');
            setTabletPhoto(null);
            setPhotoPreview(null);
            setTabletNote("");
            // Reset Vehicle Photo State
            setVehiclePhoto(null);
            setVehiclePhotoPreview(null);

            setConfirmVehicle(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Compress image using canvas to prevent memory crash on Android
    const compressImage = (file, maxDimension = 1280, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                canvas.toBlob((blob) => {
                    if (!blob) { reject(new Error('Compression failed')); return; }
                    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                    resolve({ file: compressedFile, preview: dataUrl });
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
            img.src = objectUrl;
        });
    };

    const handlePhotoCapture = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const { file: compressed, preview } = await compressImage(file);
                setTabletPhoto(compressed);
                setPhotoPreview(preview);
            } catch (err) {
                console.error('Photo compression failed:', err);
                toast.error("Errore elaborazione foto. Riprova.");
            }
        }
    };

    const handleVehiclePhotoCapture = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const { file: compressed, preview } = await compressImage(file);
                setVehiclePhoto(compressed);
                setVehiclePhotoPreview(preview);
            } catch (err) {
                console.error('Photo compression failed:', err);
                toast.error("Errore elaborazione foto. Riprova.");
            }
        }
    };

    const handleCheck = (key, value) => {
        if (value === true) {
            // OK -> Set True and clear any previous issue data
            setChecks(prev => ({ ...prev, [key]: true }));
        } else {
            // KO -> Open Reporting Modal
            const label = CHECKS.find(c => c.key === key)?.label || key;
            setReportingIssue({
                key,
                label,
                note: "",
                photo: null,
                photoPreview: null
            });
        }
    };

    const confirmIssue = () => {
        if (!reportingIssue) return;

        // Validation: Note is mandatory for issues
        if (!reportingIssue.note || reportingIssue.note.length < 5) {
            toast.error("Descrivi il problema (min. 5 caratteri)");
            return;
        }

        const issueData = {
            status: false,
            note: reportingIssue.note,
            photo: reportingIssue.photo, // File object
            photo_temp_id: reportingIssue.photo ? (Date.now() + '-' + Math.random().toString(36).substr(2, 9)) : null
        };

        setChecks(prev => ({ ...prev, [reportingIssue.key]: issueData }));
        setReportingIssue(null);
    };

    const cancelIssue = () => {
        setReportingIssue(null);
        // Do not update checks, leave as is (undefined or previous value)
    };

    const getProgress = () => {
        const answered = Object.keys(checks).length;
        const total = CHECKS.length;
        return { answered, total, percent: (answered / total) * 100 };
    };

    const validate = () => {
        const { answered, total } = getProgress();
        if (answered < total) return { valid: false, msg: "Devi completare tutti i controlli." };

        if (!tabletPhoto) {
            return { valid: false, msg: "FOTO TABLET OBBLIGATORIA! Devi scattare una foto al tablet di bordo." };
        }

        if (!vehiclePhoto) {
            return { valid: false, msg: "FOTO MEZZO OBBLIGATORIA! Devi scattare una foto completa del mezzo." };
        }

        if (tabletStatus === 'broken' && (!tabletNote || tabletNote.length < 5)) {
            return { valid: false, msg: "Se il tablet ha problemi, devi inserire una descrizione." };
        }

        const hasAnomalies = Object.values(checks).some(v => v === false);
        // Note logic is handled by wizard now
        return { valid: true };
    };

    const handleSubmit = async () => {
        const { answered, total } = getProgress();
        if (answered < total) {
            toast.error("Devi completare tutti i controlli.");
            return;
        }

        // Direct Submit (Notes collected inline)
        await finalSubmit();
    };

    const [validationError, setValidationError] = useState(null); // { title: string, message: string }

    const finalSubmit = async () => {
        setSubmitting(true);
        try {
            // Prepare data for backend
            // 1. Separate Files from JSON
            const cleanChecks = {};
            const issuePhotos = {};
            let finalNotesStr = ""; // Aggregate notes for legacy/summary field

            Object.entries(checks).forEach(([key, val]) => {
                if (val === true) {
                    cleanChecks[key] = true;
                } else if (typeof val === 'object' && val.status === false) {
                    // It's an issue
                    cleanChecks[key] = {
                        status: false,
                        note: val.note,
                        photo_temp_id: val.photo_temp_id
                    };

                    if (val.photo) {
                        issuePhotos[`issue_photo_${key}`] = val.photo;
                    }

                    // Add to summary notes
                    const label = CHECKS.find(c => c.key === key)?.label || key;
                    finalNotesStr += `${label}: ${val.note} | `;
                }
            });

            // Combine tablet note if exists
            let subNotes = finalNotesStr;
            if (tabletStatus === 'broken' && tabletNote) {
                subNotes = subNotes ? `${subNotes} Tablet: ${tabletNote}` : `Tablet: ${tabletNote}`;
            }

            await fleetApi.submitChecklistV2({
                vehicleId: selectedVehicle.id,
                checks: cleanChecks,
                notes: subNotes,
                tabletPhoto,
                tabletStatus,
                issuePhotos,
                vehiclePhoto
            });

            // FIX: Show success immediately, then refresh data in background
            // This prevents white screen if loadData() fails
            setStep(3);
            toast.success("Checklist inviata correttamente!");
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Refresh data in background (non-blocking)
            loadData().catch(err => console.warn("Background refresh failed:", err));
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || "Errore invio checklist";

            // Check for Photo Error to show Modal
            if (err.response?.status === 400 && errorMsg.includes("Foto")) {
                const isMezzoError = errorMsg.includes("Mezzo");
                setValidationError({
                    title: isMezzoError ? "Manca la Foto del Mezzo!" : "Manca la Foto del Tablet!",
                    message: isMezzoError
                        ? "Non puoi completare il check senza aver scattato la foto del mezzo.\n\nAssicurati che il mezzo sia visibile per intero."
                        : "Non puoi completare il check senza aver scattato la foto del tablet.\n\nAssicurati che il tablet sia visibile e funzionante."
                });
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        const isChecked = !!checkedVehicles[v.id];

        if (filter === 'todo') return !isChecked;
        if (filter === 'completed') return isChecked;

        return true; // 'all'
    });

    // Group by type
    const grouped = filteredVehicles.reduce((acc, v) => {
        const type = v.vehicle_type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(v);
        return acc;
    }, {});

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">Caricamento Flotta...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 overflow-hidden shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between relative">
                    <div className="relative z-10">
                        <h1 className="text-xl font-black text-slate-900 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-sm text-white">
                                <ShieldCheck size={20} />
                            </div>
                            PARCO MEZZI
                        </h1>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                            Controllo & Gestione • SL Enterprise
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setActiveView('checklist')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'checklist' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2"><ClipboardCheck size={14} /> Check-In</span>
                        </button>
                        {canManageFleet && (
                            <button
                                onClick={() => setActiveView('management')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'management' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <span className="flex items-center gap-2"><Settings size={14} /> Gestione</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 mt-12">
                <AnimatePresence mode='wait'>
                    {activeView === 'checklist' ? (
                        <>
                            {step === 1 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                                    key="step1"
                                    className="space-y-12"
                                >
                                    <div className="flex flex-col gap-6 mb-8">
                                        {/* Shift Banner */}
                                        <div className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm ${shiftInfo.available
                                            ? shiftInfo.shift === 'morning'
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-indigo-50 border-indigo-200'
                                            : 'bg-slate-100 border-slate-200'
                                            }`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${shiftInfo.available
                                                ? shiftInfo.shift === 'morning'
                                                    ? 'bg-amber-100 text-amber-600'
                                                    : 'bg-indigo-100 text-indigo-600'
                                                : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                {shiftInfo.shift === 'morning' ? '☀️' : shiftInfo.shift === 'evening' ? '🌙' : '⏸️'}
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                                    {shiftInfo.available ? shiftInfo.label : 'Fuori Turno'}
                                                </h4>
                                                {shiftInfo.message && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{shiftInfo.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Counter */}
                                        {shiftInfo.available && (
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200 shrink-0">
                                                        <ClipboardCheck size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-slate-900 font-black uppercase text-xs tracking-widest leading-tight">Avanzamento Turno</h4>
                                                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Mezzi Controllati</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                                        {Object.keys(checkedVehicles).length} <span className="text-slate-400 text-sm">/ {vehicles.length}</span>
                                                    </span>
                                                    <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(Object.keys(checkedVehicles).length / vehicles.length) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                                        {[
                                            { id: 'all', label: 'Tutti' },
                                            { id: 'todo', label: 'Da Fare' },
                                            { id: 'completed', label: 'Completati' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    if (opt.id === 'all') { setHideCompleted(false); }
                                                    else if (opt.id === 'todo') { setHideCompleted(true); }
                                                    else if (opt.id === 'completed') { setHideCompleted(false); }

                                                    setFilter(opt.id);
                                                }}
                                                className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                                                        ${filter === opt.id
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {!shiftInfo.available ? (
                                        /* ── Blocked State ── */
                                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                                            <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-bold text-sm">{shiftInfo.message || 'Nessun check disponibile'}</p>
                                            <p className="text-slate-400 text-xs mt-2">I check sono attivi dalle 06:00 alle 12:30 e dalle 14:00 alle 21:30</p>
                                        </div>
                                    ) : Object.entries(grouped).length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                                            <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-medium">Nessun mezzo disponibile al momento.</p>
                                        </div>
                                    ) : (
                                        Object.entries(grouped).map(([type, list]) => (
                                            <section key={type} className="mb-6">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] whitespace-nowrap">
                                                        {type}
                                                    </h3>
                                                    <div className="h-px w-full bg-blue-100"></div>
                                                </div>

                                                {/* ── Compact Mobile List ── */}
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                                                    {list.map(v => {
                                                        const checkInfo = checkedVehicles[v.id] || checkedVehicles[String(v.id)];
                                                        const isChecked = !!checkInfo;
                                                        const operatorName = checkInfo?.operator;
                                                        const checkTime = checkInfo?.time;
                                                        const vTabletStatus = checkInfo?.tabletStatus;

                                                        const isMitsubishi = v.brand?.toLowerCase().includes('mitsubishi');
                                                        const accentColor = isMitsubishi ? 'emerald' : 'amber';

                                                        return (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => handleSelectVehicle(v)}
                                                                disabled={isChecked}
                                                                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-all
                                                                    ${isChecked
                                                                        ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                                                                        : `hover:bg-${accentColor}-50 active:bg-${accentColor}-100 cursor-pointer`
                                                                    }`}
                                                            >
                                                                {/* Vehicle Number */}
                                                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${isChecked
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                    : `bg-${accentColor}-50 text-${accentColor}-700 border-${accentColor}-200`
                                                                    }`}>
                                                                    {isChecked ? <CheckCircle2 size={20} /> : v.internal_code}
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-grow min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                                            {v.brand || 'N/D'} {v.internal_code}
                                                                        </span>
                                                                        {/* Tablet Status */}
                                                                        {isChecked && vTabletStatus === 'broken' && (
                                                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">TABLET KO</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 truncate">
                                                                        {isChecked
                                                                            ? `${operatorName} • ${checkTime || ''}`
                                                                            : v.assigned_operator || v.model || type
                                                                        }
                                                                    </div>
                                                                </div>

                                                                {/* Action Indicator */}
                                                                <div className="flex-shrink-0">
                                                                    {isChecked ? (
                                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">FATTO</span>
                                                                    ) : (
                                                                        <ArrowRight size={16} className={`text-${accentColor}-400`} />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {step === 2 && selectedVehicle && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    key="step2"
                                >
                                    {/* Checklist Header */}
                                    <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm mb-10 overflow-hidden relative">

                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-sm">
                                                    <ForkliftIcon className="w-10 h-10" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1">{selectedVehicle.brand}</div>
                                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{selectedVehicle.internal_code}</h2>
                                                    <p className="text-slate-400 text-xs font-bold mt-2 flex items-center gap-2 uppercase tracking-widest">
                                                        <User size={12} className="text-blue-600" /> {user.full_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setStep(1)}
                                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                                            >
                                                Cambia Mezzo
                                            </button>
                                        </div>

                                        {/* Progress Visual */}
                                        <div className="mt-10">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avanzamento Controlli</span>
                                                <span className={`text-xs font-black p-1 px-3 rounded-full ${getProgress().percent === 100 ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                                    {getProgress().answered} / {getProgress().total}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${getProgress().percent}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${getProgress().percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checklist Content */}
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest pl-2 border-l-4 border-blue-500 mb-6">
                                        Controlli
                                    </h3>

                                    {/* Tablet Check Section */}
                                    <div id="tablet-check-section" className="bg-white border border-slate-200 rounded-[32px] p-6 mb-8 group hover:border-blue-300 transition-all shadow-sm">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-200">
                                                <Tablet size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-wider">Controllo Tablet</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Verifica integrità dispositivo di bordo</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Status Selection */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stato Tablet</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => setTabletStatus('ok')}
                                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border cursor-pointer ${tabletStatus === 'ok'
                                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        <CheckCircle2 size={24} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setTabletStatus('broken')}
                                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border cursor-pointer ${tabletStatus === 'broken'
                                                            ? 'bg-red-50 border-red-500 text-red-500'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        <AlertTriangle size={24} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Problema</span>
                                                    </button>
                                                </div>

                                                {tabletStatus === 'broken' && (
                                                    <motion.textarea
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        value={tabletNote}
                                                        onChange={(e) => setTabletNote(e.target.value)}
                                                        placeholder="Descrivi il problema del tablet..."
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm focus:outline-none focus:border-red-400 min-h-[80px]"
                                                    />
                                                )}
                                            </div>

                                            {/* Photo Upload */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                                                    <span>Foto Tablet (Obbligatoria)</span>
                                                    {tabletPhoto && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Caricata</span>}
                                                </label>

                                                <div className="relative group/photo">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        onChange={handlePhotoCapture}
                                                        className="hidden"
                                                        id="tablet-photo-input"
                                                    />

                                                    {photoPreview ? (
                                                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img src={photoPreview} alt="Tablet Preview" className="w-full h-full object-cover opacity-80" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setTabletPhoto(null);
                                                                        setPhotoPreview(null);
                                                                    }}
                                                                    className="p-3 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label
                                                            htmlFor="tablet-photo-input"
                                                            className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-slate-400 hover:text-blue-500"
                                                        >
                                                            <div className="p-4 rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                                <Camera size={32} />
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="block text-xs font-black uppercase tracking-widest">Scatta Foto</span>
                                                                <span className="text-[10px] opacity-60">Tocca qui per aprire la fotocamera</span>
                                                            </div>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vehicle Photo Section */}
                                    <div id="vehicle-photo-section" className="bg-white border border-slate-200 rounded-[32px] p-6 mb-8 group hover:border-emerald-300 transition-all shadow-sm">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                                                <Car size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-wider">Foto Mezzo Completa</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Scatta una foto del mezzo per intero (obbligatoria)</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                                                <span>Foto Mezzo (Obbligatoria)</span>
                                                {vehiclePhoto && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Caricata</span>}
                                            </label>

                                            <div className="relative group/vphoto">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleVehiclePhotoCapture}
                                                    className="hidden"
                                                    id="vehicle-photo-input"
                                                />

                                                {vehiclePhotoPreview ? (
                                                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                                                        <img src={vehiclePhotoPreview} alt="Vehicle Preview" className="w-full h-full object-cover opacity-80" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/vphoto:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setVehiclePhoto(null);
                                                                    setVehiclePhotoPreview(null);
                                                                }}
                                                                className="p-3 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label
                                                        htmlFor="vehicle-photo-input"
                                                        className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-slate-400 hover:text-emerald-500"
                                                    >
                                                        <div className="p-4 rounded-full bg-slate-100 group-hover:bg-emerald-100 transition-colors">
                                                            <Camera size={32} />
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="block text-xs font-black uppercase tracking-widest">Scatta Foto Mezzo</span>
                                                            <span className="text-[10px] opacity-60">Inquadra il mezzo per intero</span>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {CHECKS.map((item, idx) => {
                                            const val = checks[item.key];
                                            const isKO = val === false || (typeof val === 'object' && val.status === false);
                                            const isOK = val === true;

                                            return (
                                                <motion.div
                                                    id={`check-item-${item.key}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    key={item.key}
                                                    className={`group flex items-center justify-between p-3 md:p-6 rounded-[20px] md:rounded-[28px] border transition-all duration-300 
                                                        ${isOK ? 'bg-emerald-50 border-emerald-200' :
                                                            isKO ? 'bg-red-50 border-red-200' :
                                                                'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1 mr-2 md:mr-4">
                                                        <span className="text-slate-300 font-black text-xs md:text-sm italic w-4 shrink-0">{idx + 1}</span>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-slate-900 font-bold tracking-tight text-sm md:text-lg leading-tight">{item.label}</span>
                                                            {isKO && (
                                                                <div className="flex items-center gap-2 mt-2 text-red-400">
                                                                    <AlertTriangle size={12} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                                                        {typeof val === 'object' && val.note ? val.note : "Segnalazione Anomalia"}
                                                                    </span>
                                                                    {typeof val === 'object' && val.photo && (
                                                                        <span className="flex items-center gap-1 text-[10px] bg-red-100 px-2 py-0.5 rounded text-red-500">
                                                                            <Camera size={10} /> Foto
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 md:gap-3 shrink-0">
                                                        <button
                                                            onClick={() => handleCheck(item.key, true)}
                                                            className={`px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all cursor-pointer
                                                                ${isOK
                                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                                    : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'}`}
                                                        >
                                                            OK
                                                        </button>
                                                        <button
                                                            onClick={() => handleCheck(item.key, false)}
                                                            className={`px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all cursor-pointer
                                                                ${isKO
                                                                    ? 'bg-red-500 text-white shadow-sm'
                                                                    : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200'}`}
                                                        >
                                                            KO
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-12 flex flex-col md:flex-row items-center gap-6 p-2">
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center md:text-left flex-1 max-w-sm">
                                            Cliccando su invia, confermi che i dati inseriti sono veritieri e che il mezzo è in stato di {Object.values(checks).every(v => v === true) ? 'Sicurezza' : 'Allerta'}.
                                        </p>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className={`w-full md:w-auto px-12 py-5 rounded-[32px] font-black text-base uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-sm active:scale-95 cursor-pointer
                                                ${submitting ? 'bg-slate-200 text-slate-400 grayscale' :
                                                    'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                        >
                                            {submitting ? 'Elaborazione...' : (
                                                <>
                                                    Invia Check In <ClipboardCheck size={20} />
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Issue Reporting Modal */}
                                    <StandardModal
                                        isOpen={!!reportingIssue}
                                        onClose={cancelIssue}
                                        title="Segnala Problema"
                                    >
                                        {reportingIssue && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-slate-900 font-bold text-lg mb-2">{reportingIssue.label}</h4>
                                                    <p className="text-slate-500 text-xs">Descrivi il problema riscontrato ed eventualmente allega una foto.</p>
                                                </div>

                                                {/* Note Input */}
                                                <div>
                                                    <label className="text-[10px] font-black pointer-events-none text-slate-500 uppercase tracking-widest block mb-1">
                                                        Descrizione Guasto *
                                                    </label>
                                                    <textarea
                                                        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-400 transition-all resize-none"
                                                        placeholder="Es. Forca piegata, Tubo perde olio..."
                                                        value={reportingIssue.note}
                                                        onChange={(e) => setReportingIssue(prev => ({ ...prev, note: e.target.value }))}
                                                        autoFocus
                                                    />
                                                </div>

                                                {/* Photo Input */}
                                                <div>
                                                    <label className="text-[10px] font-black pointer-events-none text-slate-500 uppercase tracking-widest block mb-2">
                                                        Foto Guasto (Opzionale)
                                                    </label>
                                                    <div className="flex items-start gap-4">
                                                        <label className="flex-1 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group">
                                                            <Camera className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                                            <span className="text-[10px] text-slate-400">Scatta / Carica</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                capture="environment"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files[0];
                                                                    if (file) {
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => {
                                                                            setReportingIssue(prev => ({
                                                                                ...prev,
                                                                                photo: file,
                                                                                photoPreview: reader.result
                                                                            }));
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>

                                                        {reportingIssue.photoPreview && (
                                                            <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden relative group">
                                                                <img src={reportingIssue.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                                <button
                                                                    onClick={() => setReportingIssue(prev => ({ ...prev, photo: null, photoPreview: null }))}
                                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-4">
                                                    <button
                                                        onClick={cancelIssue}
                                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                                                    >
                                                        Annulla
                                                    </button>
                                                    <button
                                                        onClick={confirmIssue}
                                                        className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        Conferma Guasto
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </StandardModal>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center"
                                >
                                    <div className="relative mb-10">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full"></div>
                                        <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
                                            <CheckCircle2 size={56} />
                                        </div>
                                    </div>

                                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">CHECK REGISTRATO!</h2>
                                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto mb-12">
                                        Il rapporto è stato archiviato correttamente. Grazie per garantire la sicurezza del turno.
                                    </p>

                                    <div className="flex flex-col gap-4 w-full max-w-md items-center">
                                        <button
                                            onClick={() => { setStep(1); setSelectedVehicle(null); }}
                                            className="w-full h-16 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[28px] font-black uppercase tracking-widest transition-all border border-slate-200 active:scale-95 cursor-pointer"
                                        >
                                            Nuovo Check
                                        </button>
                                        {(user?.permissions?.includes('view_checklist_history') || user?.permissions?.includes('*')) && (
                                            <button
                                                onClick={() => navigate("/production/checklist/history")}
                                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[28px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                                            >
                                                Storico <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            key="management"
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-900 tracking-widest uppercase">Anagrafica Flotta</h2>
                                <button
                                    onClick={openAddModal}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 cursor-pointer"
                                >
                                    <Plus size={18} /> Aggiungi Mezzo
                                </button>
                            </div>

                            <div className="space-y-4">
                                {vehicles.map(v => (
                                    <div key={v.id} className="bg-white border border-slate-200 p-6 rounded-[32px] flex items-center justify-between group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-200 group-hover:bg-indigo-100 transition-all">
                                                <ForkliftIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{v.internal_code}</span>
                                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-500 font-bold uppercase border border-slate-200">{v.vehicle_type}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
                                                    {v.brand} {v.model}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(v)} className="p-3 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all border border-slate-200 cursor-pointer"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeleteVehicle(v.id)} className="p-3 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-200 cursor-pointer"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >

            {/* Vehicle Selection Confirmation Modal */}
            <StandardModal
                isOpen={!!confirmVehicle}
                onClose={() => setConfirmVehicle(null)}
                title="Conferma Selezione"
            >
                <div className="space-y-6">
                    <p className="text-slate-400 text-sm">
                        Stai iniziando il check-in per il mezzo:
                    </p>
                    {confirmVehicle && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-200">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{confirmVehicle.internal_code}</h3>
                                <p className="text-[10px] uppercase tracking-widest text-slate-400">{confirmVehicle.brand} {confirmVehicle.model}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setConfirmVehicle(null)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={confirmSelection}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            Conferma e Inizia
                        </button>
                    </div>
                </div>
            </StandardModal>

            {/* Vehicle Editor Modal */}
            <StandardModal
                isOpen={showVehicleModal}
                onClose={() => setShowVehicleModal(false)}
                title={vehicleToEdit ? "Modifica Mezzo" : "Nuovo Mezzo"}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Codice Interno</label>
                            <input
                                type="text"
                                value={vehicleForm.internal_code}
                                onChange={e => setVehicleForm({ ...vehicleForm, internal_code: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-indigo-400 transition-all"
                                placeholder="E.g. 29"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                            <select
                                value={vehicleForm.vehicle_type}
                                onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-indigo-400 transition-all"
                            >
                                <option value="forklift">Muletto</option>
                                <option value="retractable">Retrattile</option>
                                <option value="transpallet">Transpallet</option>
                                <option value="ple">PLE</option>
                                <option value="truck">Camion</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Marca</label>
                            <input
                                type="text"
                                value={vehicleForm.brand}
                                onChange={e => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-indigo-400 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modello</label>
                            <input
                                type="text"
                                value={vehicleForm.model}
                                onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-indigo-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <input
                            type="checkbox"
                            checked={vehicleForm.is_4_0}
                            onChange={e => setVehicleForm({ ...vehicleForm, is_4_0: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 bg-white"
                        />
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Industria 4.0</label>
                    </div>

                    <div className="pt-6 border-t border-slate-200 flex gap-4">
                        <button
                            onClick={() => setShowVehicleModal(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSaveVehicle}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            Salva Mezzo
                        </button>
                    </div>
                </div>
            </StandardModal>
            {/* Validation Error Modal */}
            <StandardModal
                isOpen={!!validationError}
                onClose={() => setValidationError(null)}
                title={validationError?.title || "Attenzione"}
            >
                <div className="flex flex-col items-center text-center p-6 space-y-6">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                        <Camera size={48} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        {validationError?.message}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        Scatta subito una foto per procedere con l'archiviazione.
                    </p>

                    <button
                        onClick={() => setValidationError(null)}
                        className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        Ho capito, vado a farla
                    </button>
                </div>
            </StandardModal>
        </div >
    );
}
