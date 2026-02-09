import { useState, useCallback } from "react";
import type { TreeNode } from "../types";

interface FolderTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
}

function TreeItem({
  node,
  selectedPath,
  onSelectFile,
  depth = 0,
}: {
  node: TreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);

  if (node.isFile) {
    const path = node.fullPath ?? "";
    const isFileSelected = path && path === selectedPath;
    return (
      <button
        type="button"
        onClick={() => path && onSelectFile(path)}
        className={`w-full text-left px-2 py-1 rounded text-sm truncate ${
          isFileSelected
            ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={path}
      >
        {node.name}
      </button>
    );
  }

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-4">{open ? "▼" : "▶"}</span>
        {node.name}
      </button>
      {open && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.relativePath}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              depth={depth + 1}
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
    <div
      className="h-full overflow-auto py-2 relative"
      onContextMenu={handleContextMenu}
    >
      {nodes.length === 0 ? (
        <p className="px-3 text-sm text-[var(--color-text-muted)]">No markdown files</p>
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
            className="fixed z-20 min-w-[120px] py-1 rounded shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={handleRefresh}
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-accent)]/20"
            >
              更新
            </button>
          </div>
        </>
      )}
    </div>
  );
}
