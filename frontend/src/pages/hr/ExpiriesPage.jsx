/**
 * SL Enterprise - Expiries Dashboard Page
 * Dashboard scadenze: contratti, certificazioni, visite mediche
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { expiriesApi } from '../../api/client';

// Card colorata per le scadenze urgenti
const ExpiryCard = ({ title, icon, weekCount, monthCount, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-slate-800/50 rounded-2xl border border-white/10 p-6 cursor-pointer hover:scale-105 transition-transform ${weekCount > 0 ? 'ring-2 ring-red-500/50' : ''
            }`}
    >
        <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">{icon}</span>
            {weekCount > 0 && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full animate-pulse">
                    ⚠️ Urgente
                </span>
            )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Prossimi 7 giorni</span>
                <span className={`text-xl font-bold ${weekCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {weekCount}
                </span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Prossimi 30 giorni</span>
                <span className={`text-xl font-bold ${monthCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {monthCount}
                </span>
            </div>
        </div>
    </div>
);

// Riga tabella scadenza
const ExpiryRow = ({ item, type }) => {
    const getDaysColor = (days) => {
        if (days <= 7) return 'text-red-400 bg-red-500/20';
        if (days <= 14) return 'text-orange-400 bg-orange-500/20';
        if (days <= 30) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-green-400 bg-green-500/20';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const expiryDate = type === 'contract' ? item.contract_end :
        type === 'certification' ? item.expiry_date :
            item.next_exam_date;

    const daysRemaining = item.days_remaining ??
        Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <tr className="hover:bg-white/5 transition">
            <td className="px-4 py-3">
                <Link
                    to={`/hr/employees/${item.employee_id || item.id}`}
                    className="text-blue-400 hover:text-blue-300"
                >
                    {item.employee_name || `${item.first_name} ${item.last_name}`}
                </Link>
            </td>
            <td className="px-4 py-3 text-gray-300">
                {type === 'contract' ? item.current_role :
                    type === 'certification' ? item.cert_name :
                        item.exam_type}
            </td>
            <td className="px-4 py-3 text-gray-400">{formatDate(expiryDate)}</td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDaysColor(daysRemaining)}`}>
                    {daysRemaining} giorni
                </span>
            </td>
        </tr>
    );
};

export default function ExpiriesPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [details, setDetails] = useState({
        certifications: [],
        medical: [],
        contracts: []
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashData, certs, medical, contracts] = await Promise.all([
                    expiriesApi.getExpiries(),
                    expiriesApi.getCertifications(60),
                    expiriesApi.getMedicalExams(60),
                    expiriesApi.getContracts(60)
                ]);

                setDashboard(dashData);
                setDetails({
                    certifications: certs,
                    medical: medical,
                    contracts: contracts
                });
            } catch (error) {
                console.error('Error fetching expiries:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'all', label: 'Tutte', count: (details.certifications?.length || 0) + (details.medical?.length || 0) + (details.contracts?.length || 0) },
        { id: 'contracts', label: '📄 Contratti', count: details.contracts?.length || 0 },
        { id: 'certifications', label: '🎓 Certificazioni', count: details.certifications?.length || 0 },
        { id: 'medical', label: '🏥 Visite Mediche', count: details.medical?.length || 0 },
    ];

    const getFilteredItems = () => {
        switch (activeTab) {
            case 'contracts':
                return { items: details.contracts || [], type: 'contract' };
            case 'certifications':
                return { items: details.certifications || [], type: 'certification' };
            case 'medical':
                return { items: details.medical || [], type: 'medical' };
            default:
                return {
                    items: [
                        ...(details.contracts || []).map(i => ({ ...i, _type: 'contract' })),
                        ...(details.certifications || []).map(i => ({ ...i, _type: 'certification' })),
                        ...(details.medical || []).map(i => ({ ...i, _type: 'medical' }))
                    ].sort((a, b) => {
                        const dateA = a.contract_end || a.expiry_date || a.next_exam_date;
                        const dateB = b.contract_end || b.expiry_date || b.next_exam_date;
                        return new Date(dateA) - new Date(dateB);
                    }),
                    type: 'mixed'
                };
        }
    };

    const filtered = getFilteredItems();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">📅 Scadenze</h1>
                    <p className="text-gray-400 mt-1">Monitora contratti, certificazioni e visite mediche in scadenza</p>
                </div>
                <div className="text-right">
                    {dashboard?.total_urgent > 0 && (
                        <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                            <span className="text-red-400 font-bold text-xl">{dashboard.total_urgent}</span>
                            <span className="text-red-300 ml-2">urgenti questa settimana</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ExpiryCard
                    title="Contratti"
                    icon="📄"
                    weekCount={dashboard?.contracts?.week || 0}
                    monthCount={dashboard?.contracts?.month || 0}
                    onClick={() => setActiveTab('contracts')}
                />
                <ExpiryCard
                    title="Certificazioni"
                    icon="🎓"
                    weekCount={dashboard?.certifications?.week || 0}
                    monthCount={dashboard?.certifications?.month || 0}
                    onClick={() => setActiveTab('certifications')}
                />
                <ExpiryCard
                    title="Visite Mediche"
                    icon="🏥"
                    weekCount={dashboard?.medical_exams?.week || 0}
                    monthCount={dashboard?.medical_exams?.month || 0}
                    onClick={() => setActiveTab('medical')}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Dipendente</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Dettaglio</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Scadenza</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Giorni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                                    <div className="text-4xl mb-2">✅</div>
                                    Nessuna scadenza nei prossimi 60 giorni
                                </td>
                            </tr>
                        ) : (
                            filtered.items.map((item, idx) => (
                                <ExpiryRow
                                    key={`${item._type || filtered.type}-${item.id || idx}`}
                                    item={item}
                                    type={item._type || filtered.type}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span> ≤ 7 giorni
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span> 8-14 giorni
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span> 15-30 giorni
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span> &gt; 30 giorni
                </span>
            </div>
        </div>
    );
}
