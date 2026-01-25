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
  if (p >= 8) return "bg-red-500 text-white animate-pulse"; // Emergency
  if (p >= 5) return "bg-yellow-500 text-black"; // Medium
  return "bg-green-500 text-white"; // Low
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
  const [doneChecks, totalChecks, checkProgress] = calculateChecklistProgress(
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

  return (
    <div
      className={`group bg-slate-800 rounded-xl border-l-4 overflow-hidden mb-3 hover:bg-slate-750 transition-all ${task.status === "completed"
        ? "border-green-500 opacity-60"
        : task.priority >= 8
          ? "border-red-600 shadow-lg shadow-red-900/20"
          : "border-blue-500"
        }`}
    >
      {/* MAIN ROW */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Priority */}
        <div className="flex flex-col items-center gap-1 mr-2">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${getPriorityColor(task.priority)}`}
          >
            {task.priority}
          </div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
            Urgenza
          </span>
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`text-lg font-semibold truncate ${task.status === "completed" ? "line-through text-gray-500" : "text-white"}`}
            >
              {task.title}
            </h4>
            {task.status === "in_progress" && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 rounded">
                In Corso
              </span>
            )}
            {task.status === "acknowledged" && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 rounded">
                Visto
              </span>
            )}
            {task.recurrence !== "none" && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 rounded">
                🔄 {task.recurrence}
              </span>
            )}
          </div>

          {/* Enhanced Assignee Badge */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 px-3 py-1.5 rounded-lg">
              <span className="text-lg">👤</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Assegnato a</span>
                <span className="text-sm font-semibold text-white">{task.assignee_name || "Non assegnato"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                📅{" "}
                <span
                  className={
                    task.deadline && new Date(task.deadline) < new Date()
                      ? "text-red-400 font-bold"
                      : ""
                  }
                >
                  {formatDate(task.deadline)}
                </span>
              </span>
              {totalChecks > 0 && (
                <span>
                  ✅ {doneChecks}/{totalChecks} ({checkProgress}%)
                </span>
              )}
              {/* Attachment Badge */}
              {task.attachments && task.attachments.length > 0 && (
                <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  📎 {task.attachments.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex-shrink-0 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {task.status === "pending" && canAct && (
            <button
              onClick={() => handleAction("acknowledged")}
              className="px-3 py-1 bg-yellow-600/20 text-yellow-400 text-sm rounded hover:bg-yellow-600/40"
            >
              👁️ Visto
            </button>
          )}
          {(task.status === "pending" || task.status === "acknowledged") &&
            canAct && (
              <button
                onClick={() => handleAction("in_progress")}
                className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded hover:bg-blue-600/40"
              >
                ▶️ Inizia
              </button>
            )}
          {task.status === "in_progress" && canAct && (
            <button
              onClick={() => handleAction("completed")}
              className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded hover:bg-green-600/40"
            >
              ✅ Finito
            </button>
          )}
          <button
            onClick={openInteractions}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-blue-300 rounded-lg transition"
            title="Chat & Allegati"
          >
            💬
          </button>
          {(isManager || canAct) && (
            <button
              onClick={() => onEdit(task)}
              disabled={!!task.locked_by && task.locked_by !== currentUserId}
              className="p-2 text-gray-400 hover:text-blue-400 transition disabled:opacity-50"
            >
              ✏️
            </button>
          )}
          {isManager && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-gray-500 hover:text-red-400 transition"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* EXPANDED */}
      {expanded && (
        <div className="bg-slate-900/30 overflow-hidden border-t border-white/5 transition-all">
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  {task.title}
                  {task.category && (
                    <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-gray-400">
                      {task.category}
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-1 mb-1">
                  {task.tags?.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[9px] bg-blue-600/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">
                  {task.description || "Nessuna descrizione."}
                </p>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>
                    ✍️ Assegnato da: <strong>{task.author_name}</strong> il{" "}
                    {formatDate(task.created_at)}
                  </p>
                  {task.acknowledged_at && (
                    <p>
                      👁️ Visto da:{" "}
                      <strong>{task.acknowledger_name || "N/A"}</strong> il{" "}
                      {formatDate(task.acknowledged_at)}
                    </p>
                  )}
                  {task.started_at && (
                    <p>🚀 Iniziato il: {formatDate(task.started_at)}</p>
                  )}
                  {task.completed_at && (
                    <p>
                      🏁 Completato da: <strong>{task.completer_name}</strong>{" "}
                      il {formatDate(task.completed_at)}
                    </p>
                  )}
                  {task.reopen_reason && (
                    <p className="text-orange-400">
                      ⚠️ Riaperto: {task.reopen_reason}
                    </p>
                  )}
                </div>

                {canAct &&
                  (task.status === "in_progress" ||
                    task.status === "completed") && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-500 mb-2">
                        Torna allo stato precedente:
                      </p>
                      <button
                        onClick={() => handleAction("pending")}
                        className="px-3 py-1 bg-orange-600/20 text-orange-400 text-sm rounded hover:bg-orange-600/40"
                      >
                        ⏪ Riporta a "Da Fare"
                      </button>
                    </div>
                  )}
              </div>
              <div>
                <ChecklistRenderer
                  items={task.checklist}
                  onToggle={(idx) =>
                    toggleChecklist(idx, !task.checklist[idx].done)
                  }
                  readOnly={!canAct || task.status === "completed"}
                />
              </div>
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
    const interval = setInterval(() => refreshTasks(true), 3000); // 3s polling
    return () => clearInterval(interval);
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
    } catch (err) {
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
    } catch (err) {
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
      } catch (e) { }
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
    toast.info('⚡ Modalità URGENTE attivata!');
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
    return <div className="p-10 text-center text-white">Caricamento...</div>;

  const inputClasses =
    "w-full bg-slate-700 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClasses = "block text-sm font-medium text-gray-400 mb-1";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            📋 Task Board
          </h1>
          <p className="text-gray-400">
            Assegna, monitora e completa le attività operative.
          </p>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition flex items-center gap-2"
            >
              <span>+</span> Nuovo Task
            </button>
          )}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-4 py-2 rounded-xl transition border border-white/10 ${showCalendar ? "bg-white/20 text-white" : "bg-slate-800 text-gray-400 hover:text-white"}`}
            title="Calendario Scadenze"
          >
            📅
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-4 py-2 rounded-xl transition border border-white/10 ${showGuide ? "bg-white/20 text-white" : "bg-slate-800 text-gray-400 hover:text-white"}`}
            title="Guida Utente"
          >
            ℹ️
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
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
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
          <div className="flex items-center gap-2 bg-slate-800/60 p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "active" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              Attivi
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "completed" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              Completati
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "all" ? "bg-slate-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              Tutti
            </button>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Filtri:</span>

          <button
            onClick={() => toggleQuickFilter('mine')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${quickFilters.mine
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-800 text-gray-400 hover:text-white border border-white/10'
              }`}
          >
            👤 A me
            {quickFilters.mine && <span className="text-xs opacity-70">({myTasks.length})</span>}
          </button>

          <button
            onClick={() => toggleQuickFilter('delegated')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${quickFilters.delegated
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-800 text-gray-400 hover:text-white border border-white/10'
              }`}
          >
            ✍️ Delegati
          </button>

          <button
            onClick={() => toggleQuickFilter('today')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${quickFilters.today
              ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/30'
              : 'bg-slate-800 text-gray-400 hover:text-white border border-white/10'
              }`}
          >
            📅 Oggi
          </button>

          <button
            onClick={() => toggleQuickFilter('overdue')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${quickFilters.overdue
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
              : 'bg-slate-800 text-gray-400 hover:text-white border border-white/10'
              }`}
          >
            ⚠️ Scaduti
          </button>

          <button
            onClick={() => toggleQuickFilter('urgent')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${quickFilters.urgent
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-slate-800 text-gray-400 hover:text-white border border-white/10'
              }`}
          >
            🔴 Urgenti
          </button>

          {/* Clear all filters */}
          {Object.values(quickFilters).some(v => v) && (
            <button
              onClick={clearQuickFilters}
              className="px-2 py-1 text-xs text-gray-500 hover:text-white transition"
            >
              ✕ Pulisci
            </button>
          )}
        </div>

        {/* Active Search/Filter Indicator */}
        {(searchQuery || Object.values(quickFilters).some(v => v)) && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-slate-800/40 px-3 py-2 rounded-lg">
            <span>🔍 Risultati: <strong className="text-white">{filteredTasks.length}</strong> task trovati</span>
            {searchQuery && (
              <span className="bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white">✕</button>
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
            icon="📥"
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
            icon="📤"
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
            icon="👥"
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
            icon="✅"
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
          <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-dashed border-white/5">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500">Nessun task trovato con i filtri selezionati.</p>
            {(searchQuery || Object.values(quickFilters).some(v => v)) && (
              <button
                onClick={() => { setSearchQuery(''); clearQuickFilters(); }}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                Pulisci tutti i filtri
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interaction Modal */}
      {interactionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-white/10 flex flex-col shadow-2xl relative">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 rounded-t-2xl">
              <div>
                <h2 className="text-2xl text-white font-bold flex items-center gap-3">
                  {interactionTask.title}
                  <span className="text-sm font-normal text-gray-400 bg-black/40 px-3 py-1 rounded-full">
                    #{interactionTask.id}
                  </span>
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {interactionTask.description}
                </p>
              </div>
              <button
                onClick={() => setInteractionTask(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition text-xl"
              >
                ✕
              </button>
            </div>
            {/* Body grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-white/10">
              <div className="p-6 overflow-hidden flex flex-col">
                <TaskComments
                  taskId={interactionTask.id}
                  comments={interactionTask.comments}
                  onRefresh={() => refreshSingleTask(interactionTask.id)}
                />
              </div>
              <div className="p-6 overflow-hidden flex flex-col bg-black/20">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    {editingTaskId ? "✏️ Modifica Task" : "✨ Crea Nuovo Task"}
                  </h2>
                  {!editingTaskId && (
                    <button
                      type="button"
                      onClick={setUrgent}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${newTask.priority === 10
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/50'
                        }`}
                    >
                      ⚡ URGENTE
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white text-xl p-1"
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
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <label className={`${labelClasses} mb - 2`}>
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
                      className="flex justify-between items-center bg-slate-800 p-2 rounded border border-white/5 gap-2"
                    >
                      {/* Move arrows */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveChecklistUp(idx)}
                          disabled={idx === 0}
                          className={`text-xs px-1 py-0.5 rounded transition ${idx === 0
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
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
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          title="Sposta giù"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Item number & text */}
                      <div className="flex items-center gap-2 flex-grow min-w-0">
                        <span className="text-xs text-gray-500 font-mono">{idx + 1}.</span>
                        <span className="text-sm text-gray-300 truncate">{item.text}</span>
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
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <label className={`${labelClasses} mb-2`}>
                  📎 Allegati (Opzionale)
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
                    className="flex-1 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-sm transition flex items-center justify-center gap-2 border border-dashed border-blue-500/30"
                  >
                    <span>+</span> Aggiungi File
                  </button>
                </div>
                <div className="space-y-2">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-800 p-2 rounded border border-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">
                          {file.type?.includes('image') ? '🖼️' :
                            file.type?.includes('pdf') ? '📄' :
                              file.type?.includes('word') ? '📝' :
                                file.type?.includes('excel') || file.type?.includes('sheet') ? '📊' : '📎'}
                        </span>
                        <span className="text-sm text-gray-300 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
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

              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg"
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
