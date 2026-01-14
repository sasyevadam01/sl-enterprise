/**
 * SL Enterprise - Returns Management Page
 * Gestione dei resi materiale con workflow (Operatore -> Addetto Resi -> Amministrativo)
 */
import { useState, useEffect } from 'react';
import { returnsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../components/ui/CustomUI';

export default function ReturnsPage() {
    const { user } = useAuth();
    const { toast } = useUI();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newTicket, setNewTicket] = useState({ reference_code: '', customer_name: '', material_description: '', condition_notes: '' });

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const data = await returnsApi.getTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error loading return tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        Object.keys(newTicket).forEach(key => formData.append(key, newTicket[key]));

        try {
            await returnsApi.createTicket(formData);
            setShowNewModal(false);
            setNewTicket({ reference_code: '', customer_name: '', material_description: '', condition_notes: '' });
            loadTickets();
        } catch (error) {
            toast.error("Errore nella creazione del ticket");
        }
    };

    const handleAction = async (id, action, value) => {
        try {
            if (action === 'verify') await returnsApi.verifyTicket(id, value);
            if (action === 'credit') await returnsApi.issueCreditNote(id, value);
            if (action === 'close') await returnsApi.closeTicket(id);
            loadTickets();
        } catch (error) {
            toast.error("Errore nell'esecuzione dell'azione");
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            pending: { label: 'In Attesa', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            verified: { label: 'Verificato', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            credit_note: { label: 'Nota Credito', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            closed: { label: 'Chiuso', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
        };
        const s = config[status] || config.pending;
        return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${s.color}`}>{s.label}</span>;
    };

    if (loading) return <div className="text-center py-20 text-gray-400">Caricamento resi...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">📦 Gestione Resi</h1>
                    <p className="text-gray-400">Tracciamento e workflow resi materiale</p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold"
                >
                    + Nuovo Reso
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tickets.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-500 italic">
                        Nessun ticket di reso presente
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <div key={ticket.id} className="bg-slate-800/50 rounded-2xl border border-white/10 p-6 flex flex-col md:flex-row justify-between gap-6 transition hover:border-white/20">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-white">{ticket.reference_code}</h3>
                                    {getStatusBadge(ticket.status)}
                                </div>
                                <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Cliente:</span> {ticket.customer_name}</p>
                                <p className="text-sm text-gray-300">{ticket.material_description}</p>
                                <div className="text-xs text-gray-500 mt-2">
                                    Aperto il {new Date(ticket.opened_at).toLocaleDateString('it-IT')}
                                </div>
                            </div>

                            <div className="flex flex-col justify-center gap-2">
                                {ticket.status === 'pending' && user.role !== 'operator' && (
                                    <button
                                        onClick={() => {
                                            const notes = prompt("Note di verifica:");
                                            if (notes) handleAction(ticket.id, 'verify', notes);
                                        }}
                                        className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition text-sm font-bold"
                                    >
                                        ✅ Verifica Materiale
                                    </button>
                                )}

                                {ticket.status === 'verified' && (user.role === 'admin' || user.role === 'super_admin') && (
                                    <button
                                        onClick={() => {
                                            const amount = prompt("Importo Nota Credito (in Euro):");
                                            if (amount) handleAction(ticket.id, 'credit', Math.round(parseFloat(amount) * 100));
                                        }}
                                        className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition text-sm font-bold"
                                    >
                                        💰 Emetti Nota Credito
                                    </button>
                                )}

                                {ticket.status === 'credit_note' && (
                                    <button
                                        onClick={() => handleAction(ticket.id, 'close')}
                                        className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition text-sm font-bold"
                                    >
                                        🔒 Chiudi Ticket
                                    </button>
                                )}

                                {ticket.status === 'closed' && (
                                    <div className="text-right text-green-500 text-xs font-bold">
                                        Ticket Chiuso
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Nuovo Reso */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-3xl border border-white/10 w-full max-w-lg p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">📦 Nuovo Ticket Reso</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Riferimento / Codice</label>
                                <input
                                    required
                                    value={newTicket.reference_code}
                                    onChange={e => setNewTicket(prev => ({ ...prev, reference_code: e.target.value }))}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Es: RESO-2024-001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome Cliente</label>
                                <input
                                    required
                                    value={newTicket.customer_name}
                                    onChange={e => setNewTicket(prev => ({ ...prev, customer_name: e.target.value }))}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descrizione Materiale</label>
                                <textarea
                                    value={newTicket.material_description}
                                    onChange={e => setNewTicket(prev => ({ ...prev, material_description: e.target.value }))}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold"
                                >
                                    Crea Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
