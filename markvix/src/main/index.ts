import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { dirname, isAbsolute, join, relative, sep, resolve, normalize } from 'path'
import { fileURLToPath } from 'url'
import { promises as fs, watch, type FSWatcher } from 'fs'
import icon from '../../resources/icon.png?asset'

const markdownExtensions = new Set(['.md', '.mdx', '.markdown'])

let currentRootDir: string | null = null
let rootWatcher: FSWatcher | null = null
let scanTimeout: NodeJS.Timeout | null = null

function normalizePath(p: string): string {
  return normalize(resolve(p))
}

function isPathInsideRoot(root: string, candidate: string): boolean {
  const rootNorm = normalizePath(root)
  const candNorm = normalizePath(candidate)
  const rel = relative(rootNorm, candNorm)
  // same path or child path: rel === '' or does not start with '..'
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

async function getInitialRootFromArgs(): Promise<string | null> {
  const args = process.argv.slice(1)
  for (const arg of args) {
    // 明示的に絶対パスとして指定されたディレクトリのみを採用する
    // （開発時に渡される作業ディレクトリなどの相対パスは無視する）
    if (!isAbsolute(arg)) continue
    try {
      const stat = await fs.stat(arg)
      if (stat.isDirectory()) {
        return arg
      }
    } catch {
      // ignore invalid paths
    }
  }
  return null
}

async function scanMarkdownFiles(root: string): Promise<{ path: string; relative_path: string }[]> {
  const results: { path: string; relative_path: string }[] = []
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target'])

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue
        await walk(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      const dot = entry.name.lastIndexOf('.')
      if (dot < 0) continue
      const ext = entry.name.slice(dot).toLowerCase()
      if (!markdownExtensions.has(ext)) continue
      const rel = relative(root, fullPath).split(sep).join('/')
      results.push({ path: fullPath, relative_path: rel })
    }
  }

  await walk(root)
  return results
}

function broadcastEntriesUpdated(entries: { path: string; relative_path: string }[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('fs:entriesUpdated', entries)
  }
}

function broadcastFileChanged(fullPath: string): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('fs:fileChanged', fullPath)
  }
}

async function triggerRescan(): Promise<void> {
  if (!currentRootDir) return
  try {
    const entries = await scanMarkdownFiles(currentRootDir)
    broadcastEntriesUpdated(entries)
  } catch (error) {
    console.warn('[markvix] failed to rescan markdown files:', error)
  }
}

function scheduleRescan(): void {
  if (scanTimeout) {
    clearTimeout(scanTimeout)
  }
  scanTimeout = setTimeout(() => {
    scanTimeout = null
    void triggerRescan()
  }, 500)
}

function startRootWatcher(root: string): void {
  if (rootWatcher) {
    rootWatcher.close()
    rootWatcher = null
  }

  try {
    rootWatcher = watch(
      root,
      {
        recursive: true
      },
      (eventType, filename) => {
        // filename が取れないケースもあるので、その場合もツリー再スキャンだけは行う
        if (!currentRootDir) return

        scheduleRescan()

        if (!filename) return

        const fullPath = join(root, filename)
        if (!isPathInsideRoot(currentRootDir, fullPath)) {
          return
        }

        if (eventType === 'change' || eventType === 'rename') {
          const dot = filename.lastIndexOf('.')
          if (dot < 0) return
          const ext = filename.slice(dot).toLowerCase()
          if (!markdownExtensions.has(ext)) return
          broadcastFileChanged(normalizePath(fullPath))
        }
      }
    )

    rootWatcher.on('error', (error) => {
      console.warn('[markvix] root watcher error:', error)
      rootWatcher?.close()
      rootWatcher = null
    })
  } catch (error) {
    // Windows 以外で recursive オプションが未対応など、fs.watch 自体が使えない環境では
    // 自動更新をあきらめ、手動の「更新」にフォールバックする。
    console.warn('[markvix] failed to start root watcher:', error)
    rootWatcher = null
  }
}

function setCurrentRootDir(nextRoot: string): void {
  const normalized = normalizePath(nextRoot)
  currentRootDir = normalized
  startRootWatcher(normalized)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Markvix',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url)
      const protocol = url.protocol
      // Allow only http/https links to be opened externally.
      if (protocol === 'http:' || protocol === 'https:') {
        shell.openExternal(details.url)
      } else {
        // Forbid file://, javascript:, and other custom schemes for safety.
        console.warn('[markvix] blocked external URL:', details.url)
      }
    } catch {
      console.warn('[markvix] invalid external URL:', details.url)
    }
    return { action: 'deny' }
  })

  // ファイル/フォルダのドロップ時に誤ってナビゲーションしないようにする
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.isPackaged ? 'com.markvix' : process.execPath)
  }

  // DevTools shortcuts and test-only handlers in development
  if (!app.isPackaged) {
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
        if (input.control && input.key.toLowerCase() === 'r') {
          window.webContents.reload()
          event.preventDefault()
        }
      })
    })

    // IPC test handler is only enabled in development.
    ipcMain.on('ping', () => console.log('pong'))
  }

  ipcMain.handle('app:getInitialRoot', async () => {
    const initial = await getInitialRootFromArgs()
    if (initial) {
      // 起動引数で指定されたディレクトリをルートとして採用する
      setCurrentRootDir(initial)
    }
    return initial
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selected = result.filePaths[0] ?? null
    if (!selected) return null
    setCurrentRootDir(selected)
    return currentRootDir
  })

  ipcMain.handle('fs:scanMarkdownFiles', async () => {
    if (!currentRootDir) {
      // Renderer から任意パスを受け取ってルートを変更しないようにするため、
      // ルートは app:getInitialRoot / dialog:openFolder / fs:resolveDropPath のみで更新する。
      throw new Error('Root directory is not set')
    }
    return scanMarkdownFiles(currentRootDir)
  })

  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    if (!filePath) throw new Error('Invalid path')
    if (!currentRootDir) {
      throw new Error('Root directory is not set')
    }
    const resolvedPath = isAbsolute(filePath)
      ? normalizePath(filePath)
      : normalizePath(join(currentRootDir, filePath))
    if (!isPathInsideRoot(currentRootDir, resolvedPath)) {
      throw new Error('Access to the requested file is not allowed')
    }
    const data = await fs.readFile(resolvedPath, 'utf-8')
    return data
  })

  ipcMain.handle('fs:resolveDropPath', async (_event, rawPath: string) => {
    if (!rawPath) return null
    let candidate = rawPath
    if (rawPath.startsWith('file://')) {
      try {
        candidate = fileURLToPath(rawPath)
      } catch {
        return null
      }
    }
    try {
      const stat = await fs.stat(candidate)
      if (stat.isDirectory()) {
        setCurrentRootDir(candidate)
        return currentRootDir
      }
      if (stat.isFile()) {
        const dir = dirname(candidate)
        setCurrentRootDir(dir)
        return currentRootDir
      }
    } catch {
      return null
    }
    return null
  })

  ipcMain.on('log:agent', (_event, payload) => {
    // 開発時のデバッグ用ログ。ビルド済みバイナリでは冗長なログを出さない。
    if (!app.isPackaged) {
      console.log('[agent-log]', payload)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (rootWatcher) {
    rootWatcher.close()
    rootWatcher = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
