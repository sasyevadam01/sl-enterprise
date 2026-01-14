/**
 * SL Enterprise - New Employee Page (Wizard)
 * Form per creare un nuovo dipendente
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { employeesApi } from '../../api/client';

const CONTRACT_TYPES = [
    { value: 'full_time', label: 'Tempo Pieno' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'internship', label: 'Stage' },
    { value: 'agency', label: 'Somministrazione' },
];

export default function NewEmployeePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [loadingManagers, setLoadingManagers] = useState(true);

    // Carica ruoli e dipendenti disponibili all'avvio
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [roles, employees] = await Promise.all([
                    employeesApi.getRoles(),
                    employeesApi.getEmployees()
                ]);
                setAvailableRoles(roles);
                setAllEmployees(employees.filter(e => e.is_active).sort((a, b) =>
                    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${a.first_name}`)
                ));
            } catch (err) {
                console.error("Failed to fetch metadata:", err);
            } finally {
                setLoadingRoles(false);
                setLoadingManagers(false);
            }
        };
        fetchMetadata();
    }, []);

    const [formData, setFormData] = useState({
        // Step 1: Dati Anagrafici
        // fiscal_code removed - no longer used
        first_name: '',
        last_name: '',
        birth_date: '',
        birth_place: '',

        // Step 2: Contatti
        address: '',
        phone: '',
        email: '',
        emergency_contact: '',
        emergency_phone: '',

        // Step 3: Contratto
        current_role: '',
        contract_type: 'full_time',
        contract_start: '',
        contract_end: '',
        hiring_date: '',
        department_id: null,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateStep = (stepNum) => {
        switch (stepNum) {
            case 1:
                if (!formData.first_name || !formData.last_name) {
                    setError('Compila nome e cognome');
                    return false;
                }
                break;
            case 2:
                // Contatti opzionali
                break;
            case 3:
                if (!formData.current_role) {
                    setError('Specifica il ruolo');
                    return false;
                }
                break;
        }
        setError(null);
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => Math.min(s + 1, 3));
        }
    };

    const prevStep = () => {
        setError(null);
        setStep(s => Math.max(s - 1, 1));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setLoading(true);
        setError(null);

        try {
            // Prepara i dati
            const payload = {
                ...formData,
                birth_date: formData.birth_date || null,
                contract_start: formData.contract_start || null,
                contract_end: formData.contract_end || null,
                hiring_date: formData.hiring_date || null,
                department_id: formData.department_id || null,
            };

            const newEmployee = await employeesApi.createEmployee(payload);
            navigate(`/hr/employees/${newEmployee.id}`);
        } catch (err) {
            console.error('Error creating employee:', err);
            setError(err.response?.data?.detail || 'Errore durante la creazione');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${s === step
                            ? 'bg-blue-600 text-white scale-110'
                            : s < step
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 text-gray-400'
                            }`}
                    >
                        {s < step ? '✓' : s}
                    </div>
                    {s < 3 && (
                        <div
                            className={`w-16 h-1 ${s < step ? 'bg-green-600' : 'bg-slate-700'
                                }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Dati Anagrafici</h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Fiscal Code Input removed */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Nome *
                    </label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Cognome *
                    </label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Data di Nascita
                    </label>
                    <input
                        type="date"
                        name="birth_date"
                        value={formData.birth_date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Luogo di Nascita
                    </label>
                    <input
                        type="text"
                        name="birth_place"
                        value={formData.birth_place}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">📞 Contatti</h2>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Indirizzo
                </label>
                <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Via Roma 1, 00100 Roma"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Telefono
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="+39 333 1234567"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="mario.rossi@email.com"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-white/10">
                <h3 className="text-lg font-medium text-white mb-3">🆘 Contatto Emergenza</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Nome Contatto
                        </label>
                        <input
                            type="text"
                            name="emergency_contact"
                            value={formData.emergency_contact}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Telefono Emergenza
                        </label>
                        <input
                            type="tel"
                            name="emergency_phone"
                            value={formData.emergency_phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">📝 Contratto</h2>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Ruolo / Mansione *
                </label>
                <select
                    name="current_role"
                    value={formData.current_role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    disabled={loadingRoles}
                >
                    <option value="">-- Seleziona Ruolo --</option>
                    {availableRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
                {loadingRoles && (
                    <p className="text-xs text-gray-500 mt-1">Caricamento ruoli...</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Tipo Contratto
                </label>
                <select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {CONTRACT_TYPES.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Data Assunzione
                    </label>
                    <input
                        type="date"
                        name="hiring_date"
                        value={formData.hiring_date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Scadenza Contratto (se det.)
                    </label>
                    <input
                        type="date"
                        name="contract_end"
                        value={formData.contract_end}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Inizio Contratto
                </label>
                <input
                    type="date"
                    name="contract_start"
                    value={formData.contract_start}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Responsabile (Manager)
                </label>
                <select
                    name="manager_id"
                    value={formData.manager_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="">-- Nessuno (Root) --</option>
                    {allEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1 italic">Indica il superiore diretto per l'organigramma</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link
                        to="/hr/employees"
                        className="text-gray-400 hover:text-white transition flex items-center gap-2 mb-2"
                    >
                        ← Torna alla lista
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Nuovo Dipendente</h1>
                </div>
            </div>

            {/* Card */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 p-6">
                {renderStepIndicator()}

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                ← Indietro
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                Avanti →
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Salvataggio...
                                    </>
                                ) : (
                                    <>✓ Crea Dipendente</>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
