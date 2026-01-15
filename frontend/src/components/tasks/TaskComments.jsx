import React, { useState, useEffect, useRef } from "react";
import { tasksApi } from "../../api/client";
import { useUI } from "../ui/CustomUI";
import { useAuth } from "../../context/AuthContext";

export default function TaskComments({ taskId, comments = [], onRefresh }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await tasksApi.addComment(taskId, newMessage);
      setNewMessage("");
      onRefresh(); // Reload task to get new comment
    } catch (error) {
      console.error(error);
      toast.error("Errore invio messaggio");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-black/20 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-white/5">
        <h3 className="text-white font-semibold flex items-center gap-2">
          💬 Discussione{" "}
          <span className="text-gray-500 text-sm">({comments.length})</span>
        </h3>
      </div>

      {/* Messages List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>Nessun commento ancora.</p>
            <p className="text-xs">Inizia la discussione!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.user_id === user?.id;
            return (
              <div
                key={comment.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    isMe
                      ? "bg-blue-600/20 text-blue-100 rounded-tr-none"
                      : "bg-white/10 text-gray-200 rounded-tl-none"
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-4 mb-1">
                    <span
                      className={`text-xs font-bold ${isMe ? "text-blue-300" : "text-gray-400"}`}
                    >
                      {isMe ? "Tu" : comment.author_name}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white/5 border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Scrivi un commento..."
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition aspect-square flex items-center justify-center"
        >
          {sending ? "..." : "➤"}
        </button>
      </form>
    </div>
  );
}
