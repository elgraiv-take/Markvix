import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { RecentDirectory } from "../types";

function getFolderName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function pathsLikelyEqual(a: string, b: string): boolean {
  return a.replace(/\\/g, "/").toLowerCase() === b.replace(/\\/g, "/").toLowerCase();
}

function ChevronDown({ open }: { open: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M3.6 6.2a.75.75 0 0 1 1.06 0L8 9.54l3.34-3.34a.75.75 0 1 1 1.06 1.06l-3.87 3.87a.75.75 0 0 1-1.06 0L3.6 7.26a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}

interface RecentDirectoriesMenuProps {
  items: RecentDirectory[];
  currentPath: string | null;
  disabled?: boolean;
  onOpen: (id: string) => void;
  onManage: () => void;
  onMenuOpen?: () => void;
}

export function RecentDirectoriesMenu({
  items,
  currentPath,
  disabled,
  onOpen,
  onManage,
  onMenuOpen,
}: RecentDirectoriesMenuProps): ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) onMenuOpen?.();
          setOpen((value) => !value);
        }}
        className="px-1.5 py-1.5 flex items-center rounded-r-md bg-[var(--color-accent)] text-[#16171d] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 border-l border-[#16171d]/20"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Recent folders"
        title="Recent folders"
      >
        <ChevronDown open={open} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-[min(28rem,calc(100vw-1.5rem))] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-xl"
        >
          <div className="px-3 py-1.5 text-[11px] font-medium tracking-wider uppercase text-[var(--color-text-muted)]">
            Recent folders
          </div>
          <div className="max-h-80 overflow-auto py-1">
            {items.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No recent folders</p>
            ) : (
              items.map((item) => {
                const isCurrent = currentPath !== null && pathsLikelyEqual(currentPath, item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    disabled={!item.exists}
                    onClick={() => {
                      onOpen(item.id);
                      close();
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm flex flex-col gap-0.5 ${
                      item.exists
                        ? "text-[var(--color-text)] hover:bg-[var(--color-hover)]"
                        : "text-[var(--color-text-muted)] opacity-70 cursor-not-allowed"
                    } ${isCurrent ? "bg-[var(--color-accent)]/10" : ""}`}
                    title={item.path}
                  >
                    <span className="truncate font-medium">{getFolderName(item.path)}</span>
                    <span className="truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                      {item.path}
                    </span>
                    {!item.exists && <span className="text-[11px] text-red-400">Missing</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-[var(--color-border)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onManage();
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            >
              Manage…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
