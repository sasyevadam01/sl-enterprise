import { useState, useEffect } from 'react';
import { mobileApi, maintenanceApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';
import { format } from 'date-fns';

// 1. Loading Screen
const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
        <h2 className="text-xl font-bold animate-pulse">Caricamento...</h2>
    </div>
);

// 2. NO SHIFT ERROR SCREEN - Shows coordinator contact
const NoShiftScreen = ({ coordinatorNames, onLogout }) => (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-4">
            Attenzione: non esiste alcun turno assegnato
        </h1>
        <p className="text-gray-300 mb-6 max-w-md">
            Non risulta nessun turno programmato per te oggi in questo orario.
        </p>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-md">
            <p className="text-gray-400 mb-2">Contatta:</p>
            <p className="text-xl font-bold text-blue-400">
                {coordinatorNames?.join(' / ') || 'Il tuo coordinatore'}
            </p>
            <p className="text-lg font-bold text-blue-400 mt-1">
                o Laezza Salvatore
            </p>
        </div>
        <div className="flex gap-4 mt-8">
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
                🔄 Ricarica
            </button>
            <button
                onClick={onLogout}
                className="px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
            >
                🚪 Esci
            </button>
        </div>
    </div>
);

// 3. Crew Check-in with Presente/Assente options
const CrewCheckIn = ({ machine, leader, suggestedCrew, onConfirm }) => {
    const [crew, setCrew] = useState(
        (suggestedCrew || []).map(c => ({ ...c, status: 'present' }))
    );

    const setStatus = (memberId, status) => {
        setCrew(prev => prev.map(m =>
            m.id === memberId ? { ...m, status } : m
        ));
    };

    const confirmCheckIn = async () => {
        const crewStatus = crew.map(m => ({
            employee_id: m.id,
            status: m.status
        }));
        onConfirm(crewStatus);
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const statusColors = {
        present: 'bg-green-600 border-green-500',
        absent_replaced: 'bg-yellow-600 border-yellow-500',
        absent_alone: 'bg-red-600 border-red-500'
    };

    return (
        <div className="p-6 bg-slate-900 min-h-screen text-white flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-blue-400">
                    {machine?.role_name || 'Postazione'}
                </h1>
                <p className="text-gray-400">Conferma la squadra di oggi</p>
            </div>

            <div className="flex-1 space-y-4">
                {/* Leader (Self) */}
                <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                        {getInitials(leader?.full_name || leader?.username)}
                    </div>
                    <div>
                        <p className="font-bold text-lg">{leader?.full_name || leader?.username || 'Tu'}</p>
                        <p className="text-xs text-blue-300">Capo Macchina (Tu)</p>
                    </div>
                    <div className="ml-auto text-green-400 text-2xl">✓</div>
                </div>

                {/* Crew Members with status buttons */}
                {crew.map(member => (
                    <div key={member.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold">
                                {getInitials(member.name)}
                            </div>
                            <div>
                                <p className="font-bold text-lg">{member.name}</p>
                                <p className="text-xs text-gray-400">{member.role}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setStatus(member.id, 'present')}
                                className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 ${member.status === 'present'
                                    ? statusColors.present + ' text-white'
                                    : 'bg-slate-700 border-slate-600 text-gray-400'
                                    }`}
                            >
                                ✅ Presente
                            </button>
                            <button
                                onClick={() => setStatus(member.id, 'absent_replaced')}
                                className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 ${member.status === 'absent_replaced'
                                    ? statusColors.absent_replaced + ' text-white'
                                    : 'bg-slate-700 border-slate-600 text-gray-400'
                                    }`}
                            >
                                🔄 Sostituito
                            </button>
                            <button
                                onClick={() => setStatus(member.id, 'absent_alone')}
                                className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 ${member.status === 'absent_alone'
                                    ? statusColors.absent_alone + ' text-white'
                                    : 'bg-slate-700 border-slate-600 text-gray-400'
                                    }`}
                            >
                                👤 Solo
                            </button>
                        </div>
                    </div>
                ))}

                {crew.length === 0 && (
                    <div className="p-6 bg-slate-800/50 rounded-xl text-center text-gray-400">
                        <p>Nessun collega assegnato alla postazione.</p>
                        <p className="text-sm mt-2">Lavorerai da solo oggi.</p>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <button
                    onClick={confirmCheckIn}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-2xl shadow-lg active:scale-95 transition"
                >
                    CONFERMA E INIZIA 🚀
                </button>
            </div>
        </div>
    );
};

// 4. Downtime Reason Modal (Updated to pass full object)
const DowntimeReasonModal = ({ reasons, onSelect, onCancel }) => {
    const [selectedReason, setSelectedReason] = useState(null);
    const [notes, setNotes] = useState('');

    const handleConfirm = () => {
        if (!selectedReason) return;
        onSelect(selectedReason, notes); // Pass full object
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Seleziona Causale Fermo</h2>
                </div>

                <div className="p-4 space-y-2">
                    {reasons.map(reason => (
                        <button
                            key={reason.id}
                            onClick={() => setSelectedReason(reason)}
                            className={`w-full p-4 rounded-xl text-left transition-all border-2 ${selectedReason?.id === reason.id
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-gray-300 hover:border-blue-500'
                                }`}
                        >
                            <span className="font-bold">{reason.label}</span>
                            <span className="text-xs ml-2 opacity-60">({reason.category})</span>
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-700">
                    <label className="block text-sm text-gray-400 mb-2">Note (opzionale)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Dettagli aggiuntivi..."
                        className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 outline-none resize-none"
                        rows={3}
                    />
                </div>

                <div className="p-4 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedReason}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedReason
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-slate-600 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
    );
};

// 4.1 Maintenance Prompt Modal (New)
const MaintenancePromptModal = ({ onYes, onNo }) => (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border-2 border-red-500 animate-pulse">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔧</span>
                </div>
                <h2 className="text-xl font-bold text-white">Segnalare Guasto?</h2>
                <p className="text-gray-300 text-sm mt-2">
                    Hai selezionato un fermo tecnico. Vuoi inviare una richiesta immediata alla manutenzione?
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onNo}
                    className="py-4 rounded-xl bg-slate-700 text-gray-300 font-bold"
                >
                    No, solo Fermo
                </button>
                <button
                    onClick={onYes}
                    className="py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                    SÌ, CHIAMA 🆘
                </button>
            </div>
        </div>
    </div>
);

// 4.2 Maintenance Report Modal (New)
const MaintenanceReportModal = ({ priority, category, initialDescription, onConfirm, onCancel }) => {
    const [description, setDescription] = useState(initialDescription || '');
    const [subType, setSubType] = useState(category || 'mechanical');

    const types = [
        { id: 'mechanical', label: 'Meccanico', icon: '⚙️' },
        { id: 'electrical', label: 'Elettrico', icon: '⚡' },
        { id: 'material', label: 'Materiale', icon: '📦' },
        { id: 'other', label: 'Altro', icon: '❓' }
    ];

    const handleSubmit = () => {
        onConfirm({
            problem_type: subType,
            priority: priority,
            description: description
        });
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-orange-500/30">
                <div className={`p-6 border-b ${priority === 'high' ? 'bg-red-900/40 border-red-500/50' : 'border-slate-700'}`}>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🔧</span>
                        {priority === 'high' ? 'GUASTO BLOCCANTE' : 'Segnalazione Manutenzione'}
                    </h2>
                    {priority === 'high' && <p className="text-red-300 text-sm mt-1">Verrà attivata la sirena di emergenza</p>}
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Tipo Problema</label>
                        <div className="grid grid-cols-2 gap-2">
                            {types.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSubType(t.id)}
                                    className={`p-3 rounded-lg text-left flex items-center gap-2 border ${subType === t.id
                                        ? 'bg-blue-600 border-blue-400 text-white'
                                        : 'bg-slate-700 border-slate-600 text-gray-400'
                                        }`}
                                >
                                    <span>{t.icon}</span>
                                    <span className="font-bold text-sm">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Dettagli / Note</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrivi cosa succede..."
                            className="w-full p-4 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 outline-none h-32"
                        />
                    </div>
                </div>

                <div className="p-4 flex gap-3 border-t border-slate-700">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold">
                        Annulla
                    </button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold">
                        INVIA SEGNALAZIONE 🚀
                    </button>
                </div>
            </div>
        </div>
    );
};

// 5. Production Input Modal (Mobile-optimized)
const ProductionInputModal = ({ onConfirm, onCancel, currentTotal }) => {
    const [quantity, setQuantity] = useState('');

    const handleNumpad = (num) => {
        if (num === 'C') {
            setQuantity('');
        } else if (num === 'DEL') {
            setQuantity(prev => prev.slice(0, -1));
        } else {
            setQuantity(prev => prev + num);
        }
    };

    const handleSubmit = () => {
        const qty = parseInt(quantity);
        if (!qty || qty <= 0) return;
        onConfirm(qty);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 text-center border-b border-white/10">
                <h2 className="text-xl font-bold text-white">📝 Inserisci Produzione</h2>
                <p className="text-gray-400 text-sm mt-1">Totale attuale: {currentTotal} pz</p>
            </div>

            {/* Display */}
            <div className="p-6 flex-shrink-0">
                <div className="bg-slate-800 rounded-2xl p-6 text-center border-2 border-blue-500/50">
                    <p className="text-gray-400 text-xs mb-2">PEZZI DA AGGIUNGERE</p>
                    <p className="text-5xl font-mono font-bold text-white">
                        {quantity || '0'}
                    </p>
                </div>
            </div>

            {/* Numpad */}
            <div className="flex-1 p-4 grid grid-cols-3 gap-3 max-w-sm mx-auto w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumpad(num)}
                        className={`aspect-square rounded-2xl text-2xl font-bold transition-all active:scale-95
                            ${num === 'C' ? 'bg-red-600 text-white' :
                                num === 'DEL' ? 'bg-yellow-600 text-white' :
                                    'bg-slate-700 text-white hover:bg-slate-600'}`}
                    >
                        {num === 'DEL' ? '⌫' : num}
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/10">
                <button
                    onClick={onCancel}
                    className="py-4 rounded-xl bg-slate-700 text-white font-bold text-lg"
                >
                    ❌ Annulla
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!quantity || parseInt(quantity) <= 0}
                    className={`py-4 rounded-xl font-bold text-lg transition-all
                        ${quantity && parseInt(quantity) > 0
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-600 text-gray-500'}`}
                >
                    ✅ Conferma
                </button>
            </div>
        </div>
    );
};

// 6. Success Confirmation Modal
const SuccessModal = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm w-full border border-green-500/50">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Operazione Completata!</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <button
                onClick={onClose}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-xl"
            >
                OK
            </button>
        </div>
    </div>
);

// 8. Close Shift Confirmation Modal
const CloseShiftModal = ({ producedTotal, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-orange-500/50">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏁</span>
                </div>
                <h2 className="text-xl font-bold text-white">Chiudi Turno</h2>
                <p className="text-gray-400 text-sm mt-2">Stai per terminare il turno di lavoro.</p>
            </div>

            <div className="bg-slate-700 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Produzione registrata:</span>
                    <span className="text-2xl font-bold text-green-400">{producedTotal} pz</span>
                </div>
            </div>

            <p className="text-center text-yellow-400 text-sm mb-6">
                ⚠️ Dopo la chiusura non potrai più inserire dati per questo turno.
            </p>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onCancel}
                    className="py-4 rounded-xl bg-slate-700 text-white font-bold"
                >
                    ❌ Annulla
                </button>
                <button
                    onClick={onConfirm}
                    className="py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                    ✅ Conferma
                </button>
            </div>
        </div>
    </div>
);

// 9. Shift Closed Screen
const ShiftClosedScreen = ({ producedTotal, onLogout }) => (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-green-400 mb-4">
            Turno Completato!
        </h1>
        <p className="text-gray-300 mb-6">
            Grazie per il tuo lavoro oggi.
        </p>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
            <p className="text-gray-400 text-sm mb-1">Produzione totale:</p>
            <p className="text-4xl font-bold text-green-400">{producedTotal} pz</p>
        </div>
        <p className="text-gray-500 text-sm mb-6">
            Puoi chiudere l'app o attendere il prossimo turno.
        </p>
        <button
            onClick={onLogout}
            className="px-8 py-4 bg-red-700 hover:bg-red-600 rounded-xl text-lg font-bold transition-colors"
        >
            🚪 Esci dall'App
        </button>
    </div>
);

// 10. Main Dashboard (Working Mode)
const WorkflowDashboard = ({ machineInfo, shiftAssignmentId, onShiftClosed }) => {
    const { toast } = useUI();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isStopped, setIsStopped] = useState(false);
    const [producedToday, setProducedToday] = useState(0);

    // Modals State
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [showMaintenancePrompt, setShowMaintenancePrompt] = useState(false);
    const [showMaintenanceReport, setShowMaintenanceReport] = useState(false);
    const [showProductionModal, setShowProductionModal] = useState(false);
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    // Data State
    const [downtimeReasons, setDowntimeReasons] = useState([]);
    const [pendingReason, setPendingReason] = useState(null); // Reason selected at start
    const [maintenanceData, setMaintenanceData] = useState(null); // Data for report

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        loadStatus();
        loadReasons();
        const p = setInterval(loadStatus, 30000);
        return () => {
            clearInterval(t);
            clearInterval(p);
        };
    }, []);

    const loadStatus = async () => {
        try {
            const status = await mobileApi.getStatus();
            setProducedToday(status.pieces_produced);
            setIsStopped(status.machine_status === 'stopped');
        } catch (err) {
            console.error("Failed to load status", err);
        }
    };

    const loadReasons = async () => {
        try {
            const reasons = await mobileApi.getDowntimeReasons();
            setDowntimeReasons(reasons);
        } catch (err) {
            console.error("Failed to load reasons", err);
        }
    };

    // --- Workflow Handlers ---

    const handleToggle = () => {
        if (isStopped) {
            // RESUME WORK
            handleResumeWork();
        } else {
            // STOP MACHINE
            handleStopMachine();
        }
    };

    const handleStopMachine = async () => {
        try {
            const res = await mobileApi.startDowntime();
            if (res.machine_status === 'stopped') {
                setIsStopped(true);
                setPendingReason(null); // Reset pending reason
                setShowReasonModal(true); // Ask reason IMMEDIATELY
                toast.warning("MACCHINA FERMATA - Seleziona Causale");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Errore avvio fermo");
        }
    };

    const handleReasonSelected = (reason, notes) => {
        setPendingReason({ ...reason, notes });
        setShowReasonModal(false);

        // Check if Breakdown -> Ask Maintenance
        // Assuming 'technical' category or label containing 'Guasto' implies breakdown
        if (reason.category === 'technical' || reason.label.toLowerCase().includes('guasto')) {
            setMaintenanceData({
                priority: 'high',
                category: reason.label.toLowerCase().includes('elettrico') ? 'electrical' : 'mechanical',
                description: notes
            });
            setShowMaintenancePrompt(true);
        }
    };

    const handleResumeWork = async () => {
        try {
            // Use pending reason or fallback
            const reasonLabel = pendingReason?.label || "Ripresa Lavoro";
            const reasonNotes = pendingReason?.notes || "";

            const res = await mobileApi.stopDowntime(reasonLabel, reasonNotes);
            setIsStopped(false);
            setSuccessMessage(`Fermo registrato: ${res.duration_minutes} min - ${reasonLabel}`);
        } catch (error) {
            console.error(error);
            toast.error("Errore ripresa lavoro");
        }
    };

    // --- Maintenance Handlers ---

    const handleMaintenancePrompt = (response) => {
        setShowMaintenancePrompt(false);
        if (response === 'yes') {
            setShowMaintenanceReport(true);
        }
        // If no, just stay stopped with pendingReason set
    };

    const handleReportMaintenance = async (reportData) => {
        try {
            await maintenanceApi.report({
                ...reportData,
                shift_assignment_id: shiftAssignmentId,
                machine_id: machineInfo?.requirement_id,
            });
            setShowMaintenanceReport(false);
            setSuccessMessage("Segnalazione Inviata! 🚀");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Errore invio segnalazione");
        }
    };

    const openManualReport = () => {
        setMaintenanceData({
            priority: 'medium',
            category: 'technical',
            description: ''
        });
        setShowMaintenanceReport(true);
    };

    // --- Other Handlers ---

    const handleAddProduction = async (qty) => {
        try {
            const res = await mobileApi.updateProduction(qty);
            setProducedToday(res.new_total);
            setShowProductionModal(false);
            setSuccessMessage(`Aggiunti ${qty} pezzi! Totale: ${res.new_total} pz`);
        } catch (error) {
            console.error(error);
            toast.error("Errore salvataggio produzione");
        }
    };

    const handleCloseShift = async () => {
        try {
            await mobileApi.closeShift(shiftAssignmentId);
            setShowCloseShiftModal(false);
            onShiftClosed(producedToday);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Errore chiusura turno");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
            {/* Header with Close Shift Button */}
            <div className="p-4 flex justify-between items-start z-10">
                <div>
                    <h2 className="text-xs text-gray-400 uppercase tracking-widest">Postazione</h2>
                    <h1 className="text-xl font-bold text-blue-400">
                        {machineInfo?.role_name || 'Unknown'}
                    </h1>
                    <p className="text-xs text-gray-500">{machineInfo?.banchina}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <p className="text-2xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
                        <p className="text-xs text-gray-500">{format(currentTime, 'dd/MM/yyyy')}</p>
                    </div>
                    <button
                        onClick={() => setShowCloseShiftModal(true)}
                        disabled={isStopped}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isStopped
                            ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-500 text-white'
                            }`}
                    >
                        🏁 CHIUDI TURNO
                    </button>
                </div>
            </div>

            {/* BIG STATUS BUTTON */}
            <div className={`flex-1 flex items-center justify-center z-10 p-6 transition-colors duration-500 ${isStopped ? 'bg-red-900/20' : ''}`}>
                <button
                    onClick={handleToggle}
                    className={`w-full max-w-sm aspect-square rounded-full border-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center active:scale-95 transition-all duration-300
                        ${isStopped
                            ? 'bg-green-600 border-green-800 shadow-green-900/50 hover:bg-green-500'
                            : 'bg-red-600 border-red-900 shadow-red-900/50 hover:bg-red-500'
                        }`}
                >
                    <span className="text-6xl mb-2">{isStopped ? '▶️' : '🛑'}</span>
                    <span className="text-3xl font-black tracking-wider uppercase">
                        {isStopped ? 'RIPRENDI' : 'FERMO'}
                    </span>
                    {isStopped && <span className="text-sm font-bold mt-2 animate-pulse">MACCHINA FERMA</span>}
                </button>
            </div>

            {/* Footer Stats & Actions */}
            <div className="bg-slate-900 p-6 border-t border-white/10 z-10">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl text-center relative">
                        <p className="text-gray-400 text-xs uppercase">Prod. Odierna</p>
                        <p className="text-2xl font-bold text-green-400">{producedToday} pz</p>
                        {/* Maintenance Button (Small) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); openManualReport(); }}
                            className="absolute -top-6 -right-4 w-20 h-20 bg-orange-600 hover:bg-orange-500 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-slate-900 active:scale-95 transition-all z-20"
                        >
                            <span className="text-3xl">🔧</span>
                            <span className="text-[10px] font-bold mt-1">GUASTO</span>
                        </button>
                    </div>
                    <button
                        onClick={() => setShowProductionModal(true)}
                        disabled={isStopped}
                        className={`p-4 rounded-xl font-bold text-lg transition-all ${isStopped
                            ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white'}`}
                    >
                        📝 INSERISCI
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showReasonModal && (
                <DowntimeReasonModal
                    reasons={downtimeReasons}
                    onSelect={handleReasonSelected}
                    onCancel={() => setShowReasonModal(false)}
                />
            )}

            {showMaintenancePrompt && (
                <MaintenancePromptModal
                    onYes={() => handleMaintenancePrompt('yes')}
                    onNo={() => handleMaintenancePrompt('no')}
                />
            )}

            {showMaintenanceReport && (
                <MaintenanceReportModal
                    priority={maintenanceData?.priority}
                    category={maintenanceData?.category}
                    initialDescription={maintenanceData?.description}
                    onConfirm={handleReportMaintenance}
                    onCancel={() => setShowMaintenanceReport(false)}
                />
            )}

            {showProductionModal && (
                <ProductionInputModal
                    currentTotal={producedToday}
                    onConfirm={handleAddProduction}
                    onCancel={() => setShowProductionModal(false)}
                />
            )}

            {showCloseShiftModal && (
                <CloseShiftModal
                    producedTotal={producedToday}
                    onConfirm={handleCloseShift}
                    onCancel={() => setShowCloseShiftModal(false)}
                />
            )}

            {successMessage && (
                <SuccessModal
                    message={successMessage}
                    onClose={() => setSuccessMessage(null)}
                />
            )}
        </div>
    );
};

// --- MAIN PAGE CONTAINER ---
export default function OperatorDashboard() {
    const { user } = useAuth();
    const { toast } = useUI();

    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState('loading');
    const [assignment, setAssignment] = useState(null);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [closedProduction, setClosedProduction] = useState(0);

    useEffect(() => {
        if (user) {
            loadAssignment();
        }
    }, [user]);

    const loadAssignment = async () => {
        try {
            setLoading(true);
            const data = await mobileApi.getMyAssignment();
            setAssignment(data);

            if (data.assignment_source === 'none') {
                // Strict Mode: No shift assigned
                setStep('no_shift');
            } else if (data.assignment_source === 'explicit') {
                setSelectedMachine(data.machine_info);

                // Session persistence checks
                if (data.is_closed) {
                    // Shift was already closed - show completed screen
                    setStep('shift_closed');
                } else if (data.is_checked_in) {
                    // Already checked in - skip crew check, go to dashboard
                    setStep('dashboard');
                } else {
                    // First time - need crew confirmation
                    setStep('crew_check');
                }
            }
        } catch (error) {
            console.error(error);
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCrew = async (crewStatus) => {
        try {
            setLoading(true);
            // Pass shift_assignment_id for session persistence
            await mobileApi.confirmCrew(crewStatus, assignment?.shift_assignment_id);
            await mobileApi.checkIn({
                requirement_id: selectedMachine?.requirement_id || 0,
                confirmed_crew_ids: crewStatus.filter(c => c.status === 'present').map(c => c.employee_id)
            });
            setStep('dashboard');
            toast.success("Turno Iniziato!");
        } catch (error) {
            console.error(error);
            toast.error("Errore durante il check-in");
        } finally {
            setLoading(false);
        }
    };


    const handleShiftClosed = (producedTotal) => {
        setClosedProduction(producedTotal);
        setStep('shift_closed');
        toast.success("Turno chiuso con successo!");
    };

    if (loading) return <LoadingScreen />;

    if (step === 'no_shift') {
        return <NoShiftScreen coordinatorNames={assignment?.coordinator_names} onLogout={logout} />;
    }

    if (step === 'error') {
        return (
            <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-2">Errore di Connessione</h2>
                <p className="text-gray-300 mb-6">Impossibile contattare il server.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-slate-700 rounded-lg"
                >
                    Ricarica
                </button>
            </div>
        );
    }

    if (step === 'crew_check') {
        return (
            <CrewCheckIn
                machine={selectedMachine || { role_name: 'Postazione' }}
                leader={user}
                suggestedCrew={assignment?.crew || []}
                onConfirm={handleConfirmCrew}
            />
        );
    }

    if (step === 'dashboard') {
        return (
            <WorkflowDashboard
                machineInfo={selectedMachine}
                shiftAssignmentId={assignment?.shift_assignment_id}
                onShiftClosed={handleShiftClosed}
            />
        );
    }

    if (step === 'shift_closed') {
        return <ShiftClosedScreen producedTotal={closedProduction} onLogout={logout} />;
    }

    return <LoadingScreen />;
}
