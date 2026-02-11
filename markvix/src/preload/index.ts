import { contextBridge, ipcRenderer, webUtils } from 'electron'

type MarkdownEntry = {
  path: string
  relative_path: string
}

// Custom APIs for renderer
const api = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  scanMarkdownFiles: () => ipcRenderer.invoke('fs:scanMarkdownFiles'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  resolveDropPath: (rawPath: string) => ipcRenderer.invoke('fs:resolveDropPath', rawPath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  log: (payload: Record<string, unknown>) => ipcRenderer.send('log:agent', payload),
  getInitialRoot: () => ipcRenderer.invoke('app:getInitialRoot'),
  onEntriesUpdated: (handler: (entries: MarkdownEntry[]) => void) => {
    const listener = (_event: unknown, entries: MarkdownEntry[]) => {
      handler(entries)
    }
    ipcRenderer.on('fs:entriesUpdated', listener)
    return () => {
      ipcRenderer.removeListener('fs:entriesUpdated', listener)
    }
  },
  onFileChanged: (handler: (fullPath: string) => void) => {
    const listener = (_event: unknown, fullPath: string) => {
      handler(fullPath)
    }
    ipcRenderer.on('fs:fileChanged', listener)
    return () => {
      ipcRenderer.removeListener('fs:fileChanged', listener)
    }
  }
}

// Use `contextBridge` APIs to expose custom APIs to
// renderer only if context isolation is enabled, otherwise
// fall back to assigning to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
