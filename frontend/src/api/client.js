import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

// console.log("🔌 [CLIENT] API Base URL set to:", API_BASE_URL);

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor per token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per risposta (unwrapping data + error handling)
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Sessione scaduta o non valida (401). Redirect al login...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Evita loop di redirect se siamo già al login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// --- API MODULES ---

export const authApi = {
  login: (username, password) =>
    client.post("/auth/token", new URLSearchParams({ username, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  getMe: () => client.get("/users/me"),
};

// USERS
export const usersApi = {
  getUsers: () => client.get("/users/"),
  createUser: (data) => client.post("/users/", data),
  updateUser: (id, data) => client.patch(`/users/${id}`, data),
  deleteUser: (id) => client.delete(`/users/${id}`),
  deactivateUser: (id) => client.patch(`/users/${id}/deactivate`),
  activateUser: (id) => client.patch(`/users/${id}/activate`),
  // Live Status
  sendHeartbeat: () => client.post("/users/heartbeat"),
  getOnlineUsers: () => client.get("/users/online"),
};

// ... other APIs ...

export const expiriesApi = {
  getExpiries: () => client.get("/expiries/dashboard"),
  getCertifications: (days = 60) =>
    client.get("/expiries/certifications", { params: { days } }),
  getMedicalExams: (days = 60) =>
    client.get("/expiries/medical", { params: { days } }),
  getContracts: (days = 60) =>
    client.get("/employees/expiring-contracts", { params: { days } }),
};

export const productionApi = {
  getKPIs: () => client.get("/production/kpi/overview/"),
  getSession: (id) => client.get(`/production/sessions/${id}/`),
};

export const machinesApi = {
  getMachines: () => client.get("/machines/"),
  getMachine: (id) => client.get(`/machines/${id}/`),
};

export const fleetApi = {
  createTicket: (data) => client.post("/fleet/tickets", data),
  getTickets: (params) => client.get("/fleet/tickets", { params }),
  resolveTicket: (id, notes) =>
    client.patch(`/fleet/tickets/${id}/resolve`, null, {
      params: { resolution_notes: notes },
    }),
  getBanchine: () => client.get("/fleet/banchine"),
  getVehicles: (params) => client.get("/fleet/vehicles", { params }),
  createVehicle: (data) => client.post("/fleet/vehicles", null, { params: data }),
  updateVehicle: (id, data) => client.put(`/fleet/vehicles/${id}`, data),
  deleteVehicle: (id) => client.delete(`/fleet/vehicles/${id}`),
  // Checklists
  submitChecklist: async (vehicleId, checks, notes = null, file = null, tabletStatus = 'ok') => {
    const formData = new FormData();
    const data = JSON.stringify({
      vehicle_id: vehicleId,
      checklist_data: checks
    });

    formData.append('checklist_data', data);
    formData.append('notes', notes || "");
    formData.append('tablet_status', tabletStatus);

    if (file) {
      formData.append('photo', file);
    } else {
      console.warn("⚠️ submitChecklist: Photo is missing!");
    }

    // Debug
    for (var pair of formData.entries()) {
      console.log("Checklist FormData: " + pair[0] + ', ' + pair[1]);
    }

    const response = await client.post('/fleet/checklists', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getChecklists: (params) => client.get("/fleet/checklists", { params }),
  getLatestChecklist: (vehicleId) => client.get(`/fleet/vehicles/${vehicleId}/checklist/latest`),
  submitChecklistV2: async ({ vehicleId, checks, notes, tabletPhoto, tabletStatus, issuePhotos }) => {
    const formData = new FormData();
    const data = {
      vehicle_id: vehicleId,
      checklist_data: checks
    };

    formData.append('checklist_data', JSON.stringify(data));
    formData.append('notes', notes || '');
    formData.append('tablet_status', tabletStatus || 'ok');
    formData.append('photo', tabletPhoto);

    // Append issue photos
    if (issuePhotos) {
      Object.entries(issuePhotos).forEach(([key, file]) => {
        formData.append(key, file);
      });
    }

    return client.post('/fleet/checklists', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
  },
  resolveChecklist: (id, notes) => client.put(`/fleet/checklists/${id}/resolve`, { notes }),
};

export const notificationsApi = {
  getNotifications: (params) => client.get("/notifications/", { params }),
  getUnreadCount: () => client.get("/notifications/unread-count"),
  markAsRead: (id) => client.patch(`/notifications/${id}/read`),
  markAllAsRead: () => client.patch("/notifications/read-all"),
  deleteAll: () => client.delete("/notifications/delete-all"),
  clearRead: () => client.delete("/notifications/clear-read"),
  cleanup: (daysRead = 7, daysUnread = 30) => client.delete("/notifications/cleanup", { params: { days_read: daysRead, days_unread: daysUnread } }),
};

export const tasksApi = {
  getTasks: (params) => client.get("/tasks/", { params }),
  getMyTasks: () => client.get("/tasks/my"),
  getStats: () => client.get("/tasks/stats/"),
  createTask: (data) => client.post("/tasks/", data),
  updateTask: (id, data) => client.patch(`/tasks/${id}`, data),
  deleteTask: (id) => client.delete(`/tasks/${id}`),
  lockTask: (id) => client.post(`/tasks/${id}/lock`),
  unlockTask: (id) => client.post(`/tasks/${id}/unlock`),
  // V2 Enhancements
  getTask: (id) => client.get(`/tasks/${id}`),
  addComment: (id, content) => client.post(`/tasks/${id}/comments`, { content }),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post(`/tasks/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteAttachment: (attId) => client.delete(`/tasks/attachments/${attId}`),
};

export const rolesApi = {
  getRoles: () => client.get("/roles/"),
  createRole: (data) => client.post("/roles/", data),
  updateRole: (id, data) => client.patch(`/roles/${id}`, data),
  deleteRole: (id) => client.delete(`/roles/${id}`),
  getDefinitions: () => client.get("/roles/definitions"),
};

export const employeesApi = {
  getEmployees: () => client.get("/employees/"),
  getEmployee: (id) => client.get(`/employees/${id}`),
  createEmployee: (data) => client.post("/employees/", data),
  updateEmployee: (id, data) => client.patch(`/employees/${id}`, data),
  deleteEmployee: (id) => client.delete(`/employees/${id}`),
  getRoles: () => client.get("/employees/roles/list"),
  getBanchine: () => client.get("/employees/banchine/list"),
  // Documents
  getDocuments: (id) => client.get(`/employees/${id}/documents`),
  uploadDocument: (id, type, name, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post(
      `/employees/${id}/documents?doc_type=${type}&doc_name=${name}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },
  deleteDocument: (empId, docId) =>
    client.delete(`/employees/${empId}/documents/${docId}`),
  // Certifications
  getCertifications: (id) => client.get(`/employees/${id}/certifications`),
  addCertification: (id, data) =>
    client.post(`/employees/${id}/certifications`, data),
  deleteCertification: (empId, certId) =>
    client.delete(`/employees/${empId}/certifications/${certId}`),
  updateCertification: (empId, certId, data) =>
    client.patch(`/employees/${empId}/certifications/${certId}`, data),
  // Medical Exams
  getMedicalExams: (id) => client.get(`/employees/${id}/medical`),
  addMedicalExam: (id, data) => client.post(`/employees/${id}/medical`, data),
  deleteMedicalExam: (empId, examId) =>
    client.delete(`/employees/${empId}/medical/${examId}`),
  updateMedicalExam: (empId, examId, data) =>
    client.patch(`/employees/${empId}/medical/${examId}`, data),
  // Training
  getTrainings: (empId) => client.get(`/employees/${empId}/trainings`),
  addTraining: (empId, data) =>
    client.post(`/employees/${empId}/trainings`, data),
  updateTraining: (empId, trainingId, data) =>
    client.patch(`/employees/${empId}/trainings/${trainingId}`, data),
};

export const leavesApi = {
  getLeaves: (params) => client.get("/leaves/", { params }),
  getPending: () => client.get("/leaves/pending"),
  createLeave: (empId, data) =>
    client.post(`/leaves/?employee_id=${empId}`, data),
  updateLeave: (id, data) => client.patch(`/leaves/${id}`, data),
  reviewLeave: (id, data) => client.patch(`/leaves/${id}/review`, data),
  cancelLeave: (id) => client.delete(`/leaves/${id}`),  // Alias for compatibility
  deleteLeave: (id) => client.delete(`/leaves/${id}`),  // Hard delete
  // Monte Ore Permessi
  getEmployeeHours: (empId, year) =>
    client.get(`/leaves/hours/${empId}`, { params: { year } }),
  getHoursSummary: (year, deptId) =>
    client.get("/leaves/hours-summary", {
      params: { year, department_id: deptId },
    }),
  getLeaveTypes: () => client.get("/leaves/types"),
};



export const eventsApi = {
  getEvents: (params) => client.get("/events/", { params }),
  getPending: () => client.get("/events/pending"),
  getTypes: () => client.get("/events/types"),
  createEvent: (data) => client.post("/events/", data),
  reviewEvent: (id, data) => client.patch(`/events/${id}/review`, data),
  getLeaderboard: (limit = 10) =>
    client.get("/events/leaderboard", { params: { limit } }),
  getTimeline: (employeeId) =>
    client.get(`/events/employee/${employeeId}/timeline`),
  getBadges: (employeeId) =>
    client.get(`/events/employee/${employeeId}/badges`),
  getBadgeDefinitions: () => client.get("/events/badges/definitions"),
  updateEvent: (id, data) => client.patch(`/events/${id}`, data),
  deleteEvent: (id) => client.delete(`/events/${id}`),
};

export const orgApi = {
  getChart: () => client.get("/org/chart"),
  getTree: () => client.get("/org/tree"),
  getPyramid: () => client.get("/org/pyramid"),
};

export const announcementsApi = {
  getAll: (activeOnly = true) =>
    client.get("/announcements/", { params: { active_only: activeOnly } }),
  getUrgent: () => client.get("/announcements/urgent"),
  getOne: (id) => client.get(`/announcements/${id}`),
  create: (data) => client.post("/announcements/", data),
  update: (id, data) => client.put(`/announcements/${id}`, data),
  archive: (id) => client.delete(`/announcements/${id}`),
  deletePermanent: (id) =>
    client.delete(`/announcements/${id}`, { params: { permanent: true } }),
};

export const auditApi = {
  getLogs: (params) => client.get("/audit/", { params }),
};

export const hrStatsApi = {
  getPendingCounts: () => client.get("/hr/stats/pending-counts"),
};

export const returnsApi = {
  getTickets: () => client.get("/returns/"),
  createTicket: (data) =>
    client.post("/returns/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  verifyTicket: (id, notes) =>
    client.patch(
      `/returns/${id}/verify`,
      { verification_notes: notes },
      { headers: { "Content-Type": "multipart/form-data" } },
    ),
  issueCreditNote: (id, amount) =>
    client.patch(
      `/returns/${id}/credit-note`,
      { amount },
      { headers: { "Content-Type": "multipart/form-data" } },
    ),
  closeTicket: (id) => client.post(`/returns/${id}/close`),
};

export const shiftsApi = {
  getMyTeam: () => client.get("/shifts/team"),
  getShifts: (start, end, deptId) =>
    client.get("/shifts/planner", {
      params: { start_date: start, end_date: end, department_id: deptId },
    }),
  assignShift: (data) => client.post("/shifts/assign", data),
  copyPreviousWeek: (targetWeekStart) =>
    client.post("/shifts/copy-previous-week", null, {
      params: { target_week_start: targetWeekStart },
    }),
  exportShifts: (start, end) =>
    client.get("/shifts/export", {
      params: { start_date: start, end_date: end },
    }),
  exportShiftsPdf: (start, end, deptId, coordinatorId) =>
    client.get("/shifts/export/pdf", {
      params: { start_date: start, end_date: end, department_id: deptId, coordinator_id: coordinatorId },
      responseType: "blob",
    }),
  getHolidays: (year) => client.get("/shifts/holidays", { params: { year } }),
};

export const factoryApi = {
  // Requirements & KPI
  getRequirements: (banchinaId) =>
    client.get(
      "/factory/requirements",
      banchinaId ? { params: { banchina_id: banchinaId } } : {},
    ),
  updateKPI: (reqId, target) =>
    client.patch(`/factory/requirements/${reqId}/kpi`, { kpi_target: target }),

  // Cost Analysis
  getCostReport: (start, end) =>
    client.get("/factory/costs/report", {
      params: { start_date: start, end_date: end },
    }),

  // Staffing
  verifyStaffing: (date, shift) =>
    client.get("/factory/staffing/verify", { params: { date, shift } }),
};

// KPI Produzione - Configurator
export const kpiApi = {
  // Configurazioni KPI (Admin/Controller)
  getConfigs: (activeOnly = true) =>
    client.get("/kpi/configs", { params: { active_only: activeOnly } }),
  createConfig: (data) => client.post("/kpi/configs", data),
  updateConfig: (configId, data) =>
    client.patch(`/kpi/configs/${configId}`, data),
  deleteConfig: (configId) => client.delete(`/kpi/configs/${configId}`),

  // Registrazioni KPI
  getEntries: (workDate, configId = null) =>
    client.get("/kpi/entries", {
      params: { work_date: workDate, config_id: configId },
    }),
  createEntry: (data) => client.post("/kpi/entries", data),
  deleteEntry: (entryId) => client.delete(`/kpi/entries/${entryId}`),

  // Panoramica (stato completamento per data)
  getPanoramica: (workDate) =>
    client.get("/kpi/panoramica", { params: { work_date: workDate } }),

  // Report
  getDailyReport: (workDate) =>
    client.get("/kpi/report/daily", { params: { work_date: workDate } }),
  getDailyReportPdf: (workDate) =>
    client.get("/kpi/report/daily/pdf", {
      params: { work_date: workDate },
      responseType: "blob",
    }),
  getTrend: (startDate, endDate, excludeWeekends = false, sectorName = null) =>
    client.get("/kpi/report/trend", {
      params: {
        start_date: startDate,
        end_date: endDate,
        exclude_weekends: excludeWeekends,
        sector_name: sectorName,
      },
    }),
  getAdvancedPdfReport: (startDate, endDate, sectorName) =>
    client.get("/kpi/report/advanced/pdf", {
      params: {
        start_date: startDate,
        end_date: endDate,
        sector_name: sectorName,
      },
      responseType: "blob",
    }),

  // Staffing / Requirements Configuration
  getKpiRequirements: (configId) =>
    client.get(`/kpi/configs/${configId}/requirements`),
  updateRequirement: (reqId, data) =>
    client.patch(`/kpi/requirements/${reqId}`, data),
  createRequirement: (configId, data) =>
    client.post(`/kpi/configs/${configId}/requirements`, data),

  // Operators List
  getOperators: (sectorName, workDate, shiftType) =>
    client.get(`/kpi/operators/${sectorName}`, {
      params: { work_date: workDate, shift_type: shiftType }
    }),
};

export const facilityApi = {
  getDb: (params) => client.get("/facility/maintenance", { params }),
  create: (data) => client.post("/facility/maintenance", data),
  update: (id, data) => client.patch(`/facility/maintenance/${id}`, data),
  delete: (id) => client.delete(`/facility/maintenance/${id}`),
};

export const maintenanceApi = {
  report: (data) => client.post("/maintenance/report", data),
  getQueue: (activeOnly = true) => client.get("/maintenance/queue", { params: { active_only: activeOnly } }),
  acknowledge: (id) => client.post(`/maintenance/${id}/acknowledge`),
  resolve: (id, notes) => client.post(`/maintenance/${id}/resolve`, null, { params: { notes } }),
};

export const mobileApi = {
  getMyAssignment: () => client.get("/mobile/my-assignment"),
  checkIn: (data) => client.post("/mobile/check-in", data),
  getBanchinaMachines: (banchinaId) => client.get(`/mobile/banchina-machines/${banchinaId}`),
  // Production
  updateProduction: (qty) => client.post("/mobile/production/update", { quantity: parseInt(qty) }),
  getStatus: () => client.get("/mobile/status"),
  // Downtime - Separate Start/Stop
  startDowntime: () => client.post("/mobile/downtime/start"),
  stopDowntime: (reason, reasonDetail) => client.post("/mobile/downtime/stop", {
    reason,
    reason_detail: reasonDetail || null
  }),
  getDowntimeReasons: () => client.get("/mobile/downtime-reasons"),
  // Crew - now includes shift_assignment_id for session persistence
  confirmCrew: (crewStatus, shiftAssignmentId) => client.post("/mobile/crew/confirm", {
    crew_status: crewStatus,
    shift_assignment_id: shiftAssignmentId
  }),
  // Shift Closure - marks shift as completed
  closeShift: (shiftAssignmentId) => client.post("/mobile/shift/close", {
    shift_assignment_id: shiftAssignmentId
  }),
  // KPI Downtimes Display
  getKpiDowntimes: (kpiConfigId, date, shiftType) =>
    client.get(`/mobile/downtimes/${kpiConfigId}`, { params: { date, shift_type: shiftType } }),
};

// Live Production (Picking List)
export const pickingApi = {
  // Config (Materials/Colors)
  getConfig: (category, includeInactive = false) => client.get("/production/config", { params: { category, include_inactive: includeInactive } }),
  createMaterial: (data) => client.post("/production/config", data),
  updateMaterial: (id, data) => client.patch(`/production/config/${id}`, data),

  // Requests (Orders)
  createRequest: (data) => client.post("/production/requests", data),
  getRequests: (status, limit = 50) => client.get("/production/requests", { params: { status, limit } }),
  updateStatus: (id, status, notes) => client.patch(`/production/requests/${id}/status`, { status, notes }),
  acknowledge: (id) => client.patch(`/production/requests/${id}/acknowledge`),

  // Reporting
  // Reporting
  getReports: (startDate, endDate, shiftType = 'all') =>
    client.get("/production/reports", { params: { start_date: startDate, end_date: endDate, shift_type: shiftType } }),

  downloadReport: (startDate, endDate, shiftType = 'all') =>
    client.get("/production/reports", {
      params: { start_date: startDate, end_date: endDate, shift_type: shiftType, format: 'excel' },
      responseType: 'blob'
    }),

  getExportUrl: (startDate, endDate, shiftType = 'all') =>
    `${API_BASE_URL}/production/reports?start_date=${startDate}&end_date=${endDate}&shift_type=${shiftType}&format=excel`,
};

export const adminApi = {
  getWorkstations: () => client.get("/admin/workstations"),
};

// Chat Interna
export const chatApi = {
  // Conversazioni
  getConversations: () => client.get("/chat/conversations"),
  createConversation: (data) => client.post("/chat/conversations", data),

  // Messaggi
  getMessages: (convId, params) => client.get(`/chat/conversations/${convId}/messages`, { params }),
  sendMessage: (convId, data) => client.post(`/chat/conversations/${convId}/messages`, data),
  deleteMessage: (msgId) => client.delete(`/chat/messages/${msgId}`),
  markAsRead: (convId) => client.patch(`/chat/conversations/${convId}/read`),

  // Contatti
  getContacts: () => client.get("/chat/contacts"),

  // Badge
  getUnreadCount: () => client.get("/chat/unread-count"),

  // Push Notifications
  getVapidKey: () => client.get("/chat/push/vapid-key"),
  subscribePush: (data) => client.post("/chat/push/subscribe", data),
  unsubscribePush: (endpoint) => client.delete("/chat/push/unsubscribe", { params: { endpoint } }),

  // Notifiche e Badge
  getNotificationsSummary: () => client.get('/chat/notifications/summary'),

  // Moderazione (Admin)
  timeoutUser: (convId, userId, minutes = 1) => client.post(`/chat/conversations/${convId}/ban`, { user_id: userId, duration_minutes: minutes }),
  deleteConversation: (convId) => client.delete(`/chat/conversations/${convId}`),

  // Allegati
  uploadAttachment: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post("/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ============================================================
// LOGISTICS (Richiesta Materiale)
// ============================================================
export const logisticsApi = {
  // Material Types
  getMaterials: (activeOnly = true) => client.get("/logistics/materials", { params: { active_only: activeOnly } }),
  createMaterial: (data) => client.post("/logistics/materials", data),
  updateMaterial: (id, data) => client.patch(`/logistics/materials/${id}`, data),
  deleteMaterial: (id) => client.delete(`/logistics/materials/${id}`),

  // Requests
  createRequest: (data) => client.post("/logistics/requests", data),
  getRequests: (params = {}) => client.get("/logistics/requests", { params }),
  getRequest: (id) => client.get(`/logistics/requests/${id}`),
  takeRequest: (id, eta_minutes) => client.patch(`/logistics/requests/${id}/take`, { promised_eta_minutes: eta_minutes }),
  completeRequest: (id, code) => client.patch(`/logistics/requests/${id}/complete`, { confirmation_code: code }),
  releaseRequest: (id) => client.patch(`/logistics/requests/${id}/release`),
  markUrgent: (id) => client.patch(`/logistics/requests/${id}/urgent`),
  cancelRequest: (id, reason) => client.patch(`/logistics/requests/${id}/cancel`, { reason }),
  takeRequestBatch: (ids, eta) => client.patch("/logistics/requests/take-batch", ids, { params: { eta_minutes: eta } }),

  // Messages
  getMessages: (requestId) => client.get(`/logistics/requests/${requestId}/messages`),
  sendMessage: (requestId, content, type = "custom") => client.post(`/logistics/requests/${requestId}/messages`, { content, message_type: type }),

  // Preset Messages & ETA Options
  getPresetMessages: (activeOnly = true) => client.get("/logistics/preset-messages", { params: { active_only: activeOnly } }),
  createPresetMessage: (data) => client.post("/logistics/preset-messages", data),
  updatePresetMessage: (id, data) => client.patch(`/logistics/preset-messages/${id}`, data),
  deletePresetMessage: (id) => client.delete(`/logistics/preset-messages/${id}`),

  getEtaOptions: (activeOnly = true) => client.get("/logistics/eta-options", { params: { active_only: activeOnly } }),
  createEtaOption: (data) => client.post("/logistics/eta-options", data),
  updateEtaOption: (id, data) => client.patch(`/logistics/eta-options/${id}`, data),
  deleteEtaOption: (id) => client.delete(`/logistics/eta-options/${id}`),

  // Performance & Leaderboard
  getMyPerformance: () => client.get("/logistics/performance/me"),
  getEmployeePerformance: (employeeId) => client.get(`/logistics/performance/employee/${employeeId}`),
  getLeaderboard: (month, year) => client.get("/logistics/leaderboard", { params: { month, year } }),

  // Config (Admin)
  getConfig: () => client.get("/logistics/config"),
  updateConfig: (key, value) => client.put(`/logistics/config/${key}`, null, { params: { value } }),
};

export default client;

