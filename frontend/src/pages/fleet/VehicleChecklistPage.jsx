import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fleetApi } from '../../api/client';
import { useUI, StandardModal } from '../../components/ui/CustomUI';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
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

    // Feature: Disable checked vehicles
    const [checkedVehicles, setCheckedVehicles] = useState({}); // { vehicle_id: operator_name }

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
            const today = format(new Date(), 'yyyy-MM-dd');
            const [vData, chkData] = await Promise.all([
                fleetApi.getVehicles({ status: 'operational' }),
                fleetApi.getChecklists({ date: today })
            ]);

            setVehicles(vData);

            const checkedMap = {};
            chkData.forEach(chk => {
                const opName = chk.operator ? (chk.operator.full_name || chk.operator.username) : `Operatore #${chk.operator_id}`;
                checkedMap[chk.vehicle_id] = {
                    operator: opName,
                    tabletStatus: chk.tablet_status || 'ok' // Default to ok if missing (legacy)
                };
            });
            setCheckedVehicles(checkedMap);

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

            setConfirmVehicle(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTabletPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
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
                issuePhotos
            });
            await loadData();
            setStep(3);
            toast.success("Checklist inviata correttamente!");
            // Reset Wizard
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || "Errore invio checklist";

            // Check for Photo Error to show Modal
            if (err.response?.status === 400 && errorMsg.includes("Foto")) {
                setValidationError({
                    title: "Manca la Foto del Tablet!",
                    message: "Non puoi completare il check senza aver scattato la foto del tablet.\n\nAssicurati che il tablet sia visibile e funzionante."
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
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Caricamento Flotta...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 overflow-hidden">
                <div className="max-w-4xl mx-auto flex items-center justify-between relative">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-600/10 blur-[80px] rounded-full"></div>

                    <div className="relative z-10">
                        <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 text-white">
                                <ShieldCheck size={20} />
                            </div>
                            PARCO MEZZI
                        </h1>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                            Controllo & Gestione • SL Enterprise
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setActiveView('checklist')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'checklist' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <span className="flex items-center gap-2"><ClipboardCheck size={14} /> Check-In</span>
                        </button>
                        {canManageFleet && (
                            <button
                                onClick={() => setActiveView('management')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'management' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
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
                                        {/* Progress Counter */}
                                        <div className="flex items-center justify-between bg-[#1e293b]/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                    <ClipboardCheck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black uppercase text-sm tracking-widest">Avanzamento Turno</h4>
                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Mezzi Controllati</p>
                                                </div>
                                            </div>
                                            <div className="flex items-end flex-col">
                                                <span className="text-2xl font-black text-white tracking-tighter">
                                                    {Object.keys(checkedVehicles).length} <span className="text-slate-500 text-sm">/ {vehicles.length}</span>
                                                </span>
                                                <div className="w-32 h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-1">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(Object.keys(checkedVehicles).length / vehicles.length) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="flex flex-wrap gap-4 bg-[#1e293b]/50 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
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
                                                    else if (opt.id === 'completed') { setHideCompleted(false); /* Logic to hide todo? Need separate state or just reuse hideCompleted logic properly */ }

                                                    // Simplify logic: Use a single filter state for these 3 modes
                                                    setFilter(opt.id);
                                                }}
                                                className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                        ${filter === opt.id
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                        : 'bg-transparent text-slate-500 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {Object.entries(grouped).length === 0 ? (
                                        <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                                            <Truck size={48} className="mx-auto text-slate-600 mb-4" />
                                            <p className="text-slate-400 font-medium">Nessun mezzo disponibile al momento.</p>
                                        </div>
                                    ) : (
                                        Object.entries(grouped).map(([type, list]) => (
                                            <section key={type}>
                                                <div className="flex items-center gap-4 mb-6">
                                                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                                        {type}
                                                    </h3>
                                                    <div className="h-px w-full bg-blue-500/10"></div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {list.map(v => {
                                                        const checkInfo = checkedVehicles[v.id];
                                                        const isChecked = !!checkInfo;
                                                        const operatorName = checkInfo?.operator;
                                                        const tabletStatus = checkInfo?.tabletStatus;

                                                        const isMitsubishi = v.brand?.toLowerCase().includes('mitsubishi');

                                                        return (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => handleSelectVehicle(v)}
                                                                disabled={isChecked}
                                                                className={`group relative h-48 rounded-[32px] text-left transition-all duration-300 border overflow-hidden p-6 flex flex-col justify-between
                                                                    ${isChecked
                                                                        ? 'bg-slate-900/30 border-white/5 opacity-50 cursor-not-allowed'
                                                                        : isMitsubishi
                                                                            ? 'bg-[#1e293b]/40 backdrop-blur-xl border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-900/10 active:scale-95'
                                                                            : 'bg-[#1e293b]/40 backdrop-blur-xl border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-900/10 active:scale-95'
                                                                    }`}
                                                            >
                                                                {/* Realistic Technical Drawing Background */}
                                                                <div className={`absolute -right-4 bottom-0 w-48 h-48 opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20 pointer-events-none
                                                                    ${isMitsubishi ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                                        <path d="M60 160V170H40V160H60ZM60 160H80V120H40V160H60Z" fill="currentColor" />
                                                                        <path d="M120 50V170H100V50H120ZM140 170H180C191 170 200 161 200 150V90L150 60H140V170ZM150 80L185 100V160H140V80H150Z" fill="currentColor" />
                                                                        <path d="M80 170H100V50H80V170Z" fill="currentColor" />
                                                                        <path d="M220 170H200V150H220V170Z" fill="currentColor" />
                                                                        <circle cx="90" cy="180" r="15" fill="currentColor" />
                                                                        <circle cx="170" cy="180" r="15" fill="currentColor" />
                                                                        {/* Mast details */}
                                                                        <rect x="85" y="60" width="5" height="100" fill="currentColor" opacity="0.5" />
                                                                        <rect x="115" y="60" width="5" height="100" fill="currentColor" opacity="0.5" />
                                                                        <path d="M80 60H120V65H80V60Z" fill="currentColor" />
                                                                        <path d="M80 160H120V165H80V160Z" fill="currentColor" />
                                                                        {/* Forks */}
                                                                        <path d="M10 165H80V170H10V165Z" fill="currentColor" />
                                                                        <path d="M10 165V155L20 155V165H10Z" fill="currentColor" />
                                                                    </svg>
                                                                </div>

                                                                {/* Decorator Light Blur */}
                                                                <div className={`absolute -top-10 -right-10 w-40 h-40 blur-3xl rounded-full transition-colors pointer-events-none
                                                                    ${isMitsubishi ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-amber-500/10 group-hover:bg-amber-500/20'}`}>
                                                                </div>

                                                                <div className="relative z-10 w-full">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 opacity-70">{v.brand}</div>
                                                                            <div className={`text-4xl font-black text-white transition-colors tracking-tighter ${isMitsubishi ? 'group-hover:text-emerald-400' : 'group-hover:text-amber-400'}`}>
                                                                                {v.internal_code}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className={`p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm self-end ${isMitsubishi ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                                <ForkliftIcon className="w-6 h-6" />
                                                                            </div>
                                                                            {/* Tablet Status Icon */}
                                                                            <div className={`p-1.5 rounded-lg border border-white/5 backdrop-blur-sm self-end flex items-center justify-center transition-colors
                                                                                ${isChecked
                                                                                    ? (tabletStatus === 'broken' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30')
                                                                                    : 'bg-white/5 text-slate-600'}`}
                                                                                title={`Tablet: ${isChecked ? (tabletStatus === 'broken' ? 'Problema Segnalato' : 'OK') : 'Da Verificare'}`}
                                                                            >
                                                                                {isChecked && tabletStatus === 'broken' ? <AlertTriangle size={14} /> : <Tablet size={14} />}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {isChecked ? (
                                                                        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                                                                                <CheckCircle2 size={12} /> COMPLETATO
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 font-bold truncate">
                                                                                Operatore: {operatorName}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`mt-8 flex items-center gap-2 transition-transform group-hover:translate-x-1 ${isMitsubishi ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Seleziona</span>
                                                                            <ArrowRight size={14} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        )
                                        ))}
                                </motion.div>
                            )}

                            {step === 2 && selectedVehicle && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    key="step2"
                                >
                                    {/* Checklist Header */}
                                    <div className="bg-[#1e293b]/50 backdrop-blur-2xl rounded-[40px] p-8 border border-white/5 shadow-2xl mb-10 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                                                    <ForkliftIcon className="w-10 h-10" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">{selectedVehicle.brand}</div>
                                                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{selectedVehicle.internal_code}</h2>
                                                    <p className="text-slate-500 text-xs font-bold mt-2 flex items-center gap-2 uppercase tracking-widest">
                                                        <User size={12} className="text-blue-400" /> {user.full_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setStep(1)}
                                                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/5 transition-all active:scale-95"
                                            >
                                                Cambia Mezzo
                                            </button>
                                        </div>

                                        {/* Progress Visual */}
                                        <div className="mt-10">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avanzamento Controlli</span>
                                                <span className={`text-xs font-black p-1 px-3 rounded-full ${getProgress().percent === 100 ? 'bg-emerald-500 text-white' : 'bg-blue-600/20 text-blue-400'}`}>
                                                    {getProgress().answered} / {getProgress().total}
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${getProgress().percent}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${getProgress().percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checklist Content */}
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest pl-2 border-l-4 border-blue-500 mb-6">
                                        Controlli
                                    </h3>

                                    {/* Tablet Check Section */}
                                    <div id="tablet-check-section" className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 mb-8 group hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                <Tablet size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-white uppercase tracking-wider">Controllo Tablet</h4>
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
                                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${tabletStatus === 'ok'
                                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                            : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-slate-800'}`}
                                                    >
                                                        <CheckCircle2 size={24} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setTabletStatus('broken')}
                                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${tabletStatus === 'broken'
                                                            ? 'bg-red-500/10 border-red-500 text-red-400'
                                                            : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-slate-800'}`}
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
                                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-red-500/50 min-h-[80px]"
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
                                                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 bg-black">
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
                                                            className="w-full h-48 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-slate-500 hover:text-blue-400"
                                                        >
                                                            <div className="p-4 rounded-full bg-slate-800 group-hover:bg-blue-500/20 transition-colors">
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
                                                    className={`group flex items-center justify-between p-6 rounded-[28px] border transition-all duration-300 
                                                        ${isOK ? 'bg-emerald-500/5 border-emerald-500/20' :
                                                            isKO ? 'bg-red-500/5 border-red-500/20' :
                                                                'bg-[#1e293b]/30 border-white/5 hover:bg-[#1e293b]/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-slate-600 font-black text-sm italic w-4">{idx + 1}</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold tracking-tight text-lg">{item.label}</span>
                                                            {isKO && (
                                                                <div className="flex items-center gap-2 mt-2 text-red-400">
                                                                    <AlertTriangle size={12} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                                                        {typeof val === 'object' && val.note ? val.note : "Segnalazione Anomalia"}
                                                                    </span>
                                                                    {typeof val === 'object' && val.photo && (
                                                                        <span className="flex items-center gap-1 text-[10px] bg-red-400/10 px-2 py-0.5 rounded text-red-300">
                                                                            <Camera size={10} /> Foto
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => handleCheck(item.key, true)}
                                                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                                                ${isOK
                                                                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                                                                    : 'bg-white/5 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                                                        >
                                                            OK
                                                        </button>
                                                        <button
                                                            onClick={() => handleCheck(item.key, false)}
                                                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                                                ${isKO
                                                                    ? 'bg-red-500 text-white shadow-xl shadow-red-500/20'
                                                                    : 'bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-400'}`}
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
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center md:text-left flex-1 max-w-sm">
                                            Cliccando su invia, confermi che i dati inseriti sono veritieri e che il mezzo è in stato di {Object.values(checks).every(v => v === true) ? 'Sicurezza' : 'Allerta'}.
                                        </p>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className={`w-full md:w-auto px-12 py-5 rounded-[32px] font-black text-base uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95
                                                ${submitting ? 'bg-slate-800 text-slate-600 grayscale' :
                                                    'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
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
                                                    <h4 className="text-white font-bold text-lg mb-2">{reportingIssue.label}</h4>
                                                    <p className="text-slate-400 text-xs">Descrivi il problema riscontrato ed eventualmente allega una foto.</p>
                                                </div>

                                                {/* Note Input */}
                                                <div>
                                                    <label className="text-[10px] font-black pointer-events-none text-slate-500 uppercase tracking-widest block mb-1">
                                                        Descrizione Guasto *
                                                    </label>
                                                    <textarea
                                                        className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-all resize-none"
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
                                                        <label className="flex-1 h-24 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group">
                                                            <Camera className="text-slate-500 group-hover:text-white transition-colors" />
                                                            <span className="text-[10px] text-slate-500">Scatta / Carica</span>
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
                                                            <div className="w-24 h-24 rounded-xl border border-white/10 overflow-hidden relative group">
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
                                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                                                    >
                                                        Annulla
                                                    </button>
                                                    <button
                                                        onClick={confirmIssue}
                                                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
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

                                    <h2 className="text-4xl font-black text-white tracking-tight mb-4">CHECK REGISTRATO!</h2>
                                    <p className="text-slate-400 font-medium text-lg max-w-sm mx-auto mb-12">
                                        Il rapporto è stato archiviato correttamente. Grazie per garantire la sicurezza del turno.
                                    </p>

                                    <div className="flex flex-col gap-4 w-full max-w-md items-center">
                                        <button
                                            onClick={() => { setStep(1); setSelectedVehicle(null); }}
                                            className="w-full h-16 bg-white/5 hover:bg-white/10 text-slate-300 rounded-[28px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                                        >
                                            Nuovo Check
                                        </button>
                                        {(user?.permissions?.includes('view_checklist_history') || user?.permissions?.includes('*')) && (
                                            <button
                                                onClick={() => navigate("/production/checklist/history")}
                                                className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-[28px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
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
                                <h2 className="text-xl font-black text-white tracking-widest uppercase">Anagrafica Flotta</h2>
                                <button
                                    onClick={openAddModal}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                                >
                                    <Plus size={18} /> Aggiungi Mezzo
                                </button>
                            </div>

                            <div className="space-y-4">
                                {vehicles.map(v => (
                                    <div key={v.id} className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] flex items-center justify-between group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600/20 transition-all">
                                                <ForkliftIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-white tracking-tighter">{v.internal_code}</span>
                                                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-slate-400 font-bold uppercase">{v.vehicle_type}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">
                                                    {v.brand} {v.model}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(v)} className="p-3 bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeleteVehicle(v.id)} className="p-3 bg-white/5 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-xl transition-all"><Trash2 size={18} /></button>
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
                        <div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">{confirmVehicle.internal_code}</h3>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">{confirmVehicle.brand} {confirmVehicle.model}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setConfirmVehicle(null)}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={confirmSelection}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
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
                                className="w-full bg-[#0f172a] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                placeholder="E.g. 29"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                            <select
                                value={vehicleForm.vehicle_type}
                                onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                                className="w-full bg-[#0f172a] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
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
                                className="w-full bg-[#0f172a] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modello</label>
                            <input
                                type="text"
                                value={vehicleForm.model}
                                onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                                className="w-full bg-[#0f172a] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <input
                            type="checkbox"
                            checked={vehicleForm.is_4_0}
                            onChange={e => setVehicleForm({ ...vehicleForm, is_4_0: e.target.checked })}
                            className="w-5 h-5 rounded border-white/10 bg-[#0f172a]"
                        />
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Industria 4.0</label>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex gap-4">
                        <button
                            onClick={() => setShowVehicleModal(false)}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSaveVehicle}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
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
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {validationError?.message}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        Scatta subito una foto per procedere con l'archiviazione.
                    </p>

                    <button
                        onClick={() => setValidationError(null)}
                        className="w-full h-16 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/30 transition-all active:scale-95"
                    >
                        Ho capito, vado a farla
                    </button>
                </div>
            </StandardModal>
        </div >
    );
}
