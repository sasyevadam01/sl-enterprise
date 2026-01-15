import React from 'react';

export default function TaskUserGuide({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl relative">
                <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                    <h2 className="text-2xl text-white font-bold">ℹ️ Guida Gestione Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition text-xl">✕</button>
                </div>

                <div className="p-8 space-y-8 text-gray-300">

                    {/* Section 1: Workflow */}
                    <section>
                        <h3 className="text-xl font-bold text-white mb-3 text-blue-400">1. Flusso di Lavoro</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="text-2xl mb-2">📥</div>
                                <div className="font-bold text-white">Da Fare</div>
                                <div className="text-xs mt-1">Nuovo task assegnato. In attesa di presa visione.</div>
                            </div>
                            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                <div className="text-2xl mb-2">👁️</div>
                                <div className="font-bold text-yellow-400">Visto</div>
                                <div className="text-xs mt-1">L'operatore ha letto il task (Click su "Visto").</div>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <div className="text-2xl mb-2">🚀</div>
                                <div className="font-bold text-blue-400">In Corso</div>
                                <div className="text-xs mt-1">Attività iniziata (Click su "Inizia"). Timer avviato.</div>
                            </div>
                            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                <div className="text-2xl mb-2">✅</div>
                                <div className="font-bold text-green-400">Completato</div>
                                <div className="text-xs mt-1">Attività finita. Archiviato nello storico.</div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Features */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-3 text-purple-400">2. Funzioni Avanzate</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-3">
                                    <span className="text-xl">💬</span>
                                    <div>
                                        <strong className="text-white">Chat & Commenti</strong>
                                        <p className="text-sm">Discuti i dettagli del task direttamente nella scheda dedicata. Le notifiche arrivano agli interessati.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-xl">📎</span>
                                    <div>
                                        <strong className="text-white">Allegati & Foto</strong>
                                        <p className="text-sm">Carica PDF, Immagini o Documenti. Utile per manuali o prove fotografiche del lavoro svolto.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-xl">🔒</span>
                                    <div>
                                        <strong className="text-white">Blocco Modifiche</strong>
                                        <p className="text-sm">Quando modifichi un task, questo viene "bloccato" per gli altri utenti per evitare sovrascritture.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-3 text-red-400">3. Priorità & Categorie</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                        <strong className="text-white">Bassa (1-4)</strong>
                                    </div>
                                    <p className="text-sm">Attività di routine, nessuna urgenza immediata.</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                        <strong className="text-white">Media (5-7)</strong>
                                    </div>
                                    <p className="text-sm">Importante. Da completare nei tempi previsti.</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                                        <strong className="text-white">Alta/Critica (8-10)</strong>
                                    </div>
                                    <p className="text-sm">Urgenza massima. Notifica prioritaria inviata.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Calendar */}
                    <section>
                        <h3 className="text-xl font-bold text-white mb-3 text-orange-400">4. Calendario & Scadenze</h3>
                        <p className="text-sm mb-4">Usa il widget 📅 Calendario per visualizzare visivamente le scadenze del mese. I pallini colorati indicano la priorità dei task in scadenza quel giorno.</p>
                    </section>

                </div>

                <div className="p-6 border-t border-white/10 bg-slate-900 sticky bottom-0 text-center">
                    <button onClick={onClose} className="px-8 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">
                        Ho Capito
                    </button>
                </div>
            </div>
        </div>
    );
}
