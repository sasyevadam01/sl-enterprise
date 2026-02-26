/**
 * CheckList Web v2.0 — Controllo giornaliero clienti per coordinatori.
 * Desktop-first, sub-checklist nelle note, righe espandibili, progress badge.
 * Features: Heatmap calendar, Voice notes, Enter-to-next, Live polling.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { checklistWebApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
    ClipboardCheck, Calendar, Download, Play, Search,
    Filter, CheckCircle2, XCircle, Edit3, Trash2, Clock,
    Plus, ChevronDown, ChevronRight, Check, ListChecks, AlertCircle,
    Mic, MicOff, HelpCircle, ChevronLeft
} from 'lucide-react';
import './ChecklistWebPage.css';

// ── Helpers ──

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function getTodayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Parse la nota e separa sub-item da testo libero. */
function parseNote(nota) {
    if (!nota) return { subItems: [], freeLines: [], raw: '' };
    const lines = nota.split('\n');
    const subItems = [];
    const freeLines = [];
    for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
            subItems.push({ text: trimmed.slice(4), done: true });
        } else if (trimmed.startsWith('[ ] ')) {
            subItems.push({ text: trimmed.slice(4), done: false });
        } else if (trimmed.length > 0) {
            freeLines.push(trimmed);
        }
    }
    return { subItems, freeLines, raw: nota };
}

/** Ricostruisce la nota da sub-items e testo libero. */
function buildNote(subItems, freeLines) {
    const parts = [];
    for (const item of subItems) {
        parts.push(item.done ? `[x] ${item.text}` : `[ ] ${item.text}`);
    }
    for (const line of freeLines) {
        parts.push(line);
    }
    return parts.join('\n') || null;
}

/** Conta i sub-item aperti in una nota. */
function countOpenItems(nota) {
    if (!nota) return 0;
    const { subItems } = parseNote(nota);
    return subItems.filter(i => !i.done).length;
}

/** Iniziali dell'operatore per l'avatar. */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}


// ── Main Component ──

