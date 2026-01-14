/**
 * SL Enterprise - Audit Log Page
 * La "scatola nera" del sistema: tracciamento di tutte le azioni amministrative
 */
import { useState, useEffect } from 'react';
import { auditApi } from '../../api/client';

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const data = await auditApi.getLogs();
                setLogs(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error loading audit logs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getActionColor = (action) => {
        if (action.includes('DELETE') || action.includes('REJECTED')) return 'text-red-400';
        if (action.includes('CREATE') || action.includes('APPROVED')) return 'text-green-400';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-400';
        if (action.includes('LOGIN')) return 'text-purple-400';
        return 'text-gray-300';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">🕵️ Audit Log</h1>
                    <p className="text-gray-400 mt-1">Tracciamento completo delle azioni eseguite nel sistema</p>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cerca record..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500">🔍</span>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-700/50 border-b border-white/10">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Utente</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Azione</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Dettagli</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                                        Nessun record trovato
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {new Date(log.timestamp).toLocaleString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                                                    {log.username.substring(0, 2)}
                                                </div>
                                                <span className="text-white font-medium">{log.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-bold ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" title={log.details}>
                                            {log.details || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                                            {log.ip_address || '127.0.0.1'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <p className="text-sm text-gray-400">
                    I log di audit sono permanenti e non possono essere eliminati nemmeno dal Super Admin.
                    Questo garantisce l'integrità del sistema per fini ispettivi.
                </p>
            </div>
        </div>
    );
}
