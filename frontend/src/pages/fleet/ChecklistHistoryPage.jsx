import { useState, useEffect, useMemo } from 'react';

const API_HOST = `${window.location.protocol}//${window.location.hostname}:8000`;
import { fleetApi, tasksApi } from '../../api/client';
import { useUI, StandardModal } from '../../components/ui/CustomUI';
import { useAuth } from '../../context/AuthContext';
import { format, addDays, subDays, startOfDay, isToday as isDateToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    User,
    Clock,
    Car,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Filter,
    Search,
    Camera,
    Maximize2
} from 'lucide-react';
import StylishCalendar from '../../components/ui/StylishCalendar';
import { isValid } from 'date-fns';

const safeFormat = (date, fmt, options = {}) => {
    const d = new Date(date);
    return isValid(d) ? format(d, fmt, options) : 'Data non valida';
};

export default function ChecklistHistoryPage() {
    const { toast } = useUI();
    const [checklists, setChecklists] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Filters
    const [filterVehicle, setFilterVehicle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail Modal
    const [selectedChecklist, setSelectedChecklist] = useState(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const [historyData, vehiclesData] = await Promise.all([
                fleetApi.getChecklists({ date: formattedDate, limit: 1000 }),
                fleetApi.getVehicles()
            ]);

            setChecklists(historyData);
            setVehicles(vehiclesData);
        } catch (err) {
            console.error(err);
            toast.error("Errore caricamento storico");
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
    const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

    const filteredChecklists = useMemo(() => {
        return checklists.filter(chk => {
            const vehicle = vehicles.find(v => v.id === chk.vehicle_id);
            const matchesVehicle = !filterVehicle || chk.vehicle_id.toString() === filterVehicle;
            const matchesSearch = !searchQuery ||
                vehicle?.internal_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                chk.operator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesVehicle && matchesSearch;
        });
    }, [checklists, filterVehicle, searchQuery, vehicles]);

    const findVehicle = (id) => vehicles.find(v => v.id === id);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-20">
            {/* Header / Navigation */}
            <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/30">
                            <Car size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-widest leading-none">
                                STORICO CHECK
                            </h1>
                            <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                Mezzi & Carrelli • Enterprise
                            </p>
                        </div>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-[24px] border border-white/10 shadow-inner">
                        <button
                            onClick={handlePrevDay}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white group active:scale-95"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); }}
                                className="flex items-center gap-3 px-8 py-3 bg-blue-600/10 hover:bg-blue-600/20 rounded-[20px] transition-all border border-blue-500/10 group overflow-hidden"
                            >
                                <CalendarIcon size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                                <span className="font-black text-white min-w-[160px] text-center tracking-tight">
                                    {isDateToday(selectedDate) ? "OGGI" : format(selectedDate, 'EEEE d MMMM', { locale: it }).toUpperCase()}
                                </span>
                            </button>

                            {showCalendar && (
                                <StylishCalendar
                                    selectedDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                    isOpen={showCalendar}
                                    onClose={() => setShowCalendar(false)}
                                />
                            )}
                        </div>

                        <button
                            onClick={handleNextDay}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white group active:scale-95"
                        >
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-12">
                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-12">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca mezzo o operatore..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-[24px] py-4 pl-14 pr-6 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-bold placeholder:text-slate-600 tracking-tight"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                            <select
                                value={filterVehicle}
                                onChange={(e) => setFilterVehicle(e.target.value)}
                                className="bg-slate-900/50 border border-white/5 rounded-[24px] pl-14 pr-10 py-4 text-slate-300 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer hover:bg-slate-800/80 tracking-tight"
                            >
                                <option value="">TUTTI I MEZZI</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.internal_code} - {v.brand}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => { setSelectedDate(new Date()); setFilterVehicle(''); setSearchQuery(''); }}
                            className="px-6 bg-slate-900/50 border border-white/5 rounded-[24px] text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-black text-xs tracking-widest flex items-center gap-2 uppercase"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-72 bg-slate-900/50 rounded-[40px] border border-white/5 animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredChecklists.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-40 bg-slate-900/20 rounded-[60px] border border-dashed border-white/5"
                    >
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-8 relative">
                            <CalendarIcon size={48} className="text-slate-700" />
                            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-4 border-[#0f172a] flex items-center justify-center font-bold text-xs text-white">!</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 tracking-tight">NESSUNA REGISTRAZIONE</h3>
                        <p className="text-slate-600 mt-2 font-medium">Non ci sono check archiviati per questa data.</p>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                        >
                            TORNA A OGGI
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredChecklists.map((chk, index) => (
                                <ChecklistCard
                                    key={chk.id}
                                    checklist={chk}
                                    vehicle={findVehicle(chk.vehicle_id)}
                                    index={index}
                                    onClick={() => setSelectedChecklist(chk)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {selectedChecklist && (
                <ChecklistDetailModal
                    checklist={selectedChecklist}
                    vehicle={findVehicle(selectedChecklist.vehicle_id)}
                    onClose={() => setSelectedChecklist(null)}
                    StandardModal={StandardModal}
                    onRefresh={loadData}
                />
            )}
        </div>
    );
}

function ChecklistCard({ checklist, vehicle, index, onClick }) {
    const isWarning = checklist.status === 'warning';
    const isResolved = checklist.status === 'resolved';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: index * 0.05
            }}
            onClick={onClick}
            className="group relative cursor-pointer h-full"
        >
            {/* Background Glow */}
            <div className={`
                absolute inset-0 rounded-[40px] transition-all duration-700 blur-2xl opacity-0 group-hover:opacity-30
                ${isWarning ? 'bg-red-500' : isResolved ? 'bg-amber-500' : 'bg-emerald-500'}
            `}></div>

            <div className="relative h-full bg-[#1e293b]/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 hover:border-white/20 transition-all duration-500 flex flex-col justify-between group-hover:bg-[#1e293b]/60 group-hover:-translate-y-2">

                <div>
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-5">
                            <div className={`
                                w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-110 transition-transform duration-500
                                ${isWarning ? 'bg-red-500/10 text-red-500' : isResolved ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}
                            `}>
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Car size={36} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white leading-none group-hover:text-blue-400 transition-colors tracking-tight">
                                    {vehicle?.internal_code || 'N/A'}
                                </h3>
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mt-1 opacity-70">
                                    {vehicle?.brand || 'Generic'} • {vehicle?.vehicle_type}
                                </p>
                            </div>
                        </div>

                        <div className={`
                            px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border
                            ${isWarning ? 'bg-red-500 text-white border-red-500/20 shadow-lg shadow-red-500/20' : isResolved ? 'bg-amber-500 text-black border-amber-500/20 shadow-lg shadow-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                        `}>
                            {isWarning ? 'DANGER' : isResolved ? 'FIXED' : 'SAFE'}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-blue-300 transition-colors">
                                    <User size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Operatore</span>
                                    <span className="text-white font-bold tracking-tight">
                                        {checklist.operator ? (checklist.operator.full_name || checklist.operator.username) : 'Sconosciuto'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 text-slate-400 font-black text-lg">
                                    <Clock size={16} className="text-slate-500" />
                                    {safeFormat(checklist.timestamp, 'HH:mm')}
                                </div>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Check-in Time</span>
                            </div>
                        </div>

                        {/* Note Preview */}
                        {(isWarning || checklist.notes) && (
                            <div className={`
                                rounded-3xl p-5 border transition-all duration-300
                                ${isWarning ? 'bg-red-500/5 border-red-500/10' : 'bg-white/5 border-white/5'}
                            `}>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={14} className={isWarning ? 'text-red-500' : 'text-slate-500'} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isWarning ? 'text-red-500' : 'text-slate-500'}`}>
                                        OSSERVAZIONI
                                    </span>
                                </div>
                                <p className="text-slate-300 text-sm font-medium italic leading-relaxed line-clamp-2">
                                    "{checklist.notes || "Nessuna nota."}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between group/action">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover/action:text-blue-400 transition-colors">Vedi Rapporto</span>
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center group-hover/action:bg-blue-600 transition-all shadow-lg group-hover/action:shadow-blue-600/30">
                        <ExternalLink size={20} className="text-slate-400 group-hover/action:text-white" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function ChecklistDetailModal({ checklist, vehicle, onClose, StandardModal, onRefresh }) {
    const { user } = useAuth();
    const { toast, showConfirm } = useUI();

    const isWarning = checklist.status === 'warning';
    const isResolved = checklist.status === 'resolved';

    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [resolutionNote, setResolutionNote] = useState("");

    const handleResolveClick = () => {
        setResolutionNote("");
        setShowResolutionModal(true);
    };

    const confirmResolve = async () => {
        if (!resolutionNote.trim()) {
            toast.error("Inserisci una nota per procedere.");
            return;
        }

        try {
            await fleetApi.resolveChecklist(checklist.id, resolutionNote);
            toast.success("Segnalazione archiviata come RISOLTA.");
            onRefresh();
            setShowResolutionModal(false);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Errore processo.");
        }
    };

    const handleCreateTask = async () => {
        const confirmed = await showConfirm({
            title: "Creare Task Manutenzione?",
            message: "Verrà generato un ticket automatico nella Task Board con tutti i dettagli delle anomalie.",
            confirmText: "Genera Task",
            type: "info"
        });
        if (!confirmed) return;

        try {
            const failedItems = Object.entries(checklist.checklist_data || {})
                .filter(([_, val]) => {
                    if (val === false) return true;
                    if (typeof val === 'object' && val.status === false) return true;
                    return false;
                })
                .map(([key, _]) => ({ text: `RIPARARE: ${key.replace(/_/g, ' ').toUpperCase()}`, done: false }));

            const description = `🚩 ANOMALIA MEZZO: ${vehicle?.internal_code}\n` +
                `👤 Segnalato da: ${checklist.operator?.full_name || checklist.operator?.username}\n` +
                `📝 Note: ${checklist.notes || 'Nessuna'}\n\n` +
                `--- GENERATO DA SISTEMA CONTROLLO FLOTTA ---`;

            const payload = {
                title: `🛠️ RIPARAZIONE ${vehicle?.internal_code} (${failedItems.length} FIX)`,
                description: description,
                priority: 9,
                assigned_to: user?.id,
                checklist: failedItems,
                category: "Manutenzione",
                tags: ["flotta", "auto_fix"]
            };

            await tasksApi.createTask(payload);
            toast.success("Task creato correttamente!");
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Errore creazione Task");
        }
    };

    return (
        <StandardModal
            title={`ISPEZIONE TECNICA - ${vehicle?.internal_code || 'MEZZO'}`}
            isOpen={true}
            onClose={onClose}
        >
            <div className="space-y-10 py-4 max-w-xl mx-auto">
                {/* Hero Status */}
                <div className={`p-10 rounded-[48px] flex flex-col items-center text-center gap-6 relative overflow-hidden ${isWarning ? 'bg-red-500/10' : isResolved ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                    <div className={`
                        w-24 h-24 rounded-[32px] flex items-center justify-center text-5xl shadow-2xl z-10
                        ${isWarning ? 'bg-red-500 text-white shadow-red-500/40' : isResolved ? 'bg-amber-500 text-black shadow-amber-500/40' : 'bg-emerald-500 text-white shadow-emerald-500/40'}
                    `}>
                        {isWarning ? <AlertTriangle size={48} /> : <CheckCircle2 size={48} />}
                    </div>
                    <div className="z-10">
                        <h4 className={`text-3xl font-black uppercase tracking-tight ${isWarning ? 'text-red-400' : isResolved ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {isWarning ? 'Stato: CRITICO' : isResolved ? 'Stato: RIPRISTINATO' : 'Stato: OPERATIVO'}
                        </h4>
                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">
                            Ispezione completata alle {safeFormat(checklist.timestamp, 'HH:mm')}
                        </p>
                    </div>
                </div>

                {/* Details Sections */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Operatore</span>
                        <p className="text-white font-black text-lg">{checklist.operator?.full_name || 'N/A'}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 text-right">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Data</span>
                        <p className="text-white font-black text-lg">{safeFormat(checklist.timestamp, 'dd MMM yyyy', { locale: it })}</p>
                    </div>
                </div>

                {/* Notes & Evidence */}
                {(checklist.notes || isWarning || checklist.tablet_photo_url) && (
                    <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-inner">
                        {(checklist.notes || isWarning) && (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Rapporto Operatore</h5>
                                </div>
                                <p className="text-white text-xl font-medium leading-relaxed italic">
                                    "{checklist.notes || "L'operatore non ha inserito note specifiche."}"
                                </p>
                            </>
                        )}

                        {/* Tablet Photo */}
                        {checklist.tablet_photo_url && (
                            <div className={`${(checklist.notes || isWarning) ? "mt-8 pt-6 border-t border-white/5" : ""}`}>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 flex items-center gap-2">
                                    <Camera size={14} /> Foto Tablet
                                </span>
                                <div className="rounded-2xl overflow-hidden border border-white/10 relative group">
                                    <img
                                        src={`${API_HOST}${checklist.tablet_photo_url}`}
                                        alt="Foto Tablet"
                                        className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                                        onClick={() => window.open(`${API_HOST}${checklist.tablet_photo_url}`, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <span className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                            <Maximize2 size={14} /> Clicca per ingrandire
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Resolution */}
                {isResolved && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-500/10 p-8 rounded-[40px] border border-emerald-500/20"
                    >
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Intervento di Risoluzione</h5>
                        <p className="text-emerald-200 text-xl font-medium leading-relaxed italic">
                            "{checklist.resolution_notes}"
                        </p>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-500/40 uppercase">Certificato da Admin</span>
                            <span className="text-[11px] font-mono font-bold text-emerald-500/60">{format(new Date(checklist.resolved_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                    </motion.div>
                )}

                {/* Technical Checklist (Enhanced) */}
                <div>
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Analisi Tecnica</h5>
                        <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-3 py-1 rounded-full">{Object.keys(checklist.checklist_data || {}).length} Punti Controllati</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                        {Object.entries(checklist.checklist_data || {}).map(([key, val]) => {
                            const isIssue = val === false || (typeof val === 'object' && val.status === false);
                            const issueData = typeof val === 'object' ? val : null;

                            return (
                                <div key={key} className={`
                                    flex flex-col bg-white/5 px-6 py-5 rounded-[24px] border transition-colors
                                    ${isIssue ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 hover:bg-white/10'}
                                `}>
                                    <div className="flex justify-between items-center w-full">
                                        <span className={`font-bold capitalize text-sm ${isIssue ? 'text-red-300' : 'text-slate-400'}`}>
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        {isIssue ? (
                                            <AlertTriangle size={20} className="text-red-500" />
                                        ) : (
                                            <CheckCircle2 size={20} className="text-emerald-500" />
                                        )}
                                    </div>

                                    {/* Issue Details (Note & Photo) */}
                                    {isIssue && issueData && (
                                        <div className="mt-4 pt-4 border-t border-red-500/10">
                                            {issueData.note && (
                                                <p className="text-red-200/80 text-sm italic mb-4">
                                                    "{issueData.note}"
                                                </p>
                                            )}

                                            {issueData.photo_url && (
                                                <div className="relative group rounded-xl overflow-hidden border border-red-500/20 bg-black/20 w-full sm:w-1/2">
                                                    <img
                                                        src={`${API_HOST}${issueData.photo_url}`}
                                                        alt="Dettaglio Problema"
                                                        className="w-full h-40 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        onClick={() => window.open(`${API_HOST}${issueData.photo_url}`, '_blank')}
                                                    >
                                                        <Maximize2 size={20} className="text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Critical Actions */}
                {isWarning && !isResolved && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                        <button
                            onClick={handleResolveClick}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white h-20 rounded-[32px] font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 group"
                        >
                            <CheckCircle2 size={28} className="group-hover:rotate-12 transition-transform" /> Risolvi
                        </button>
                        <button
                            onClick={handleCreateTask}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white h-20 rounded-[32px] font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 group"
                        >
                            <ExternalLink size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Task
                        </button>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full h-16 bg-white/5 hover:bg-white/10 text-slate-400 rounded-[32px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 mt-4"
                >
                    Chiudi Rapporto
                </button>
            </div>

            {/* Custom Resolution Modal */}
            <StandardModal
                isOpen={showResolutionModal}
                onClose={() => setShowResolutionModal(false)}
                title="RISOLUZIONE SEGNALAZIONE"
            >
                <div className="p-6">
                    <p className="text-slate-400 mb-4 font-bold text-sm">Descrivi l'intervento effettuato per risolvere le anomalie:</p>
                    <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px]"
                        placeholder="Esempio: Sostituita lampadina posteriore destra e rabboccato olio..."
                    />
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={() => setShowResolutionModal(false)}
                            className="flex-1 py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            ANNULLA
                        </button>
                        <button
                            onClick={confirmResolve}
                            className="flex-1 py-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            CONFERMA RISOLUZIONE
                        </button>
                    </div>
                </div>
            </StandardModal>
        </StandardModal>
    );
}
