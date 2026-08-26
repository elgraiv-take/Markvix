import { useCallback, useEffect, type ReactElement } from "react";
import type { RecentDirectory } from "../types";

function getFolderName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function formatOpenedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RecentDirectoriesManagerProps {
  open: boolean;
  items: RecentDirectory[];
  currentPath: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveAll: () => void;
}

export function RecentDirectoriesManager({
  open,
  items,
  currentPath,
  onClose,
  onOpen,
  onRemove,
  onRemoveAll,
}: RecentDirectoriesManagerProps): ReactElement | null {
  const handleRemoveAll = useCallback((): void => {
    if (items.length === 0) return;
    const confirmed = window.confirm("Remove all recent folders?");
    if (confirmed) onRemoveAll();
  }, [items.length, onRemoveAll]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-directories-title"
        className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="recent-directories-title" className="text-sm font-semibold">
            Recent folders
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No recent folders
            </p>
          ) : (
            <ul>
              {items.map((item) => {
                const isCurrent =
                  currentPath !== null &&
                  currentPath.replace(/\\/g, "/").toLowerCase() ===
                    item.path.replace(/\\/g, "/").toLowerCase();
                return (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 ${
                      isCurrent ? "bg-[var(--color-accent)]/10" : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!item.exists}
                      onClick={() => onOpen(item.id)}
                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-70"
                      title={item.path}
                    >
                      <div className="truncate text-sm font-medium text-[var(--color-text)]">
                        {getFolderName(item.path)}
                      </div>
                      <div className="truncate font-mono text-[12px] text-[var(--color-text-muted)]">
                        {item.path}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        {formatOpenedAt(item.openedAt)}
                        {!item.exists && <span className="ml-2 text-red-400">Missing</span>}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
          <span className="text-[12px] text-[var(--color-text-muted)]">
            {items.length === 1 ? "1 item" : `${items.length} items`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleRemoveAll}
              className="rounded-md px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-40"
            >
              Remove all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm font-medium bg-[var(--color-accent)] text-[#16171d] hover:bg-[var(--color-accent-hover)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
