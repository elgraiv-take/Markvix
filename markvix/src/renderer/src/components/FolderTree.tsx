import { useState, useCallback } from "react";
import type { TreeNode } from "../types";

interface FolderTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-150 ${
        open ? "rotate-90" : ""
      }`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6.2 3.6a.75.75 0 0 1 1.06 0l4.2 4.2a.75.75 0 0 1 0 1.06l-4.2 4.2a.75.75 0 1 1-1.06-1.06L9.84 8 6.2 4.36a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5 shrink-0 text-amber-400/80"
      fill="currentColor"
      aria-hidden
    >
      {open ? (
        <path d="M1.75 3.5A1.75 1.75 0 0 1 3.5 1.75h2.88c.4 0 .78.16 1.06.44l.62.62h5.44A1.75 1.75 0 0 1 15.25 4.5v.75H2.4l.85 6.25h10.5l.5-3.5h1.52l-.62 4.35A1.75 1.75 0 0 1 13.42 14H3.08A1.75 1.75 0 0 1 1.35 12.4L.4 5.4A.75.75 0 0 1 1.14 4.5H1.75V3.5z" />
      ) : (
        <path d="M1.75 2.5A1.75 1.75 0 0 0 0 4.25v7.5C0 12.99 1.01 14 2.25 14h11.5A1.75 1.75 0 0 0 15.5 12.25v-6.5A1.75 1.75 0 0 0 13.75 4H8.06L6.78 2.72A1.75 1.75 0 0 0 5.54 2.2H1.75z" />
      )}
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5 shrink-0 text-sky-300/65"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3.5 1.75A.75.75 0 0 1 4.25 1h5.19c.2 0 .39.08.53.22l3.81 3.81c.14.14.22.33.22.53v8.69A.75.75 0 0 1 13.25 15h-9a.75.75 0 0 1-.75-.75V1.75zM9 2.5v3.25c0 .41.34.75.75.75h3.25L9 2.5z" />
    </svg>
  );
}

function TreeItem({
  node,
  selectedPath,
  onSelectFile,
}: {
  node: TreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.isFile) {
    const path = node.fullPath ?? "";
    const isFileSelected = path && path === selectedPath;
    return (
      <button
        type="button"
        onClick={() => path && onSelectFile(path)}
        className={`w-full h-7 text-left rounded-md text-[13px] truncate flex items-center gap-1.5 pl-0.5 pr-2 ${
          isFileSelected
            ? "bg-[var(--color-accent)]/15 text-[var(--color-text)] shadow-[inset_2px_0_0_var(--color-accent)]"
            : "text-[var(--color-text)] hover:bg-[var(--color-hover)]"
        }`}
        title={path}
      >
        <FileIcon />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-7 text-left rounded-md text-[13px] flex items-center gap-1 pr-2 text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
        title={node.relativePath}
      >
        <ChevronIcon open={open} />
        <FolderIcon open={open} />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeItem
              key={child.relativePath}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ nodes, selectedPath, onSelectFile, onRefresh }: FolderTreeProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (onRefresh) setMenuPos({ x: e.clientX, y: e.clientY });
    },
    [onRefresh]
  );

  const closeMenu = useCallback(() => setMenuPos(null), []);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    setMenuPos(null);
  }, [onRefresh]);

  return (
    <div className="h-full overflow-auto py-1.5 px-1.5 relative" onContextMenu={handleContextMenu}>
      {nodes.length === 0 ? (
        <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No markdown files</p>
      ) : (
        nodes.map((node) => (
          <TreeItem
            key={node.relativePath}
            node={node}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))
      )}
      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={closeMenu}
            onContextMenu={closeMenu}
          />
          <div
            className="fixed z-20 min-w-[128px] py-1 rounded-md shadow-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={handleRefresh}
              className="w-full text-left px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            >
              更新
            </button>
          </div>
        </>
      )}
    </div>
  );
}
