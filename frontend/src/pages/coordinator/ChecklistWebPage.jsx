/**
 * CheckList Web — Controllo giornaliero clienti per coordinatori.
 * Desktop-first, tabella inline editing, progress bar, export PDF.
 */
import { useState, useEffect, useCallback } from 'react';
import { checklistWebApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
    ClipboardCheck, Calendar, Download, Play, Search,
    Filter, CheckCircle2, XCircle, Edit3, Trash2, User, Clock
} from 'lucide-react';
import './ChecklistWebPage.css';

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

export default function ChecklistWebPage() {
    const [entries, setEntries] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getTodayISO());
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteValue, setEditingNoteValue] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);

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

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    // ── Toggle Check ──
    const handleToggleCheck = async (entry) => {
        const newChecked = !entry.checked;
        // Optimistic update
        setEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, checked: newChecked } : e
        ));
        try {
            const updated = await checklistWebApi.updateEntry(entry.id, { checked: newChecked });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch (err) {
            // Revert
            setEntries(prev => prev.map(e =>
                e.id === entry.id ? { ...e, checked: entry.checked } : e
            ));
            toast.error('Errore aggiornamento check');
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
        } catch (err) {
            toast.error('Errore salvataggio nota');
        }
    };

    // ── Delete Note ──
    const handleDeleteNote = async (entryId) => {
        try {
            const updated = await checklistWebApi.deleteNote(entryId);
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            toast.success('Nota eliminata');
        } catch (err) {
            toast.error('Errore eliminazione nota');
        }
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

    // ── Filtering ──
    const filteredEntries = entries.filter(e => {
        if (searchTerm && !e.cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (showUncheckedOnly && e.checked) return false;
        return true;
    });

    const checkedCount = entries.filter(e => e.checked).length;
    const totalCount = entries.length;
    const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

    const progressColor = progressPct === 100
        ? 'var(--clw-success)'
        : progressPct >= 50
            ? 'var(--clw-warning)'
            : 'var(--clw-danger)';

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

            {/* ── Empty State (Init Day) ── */}
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
                            {filteredEntries.map((entry, idx) => (
                                <tr
                                    key={entry.id}
                                    className={`clw-row ${entry.checked ? 'clw-row-checked' : 'clw-row-unchecked'}`}
                                >
                                    <td className="clw-td-num">{idx + 1}</td>
                                    <td className="clw-td-client">
                                        <span className={entry.checked ? 'clw-client-done' : 'clw-client-pending'}>
                                            {entry.cliente}
                                        </span>
                                    </td>
                                    <td className="clw-td-check">
                                        <button
                                            onClick={() => handleToggleCheck(entry)}
                                            className={`clw-check-btn ${entry.checked ? 'checked' : 'unchecked'}`}
                                            title={entry.checked ? 'Segna come non controllato' : 'Segna come controllato'}
                                        >
                                            {entry.checked
                                                ? <CheckCircle2 size={22} />
                                                : <XCircle size={22} />
                                            }
                                        </button>
                                    </td>
                                    <td className="clw-td-note">
                                        {editingNoteId === entry.id ? (
                                            <div className="clw-note-edit">
                                                <input
                                                    type="text"
                                                    value={editingNoteValue}
                                                    onChange={e => setEditingNoteValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveNote(entry.id);
                                                        if (e.key === 'Escape') { setEditingNoteId(null); setEditingNoteValue(''); }
                                                    }}
                                                    className="clw-note-input"
                                                    autoFocus
                                                    placeholder="Scrivi nota..."
                                                />
                                                <button
                                                    onClick={() => handleSaveNote(entry.id)}
                                                    className="clw-note-save"
                                                    title="Salva (Enter)"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingNoteId(null); setEditingNoteValue(''); }}
                                                    className="clw-note-cancel"
                                                    title="Annulla (Esc)"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span
                                                className={`clw-note-text ${entry.nota ? '' : 'clw-note-empty'}`}
                                                onClick={() => { setEditingNoteId(entry.id); setEditingNoteValue(entry.nota || ''); }}
                                                title="Clicca per modificare"
                                            >
                                                {entry.nota || '— clicca per aggiungere nota —'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="clw-td-operator">
                                        {entry.operator_name ? (
                                            <span className="clw-operator-badge">
                                                <User size={12} />
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
                                    <td className="clw-td-actions">
                                        <button
                                            onClick={() => { setEditingNoteId(entry.id); setEditingNoteValue(entry.nota || ''); }}
                                            className="clw-action-btn clw-action-edit"
                                            title="Modifica nota"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        {entry.nota && (
                                            <button
                                                onClick={() => handleDeleteNote(entry.id)}
                                                className="clw-action-btn clw-action-delete"
                                                title="Elimina nota"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredEntries.length === 0 && entries.length > 0 && (
                        <div className="clw-no-results">
                            <Search size={24} />
                            <p>Nessun cliente trovato con i filtri applicati.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Date Info Footer ── */}
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
