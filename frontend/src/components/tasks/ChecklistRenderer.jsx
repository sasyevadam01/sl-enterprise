import React from "react";

export const ChecklistRenderer = ({
  items = [],
  onToggle,
  readOnly = false,
}) => {
  if (!items || items.length === 0)
    return (
      <div className="text-gray-500 text-xs italic">Nessuna checklist.</div>
    );

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg border border-white/5">
      {/* Header / Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span className="font-semibold uppercase tracking-wider">
          Checklist
        </span>
        <span className={progress === 100 ? "text-green-400" : "text-blue-400"}>
          {progress}% Completato
        </span>
      </div>

      <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* List Items */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={() => !readOnly && onToggle && onToggle(idx)}
            className={`
                            group flex items-start gap-3 p-2 rounded transition-colors
                            ${readOnly ? "opacity-75 cursor-default" : "cursor-pointer hover:bg-white/5"}
                        `}
          >
            {/* Checkbox Visual */}
            <div
              className={`
                            flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all
                            ${
                              item.done
                                ? "bg-green-500 border-green-500 text-white"
                                : "bg-transparent border-gray-600 text-transparent group-hover:border-gray-400"
                            }
                        `}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Text */}
            <span
              className={`text-sm leading-snug transition-all ${item.done ? "text-gray-500 line-through" : "text-gray-200"}`}
            >
              {item.label || item.text || "Elemento senza nome"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
