/**
 * SL Enterprise - Advanced Task Management
 * "To-Do List" style with granular priority and tracking.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { ChecklistRenderer } from "../../components/tasks/ChecklistRenderer";
import TaskAttachments from "../../components/tasks/TaskAttachments";
import TaskComments from "../../components/tasks/TaskComments";
import TaskCalendarWidget from "../../components/tasks/TaskCalendarWidget";
import TaskUserGuide from "../../components/tasks/TaskUserGuide";
import TaskSearchBar from "../../components/tasks/TaskSearchBar";
import TaskSection from "../../components/tasks/TaskSection";
import { tasksApi, usersApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../components/ui/CustomUI";

// --- UTILS ---
const getPriorityColor = (p) => {
  if (p >= 8) return "bg-red-100 text-red-700 ring-1 ring-red-200"; // Emergency
  if (p >= 5) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200"; // Medium
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200"; // Low
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// --- COMPONENTS ---

const calculateChecklistProgress = (items) => {
  if (!items || items.length === 0) return [0, 0, 0];
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  return [done, total, Math.round((done / total) * 100)];
};

const statusConfig = {
  pending: { label: 'Da Fare', cls: 'bg-slate-100 text-slate-600' },
  acknowledged: { label: 'Visto', cls: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Corso', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completato', cls: 'bg-emerald-100 text-emerald-700' },
};

const TaskItem = ({
  task,
  onAction,
  onDelete,
  onEdit,
  isManager,
  currentUserId,
  onInteract,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [doneChecks, totalChecks] = calculateChecklistProgress(
    task.checklist,
  );

  const toggleChecklist = async (index, newVal) => {
    const newChecklist = [...task.checklist];
    newChecklist[index].done = newVal;
    await onAction(task.id, { checklist: newChecklist });
  };

  const handleAction = (type) => {
    onAction(task.id, type);
  };

  const openInteractions = (e) => {
    e.stopPropagation();
    if (onInteract) onInteract(task);
  };

  const isAssignee = task.assigned_to === currentUserId;
  const canAct = isManager || isAssignee;
  const st = statusConfig[task.status] || statusConfig.pending;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

  return (
    <div className={`border-b border-slate-100 last:border-b-0 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
      {/* ── Main Row ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Priority Badge */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </div>

        {/* Title + Assignee */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {task.title}
            </span>
            {task.recurrence !== 'none' && (
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">RIC</span>
            )}
            {totalChecks > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                {doneChecks}/{totalChecks}
              </span>
            )}
            {task.attachments?.length > 0 && (
              <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium">
                {task.attachments.length} file
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate mt-0.5">
            {task.assignee_name || 'Non assegnato'}
          </div>
        </div>

        {/* Deadline */}
        <div className="flex-shrink-0 w-28 text-right hidden md:block">
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
            {formatDate(task.deadline)}
          </span>
        </div>

        {/* Status Pill */}
        <div className="flex-shrink-0 w-24 text-center hidden sm:block">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>
            {st.label}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {task.status === 'pending' && canAct && (
            <button onClick={() => handleAction('acknowledged')} className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 transition cursor-pointer" title="Segna come Visto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          )}
          {(task.status === 'pending' || task.status === 'acknowledged') && canAct && (
            <button onClick={() => handleAction('in_progress')} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition cursor-pointer" title="Inizia">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          )}
          {task.status === 'in_progress' && canAct && (
            <button onClick={() => handleAction('completed')} className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition cursor-pointer" title="Completa">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          )}
          <button onClick={openInteractions} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition cursor-pointer" title="Chat & Allegati">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </button>
          {(isManager || canAct) && (
            <button onClick={() => onEdit(task)} disabled={!!task.locked_by && task.locked_by !== currentUserId} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition disabled:opacity-30 cursor-pointer" title="Modifica">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          )}
          {isManager && (
            <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition cursor-pointer" title="Elimina">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>

        {/* Expand Arrow */}
        <svg className={`w-4 h-4 text-slate-300 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                {task.title}
                {task.category && (
                  <span className="text-[10px] uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-slate-500">{task.category}</span>
                )}
              </h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {task.tags?.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">#{tag}</span>
                ))}
              </div>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{task.description || 'Nessuna descrizione.'}</p>

              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <p>Assegnato da: <strong className="text-slate-600">{task.author_name}</strong> il {formatDate(task.created_at)}</p>
                {task.acknowledged_at && <p>Visto il: {formatDate(task.acknowledged_at)}</p>}
                {task.started_at && <p>Iniziato il: {formatDate(task.started_at)}</p>}
                {task.completed_at && <p>Completato da: <strong className="text-slate-600">{task.completer_name}</strong> il {formatDate(task.completed_at)}</p>}
                {task.reopen_reason && <p className="text-orange-600">Riaperto: {task.reopen_reason}</p>}
              </div>

              {canAct && (task.status === 'in_progress' || task.status === 'completed') && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <button onClick={() => handleAction('pending')} className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 text-xs rounded-lg hover:bg-orange-100 transition cursor-pointer">
                    Riporta a "Da Fare"
                  </button>
                </div>
              )}
            </div>
            <div>
              <ChecklistRenderer
                items={task.checklist}
                onToggle={(idx) => toggleChecklist(idx, !task.checklist[idx].done)}
                readOnly={!canAct || task.status === 'completed'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TasksPage() {
  const { user } = useAuth();
  const { toast, showConfirm } = useUI();
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: 1,
    assigned_to: "",
    recurrence: "none",
    deadline: "",
    checklist: [],
    category: "",
    tags: [],
  });
  const [checklistInput, setChecklistInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const pendingFileInputRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("active");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [interactionTask, setInteractionTask] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // NEW: Smart Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [quickFilters, setQuickFilters] = useState({
    mine: false,
    delegated: false,
    today: false,
    overdue: false,
    urgent: false
  });

  const refreshSingleTask = async (taskId) => {
    try {
      const taskData = await tasksApi.getTask(taskId);
      // Note: axios interceptor already unwraps .data, so taskData IS the task
      if (taskData) {
        setInteractionTask(taskData);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? taskData : t)));
      }
    } catch (error) {
      console.error("Failed to refresh task", error);
    }
  };

  const canCreate = [
    "super_admin",
    "admin",
    "factory_controller",
    "hr_manager",
    "coordinator",
  ].includes(user?.role);
  const canManageAll = [
    "super_admin",
    "admin",
    "factory_controller",
    "hr_manager",
  ].includes(user?.role);
  const isManager = canManageAll; // Controls extra powers like deleting others' tasks

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Always load tasks first - this is critical
        const tData = await tasksApi.getTasks({});
        const validTasks = Array.isArray(tData) ? tData : [];
        setTasks(validTasks);
        // console.log("Tasks loaded:", validTasks.length);

        // 2. Try to load users list (only managers/admins can access this)
        try {
          const uData = await usersApi.getUsers();
          setUsersList(Array.isArray(uData) ? uData : uData?.data || []);
        } catch (usersErr) {
          // Non-admins can't fetch users list - this is expected
          console.log(
            "Could not load users list (non-admin user):",
            usersErr?.response?.status,
          );
          setUsersList([]);
        }
      } catch (err) {
        console.error("Error loading tasks:", err);
        if (toast) toast.error("Errore caricamento task");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh
  // Refresh with silent option for polling
  const refreshTasks = async (silent = false) => {
    try {
      // console.log("Refreshing tasks..."); // Reduce log spam
      const data = await tasksApi.getTasks({});
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      if (!silent && toast) toast.error("Errore aggiornamento lista");
    }
  };

  // Polling for live updates
  useEffect(() => {
    const interval = setInterval(() => refreshTasks(true), 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleUpdate = async (id, data) => {
    try {
      // If data is a string, it's a status action
      if (typeof data === "string") {
        let updatePayload = {};
        if (data === "acknowledged") updatePayload = { status: "acknowledged" };
        else if (data === "in_progress")
          updatePayload = { status: "in_progress" };
        else if (data === "completed") updatePayload = { status: "completed" };
        else if (data === "pending")
          updatePayload = {
            status: "pending",
            reopen_reason: "Riaperto manualmente",
          };
        await tasksApi.updateTask(id, updatePayload);
      } else {
        // Otherwise, it's a direct data update (e.g., checklist)
        await tasksApi.updateTask(id, data);
      }
      refreshTasks();
    } catch {
      toast.error("Errore aggiornamento task");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: "Elimina Task",
      message:
        "Sei sicuro di voler eliminare definitivamente questo task? L'operazione è irreversibile.",
      type: "danger",
      confirmText: "Elimina",
    });

    if (!confirmed) return;

    try {
      await tasksApi.deleteTask(id);
      toast.success("Task eliminato correttamente");
      refreshTasks();
    } catch {
      toast.error("Impossibile eliminare il task");
    }
  };

  const handleEdit = async (task) => {
    // 1. Try to lock
    try {
      await tasksApi.lockTask(task.id);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.detail);
        return;
      }
      // Ignore generic errors if it's just user double clicking
    }

    // 2. Populate form
    setNewTask({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to,
      priority: task.priority,
      recurrence: task.recurrence || "none",
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      checklist: task.checklist || [],
      category: task.category || "",
      tags: task.tags || [],
    });
    setEditingTaskId(task.id);
    setShowModal(true);
  };

  // Check if form has unsaved data
  const hasUnsavedData = () => {
    return (
      newTask.title.trim() !== '' ||
      newTask.description.trim() !== '' ||
      newTask.assigned_to !== '' ||
      newTask.checklist.length > 0 ||
      pendingFiles.length > 0
    );
  };

  const handleCloseModal = async () => {
    // Confirm if form has data
    if (!editingTaskId && hasUnsavedData()) {
      const confirmed = await showConfirm(
        "Chiudi senza salvare?",
        "Hai dati non salvati. Sei sicuro di voler chiudere?"
      );
      if (!confirmed) return;
    }

    if (editingTaskId) {
      try {
        await tasksApi.unlockTask(editingTaskId);
      } catch { /* ignore */ }
    }
    setShowModal(false);
    setEditingTaskId(null);
    setNewTask({
      title: "",
      description: "",
      assigned_to: "",
      priority: 5,
      recurrence: "none",
      deadline: "",
      checklist: [],
      category: "",
      tags: [],
    });
    setChecklistInput("");
    setPendingFiles([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validazione base
    if (!newTask.assigned_to) {
      toast.warning("Devi assegnare il task a un utente.");
      return;
    }

    const processedTags =
      typeof newTask.tags === "string"
        ? newTask.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
        : newTask.tags;

    const payload = {
      ...newTask,
      assigned_to: parseInt(newTask.assigned_to),
      deadline: newTask.deadline || null,
      tags: processedTags,
    };

    try {
      let savedTaskId = editingTaskId;

      if (editingTaskId) {
        // UPDATE
        await tasksApi.updateTask(editingTaskId, payload);
        await tasksApi.unlockTask(editingTaskId);
        toast.success("Task aggiornato!");
      } else {
        // CREATE
        const createdTask = await tasksApi.createTask(payload);
        savedTaskId = createdTask.id;
        toast.success("Task creato e assegnato con successo!");
      }

      // Upload pending files (Solution B: two-step workflow)
      if (pendingFiles.length > 0 && savedTaskId) {
        let uploadedCount = 0;
        for (const file of pendingFiles) {
          try {
            await tasksApi.uploadAttachment(savedTaskId, file);
            uploadedCount++;
          } catch (uploadErr) {
            console.error("Error uploading file:", file.name, uploadErr);
          }
        }
        if (uploadedCount > 0) {
          toast.success(`${uploadedCount} allegato/i caricato/i!`);
        }
        if (uploadedCount < pendingFiles.length) {
          toast.warning(`${pendingFiles.length - uploadedCount} file non caricato/i`);
        }
      }

      // IMPORTANT: Close modal FIRST, then refresh
      setShowModal(false);
      setEditingTaskId(null);
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        priority: 5,
        recurrence: "none",
        deadline: "",
        checklist: [],
        category: "",
        tags: [],
      });
      setChecklistInput("");
      setPendingFiles([]);

      // Refresh list (non-blocking)
      refreshTasks(true).catch(console.error);
    } catch (err) {
      console.error("Errore salvataggio:", err);
      toast.error("Errore nel salvataggio. Controlla i dati.");
    }
  };

  // Pending files handlers
  const handlePendingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast.warning(`${f.name} troppo grande (max 10MB)`);
        return false;
      }
      return true;
    });
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (pendingFileInputRef.current) pendingFileInputRef.current.value = "";
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Checklist move functions
  const moveChecklistUp = (index) => {
    if (index === 0) return;
    setNewTask(prev => {
      const newChecklist = [...prev.checklist];
      [newChecklist[index - 1], newChecklist[index]] = [newChecklist[index], newChecklist[index - 1]];
      return { ...prev, checklist: newChecklist };
    });
  };

  const moveChecklistDown = (index) => {
    if (index >= newTask.checklist.length - 1) return;
    setNewTask(prev => {
      const newChecklist = [...prev.checklist];
      [newChecklist[index], newChecklist[index + 1]] = [newChecklist[index + 1], newChecklist[index]];
      return { ...prev, checklist: newChecklist };
    });
  };

  // Quick Urgent Button
  const setUrgent = () => {
    const now = new Date();
    now.setHours(23, 59, 0, 0); // Today at 23:59
    const deadline = now.toISOString().slice(0, 16);
    setNewTask(prev => ({
      ...prev,
      priority: 10,
      deadline: deadline,
      category: 'Urgenza'
    }));
    toast.info('Modalità URGENTE attivata');
  };

  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setNewTask((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { text: checklistInput, done: false }],
    }));
    setChecklistInput("");
  };

  const removeChecklistItem = (idx) => {
    setNewTask((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== idx),
    }));
  };

  // Helper: check if date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  // Helper: check if date is past
  const isPast = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Helper: match search query
  const matchesSearch = (task, query) => {
    if (!query || query.length < 2) return true;
    const q = query.toLowerCase();
    return (
      task.title?.toLowerCase().includes(q) ||
      task.description?.toLowerCase().includes(q) ||
      task.assignee_name?.toLowerCase().includes(q) ||
      task.author_name?.toLowerCase().includes(q) ||
      task.category?.toLowerCase().includes(q) ||
      task.tags?.some(t => t.toLowerCase().includes(q)) ||
      task.attachments?.some(a => a.filename?.toLowerCase().includes(q))
    );
  };

  // Filter Logic with Smart Search
  const filteredTasks = useMemo(() => {
    const validTasks = Array.isArray(tasks) ? tasks : [];

    // DEBUG: Log initial state
    // console.log(`[FILTER START] ValidTasks: ${validTasks.length}, Filter: "${filter}", QuickFilters:`, quickFilters);

    return validTasks.filter((t) => {
      // DEBUG: Log each task evaluation
      // console.log(`[FILTER CHECK] Task ${t.id} (${t.title}): Status=${t.status}, AssignedTo=${t.assigned_to}, CreatedBy=${t.assigned_by}`);

      // Status filter
      if (filter === "active" && t.status === "completed") return false;
      if (filter === "completed" && t.status !== "completed") return false;

      // Search filter
      if (!matchesSearch(t, searchQuery)) return false;

      // Calendar date filter
      if (selectedCalendarDate) {
        if (!t.deadline) return false;
        const taskDate = new Date(t.deadline).toDateString();
        const selectedDateStr = selectedCalendarDate.toDateString();
        if (taskDate !== selectedDateStr) return false;
      }

      // Quick filters (OR logic if any active)
      const hasQuickFilter = Object.values(quickFilters).some(v => v);
      if (hasQuickFilter) {
        let passesQuickFilter = false;

        // Helper for ID compare
        const sameId = (a, b) => String(a) === String(b);

        if (quickFilters.mine && sameId(t.assigned_to, user?.id)) passesQuickFilter = true;

        // FIX: Use assigned_by instead of created_by
        const taskAuthor = t.assigned_by || t.author_id;
        if (quickFilters.delegated && sameId(taskAuthor, user?.id) && !sameId(t.assigned_to, user?.id)) passesQuickFilter = true;

        if (quickFilters.today && isToday(t.deadline)) passesQuickFilter = true;
        if (quickFilters.overdue && isPast(t.deadline) && t.status !== "completed") passesQuickFilter = true;
        if (quickFilters.urgent && t.priority >= 8) passesQuickFilter = true;

        if (!passesQuickFilter) {
          // console.log(`[FILTER SKIP] Task ${t.id} failed quick filters`);
          return false;
        }
      }
      return true;
    });
  }, [tasks, filter, searchQuery, selectedCalendarDate, quickFilters, user?.id]);

  // Grouped tasks for Inbox view
  // HELPER: Robust ID check
  const sameId = (a, b) => String(a) === String(b);

  const myTasks = useMemo(() =>
    filteredTasks.filter(t => sameId(t.assigned_to, user?.id) && t.status !== "completed"),
    [filteredTasks, user?.id]);

  const delegatedTasks = useMemo(() =>
    filteredTasks.filter(t => {
      const author = t.assigned_by || t.author_id;
      return sameId(author, user?.id) && !sameId(t.assigned_to, user?.id) && t.status !== "completed";
    }),
    [filteredTasks, user?.id]);

  const completedTasks = useMemo(() =>
    filteredTasks.filter(t => t.status === "completed"),
    [filteredTasks]);

  const otherTasks = useMemo(() =>
    filteredTasks.filter(t => {
      const author = t.assigned_by || t.author_id;
      return !sameId(t.assigned_to, user?.id) &&
        !sameId(author, user?.id) &&
        t.status !== "completed";
    }),
    [filteredTasks, user?.id]);

  // Toggle quick filter
  const toggleQuickFilter = (key) => {
    setQuickFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Clear all quick filters
  const clearQuickFilters = () => {
    setQuickFilters({ mine: false, delegated: false, today: false, overdue: false, urgent: false });
  };

  if (loading)
    return <div className="p-10 text-center text-slate-500">Caricamento...</div>;

  const inputClasses =
    "w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClasses = "block text-sm font-medium text-slate-600 mb-1";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Task Board
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assegna, monitora e completa le attività operative.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition flex items-center gap-2 text-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuovo Task
            </button>
          )}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-3 py-2.5 rounded-lg transition border cursor-pointer ${showCalendar ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
            title="Calendario Scadenze"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-3 py-2.5 rounded-lg transition border cursor-pointer ${showGuide ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
            title="Guida Utente"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar Widget */}
      {showCalendar && (
        <div className="mb-6 animate-fade-in flex flex-col items-center gap-3">
          <TaskCalendarWidget
            tasks={tasks}
            selectedDate={selectedCalendarDate}
            onDateSelect={(date) => {
              // Toggle: if same date clicked, deselect
              if (selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString()) {
                setSelectedCalendarDate(null);
              } else {
                setSelectedCalendarDate(date);
                setFilter('all'); // Show all to see results
              }
            }}
          />
          {selectedCalendarDate && (
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="text-sm text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              ✕ Rimuovi filtro data
            </button>
          )}
        </div>
      )}

      {/* Search Bar + Quick Filters */}
      <div className="space-y-4">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-3">
          <TaskSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            tasks={tasks}
            users={usersList}
            onSelectSuggestion={(suggestion) => {
              if (suggestion.type === 'person') {
                setSearchQuery(suggestion.name);
              }
            }}
          />

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${filter === "active" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              Attivi
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${filter === "completed" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              Completati
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${filter === "all" ? "bg-slate-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              Tutti
            </button>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider mr-1">Filtri:</span>

          <button
            onClick={() => toggleQuickFilter('mine')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${quickFilters.mine
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
          >
            A me
            {quickFilters.mine && <span className="text-xs opacity-70">({myTasks.length})</span>}
          </button>

          <button
            onClick={() => toggleQuickFilter('delegated')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${quickFilters.delegated
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
          >
            Delegati
          </button>

          <button
            onClick={() => toggleQuickFilter('today')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${quickFilters.today
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
          >
            Oggi
          </button>

          <button
            onClick={() => toggleQuickFilter('overdue')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${quickFilters.overdue
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
          >
            Scaduti
          </button>

          <button
            onClick={() => toggleQuickFilter('urgent')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${quickFilters.urgent
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
          >
            Urgenti
          </button>

          {Object.values(quickFilters).some(v => v) && (
            <button
              onClick={clearQuickFilters}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              ✕ Pulisci
            </button>
          )}
        </div>

        {/* Active Search/Filter Indicator */}
        {(searchQuery || Object.values(quickFilters).some(v => v)) && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <span>Risultati: <strong className="text-slate-800">{filteredTasks.length}</strong> task trovati</span>
            {searchQuery && (
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 text-slate-600">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* INBOX VIEW - Task Sections */}
      <div className="space-y-6">

        {/* Section: My Tasks (assigned to me) */}
        {filter !== "completed" && (
          <TaskSection
            title="Da Fare"
            count={myTasks.length}
            color="blue"
            emptyMessage="Nessun task assegnato a te"
          >
            {myTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onAction={handleUpdate}
                onDelete={handleDelete}
                isManager={isManager}
                currentUserId={user?.id}
                onInteract={(t) => setInteractionTask(t)}
              />
            ))}
          </TaskSection>
        )}

        {/* Section: Delegated Tasks (created by me, assigned to others) */}
        {filter !== "completed" && delegatedTasks.length > 0 && (
          <TaskSection
            title="In Attesa di Altri"
            count={delegatedTasks.length}
            color="purple"
            emptyMessage="Nessun task delegato"
          >
            {delegatedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onAction={handleUpdate}
                onDelete={handleDelete}
                isManager={isManager}
                currentUserId={user?.id}
                onInteract={(t) => setInteractionTask(t)}
              />
            ))}
          </TaskSection>
        )}

        {/* Section: Other Tasks (for managers - tasks from team) */}
        {filter !== "completed" && isManager && otherTasks.length > 0 && (
          <TaskSection
            title="Task del Team"
            count={otherTasks.length}
            color="yellow"
            defaultExpanded={false}
            emptyMessage="Nessun altro task"
          >
            {otherTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onAction={handleUpdate}
                onDelete={handleDelete}
                isManager={isManager}
                currentUserId={user?.id}
                onInteract={(t) => setInteractionTask(t)}
              />
            ))}
          </TaskSection>
        )}

        {/* Section: Completed Tasks */}
        {(filter === "completed" || filter === "all") && completedTasks.length > 0 && (
          <TaskSection
            title="Completati"
            count={completedTasks.length}
            color="green"
            defaultExpanded={filter === "completed"}
            emptyMessage="Nessun task completato"
          >
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onAction={handleUpdate}
                onDelete={handleDelete}
                isManager={isManager}
                currentUserId={user?.id}
                onInteract={(t) => setInteractionTask(t)}
              />
            ))}
          </TaskSection>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            <p className="text-slate-400">Nessun task trovato con i filtri selezionati.</p>
            {(searchQuery || Object.values(quickFilters).some(v => v)) && (
              <button
                onClick={() => { setSearchQuery(''); clearQuickFilters(); }}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm cursor-pointer"
              >
                Pulisci tutti i filtri
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interaction Modal */}
      {interactionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-200 flex flex-col shadow-2xl relative">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl text-slate-900 font-bold flex items-center gap-3">
                  {interactionTask.title}
                  <span className="text-sm font-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    #{interactionTask.id}
                  </span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {interactionTask.description}
                </p>
              </div>
              <button
                onClick={() => setInteractionTask(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Body grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200">
              <div className="p-6 overflow-hidden flex flex-col">
                <TaskComments
                  taskId={interactionTask.id}
                  comments={interactionTask.comments}
                  onRefresh={() => refreshSingleTask(interactionTask.id)}
                />
              </div>
              <div className="p-6 overflow-hidden flex flex-col bg-slate-50">
                <TaskAttachments
                  taskId={interactionTask.id}
                  attachments={interactionTask.attachments}
                  onRefresh={() => refreshSingleTask(interactionTask.id)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingTaskId ? "Modifica Task" : "Nuovo Task"}
                  </h2>
                  {!editingTaskId && (
                    <button
                      type="button"
                      onClick={setUrgent}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${newTask.priority === 10
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                        }`}
                    >
                      URGENTE
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-700 text-xl p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Main Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className={labelClasses}>Titolo Attività</label>
                  <input
                    required
                    type="text"
                    className={inputClasses}
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="Es. Manutenzione Linea 1..."
                  />
                </div>

                <div>
                  <label className={labelClasses}>Assegna A</label>
                  <select
                    required
                    className={inputClasses}
                    value={newTask.assigned_to}
                    onChange={(e) =>
                      setNewTask({ ...newTask, assigned_to: e.target.value })
                    }
                  >
                    <option value="">Seleziona utente...</option>
                    {usersList?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role_label || u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Priorità (1-10)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          priority: parseInt(e.target.value),
                        })
                      }
                      className="flex-grow h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span
                      className={`font - bold text - xl w - 10 text - center ${newTask.priority >= 8 ? "text-red-500" : newTask.priority >= 5 ? "text-yellow-500" : "text-green-500"} `}
                    >
                      {newTask.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    1=Bassa, 5=Media, 10=Emergenza
                  </p>
                </div>

                <div>
                  <label className={labelClasses}>Scadenza (Data e Ora)</label>
                  <input
                    type="datetime-local"
                    className={inputClasses}
                    value={newTask.deadline}
                    onChange={(e) =>
                      setNewTask({ ...newTask, deadline: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClasses}>Ricorrenza</label>
                  <select
                    className={inputClasses}
                    value={newTask.recurrence}
                    onChange={(e) =>
                      setNewTask({ ...newTask, recurrence: e.target.value })
                    }
                  >
                    <option value="none">Nessuna</option>
                    <option value="daily">Giornaliera</option>
                    <option value="weekly">Settimanale</option>
                    <option value="monthly">Mensile</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Categoria</label>
                  <select
                    value={newTask.category}
                    onChange={(e) =>
                      setNewTask({ ...newTask, category: e.target.value })
                    }
                    className={inputClasses}
                  >
                    <option value="">Generale</option>
                    <option value="Manutenzione">Manutenzione</option>
                    <option value="Pulizia">Pulizia</option>
                    <option value="Produzione">Produzione</option>
                    <option value="Urgenza">Urgenza</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClasses}>
                    Tags (separati da virgola)
                  </label>
                  <input
                    type="text"
                    value={
                      typeof newTask.tags === "string"
                        ? newTask.tags
                        : (newTask.tags || []).join(", ")
                    }
                    onChange={(e) =>
                      setNewTask({ ...newTask, tags: e.target.value })
                    }
                    placeholder="es. Elettrico, Linea 1, Urgente"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className={labelClasses}>Descrizione Dettagliata</label>
                <textarea
                  className={`${inputClasses} h - 24`}
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Istruzioni operative..."
                />
              </div>

              {/* Checklist Builder */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className={`${labelClasses} mb-2`}>
                  Checklist Operativa (Opzionale)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Nuova voce checklist..."
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addChecklistItem())
                    }
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="bg-blue-600 px-4 rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  {newTask.checklist?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 gap-2"
                    >
                      {/* Move arrows */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveChecklistUp(idx)}
                          disabled={idx === 0}
                          className={`text-xs px-1 py-0.5 rounded transition ${idx === 0
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          title="Sposta su"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChecklistDown(idx)}
                          disabled={idx >= newTask.checklist.length - 1}
                          className={`text-xs px-1 py-0.5 rounded transition ${idx >= newTask.checklist.length - 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          title="Sposta giù"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Item number & text */}
                      <div className="flex items-center gap-2 flex-grow min-w-0">
                        <span className="text-xs text-slate-400 font-mono">{idx + 1}.</span>
                        <span className="text-sm text-slate-700 truncate">{item.text}</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(idx)}
                        className="text-red-400 hover:text-red-300 px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!newTask.checklist || newTask.checklist.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-2">
                      Nessuna voce.
                    </p>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className={`${labelClasses} mb-2`}>
                  Allegati (Opzionale)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="file"
                    ref={pendingFileInputRef}
                    className="hidden"
                    multiple
                    onChange={handlePendingFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <button
                    type="button"
                    onClick={() => pendingFileInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm transition flex items-center justify-center gap-2 border border-dashed border-blue-300 cursor-pointer"
                  >
                    <span>+</span> Aggiungi File
                  </button>
                </div>
                <div className="space-y-2">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white p-2 rounded border border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                        <span className="text-xs text-slate-400">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingFile(idx)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {pendingFiles.length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-2">
                      Nessun file selezionato. Max 10MB per file.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  Salva Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showGuide && <TaskUserGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
