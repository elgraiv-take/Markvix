/// <reference types="vite/client" />

interface Window {
  api: {
    openFolder: () => Promise<string | null>;
    scanMarkdownFiles: () => Promise<
      { path: string; relative_path: string }[]
    >;
    readFile: (path: string) => Promise<string>;
    resolveDropPath?: (rawPath: string) => Promise<string | null>;
    getPathForFile?: (file: File) => string;
    log?: (payload: Record<string, unknown>) => void;
    getInitialRoot?: () => Promise<string | null>;
    listRecentDirectories: () => Promise<
      { id: string; path: string; openedAt: string; exists: boolean }[]
    >;
    openRecentDirectory: (id: string) => Promise<string | null>;
    removeRecentDirectory: (
      id: string
    ) => Promise<{ id: string; path: string; openedAt: string; exists: boolean }[]>;
    removeAllRecentDirectories: () => Promise<
      { id: string; path: string; openedAt: string; exists: boolean }[]
    >;
    onEntriesUpdated?: (
      handler: (entries: { path: string; relative_path: string }[]) => void
    ) => () => void;
    onFileChanged?: (handler: (fullPath: string) => void) => () => void;
  };
  /** フォルダ D&D 時に main.tsx から呼び出されるハンドラ */
  markvixLoadFolderFromDrop?: (path: string) => void;
}
