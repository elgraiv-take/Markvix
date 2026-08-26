import { useState, useCallback, useEffect, useRef } from "react";
import { FolderTree } from "./components/FolderTree";
import { PreviewPanel } from "./components/PreviewPanel";
import { RecentDirectoriesManager } from "./components/RecentDirectoriesManager";
import { RecentDirectoriesMenu } from "./components/RecentDirectoriesMenu";
import { RecentDirectoriesWelcome } from "./components/RecentDirectoriesWelcome";
import { buildTree } from "./utils/tree";
import type { MarkdownEntry, OpenTab, RecentDirectory } from "./types";

function getTitle(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

function App() {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<MarkdownEntry[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [treeWidth, setTreeWidth] = useState(256);
  const [isResizingTree, setIsResizingTree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentDirectories, setRecentDirectories] = useState<RecentDirectory[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);

  const refreshRecentDirectories = useCallback(async () => {
    try {
      const list = await window.api.listRecentDirectories();
      setRecentDirectories(list);
    } catch {
      // 履歴の読み込み失敗はメイン操作を止めない
    }
  }, []);

  const loadFolder = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const list = await window.api.scanMarkdownFiles();
        setRootPath(path);
        setEntries(list);
        setTabs([]);
        setActiveTabId(null);
        setSelectedPath(null);
        await refreshRecentDirectories();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [refreshRecentDirectories]
  );

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

  const handleOpenRecent = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const selected = await window.api.openRecentDirectory(id);
        if (selected) {
          await loadFolder(selected);
          setManagerOpen(false);
        }
      } catch (e) {
        setError(`Could not open folder: ${String(e)}`);
        await refreshRecentDirectories();
      } finally {
        setLoading(false);
      }
    },
    [loadFolder, refreshRecentDirectories]
  );

  const handleRemoveRecent = useCallback(async (id: string) => {
    try {
      const list = await window.api.removeRecentDirectory(id);
      setRecentDirectories(list);
    } catch (e) {
      setError(`Could not remove recent folder: ${String(e)}`);
    }
  }, []);

  const handleRemoveAllRecent = useCallback(async () => {
    try {
      const list = await window.api.removeAllRecentDirectories();
      setRecentDirectories(list);
    } catch (e) {
      setError(`Could not remove recent folder: ${String(e)}`);
    }
  }, []);

  const openManager = useCallback(() => {
    void refreshRecentDirectories();
    setManagerOpen(true);
  }, [refreshRecentDirectories]);

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
        if (cancelled) return;
        if (initialRoot) {
          await loadFolder(initialRoot);
          return;
        }
        await refreshRecentDirectories();
      } catch {
        if (!cancelled) {
          await refreshRecentDirectories();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFolder, refreshRecentDirectories]);

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

  const startTreeResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizingTree(true);
  }, []);

  useEffect(() => {
    if (!isResizingTree) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = layoutRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minWidth = 180;
      const maxWidth = Math.max(minWidth, rect.width - 260);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - rect.left));
      setTreeWidth(nextWidth);
    };

    const handleMouseUp = () => setIsResizingTree(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTree]);

  // ディレクトリ監視イベントからの自動更新
  useEffect(() => {
    if (!rootPath) return;
    const unsubscribeEntries = window.api.onEntriesUpdated?.((nextEntries) => {
      setEntries(nextEntries);
      // 自動処理ではタブは変更しない（仕様どおり、削除されたファイルのタブも閉じない）
    });

    const unsubscribeFileChanged = window.api.onFileChanged?.((fullPath) => {
      setTabs((prev) => {
        const exists = prev.some((tab) => tab.path === fullPath);
        if (!exists) return prev;

        // 対象タブが存在する場合のみ、内容を再読み込みする
        (async () => {
          try {
            const content = await window.api.readFile(fullPath);
            setTabs((current) =>
              current.map((tab) =>
                tab.path === fullPath ? { ...tab, content } : tab
              )
            );
          } catch (e) {
            // ファイル削除や権限エラーなどの場合は、既存コンテンツを維持しつつエラーメッセージだけ表示
            setError(`ファイルを再読み込みできませんでした: ${String(e)}`);
          }
        })();

        return prev;
      });
    });

    return () => {
      unsubscribeEntries?.();
      unsubscribeFileChanged?.();
    };
  }, [rootPath]);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="relative z-20 shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative inline-flex items-stretch shrink-0">
          <button
            type="button"
            onClick={handleOpenFolder}
            disabled={loading}
            className="px-3 py-1.5 rounded-l-md text-sm font-medium bg-[var(--color-accent)] text-[#16171d] hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Open folder"}
          </button>
          <RecentDirectoriesMenu
            items={recentDirectories}
            currentPath={rootPath}
            disabled={loading}
            onOpen={handleOpenRecent}
            onManage={openManager}
            onMenuOpen={() => {
              void refreshRecentDirectories();
            }}
          />
        </div>
        {rootPath && (
          <span className="text-[13px] text-[var(--color-text-muted)] truncate max-w-[40%] font-mono" title={rootPath}>
            {rootPath}
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </header>

      <div ref={layoutRef} className="flex-1 flex min-h-0">
        <aside
          className="shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col"
          style={{ width: `${treeWidth}px` }}
        >
          <div className="px-3 py-2 text-[11px] font-medium tracking-wider uppercase text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            Files
          </div>
          <FolderTree
            nodes={treeNodes}
            selectedPath={selectedPath}
            onSelectFile={openFile}
            onRefresh={rootPath ? refreshFolder : undefined}
          />
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize file tree"
          onMouseDown={startTreeResize}
          onDoubleClick={() => setTreeWidth(256)}
          className={`w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[var(--color-accent)]/40 ${
            isResizingTree ? "bg-[var(--color-accent)]/60" : ""
          }`}
        />
        <main className="flex-1 min-w-0 flex flex-col">
          {rootPath ? (
            <PreviewPanel
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onCloseTab={closeTab}
            />
          ) : (
            <RecentDirectoriesWelcome
              items={recentDirectories}
              onOpen={handleOpenRecent}
              onManage={openManager}
            />
          )}
        </main>
      </div>
      <RecentDirectoriesManager
        open={managerOpen}
        items={recentDirectories}
        currentPath={rootPath}
        onClose={() => setManagerOpen(false)}
        onOpen={handleOpenRecent}
        onRemove={handleRemoveRecent}
        onRemoveAll={handleRemoveAllRecent}
      />
    </div>
  );
}

export default App;
