import { useState, useCallback, useEffect } from "react";
import { FolderTree } from "./components/FolderTree";
import { PreviewPanel } from "./components/PreviewPanel";
import { buildTree } from "./utils/tree";
import type { MarkdownEntry, OpenTab } from "./types";

function getTitle(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<MarkdownEntry[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolder = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.scanMarkdownFiles();
      setRootPath(path);
      setEntries(list);
      setTabs([]);
      setActiveTabId(null);
      setSelectedPath(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  /** 現在のフォルダのみ再スキャン。タブ・選択は維持し、起動画面に戻らない。 */
  const refreshFolder = useCallback(async () => {
    if (!rootPath) return;
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.scanMarkdownFiles();
      setEntries(list);
      // 削除されたファイルのタブを閉じる
      setTabs((prev) => {
        const validPaths = new Set(list.map((e) => e.path));
        const filtered = prev.filter((t) => validPaths.has(t.path));
        // アクティブなタブが削除された場合、最初のタブをアクティブにする
        if (filtered.length > 0 && !filtered.some((t) => t.id === activeTabId)) {
          setActiveTabId(filtered[0].id);
        } else if (filtered.length === 0) {
          setActiveTabId(null);
          setSelectedPath(null);
        }
        return filtered;
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [rootPath, activeTabId]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await window.api.openFolder();
    if (selected) {
      await loadFolder(selected);
    }
  }, [loadFolder]);

  const openFile = useCallback(
    async (path: string) => {
      if (!path || typeof path !== "string") return;
      setError(null);
      setSelectedPath(path);
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      try {
        const content = await window.api.readFile(path);
        const id = `tab-${Date.now()}-${path.slice(-8)}`;
        const newTab: OpenTab = {
          id,
          path,
          title: getTitle(path),
          content,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(id);
      } catch (e) {
        // エラーが発生した場合、selectedPathをリセットしてUIの不整合を防ぐ
        setSelectedPath(null);
        setError(`ファイルを開けませんでした: ${String(e)}`);
      }
    },
    [tabs]
  );

  useEffect(() => {
    if (tabs.length === 0) return;
    const exists = tabs.some((t) => t.id === activeTabId);
    if (!exists) setActiveTabId(tabs[0]?.id ?? null);
  }, [tabs, activeTabId]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      setActiveTabId((current) => {
        if (current !== id) return current;
        const idx = prev.findIndex((t) => t.id === id);
        if (idx <= 0) return next[0]?.id ?? null;
        return prev[idx - 1].id;
      });
      return next;
    });
  }, []);

  // 起動引数で渡されたディレクトリを初期フォルダとして読み込む
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initialRoot = await window.api.getInitialRoot?.();
        if (!cancelled && initialRoot) {
          await loadFolder(initialRoot);
        }
      } catch {
        // 失敗しても UI は通常どおり動くため黙殺
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFolder]);

  // main.tsx からのグローバル D&D 呼び出しを受ける
  useEffect(() => {
    window.markvixLoadFolderFromDrop = (droppedPath: string) => {
      if (!droppedPath) return;
      (async () => {
        const resolved =
          (await window.api.resolveDropPath?.(droppedPath)) ?? droppedPath;
        if (!resolved) {
          setError("フォルダを開けませんでした: 無効なパスです");
          return;
        }
        await loadFolder(resolved);
      })().catch((e) => {
        setError(`フォルダを開けませんでした: ${String(e)}`);
      });
    };
    return () => {
      delete window.markvixLoadFolderFromDrop;
    };
  }, [loadFolder]);

  const treeNodes = buildTree(entries);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={handleOpenFolder}
          disabled={loading}
          className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Open folder"}
        </button>
        {rootPath && (
          <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[40%]" title={rootPath}>
            {rootPath}
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
          <div className="px-2 py-2 text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            Files
          </div>
          <FolderTree
            nodes={treeNodes}
            selectedPath={selectedPath}
            onSelectFile={openFile}
            onRefresh={rootPath ? refreshFolder : undefined}
          />
        </aside>
        <main className="flex-1 min-w-0 flex flex-col">
          <PreviewPanel
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
