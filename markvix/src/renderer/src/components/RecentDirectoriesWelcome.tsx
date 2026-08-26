import type { ReactElement } from "react";
import type { RecentDirectory } from "../types";

function getFolderName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

interface RecentDirectoriesWelcomeProps {
  items: RecentDirectory[];
  onOpen: (id: string) => void;
  onManage: () => void;
}

export function RecentDirectoriesWelcome({
  items,
  onOpen,
  onManage,
}: RecentDirectoriesWelcomeProps): ReactElement {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-[var(--color-text-muted)]">
      <p className="text-sm">Open a folder or drop one here</p>
      {items.length > 0 && (
        <div className="mt-6 w-full max-w-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-medium tracking-wider uppercase">Recent folders</h2>
            <button
              type="button"
              onClick={onManage}
              className="text-[12px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              Manage
            </button>
          </div>
          <ul className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] max-h-72 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  type="button"
                  disabled={!item.exists}
                  onClick={() => onOpen(item.id)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                  title={item.path}
                >
                  <div className="truncate text-sm text-[var(--color-text)]">
                    {getFolderName(item.path)}
                  </div>
                  <div className="truncate font-mono text-[12px]">
                    {item.path}
                    {!item.exists && <span className="ml-2 text-red-400">Missing</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
