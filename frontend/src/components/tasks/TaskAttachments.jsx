import React, { useRef, useState } from "react";
import { tasksApi } from "../../api/client";
import { useUI } from "../ui/CustomUI";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function TaskAttachments({
  taskId,
  attachments = [],
  onRefresh,
  readOnly = false,
}) {
  const { toast, showConfirm } = useUI();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size check (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande (Max 10MB)");
      return;
    }

    setUploading(true);
    try {
      await tasksApi.uploadAttachment(taskId, file);
      toast.success("File caricato!");
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Errore caricamento file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attId) => {
    const confirm = await showConfirm(
      "Elimina Allegato",
      "Sei sicuro di voler eliminare questo file? Non potrà essere recuperato.",
    );
    if (!confirm) return;

    try {
      await tasksApi.deleteAttachment(attId);
      toast.success("File eliminato");
      onRefresh();
    } catch (error) {
      toast.error("Errore eliminazione file");
    }
  };

  const getFileIcon = (type) => {
    if (type?.includes("image")) return "🖼️";
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("word")) return "📝";
    if (type?.includes("excel") || type?.includes("sheet")) return "📊";
    return "📎";
  };

  return (
    <div className="space-y-4">
      {/* Header / Upload */}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-semibold flex items-center gap-2">
          📁 Allegati{" "}
          <span className="text-gray-500 text-sm">({attachments.length})</span>
        </h3>
        {!readOnly && (
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className={`px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-sm transition flex items-center gap-2 ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {uploading ? "Caricamento..." : "+ Aggiungi File"}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {attachments.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
            <p>Nessun allegato.</p>
            {!readOnly && (
              <p className="text-xs mt-1">
                Trascina qui o usa il pulsante per caricare.
              </p>
            )}
          </div>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl shrink-0">
                  {getFileIcon(att.file_type)}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {att.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {att.uploader_name} •{" "}
                    {new Date(att.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Preview/Download */}
                <a
                  href={`${API_URL}${att.download_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"
                  title="Scarica/Visualizza"
                >
                  ⬇️
                </a>

                {!readOnly && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Elimina"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drag & Drop Hint (Visual only for now, actual implementation needs complex events) */}
      {!readOnly && attachments.length === 0 && (
        <p className="text-xs text-center text-gray-600 mt-2">
          Formati supportati: JPEG, PDF, Excel, Word (Max 10MB)
        </p>
      )}
    </div>
  );
}