export default function ChecklistWebPage() {
    const [entries, setEntries] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getTodayISO());
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);
    const [showOpenNotesOnly, setShowOpenNotesOnly] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteValue, setEditingNoteValue] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [quickAddText, setQuickAddText] = useState('');
    const [checkAnimations, setCheckAnimations] = useState({});
    const [heatmapData, setHeatmapData] = useState({});
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const quickAddRef = useRef(null);
    const recognitionRef = useRef(null);

    // ── Load Data ──
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await checklistWebApi.getByDate(selectedDate);
            setEntries(data || []);
        } catch (err) {
            console.error('ChecklistWeb load error:', err);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Live Polling (30s) — silenzioso, senza loader ──
    useEffect(() => {
        const interval = setInterval(async () => {
            if (editingNoteId) return; // non sovrascrivere mentre si edita
            try {
                const data = await checklistWebApi.getByDate(selectedDate);
                if (data) setEntries(data);
            } catch { /* silenzioso */ }
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedDate, editingNoteId]);

    // ── Init Day ──
    const handleInitDay = async () => {
        setInitializing(true);
        try {
            const result = await checklistWebApi.initDay(selectedDate);
            toast.success(result.message || 'Giornata inizializzata!');
            setEntries(result.entries || []);
        } catch (err) {
            const msg = err.response?.data?.detail || 'Errore inizializzazione';
            toast.error(msg);
        } finally {
            setInitializing(false);
        }
    };

    // ── Toggle Main Check (with animation) ──
    const handleToggleCheck = async (entry, e) => {
        if (e) e.stopPropagation();
        const newChecked = !entry.checked;
        const animClass = newChecked ? 'just-checked' : 'just-unchecked';

        setCheckAnimations(prev => ({ ...prev, [entry.id]: animClass }));
        setTimeout(() => {
            setCheckAnimations(prev => {
                const copy = { ...prev };
                delete copy[entry.id];
                return copy;
            });
        }, 600);

        setEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, checked: newChecked } : e
        ));
        try {
            const updated = await checklistWebApi.updateEntry(entry.id, { checked: newChecked });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch {
            setEntries(prev => prev.map(e =>
                e.id === entry.id ? { ...e, checked: entry.checked } : e
            ));
            toast.error('Errore aggiornamento check');
        }
    };

    // ── Toggle Sub-Item ──
    const handleToggleSubItem = async (entry, itemIndex, e) => {
        if (e) e.stopPropagation();
        const { subItems, freeLines } = parseNote(entry.nota);
        subItems[itemIndex].done = !subItems[itemIndex].done;
        const newNota = buildNote(subItems, freeLines);

        setEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, nota: newNota } : e
        ));

        try {
            const updated = await checklistWebApi.updateEntry(entry.id, { nota: newNota || '' });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch {
            setEntries(prev => prev.map(e =>
                e.id === entry.id ? { ...e, nota: entry.nota } : e
            ));
            toast.error('Errore aggiornamento sub-item');
        }
    };

    // ── Save Note (con Enter-to-next) ──
    const handleSaveNote = async (entryId, moveToNext = false) => {
        try {
            const updated = await checklistWebApi.updateEntry(entryId, { nota: editingNoteValue });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            toast.success('Nota salvata');

            if (moveToNext) {
                // Trova la prossima riga nella lista filtrata
                const currentIdx = filteredEntries.findIndex(e => e.id === entryId);
                const nextEntry = filteredEntries[currentIdx + 1];
                if (nextEntry) {
                    setEditingNoteId(nextEntry.id);
                    setEditingNoteValue(nextEntry.nota || '');
                    return;
                }
            }
            setEditingNoteId(null);
            setEditingNoteValue('');
        } catch {
            toast.error('Errore salvataggio nota');
        }
    };

    // ── Voice Note (SpeechRecognition) ──
    const startVoiceRecording = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Il tuo browser non supporta il riconoscimento vocale');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
            }
            if (transcript) {
                setEditingNoteValue(prev => {
                    const sep = prev && !prev.endsWith('\n') ? ' ' : '';
                    return prev + sep + transcript;
                });
            }
        };

        recognition.onerror = () => {
            setIsRecording(false);
            toast.error('Errore riconoscimento vocale');
        };

        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        toast.success('🎤 Registrazione avviata — parla ora!');
    };

    const stopVoiceRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    // ── Heatmap Load ──
    useEffect(() => {
        const loadHeatmap = async () => {
            const d = new Date(selectedDate + 'T00:00:00');
            try {
                const data = await checklistWebApi.monthlySummary(d.getFullYear(), d.getMonth() + 1);
                const map = {};
                (data || []).forEach(r => { map[r.date] = r; });
                setHeatmapData(map);
            } catch { /* silenzioso */ }
        };
        loadHeatmap();
    }, [selectedDate]);

    // ── Filtered Entries (moved before handleSaveNote needs it) ──
    const filteredEntries = entries.filter(e => {
        if (searchTerm && !e.cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (showUncheckedOnly && e.checked) return false;
        if (showOpenNotesOnly && countOpenItems(e.nota) === 0) return false;
        return true;
    });

    // ── Delete Note ──
    const handleDeleteNote = async (entryId, e) => {
        if (e) e.stopPropagation();
        try {
            const updated = await checklistWebApi.deleteNote(entryId);
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            toast.success('Nota eliminata');
        } catch {
            toast.error('Errore eliminazione nota');
        }
    };

    // ── Quick Add Sub-Item ──
    const handleQuickAdd = async (entry) => {
        if (!quickAddText.trim()) return;
        const { subItems, freeLines } = parseNote(entry.nota);
        subItems.push({ text: quickAddText.trim(), done: false });
        const newNota = buildNote(subItems, freeLines);
        setQuickAddText('');

        setEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, nota: newNota } : e
        ));
        try {
            const updated = await checklistWebApi.updateEntry(entry.id, { nota: newNota || '' });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch {
            toast.error('Errore aggiunta item');
        }
    };

    // ── Add Checklist Item in Editor ──
    const addChecklistItemToEditor = () => {
        setEditingNoteValue(prev => {
            const newLine = prev && !prev.endsWith('\n') ? '\n' : '';
            return prev + newLine + '[ ] ';
        });
    };

    // ── Auto-Complete Row ──
    const handleAutoCompleteRow = async (entry, e) => {
        if (e) e.stopPropagation();
        await handleToggleCheck({ ...entry, checked: false }, e);
    };

    // ── Export PDF ──
    const handleExportPdf = async () => {
        setPdfLoading(true);
        try {
            const blob = await checklistWebApi.exportPdf(selectedDate);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checklist_web_${selectedDate}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('PDF scaricato!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Errore generazione PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // ── Row Expand ──
    const toggleRowExpand = (entryId) => {
        if (editingNoteId) return;
        setExpandedRowId(prev => prev === entryId ? null : entryId);
        setQuickAddText('');
    };

    // ── Start Editing ──
    const startEditing = (entry, e) => {
        if (e) e.stopPropagation();
        setEditingNoteId(entry.id);
        setEditingNoteValue(entry.nota || '');
        setExpandedRowId(null);
    };

    // ── Cancel Editing ──
    const cancelEditing = () => {
        setEditingNoteId(null);
        setEditingNoteValue('');
    };

    // filteredEntries already defined above (needed by handleSaveNote)

    // ── Stats ──
    const checkedCount = entries.filter(e => e.checked).length;
    const totalCount = entries.length;
    const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    const openNotesCount = entries.filter(e => countOpenItems(e.nota) > 0).length;

    const progressColor = progressPct === 100
        ? '#22c55e'
        : progressPct >= 50
            ? '#f59e0b'
            : '#ef4444';

    // ── Heatmap helpers ──
    const heatmapDate = new Date(selectedDate + 'T00:00:00');
    const heatmapYear = heatmapDate.getFullYear();
    const heatmapMonth = heatmapDate.getMonth();
    const daysInMonth = new Date(heatmapYear, heatmapMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(heatmapYear, heatmapMonth, 1).getDay();
    const dayNames = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    const navigateMonth = (delta) => {
        const d = new Date(heatmapYear, heatmapMonth + delta, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        setSelectedDate(`${y}-${m}-01`);
    };

    const getHeatColor = (dayStr) => {
        const info = heatmapData[dayStr];
        if (!info) return '#f1f5f9';
        const pct = info.total > 0 ? info.checked / info.total : 0;
        if (pct === 0) return '#fee2e2';
        if (pct < 0.5) return '#fecaca';
        if (pct < 1) return '#fef3c7';
        return '#bbf7d0';
    };

    // ── Render ──
    return (
        <div className="clw-page">
            {/* ── Header ── */}
            <div className="clw-header">
                <div className="clw-header-top">
                    <div className="clw-header-icon">
                        <ClipboardCheck size={24} />
                    </div>
                    <div className="clw-header-info">
                        <h1 className="clw-title">CheckList Web</h1>
                        <p className="clw-subtitle">Controllo Giornaliero Clienti</p>
                    </div>
                    <div className="clw-header-actions">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={`clw-filter-btn ${showHelp ? 'active' : ''}`}
                            title="Guida rapida"
                        >
                            <HelpCircle size={16} />
                        </button>
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={`clw-filter-btn ${showHeatmap ? 'active' : ''}`}
                            title="Calendario mensile"
                        >
                            <Calendar size={16} /> Calendario
                        </button>
                        <div className="clw-date-picker">
                            <Calendar size={16} />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="clw-date-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Help Box */}
                {showHelp && (
                    <div className="clw-help-box">
                        <div className="clw-help-grid">
                            <span>🔘 <b>Toggle</b> — spunta il cliente come controllato</span>
                            <span>📝 <b>Click riga</b> — espandi per vedere le sotto-note</span>
                            <span>✏️ <b>Matita</b> — apri l'editor nota</span>
                            <span>☑ <b>[ ]</b> — scrivi <code>[ ] testo</code> per creare item spuntabili</span>
                            <span>🎤 <b>Microfono</b> — detta la nota a voce</span>
                            <span>⏎ <b>Invio</b> — salva nota e passa alla prossima</span>
                            <span>📅 <b>Calendario</b> — vedi completamento del mese</span>
                            <span>📄 <b>PDF</b> — esporta la giornata in PDF</span>
                        </div>
                    </div>
                )}

                {/* Heatmap Calendar */}
                {showHeatmap && (
                    <div className="clw-heatmap">
                        <div className="clw-heatmap-header">
                            <button onClick={() => navigateMonth(-1)} className="clw-heatmap-nav"><ChevronLeft size={18} /></button>
                            <span className="clw-heatmap-title">{monthNames[heatmapMonth]} {heatmapYear}</span>
                            <button onClick={() => navigateMonth(1)} className="clw-heatmap-nav"><ChevronRight size={18} /></button>
                        </div>
                        <div className="clw-heatmap-grid">
                            {dayNames.map((d, i) => (
                                <span key={`dn-${i}`} className="clw-heatmap-dayname">{d}</span>
                            ))}
                            {Array.from({ length: (firstDayOfWeek + 6) % 7 }, (_, i) => (
                                <span key={`pad-${i}`} className="clw-heatmap-cell empty" />
                            ))}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dayStr = `${heatmapYear}-${String(heatmapMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const info = heatmapData[dayStr];
                                const isSelected = dayStr === selectedDate;
                                const isToday = dayStr === getTodayISO();
                                const pctLabel = info ? `${info.checked}/${info.total}` : '';
                                return (
                                    <button
                                        key={dayStr}
                                        className={`clw-heatmap-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                        style={{ background: getHeatColor(dayStr) }}
                                        onClick={() => setSelectedDate(dayStr)}
                                        title={info ? `${dayStr}: ${info.checked}/${info.total} completati` : dayStr}
                                    >
                                        <span className="clw-heatmap-day-num">{day}</span>
                                        {pctLabel && <span className="clw-heatmap-day-pct">{pctLabel}</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="clw-heatmap-legend">
                            <span className="clw-heatmap-legend-item"><span style={{ background: '#f1f5f9' }} className="clw-heatmap-dot" /> Nessun dato</span>
                            <span className="clw-heatmap-legend-item"><span style={{ background: '#fee2e2' }} className="clw-heatmap-dot" /> 0%</span>
                            <span className="clw-heatmap-legend-item"><span style={{ background: '#fecaca' }} className="clw-heatmap-dot" /> &lt;50%</span>
                            <span className="clw-heatmap-legend-item"><span style={{ background: '#fef3c7' }} className="clw-heatmap-dot" /> &lt;100%</span>
                            <span className="clw-heatmap-legend-item"><span style={{ background: '#bbf7d0' }} className="clw-heatmap-dot" /> 100%</span>
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                {totalCount > 0 && (
                    <div className="clw-progress-section">
                        <div className="clw-progress-info">
                            <span className="clw-progress-label">
                                Completamento: <strong>{checkedCount}/{totalCount}</strong> clienti
                            </span>
                            <span className="clw-progress-pct" style={{ color: progressColor }}>
                                {progressPct}%
                            </span>
                        </div>
                        <div className="clw-progress-bar">
                            <div
                                className="clw-progress-fill"
                                style={{ width: `${progressPct}%`, background: progressColor }}
                            />
                        </div>
                        {openNotesCount > 0 && (
                            <div className="clw-stats-row">
                                <span className="clw-stat-item open-notes">
                                    <AlertCircle size={12} />
                                    {openNotesCount} {openNotesCount === 1 ? 'cliente' : 'clienti'} con da-fare aperti
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Toolbar */}
                <div className="clw-toolbar">
                    <div className="clw-search-wrap">
                        <Search size={16} className="clw-search-icon" />
                        <input
                            type="text"
                            placeholder="Cerca cliente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="clw-search-input"
                        />
                    </div>

                    <button
                        onClick={() => setShowUncheckedOnly(!showUncheckedOnly)}
                        className={`clw-filter-btn ${showUncheckedOnly ? 'active' : ''}`}
                    >
                        <Filter size={14} />
                        Solo non controllati
                    </button>

                    <button
                        onClick={() => setShowOpenNotesOnly(!showOpenNotesOnly)}
                        className={`clw-filter-btn ${showOpenNotesOnly ? 'active-orange' : ''}`}
                    >
                        <ListChecks size={14} />
                        Con note aperte
                    </button>

                    {entries.length > 0 && (
                        <button
                            onClick={handleExportPdf}
                            disabled={pdfLoading}
                            className="clw-pdf-btn"
                        >
                            <Download size={14} />
                            {pdfLoading ? 'Generazione...' : 'Esporta PDF'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="clw-loading">
                    <div className="clw-spinner" />
                    <p>Caricamento checklist...</p>
                </div>
            )}

            {/* ── Empty State ── */}
            {!loading && entries.length === 0 && (
                <div className="clw-empty">
                    <ClipboardCheck size={56} className="clw-empty-icon" />
                    <h2>Nessuna checklist per {formatDate(selectedDate)}</h2>
                    <p>Inizializza la giornata per creare le righe per tutti i clienti.</p>
                    <button
                        onClick={handleInitDay}
                        disabled={initializing}
                        className="clw-init-btn"
                    >
                        <Play size={18} />
                        {initializing ? 'Inizializzazione...' : 'Inizializza Giornata'}
                    </button>
                </div>
            )}

            {/* ── Table ── */}
            {!loading && entries.length > 0 && (
                <div className="clw-table-container">
                    <table className="clw-table">
                        <thead>
                            <tr>
                                <th className="clw-th-num">#</th>
                                <th className="clw-th-client">Cliente</th>
                                <th className="clw-th-check">Controllo</th>
                                <th className="clw-th-note">Nota</th>
                                <th className="clw-th-operator">Ultimo Operatore</th>
                                <th className="clw-th-time">Ora</th>
                                <th className="clw-th-actions">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map((entry, idx) => {
                                const parsed = parseNote(entry.nota);
                                const hasSubItems = parsed.subItems.length > 0;
                                const doneCount = parsed.subItems.filter(i => i.done).length;
                                const totalItems = parsed.subItems.length;
                                const allSubDone = hasSubItems && doneCount === totalItems;
                                const pendingItems = countOpenItems(entry.nota);
                                const isExpanded = expandedRowId === entry.id;
                                const isEditing = editingNoteId === entry.id;
                                const animClass = checkAnimations[entry.id] || '';

                                return (
                                    <tr
                                        key={entry.id}
                                        className={`clw-row ${entry.checked ? 'clw-row-checked' : 'clw-row-unchecked'}`}
                                        onClick={() => toggleRowExpand(entry.id)}
                                    >
                                        <td className="clw-td-num">{idx + 1}</td>
                                        <td className="clw-td-client">
                                            <div className="clw-client-name-wrap">
                                                {hasSubItems && (
                                                    isExpanded
                                                        ? <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                                                        : <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                )}
                                                <span className={entry.checked ? 'clw-client-done' : 'clw-client-pending'}>
                                                    {entry.cliente}
                                                </span>
                                                {pendingItems > 0 && <span className="clw-dot-pending" title={`${pendingItems} da-fare aperti`} />}
                                            </div>
                                        </td>
                                        <td className="clw-td-check">
                                            <button
                                                onClick={(e) => handleToggleCheck(entry, e)}
                                                className={`clw-toggle ${entry.checked ? 'clw-toggle-on' : 'clw-toggle-off'} ${animClass}`}
                                                title={entry.checked ? 'Segna come non controllato' : 'Segna come controllato'}
                                            >
                                                <span className="clw-toggle-track">
                                                    <span className="clw-toggle-knob">
                                                        {entry.checked && <Check size={12} strokeWidth={3} />}
                                                    </span>
                                                </span>
                                            </button>
                                        </td>
                                        <td className="clw-td-note" onClick={(e) => e.stopPropagation()}>
                                            {isEditing ? (
                                                /* ── Edit Mode ── */
                                                <div className="clw-note-editor">
                                                    <textarea
                                                        value={editingNoteValue}
                                                        onChange={e => setEditingNoteValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Escape') cancelEditing();
                                                            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                                                e.preventDefault();
                                                                handleSaveNote(entry.id, true);
                                                            }
                                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                                e.preventDefault();
                                                                handleSaveNote(entry.id);
                                                            }
                                                        }}
                                                        className="clw-note-textarea"
                                                        autoFocus
                                                        placeholder={"Scrivi nota...\nUsa [ ] per aggiungere un item spuntabile\nInvio = salva e prossima | Shift+Invio = a capo"}
                                                    />
                                                    <div className="clw-note-editor-toolbar">
                                                        <button onClick={addChecklistItemToEditor} className="clw-editor-btn" title="Aggiungi item checklist">
                                                            <Plus size={14} /> Item
                                                        </button>
                                                        <button
                                                            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                                                            className={`clw-editor-btn ${isRecording ? 'recording' : ''}`}
                                                            title={isRecording ? 'Ferma registrazione' : 'Nota vocale'}
                                                        >
                                                            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                                            {isRecording ? 'Stop' : 'Voce'}
                                                        </button>
                                                        <span className="clw-editor-spacer" />
                                                        <span className="clw-editor-hint">Invio = salva+prossima</span>
                                                        <button onClick={cancelEditing} className="clw-editor-btn cancel">
                                                            <XCircle size={14} /> Annulla
                                                        </button>
                                                        <button onClick={() => handleSaveNote(entry.id)} className="clw-editor-btn primary">
                                                            <Check size={14} /> Salva
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ── Read Mode ── */
                                                <div className="clw-note-display">
                                                    {/* Free text lines */}
                                                    {parsed.freeLines.map((line, i) => (
                                                        <span
                                                            key={`fl-${i}`}
                                                            className="clw-note-free-line"
                                                            onClick={() => startEditing(entry)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {line}
                                                        </span>
                                                    ))}

                                                    {/* Sub-items (visible when expanded or always if few) */}
                                                    {hasSubItems && (
                                                        <>
                                                            {(!isExpanded && totalItems > 0) && (
                                                                <span
                                                                    className="clw-note-text"
                                                                    onClick={() => toggleRowExpand(entry.id)}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <span className={`clw-progress-badge ${allSubDone ? 'all-done' : 'in-progress'}`}>
                                                                        <Check size={10} />
                                                                        {doneCount}/{totalItems}
                                                                    </span>
                                                                    {' '}
                                                                    <span style={{ fontSize: 13, color: '#64748b' }}>
                                                                        {allSubDone ? 'Tutti completati' : `${totalItems - doneCount} da fare`}
                                                                    </span>
                                                                </span>
                                                            )}

                                                            {isExpanded && (
                                                                <div className="clw-sub-items">
                                                                    {parsed.subItems.map((item, i) => (
                                                                        <div
                                                                            key={`si-${i}`}
                                                                            className={`clw-sub-item ${item.done ? 'done' : ''}`}
                                                                            onClick={(e) => handleToggleSubItem(entry, i, e)}
                                                                        >
                                                                            <span className="clw-sub-item-checkbox">
                                                                                {item.done && <Check size={12} />}
                                                                            </span>
                                                                            <span>{item.text}</span>
                                                                        </div>
                                                                    ))}

                                                                    {/* Quick-add inline */}
                                                                    <div className="clw-quick-add" onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            ref={quickAddRef}
                                                                            type="text"
                                                                            placeholder="+ Aggiungi da-fare..."
                                                                            value={quickAddText}
                                                                            onChange={(e) => setQuickAddText(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    handleQuickAdd(entry);
                                                                                }
                                                                            }}
                                                                            className="clw-quick-add-input"
                                                                        />
                                                                        {quickAddText.trim() && (
                                                                            <button onClick={() => handleQuickAdd(entry)} className="clw-quick-add-btn">
                                                                                <Plus size={14} /> Aggiungi
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Auto-suggest complete row */}
                                                                    {allSubDone && !entry.checked && (
                                                                        <button
                                                                            className="clw-auto-complete-btn"
                                                                            onClick={(e) => handleAutoCompleteRow(entry, e)}
                                                                        >
                                                                            <CheckCircle2 size={14} />
                                                                            Tutti i da-fare completati — Completa riga
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Empty note — click to add */}
                                                    {!entry.nota && !hasSubItems && (
                                                        <span
                                                            className="clw-note-text clw-note-empty"
                                                            onClick={() => startEditing(entry)}
                                                        >
                                                            — clicca per aggiungere nota —
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="clw-td-operator">
                                            {entry.operator_name ? (
                                                <span className="clw-operator-badge">
                                                    <span className="clw-operator-avatar">
                                                        {getInitials(entry.operator_name)}
                                                    </span>
                                                    {entry.operator_name}
                                                </span>
                                            ) : (
                                                <span className="clw-no-operator">—</span>
                                            )}
                                        </td>
                                        <td className="clw-td-time">
                                            {entry.updated_at ? (
                                                <span className="clw-time-badge">
                                                    <Clock size={12} />
                                                    {new Date(entry.updated_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="clw-td-actions" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => startEditing(entry, e)}
                                                className="clw-action-btn clw-action-edit"
                                                title="Modifica nota"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            {entry.nota && (
                                                <button
                                                    onClick={(e) => handleDeleteNote(entry.id, e)}
                                                    className="clw-action-btn clw-action-delete"
                                                    title="Elimina nota"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredEntries.length === 0 && entries.length > 0 && (
                        <div className="clw-no-results">
                            <Search size={26} />
                            <p>Nessun cliente trovato con i filtri applicati.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Footer ── */}
            {!loading && entries.length > 0 && (
                <div className="clw-footer">
                    <span>📅 {formatDate(selectedDate)}</span>
                    <span>•</span>
                    <span>{checkedCount}/{totalCount} completati</span>
                </div>
            )}
        </div>
    );
}
