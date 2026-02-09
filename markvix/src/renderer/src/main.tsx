import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// グローバルな D&D でフォルダを開く
const handleGlobalDragOver = (event: DragEvent) => {
  // Debug: confirm global dragover is being handled
  console.debug("[markvix] global dragover");
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
};

const handleGlobalDrop = async (event: DragEvent) => {
  // Debug: confirm global drop is being handled
  console.debug("[markvix] global drop event");
  event.preventDefault();
  event.stopPropagation();

  const dt = event.dataTransfer;
  const files = Array.from(dt?.files ?? []);
  const items = Array.from(dt?.items ?? []);
  const file0 = files[0] as File & { path?: string; webkitRelativePath?: string };
  const item0 = items[0] as unknown as { getAsFile?: () => { path?: string; name?: string } | null };
  const item0File = item0?.getAsFile?.() ?? null;
  const textUriList = dt?.getData("text/uri-list") ?? "";
  const textPlain = dt?.getData("text/plain") ?? "";

  if (files.length === 0 && items.length === 0) {
    return;
  }

  let droppedPath: string | undefined;

  if (files.length > 0) {
    const getPathForFile = window.api?.getPathForFile;
    if (getPathForFile) {
      try {
        droppedPath = getPathForFile(file0) || undefined;
      } catch {
        droppedPath = undefined;
      }
    }
    if (!droppedPath) {
      droppedPath = file0?.path;
    }
  }

  // files から取れなかった場合は items 経由で try（環境によってはこちらだけパスが載ることがある）
  if (!droppedPath && items.length > 0) {
    droppedPath = item0File?.path;
  }

  // それでも取れない場合は text/uri-list or text/plain を試す
  if (!droppedPath && dt) {
    const raw = textUriList || textPlain;
    const first = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));
    droppedPath = first || undefined;
  }

  if (!droppedPath) {
    window.api?.log?.({
      location: "renderer/main.tsx:drop",
      message: "drop path not found",
      data: { filesLength: files.length, itemsLength: items.length },
    });
    return;
  }

  let resolvedPath: string | null | undefined;
  const resolver = window.api?.resolveDropPath;
  if (resolver) {
    try {
      resolvedPath = await resolver(droppedPath);
    } catch {
      resolvedPath = null;
    }
  }

  window.api?.log?.({
    location: "renderer/main.tsx:drop",
    message: "drop path resolved",
    data: { droppedPath, resolvedPath: resolvedPath ?? null },
  });

  // App 側に直接コールバックで通知
  window.markvixLoadFolderFromDrop?.(resolvedPath ?? droppedPath);
};

window.addEventListener("dragover", handleGlobalDragOver);
window.addEventListener("drop", handleGlobalDrop);
document.addEventListener("dragover", handleGlobalDragOver as unknown as EventListener);
document.addEventListener("drop", handleGlobalDrop as unknown as EventListener);
