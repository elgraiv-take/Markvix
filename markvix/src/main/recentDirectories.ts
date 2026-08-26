import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'

export type RecentDirectoryRecord = {
  id: string
  path: string
  openedAt: string
}

export type RecentDirectory = RecentDirectoryRecord & {
  exists: boolean
}

type StoreFile = {
  version: 1
  directories: RecentDirectoryRecord[]
}

const STORE_FILE_NAME = 'recent-directories.json'

let writeChain: Promise<void> = Promise.resolve()

function getSavedDir(): string {
  return join(app.getPath('appData'), 'Markvix', 'Saved')
}

function getStorePath(): string {
  return join(getSavedDir(), STORE_FILE_NAME)
}

function pathsEqual(a: string, b: string): boolean {
  if (process.platform === 'win32') {
    return a.toLowerCase() === b.toLowerCase()
  }
  return a === b
}

async function ensureSavedDir(): Promise<void> {
  await fs.mkdir(getSavedDir(), { recursive: true })
}

async function readStoreUnlocked(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf-8')
    const parsed = JSON.parse(raw) as StoreFile
    if (parsed?.version !== 1 || !Array.isArray(parsed.directories)) {
      return { version: 1, directories: [] }
    }
    const directories = parsed.directories.filter((entry): entry is RecentDirectoryRecord =>
      Boolean(
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.path === 'string' &&
        typeof entry.openedAt === 'string'
      )
    )
    return { version: 1, directories }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      console.warn('[markvix] failed to read recent directories:', error)
    }
    return { version: 1, directories: [] }
  }
}

async function writeStoreUnlocked(store: StoreFile): Promise<void> {
  await ensureSavedDir()
  const payload = JSON.stringify(store, null, 2)
  await fs.writeFile(getStorePath(), payload, 'utf-8')
}

function enqueueStoreUpdate<T>(fn: (store: StoreFile) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStoreUnlocked()
    return await fn(store)
  })
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function withExists(records: RecentDirectoryRecord[]): Promise<RecentDirectory[]> {
  return Promise.all(
    records.map(async (entry) => {
      try {
        const stat = await fs.stat(entry.path)
        return { ...entry, exists: stat.isDirectory() }
      } catch {
        return { ...entry, exists: false }
      }
    })
  )
}

export async function listRecentDirectories(): Promise<RecentDirectory[]> {
  const store = await enqueueStoreUpdate((current) => current)
  return withExists(store.directories)
}

export async function rememberRecentDirectory(path: string): Promise<RecentDirectory[]> {
  return enqueueStoreUpdate(async (store) => {
    const openedAt = new Date().toISOString()
    const existing = store.directories.find((entry) => pathsEqual(entry.path, path))
    const nextEntry: RecentDirectoryRecord = existing
      ? { ...existing, path, openedAt }
      : { id: randomUUID(), path, openedAt }

    store.directories = [
      nextEntry,
      ...store.directories.filter((entry) => entry.id !== nextEntry.id)
    ]
    await writeStoreUnlocked(store)
    return withExists(store.directories)
  })
}

export async function findRecentDirectoryById(id: string): Promise<RecentDirectoryRecord | null> {
  const store = await enqueueStoreUpdate((current) => current)
  return store.directories.find((entry) => entry.id === id) ?? null
}

export async function removeRecentDirectory(id: string): Promise<RecentDirectory[]> {
  return enqueueStoreUpdate(async (store) => {
    store.directories = store.directories.filter((entry) => entry.id !== id)
    await writeStoreUnlocked(store)
    return withExists(store.directories)
  })
}

export async function removeAllRecentDirectories(): Promise<RecentDirectory[]> {
  return enqueueStoreUpdate(async (store) => {
    store.directories = []
    await writeStoreUnlocked(store)
    return []
  })
}
