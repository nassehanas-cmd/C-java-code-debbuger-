import React from 'react';
import { X, Trash2, Clock, FolderOpen } from 'lucide-react';
import { HistorySession } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: HistorySession[];
  activeSessionId: string | null;
  onSelectSession: (session: HistorySession) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

function formatTimestamp(ts: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Debugging Session History"
    >
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <aside className="w-full max-w-md bg-[#161b22] border-l border-[#30363d] h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2f81f7]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">
              Debugging History
            </h2>
            <span className="text-xs text-[#8b949e] font-mono tabular-nums">
              · {sessions.length}/20
            </span>
          </div>

          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1.5 text-xs font-medium text-[#f85149] hover:bg-[#f85149]/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear All History
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history drawer"
              className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <FolderOpen className="w-9 h-9 text-[#484f58] mb-3" aria-hidden="true" />
              <p className="text-sm font-medium text-[#e6edf3] mb-1">
                No debugging sessions saved yet
              </p>
              <p className="text-xs text-[#8b949e]">
                Every successful C or Java code analysis is automatically saved here (up to 20 recent sessions).
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = activeSessionId === session.id;
              const codePreview =
                session.originalCode
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 95) || '(Image analysis)';

              return (
                <div
                  key={session.id}
                  className={`group relative rounded-lg border p-3.5 transition-colors ${
                    isSelected
                      ? 'bg-[#1f2937]/60 border-[#2f81f7]'
                      : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession(session);
                        onClose();
                      }}
                      className="flex items-center gap-2 text-xs text-left flex-1 cursor-pointer"
                    >
                      <span className="font-mono font-semibold text-[#58a6ff]">
                        {session.language}
                      </span>
                      <span className="text-[#484f58]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#8b949e] font-mono tabular-nums">
                        {formatTimestamp(session.timestamp)}
                      </span>
                      <span className="text-[#484f58]" aria-hidden="true">
                        ·
                      </span>
                      {session.counts.total === 0 ? (
                        <span className="text-[#3fb950] font-medium">
                          0 Errors
                        </span>
                      ) : (
                        <span className="text-[#f0883e] font-mono tabular-nums">
                          {session.counts.total}{' '}
                          {session.counts.total === 1 ? 'Issue' : 'Issues'}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete ${session.language} session from ${formatTimestamp(
                        session.timestamp
                      )}`}
                      className="p-1.5 text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session);
                      onClose();
                    }}
                    className="w-full text-left cursor-pointer"
                  >
                    <p className="text-xs font-mono text-[#c9d1d9] truncate bg-[#161b22] px-2.5 py-1.5 rounded border border-[#21262d]">
                      {codePreview}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[#8b949e] font-mono tabular-nums">
                      <span>Syntax: {session.counts.syntax}</span>
                      <span aria-hidden="true">·</span>
                      <span>Logic: {session.counts.logic}</span>
                      <span aria-hidden="true">·</span>
                      <span>Runtime: {session.counts.runtime}</span>
                      <span aria-hidden="true">·</span>
                      <span>{session.explanationLanguage}</span>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
