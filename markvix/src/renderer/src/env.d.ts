/// <reference types="vite/client" />

interface Window {
  api: {
    openFolder: () => Promise<string | null>;
    scanMarkdownFiles: (root: string) => Promise<
      { path: string; relative_path: string }[]
    >;
    readFile: (path: string) => Promise<string>;
    resolveDropPath?: (rawPath: string) => Promise<string | null>;
    getPathForFile?: (file: File) => string;
    log?: (payload: Record<string, unknown>) => void;
    getInitialRoot?: () => Promise<string | null>;
  };
  /** フォルダ D&D 時に main.tsx から呼び出されるハンドラ */
  markvixLoadFolderFromDrop?: (path: string) => void;
}
