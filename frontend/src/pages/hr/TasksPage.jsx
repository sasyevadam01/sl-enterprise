import { useState, useEffect, useMemo, useRef } from "react";
import { tasksApi, usersApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../components/ui/CustomUI";
import TaskFilters from "../../components/tasks/TaskFilters";
import TaskItem from "../../components/tasks/TaskItem";
import TaskDetailPanel from "../../components/tasks/TaskDetailPanel";
import { motion, AnimatePresence } from 'framer-motion';

export default function TasksPage() {
  const { user } = useAuth();
  const { toast, showConfirm } = useUI();

  // Data State
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]); // FOR SIDEBAR

  // UI State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Filter State
  const [filterMode, setFilterMode] = useState('active'); // 'all', 'active', 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilters, setQuickFilters] = useState({
    mine: false,
    delegated: false,
    today: false,
    urgent: false
  });

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: 5,
    assigned_to: "",
    deadline: "",
    category: "Generale"
  });

  // --- PERMISSIONS ---
  const canManageAll = ["super_admin", "admin", "factory_controller", "hr_manager"].includes(user?.role);
  const isManager = canManageAll;

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    const init = async () => {
      try {
        const tData = await tasksApi.getTasks({});
        setTasks(Array.isArray(tData) ? tData : []);

        try {
          const uData = await usersApi.getUsers();
          setUsersList(Array.isArray(uData) ? uData : uData?.data || []);

          // Initial Online Users Fetch
          try {
            const online = await usersApi.getOnlineUsers();
            setOnlineUsers(Array.isArray(online) ? online : []);
          } catch (e) { }

        } catch (e) {
          console.warn("Could not load users list");
        }
      } catch (err) {
        console.error("Error loading tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Polling for Tasks & Online Users
    const interval = setInterval(async () => {
      try {
        const data = await tasksApi.getTasks({});
        setTasks(current => Array.isArray(data) ? data : current);

        // Refresh online users
        if (window.innerWidth >= 1024) { // Only needed for sidebar on desktop
          const online = await usersApi.getOnlineUsers();
          setOnlineUsers(Array.isArray(online) ? online : []);
        }
      } catch (e) { }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---

  const handleTaskSelect = (task) => {
    setSelectedTaskId(task.id);
    setIsMobileDetailOpen(true);
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      let payload = updates;
      if (typeof updates === 'string') {
        payload = { status: updates };
      }
      await tasksApi.updateTask(taskId, payload);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...payload } : t));
      if (updates === 'completed' || payload.status === 'completed') {
        toast.success("Task completato! 🎉");
      }
    } catch (err) {
      toast.error("Errore aggiornamento task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = await showConfirm({
      title: "Elimina Task",
      message: "Sei sicuro? L'operazione è irreversibile.",
      type: "danger"
    });
    if (!confirmed) return;

    try {
      await tasksApi.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
        setIsMobileDetailOpen(false);
      }
      toast.success("Task eliminato");
    } catch (e) {
      toast.error("Errore eliminazione");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return toast.warning("Inserisci almeno un titolo");
    if (!newTask.assigned_to) return toast.warning("Assegna il task a qualcuno");

    try {
      const payload = {
        ...newTask,
        deadline: newTask.deadline || null,
        assigned_to: parseInt(newTask.assigned_to)
      };
      const created = await tasksApi.createTask(payload);
      setTasks(prev => [created, ...prev]);
      setShowCreateModal(false);

      // Auto-select the new task to allow adding details immediately
      setSelectedTaskId(created.id);
      setIsMobileDetailOpen(true);

      setNewTask({ title: "", description: "", priority: 5, assigned_to: "", deadline: "", category: "Generale" });
      toast.success("Task creato! Aggiungi ora checklist e file.");
    } catch (e) {
      toast.error("Errore creazione task");
    }
  };

  // --- FILTER LOGIC ---
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'active') result = result.filter(t => t.status !== 'completed');
    if (filterMode === 'completed') result = result.filter(t => t.status === 'completed');

    if (quickFilters.mine) result = result.filter(t => String(t.assigned_to) === String(user?.id));
    if (quickFilters.urgent) result = result.filter(t => t.priority >= 8);
    if (quickFilters.today) {
      const today = new Date().toDateString();
      result = result.filter(t => t.deadline && new Date(t.deadline).toDateString() === today);
    }
    if (quickFilters.delegated) {
      result = result.filter(t => String(t.author_id) === String(user?.id) && String(t.assigned_to) !== String(user?.id));
    }

    return result.sort((a, b) => b.priority - a.priority || new Date(a.deadline) - new Date(b.deadline));
  }, [tasks, searchQuery, filterMode, quickFilters, user?.id]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-950 overflow-hidden flex relative">

      {/* === LEFT COLUMN: NAVIGATION & ONLINE USERS (Desktop Only) === */}
      <div className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-slate-900/50 p-4 gap-6 overflow-y-auto scrollbar-hide">
        <div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1">TASKS</h2>
          <div className="text-xs text-gray-500 font-mono">PRODUCTIVITY HUB</div>
        </div>

        <nav className="space-y-1">
          <button onClick={() => setFilterMode('active')} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm transition ${filterMode === 'active' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'}`}>
            📥 Inbox
          </button>
          <button onClick={() => { setQuickFilters({ ...quickFilters, mine: !quickFilters.mine }); }} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm transition ${quickFilters.mine ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'}`}>
            👤 I Miei Task
          </button>
          <button onClick={() => { setQuickFilters({ ...quickFilters, urgent: !quickFilters.urgent }); }} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm transition ${quickFilters.urgent ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:bg-white/5'}`}>
            🔥 Urgenti
          </button>
          <div className="h-px bg-white/5 my-2"></div>
          <button onClick={() => setFilterMode('completed')} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm transition ${filterMode === 'completed' ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}>
            ✅ Completati
          </button>
        </nav>

        {/* ONLINE USERS SECTION */}
        <div className="flex-grow">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group transition">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition">
                  {u.username.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-white truncate">{u.fullName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === MIDDLE COLUMN: LIST === */}
      <div className={`flex flex-col flex-grow lg:w-96 lg:flex-none border-r border-white/5 bg-slate-950 transition-all ${selectedTaskId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 bg-slate-900/30 backdrop-blur-sm z-10">
          {/* On Desktop, we might want to hide pills if side-nav covers it, but Search is needed.
                    Let's adapt TaskFilters style via CSS/Props in future, for now it wraps gracefully.
                */}
          <TaskFilters
            currentFilter={filterMode}
            onFilterChange={setFilterMode}
            quickFilters={quickFilters}
            onQuickFilterToggle={(k) => setQuickFilters(prev => ({ ...prev, [k]: !prev[k] }))}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
          />
        </div>

        <div className="flex-grow overflow-y-auto p-4 scrollbar-hide">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-4xl mb-4 opacity-30">📭</div>
              <p>Nessun task trovato</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onClick={() => handleTaskSelect(task)}
                currentUserId={user?.id}
              />
            ))
          )}
          {/* Spacer for FAB */}
          <div className="h-32 lg:h-0"></div>
        </div>
      </div>

      {/* === RIGHT COLUMN: DETAIL (Desktop) === */}
      <div className="hidden lg:block flex-grow bg-slate-900 relative">
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          canAct={canManageAll || selectedTask?.assigned_to === user?.id}
          isManager={isManager}
          currentUser={user}
        />
      </div>

      {/* === MOBILE DETAIL OVERLAY === */}
      <AnimatePresence>
        {isMobileDetailOpen && selectedTask && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-slate-950 lg:hidden flex flex-col pt-safe"
          >
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setIsMobileDetailOpen(false)}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              canAct={canManageAll || selectedTask?.assigned_to === user?.id}
              isManager={isManager}
              currentUser={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === FAB === */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 lg:bottom-10 right-6 z-40 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] flex items-center justify-center text-3xl transition-transform hover:scale-110 active:scale-95"
        title="Nuovo Task"
      >
        +
      </button>

      {/* === CREATE MODAL (Enhanced) === */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-0">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-slate-900 border border-white/10 rounded-t-2xl md:rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">Nuovo Task</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="Titolo del task..."
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-bold placeholder-gray-500 focus:border-blue-500 outline-none"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                />

                <textarea
                  placeholder="Descrizione (opzionale)"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-gray-300 min-h-[100px] outline-none"
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Assegnatario</label>
                    <select
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={newTask.assigned_to}
                      onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    >
                      <option value="">Seleziona...</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Categoria</label>
                    <select
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={newTask.category}
                      onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                    >
                      <option value="Generale">Generale</option>
                      <option value="Produzione">Produzione</option>
                      <option value="Manutenzione">Manutenzione</option>
                      <option value="HR">HR</option>
                      <option value="Amministrazione">Amministrazione</option>
                      <option value="Sicurezza">Sicurezza</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold mb-1 block flex justify-between">
                    <span>Priorità (1-10)</span>
                    <span className={`font-mono ${newTask.priority >= 8 ? 'text-red-400' : 'text-blue-400'}`}>
                      Valore: {newTask.priority}
                      {newTask.priority >= 8 && " (URGENTE)"}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase font-bold">
                    <span>Bassa</span>
                    <span>Media</span>
                    <span>Alta</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Scadenza</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={newTask.deadline}
                    onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-gray-400 hover:bg-slate-800 rounded-lg font-bold">Annulla</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg">Crea Task</button>
                </div>
                <p className="text-center text-[10px] text-gray-500 mt-2">
                  * Checklist e file potranno essere aggiunti dopo la creazione.
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
