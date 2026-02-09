import { contextBridge, ipcRenderer, webUtils } from 'electron'

// Custom APIs for renderer
const api = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  scanMarkdownFiles: (root: string) => ipcRenderer.invoke('fs:scanMarkdownFiles', root),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  resolveDropPath: (rawPath: string) => ipcRenderer.invoke('fs:resolveDropPath', rawPath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  log: (payload: Record<string, unknown>) => ipcRenderer.send('log:agent', payload),
  getInitialRoot: () => ipcRenderer.invoke('app:getInitialRoot')
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
