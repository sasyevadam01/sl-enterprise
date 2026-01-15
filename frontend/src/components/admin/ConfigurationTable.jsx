import { useState } from 'react';

export default function ConfigurationTable({
    title,
    description,
    items,
    columns, // Array of { key, label }
    onAdd,
    onEdit,
    onDelete,
    addButtonLabel = "Aggiungi"
}) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const handleAddClick = () => {
        setForm({});
        setEditMode(false);
        setEditingId(null);
        setShowModal(true);
    };

    const handleEditClick = (item) => {
        setForm({ ...item });
        setEditMode(true);
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editMode && onEdit) {
            await onEdit(editingId, form);
        } else {
            await onAdd(form);
        }
        setShowModal(false);
    };

    return (
        <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    {description && <p className="text-sm text-gray-400">{description}</p>}
                </div>
                <button
                    onClick={handleAddClick}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                >
                    + {addButtonLabel}
                </button>
            </div>

            <table className="w-full">
                <thead className="bg-slate-800">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                {col.label}
                            </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                            Azioni
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 text-sm">
                                Nessun elemento configurato
                            </td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-white/5 transition">
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3 text-sm text-gray-300">
                                        {col.onToggle ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    col.onToggle(item);
                                                }}
                                                className={`w-10 h-6 rounded-full p-1 transition-colors ${item[col.key] ? 'bg-green-600' : 'bg-gray-600'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${item[col.key] ? 'translate-x-4' : ''}`} />
                                            </button>
                                        ) : (
                                            col.render ? col.render(item[col.key], item) : item[col.key]
                                        )}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleEditClick(item)}
                                        className="text-blue-400 hover:text-blue-300 transition text-sm mr-3"
                                    >
                                        ✏️ Modifica
                                    </button>
                                    <button
                                        onClick={() => onDelete(item.id)}
                                        className="text-red-400 hover:text-red-300 transition text-sm"
                                    >
                                        🗑️ Elimina
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editMode ? 'Modifica Elemento' : addButtonLabel}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {columns.map(col => (
                                <div key={col.key}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{col.label}</label>
                                    {col.type === 'select' ? (
                                        <select
                                            required
                                            value={form[col.key] || ''}
                                            onChange={e => setForm({ ...form, [col.key]: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white appearance-none"
                                        >
                                            <option value="">Seleziona...</option>
                                            {col.options.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : col.type === 'checkbox' ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="checkbox"
                                                checked={!!form[col.key]}
                                                onChange={e => setForm({ ...form, [col.key]: e.target.checked })}
                                                className="w-5 h-5 rounded border-white/10 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-300">Attivo</span>
                                        </div>
                                    ) : (
                                        <input
                                            type={col.type || 'text'}
                                            required={col.required !== false}
                                            value={form[col.key] || ''}
                                            onChange={e => setForm({ ...form, [col.key]: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={col.placeholder || ''}
                                        />
                                    )}
                                </div>
                            ))}

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                                    Annulla
                                </button>
                                <button type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                    Salva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
