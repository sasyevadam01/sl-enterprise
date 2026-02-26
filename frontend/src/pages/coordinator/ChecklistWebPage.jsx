/**
 * CheckList Web v2.0 — Controllo giornaliero clienti per coordinatori.
 * Desktop-first, sub-checklist nelle note, righe espandibili, progress badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { checklistWebApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
    ClipboardCheck, Calendar, Download, Play, Search,
    Filter, CheckCircle2, XCircle, Edit3, Trash2, Clock,
    Plus, ChevronDown, ChevronRight, Check, ListChecks, AlertCircle
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

    const quickAddRef = useRef(null);

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

    // ── Save Note ──
    const handleSaveNote = async (entryId) => {
        try {
            const updated = await checklistWebApi.updateEntry(entryId, { nota: editingNoteValue });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            setEditingNoteId(null);
            setEditingNoteValue('');
            toast.success('Nota salvata');
        } catch {
            toast.error('Errore salvataggio nota');
        }
    };

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

    // ── Filtering ──
    const filteredEntries = entries.filter(e => {
        if (searchTerm && !e.cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (showUncheckedOnly && e.checked) return false;
        if (showOpenNotesOnly && countOpenItems(e.nota) === 0) return false;
        return true;
    });

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
                                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                                e.preventDefault();
                                                                handleSaveNote(entry.id);
                                                            }
                                                        }}
                                                        className="clw-note-textarea"
                                                        autoFocus
                                                        placeholder={"Scrivi nota...\nUsa [ ] per aggiungere un item spuntabile"}
                                                    />
                                                    <div className="clw-note-editor-toolbar">
                                                        <button onClick={addChecklistItemToEditor} className="clw-editor-btn" title="Aggiungi item checklist">
                                                            <Plus size={14} /> Item
                                                        </button>
                                                        <span className="clw-editor-spacer" />
                                                        <span className="clw-editor-hint">Ctrl+Enter per salvare</span>
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
