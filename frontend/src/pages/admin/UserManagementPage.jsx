import { useState, useEffect } from 'react';
import { usersApi, employeesApi, rolesApi } from '../../api/client';
import { useUI } from '../../components/ui/CustomUI';

// --- COMPONENTS ---

const UsersTable = ({ users, roles, onToggleStatus, onEdit, onDelete }) => (
    <>
        {/* --- DESKTOP TABLE --- */}
        <div className="hidden md:block bg-slate-800 rounded-2xl border border-white/10 overflow-hidden shadow-xl animate-fade-in">
            <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-gray-400 uppercase text-xs font-semibold">
                    <tr>
                        <th className="p-4">Utente</th>
                        <th className="p-4">Ruolo</th>
                        <th className="p-4">Stato</th>
                        <th className="p-4">Ultimo Accesso</th>
                        <th className="p-4 text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400 group-hover:bg-slate-600 transition">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">{user.full_name}</div>
                                        <div className="text-sm text-gray-500">@{user.username}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700 text-gray-300">
                                    {user.role_label || user.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border
                                    ${user.is_active
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'}
                                `}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {user.is_active ? 'Attivo' : 'Disabilitato'}
                                </span>
                            </td>
                            <td className="p-4 text-sm text-gray-400 font-mono">
                                {user.last_seen ? new Date(user.last_seen + 'Z').toLocaleString('it-IT') : '-'}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(user)}
                                        className="px-3 py-1.5 rounded text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                                    >
                                        ✏️ Modifica
                                    </button>
                                    {user.role !== 'super_admin' && (
                                        <>
                                            <button
                                                onClick={() => onToggleStatus(user)}
                                                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors
                                                    ${user.is_active
                                                        ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                                                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}
                                                `}
                                            >
                                                {user.is_active ? 'Disabilita' : 'Attiva'}
                                            </button>
                                            <button
                                                onClick={() => onDelete(user)}
                                                className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                🗑️ Elimina
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* --- MOBILE CARDS --- */}
        <div className="md:hidden space-y-4">
            {users.map(user => (
                <div key={user.id} className="bg-slate-800 rounded-xl p-4 border border-white/10 shadow-lg">
                    {/* Header: Avatar, Name, Role */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-white text-lg">{user.full_name}</div>
                                <div className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded inline-block mt-0.5 border border-blue-500/20">
                                    {user.role_label || user.role}
                                </div>
                            </div>
                        </div>
                        {/* Status Badge */}
                        <div className={`w-3 h-3 rounded-full mt-2 ${user.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-slate-900/50 p-3 rounded-lg border border-white/5">
                        <div>
                            <span className="block text-gray-500 mb-0.5">Username</span>
                            <span className="text-gray-200 font-mono">@{user.username}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 mb-0.5">Ultimo Accesso</span>
                            <span className="text-gray-200">{user.last_seen ? new Date(user.last_seen + 'Z').toLocaleDateString('it-IT') : '-'}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => onEdit(user)}
                            className="py-2 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20"
                        >
                            ✏️ Modifica
                        </button>

                        {user.role !== 'super_admin' && (
                            <>
                                <button
                                    onClick={() => onToggleStatus(user)}
                                    className={`py-2 rounded-lg border text-xs font-bold
                                        ${user.is_active
                                            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/20'
                                            : 'bg-green-500/10 text-green-300 border-green-500/20 hover:bg-green-500/20'}
                                    `}
                                >
                                    {user.is_active ? 'Disabilita' : 'Attiva'}
                                </button>
                                <button
                                    onClick={() => onDelete(user)}
                                    className="py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-bold hover:bg-red-500/20"
                                >
                                    🗑️ Elimina
                                </button>
                            </>
                        )}
                        {user.role === 'super_admin' && (
                            <div className="col-span-2 flex items-center justify-center bg-slate-700/30 rounded-lg border border-white/5 text-xs text-gray-500 italic">
                                Azioni bloccate
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </>
);

const PermissionsMatrix = ({ roles, definitions, onTogglePermission, onChangeDefaultHome }) => {
    // Group permissions by category
    const groupedDefs = definitions.reduce((acc, perm) => {
        const cat = perm.category || 'Altro';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
    }, {});

    const categoryIcons = {
        'General': '🏠',
        'HR': '👥',
        'Factory': '🏭',
        'Production': '🔴',
        'Logistics': '📦',
        'Admin': '⚙️',
        'Altro': '📋'
    };

    const categoryColors = {
        'General': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        'HR': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
        'Factory': 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
        'Production': 'from-red-500/20 to-pink-500/20 border-red-500/30',
        'Logistics': 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
        'Admin': 'from-red-500/20 to-rose-500/20 border-red-500/30',
        'Altro': 'from-gray-500/20 to-slate-500/20 border-gray-500/30'
    };

    // Available home pages for dropdown
    const homeOptions = [
        { value: '/dashboard', label: '📊 Dashboard HR' },
        { value: '/hr/tasks', label: '📋 Task Board' },
        { value: '/hr/planner', label: '🗓️ Gestione Turni' },
        { value: '/factory/dashboard', label: '🏭 Factory Dashboard' },
        { value: '/factory/kpi', label: '⚙️ Inserimento KPI' },
        { value: '/production/orders', label: '📦 Live Production' },
        { value: '/mobile/dashboard', label: '📱 Solo Mobile' },

    ];

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl border border-white/10 p-4">
                <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                    🔒 Matrice Permessi per Ruolo
                </h3>
                <p className="text-sm text-gray-400 mt-1">Clicca sulle caselle per abilitare/disabilitare i permessi. Passa il mouse sulle icone ℹ️ per i dettagli.</p>
            </div>

            {/* Default Home Page Section */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 overflow-hidden">
                <div className="p-3 bg-slate-900/50 border-b border-white/10 flex items-center gap-2">
                    <span className="text-xl">🏠</span>
                    <span className="font-bold text-white">Pagina Iniziale</span>
                    <span className="text-xs text-gray-400 ml-2">Dove viene reindirizzato l'utente dopo il login</span>
                </div>
                <div className="flex">
                    <div className="w-64 shrink-0 p-3 border-r border-white/10 flex items-center">
                        <span className="text-sm font-medium text-gray-200">Dopo il Login →</span>
                    </div>
                    <div className="flex-1 flex overflow-x-auto">
                        {roles.map(role => (
                            <div key={`home-${role.id}`} className="min-w-[100px] flex-1 p-2 border-r border-white/5 last:border-r-0">
                                <select
                                    value={role.default_home || '/hr/tasks'}
                                    onChange={(e) => onChangeDefaultHome(role, e.target.value)}
                                    className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                    {homeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Role Headers - Sticky */}
            <div className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden sticky top-0 z-30">
                <div className="flex">
                    <div className="w-64 shrink-0 p-3 bg-slate-900 border-r border-white/10 font-bold text-gray-400 text-xs uppercase">
                        Permesso
                    </div>
                    <div className="flex-1 flex overflow-x-auto">
                        {roles.map(role => (
                            <div key={role.id} className="min-w-[100px] flex-1 p-3 text-center bg-slate-900 border-r border-white/5 last:border-r-0">
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{role.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Categories */}
            {Object.entries(groupedDefs).map(([category, perms]) => (
                <div key={category} className={`bg-gradient-to-r ${categoryColors[category] || categoryColors['Altro']} rounded-xl border overflow-hidden`}>
                    {/* Category Header */}
                    <div className="p-3 bg-slate-900/50 border-b border-white/10 flex items-center gap-2">
                        <span className="text-xl">{categoryIcons[category] || '📋'}</span>
                        <span className="font-bold text-white">{category}</span>
                        <span className="text-xs text-gray-400 ml-2">({perms.length} permessi)</span>
                    </div>

                    {/* Permissions in this category */}
                    <div className="divide-y divide-white/5">
                        {perms.map(perm => (
                            <div key={perm.code} className="flex hover:bg-white/5 transition-colors">
                                {/* Permission Name + Tooltip */}
                                <div className="w-64 shrink-0 p-3 border-r border-white/10 flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-gray-200 block truncate">{perm.label}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{perm.code}</span>
                                    </div>
                                    {/* Tooltip Icon */}
                                    <div className="relative group shrink-0">
                                        <span className="cursor-help text-blue-400 hover:text-blue-300 text-sm">ℹ️</span>
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-3 bg-slate-900 border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs text-gray-300">
                                            {perm.description || 'Nessuna descrizione disponibile.'}
                                        </div>
                                    </div>
                                </div>

                                {/* Checkboxes */}
                                <div className="flex-1 flex overflow-x-auto">
                                    {roles.map(role => {
                                        const isGranted = role.permissions?.includes(perm.code);
                                        const isSuperAdmin = role.name === 'super_admin';
                                        return (
                                            <div key={`${role.id}-${perm.code}`} className="min-w-[100px] flex-1 p-3 flex justify-center items-center border-r border-white/5 last:border-r-0">
                                                <button
                                                    onClick={() => !isSuperAdmin && onTogglePermission(role, perm.code)}
                                                    disabled={isSuperAdmin}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 transform hover:scale-110
                                                        ${isGranted
                                                            ? 'bg-green-500 border-green-400 text-white shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                                                            : 'bg-slate-700/50 border-slate-600 text-transparent hover:border-gray-400'}
                                                        ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                                    `}
                                                    title={isSuperAdmin ? 'Super Admin ha sempre tutti i permessi' : (isGranted ? 'Clicca per rimuovere' : 'Clicca per abilitare')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Footer Note */}
            <div className="p-3 bg-amber-900/20 text-amber-200 text-xs text-center rounded-xl border border-amber-500/20 flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>Il ruolo <strong>Super Admin</strong> ha sempre tutti i permessi attivi e non può essere modificato.</span>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState('users'); // users, permissions
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permDefinitions, setPermDefinitions] = useState([]);
    // State per ricerca
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // New: Edit Mode
    const [editUserId, setEditUserId] = useState(null); // New: ID to edit
    const [showPassword, setShowPassword] = useState(false); // Toggle password visibility

    const { toast, showConfirm } = useUI();

    const [form, setForm] = useState({
        username: '',
        password: '',
        full_name: '',
        role: '',
        email: '',
        department_id: null
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, empsData, rolesData, defsData] = await Promise.all([
                usersApi.getUsers(),
                employeesApi.getEmployees(),
                rolesApi.getRoles(),
                rolesApi.getDefinitions()
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setEmployees(Array.isArray(empsData) ? empsData : []);
            setRoles(Array.isArray(rolesData) ? rolesData : []);
            setPermDefinitions(Array.isArray(defsData) ? defsData : []);
        } catch (error) {
            console.error(error);
            toast.error("Errore caricamento dati");
        } finally {
            setLoading(false);
        }
    };

    // Filtered Users
    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditUserId(null);
        setForm({
            username: '',
            password: '',
            full_name: '',
            role: '',
            email: '',
            department_id: null,
            employee_id: 0  // Initialize for employee linking
        });
        setShowModal(true);
    };

    // Open Edit Modal
    const openEditModal = (user) => {
        setIsEditMode(true);
        setEditUserId(user.id);
        const userRole = roles.find(r => r.label === user.role_label)?.name || user.role;
        setForm({
            username: user.username,
            password: '', // Leave empty to not change
            full_name: user.full_name,
            role: userRole,
            email: user.email || '',
            department_id: user.department_id || null,
            employee_id: user.employee_id || 0 // Load existing link or 0
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Confirmation before saving
        const action = isEditMode ? 'modificare' : 'creare';
        const confirmed = await showConfirm({
            title: `Conferma ${isEditMode ? 'Modifica' : 'Creazione'}`,
            message: `Sei sicuro di voler ${action} l'utente ${form.username}?`,
            type: 'info'
        });

        if (!confirmed) return;

        try {
            if (isEditMode) {
                // Only send fields that have actual values to avoid 422 errors
                const updateData = {};
                if (form.username) updateData.username = form.username;
                if (form.full_name) updateData.full_name = form.full_name;
                if (form.email) updateData.email = form.email;
                if (form.role) updateData.role = form.role;
                if (form.password) updateData.password = form.password;
                // department_id is optional, only send if explicitly set
                if (form.department_id !== null && form.department_id !== undefined) {
                    updateData.department_id = form.department_id;
                }

                // employee_id - CRITICAL: Send to link/unlink employee dossier
                // Value 0 or null = unlink, positive int = link to that employee
                if (form.employee_id !== undefined) {
                    updateData.employee_id = form.employee_id || 0;
                }

                await usersApi.updateUser(editUserId, updateData);
                toast.success("Utente aggiornato con successo!");
            } else {
                await usersApi.createUser(form);
                toast.success("Utente creato con successo!");
            }
            setShowModal(false);
            setShowPassword(false); // Reset password visibility
            loadData(); // Reload to get updated user list
        } catch (error) {
            toast.error(error.response?.data?.detail || "Errore operazione");
        }
    };

    const handleToggleStatus = async (user) => {
        const action = user.is_active ? 'disattivare' : 'attivare';
        const confirmed = await showConfirm({
            title: `Conferma ${action}`,
            message: `Sei sicuro di voler ${action} l'utente ${user.username}?`,
            type: user.is_active ? 'danger' : 'info'
        });

        if (!confirmed) return;

        try {
            if (user.is_active) await usersApi.deactivateUser(user.id);
            else await usersApi.activateUser(user.id);
            toast.success("Stato utente aggiornato");
            loadData();
        } catch (error) {
            toast.error("Errore modifica stato");
        }
    };

    const handleTogglePermission = async (role, permCode) => {
        if (role.name === 'super_admin') return;

        const currentPerms = role.permissions || [];
        const hasPerm = currentPerms.includes(permCode);

        let newPerms;
        if (hasPerm) {
            newPerms = currentPerms.filter(p => p !== permCode);
        } else {
            newPerms = [...currentPerms, permCode];
        }

        // Optimistic UI update
        const updatedRoles = roles.map(r => r.id === role.id ? { ...r, permissions: newPerms } : r);
        setRoles(updatedRoles);

        try {
            await rolesApi.updateRole(role.id, { permissions: newPerms });
            toast.success(`Permessi aggiornati per ${role.label}`);
        } catch (err) {
            toast.error("Errore salvataggio permessi");
            // Revert
            loadData();
        }
    };

    const handleChangeDefaultHome = async (role, newHome) => {
        // Optimistic UI update
        const updatedRoles = roles.map(r => r.id === role.id ? { ...r, default_home: newHome } : r);
        setRoles(updatedRoles);

        try {
            await rolesApi.updateRole(role.id, { default_home: newHome });
            toast.success(`Pagina iniziale aggiornata per ${role.label}`);
        } catch (err) {
            toast.error("Errore salvataggio pagina iniziale");
            loadData();
        }
    };

    const handleDeleteUser = async (user) => {
        const confirmed = await showConfirm({
            title: 'Conferma Eliminazione',
            message: `Sei sicuro di voler eliminare PERMANENTEMENTE l'utente ${user.username}? Questa azione non è reversibile.`,
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await usersApi.deleteUser(user.id);
            toast.success(`Utente ${user.username} eliminato`);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Errore eliminazione utente");
        }
    };

    const handleEmployeeSelect = (empId) => {
        const emp = employees.find(e => e.id === parseInt(empId));
        if (emp) {
            const suggestedUser = `${emp.first_name.charAt(0).toLowerCase()}${emp.last_name.toLowerCase().replace(/ /g, '')}`;
            setForm({
                ...form,
                full_name: `${emp.first_name} ${emp.last_name}`,
                username: suggestedUser,
                email: emp.email || '',
                department_id: emp.department_id,
                employee_id: emp.id  // CRITICAL: Store employee ID for linking
            });
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 text-white pb-24 md:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Gestione Accessi
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm md:text-base">Gestione completa: Utenti e Permessi della piattaforma</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Tabs */}
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-white/10 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            👥 Utenti
                        </button>
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'permissions' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🔒 Permessi
                        </button>
                    </div>

                    {activeTab === 'users' && (
                        <button
                            onClick={openCreateModal}
                            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                        >
                            <span>➕ Nuovo</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'users' ? (
                        <div className="space-y-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 Cerca utente..."
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <span className="absolute left-3 top-3.5 text-gray-400 text-lg"></span>
                            </div>

                            <UsersTable users={filteredUsers} roles={roles} onToggleStatus={handleToggleStatus} onEdit={openEditModal} onDelete={handleDeleteUser} />
                        </div>
                    ) : (
                        <PermissionsMatrix roles={roles} definitions={permDefinitions} onTogglePermission={handleTogglePermission} onChangeDefaultHome={handleChangeDefaultHome} />
                    )}
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl p-6 md:p-8 transform transition-all scale-100 my-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-white">
                                {isEditMode ? '✏️ Modifica Utente' : '➕ Crea Nuovo Utente'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition p-2">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Employee Selector - Only show in create mode */}
                            {!isEditMode && (
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                    <label className="block text-sm font-bold text-blue-300 mb-2 uppercase tracking-wider">👤 Collega Dipendente (Opzionale)</label>
                                    <select
                                        className="w-full bg-slate-800 border border-white/20 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Seleziona un dipendente...</option>
                                        {employees
                                            .slice()
                                            .sort((a, b) => a.last_name.localeCompare(b.last_name))
                                            .map(e => (
                                                <option key={e.id} value={e.id}>{e.last_name} {e.first_name}</option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        placeholder="es. nome.cognome"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required={!isEditMode} // Required only for create
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 pr-12 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={isEditMode ? "••••••••" : "Min. 8 caratteri"}
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    {isEditMode && (
                                        <p className="text-xs text-amber-400/70 mt-1">
                                            🔒 Compila solo se vuoi cambiarla.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.full_name}
                                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Ruolo</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Seleziona Ruolo...</option>
                                        {roles.map(r => (
                                            <option key={r.name} value={r.name}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {/* Employee Selector - Available in Edit Mode Only (Use wizard at top for Create) */}
                            {isEditMode && (
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                    <label className="block text-sm font-bold text-blue-300 mb-2 uppercase tracking-wider">
                                        🔗 Modifica Collegamento
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className="w-full bg-slate-800 border border-white/20 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            onChange={(e) => {
                                                const empId = parseInt(e.target.value);
                                                setForm(prev => ({ ...prev, employee_id: empId }));
                                                if (!isEditMode) handleEmployeeSelect(e.target.value); // Autofill only on create
                                            }}
                                            value={form.employee_id || ""}
                                        >
                                            <option value={0}>-- Nessun Dipendente Collegato --</option>
                                            {employees
                                                .slice()
                                                .sort((a, b) => a.last_name.localeCompare(b.last_name))
                                                .map(e => (
                                                    <option key={e.id} value={e.id}>
                                                        {e.last_name} {e.first_name} {e.user_id && e.user_id !== editUserId ? '(Già collegato)' : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {form.role && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-sm text-blue-200 flex items-center gap-2">
                                    ℹ️ {roles.find(r => r.name === form.role)?.description}
                                </div>
                            )}

                            <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-gray-300 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg font-bold text-white shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all"
                                >
                                    {isEditMode ? 'Salva' : 'Crea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
