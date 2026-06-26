import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/utils/api'

const STORAGE_KEY = 'contentflow.tauri-data-dir.v1'

export interface TauriDirectoryHandle {
  kind: 'tauri'
  path: string
}

export interface NativeTextFile {
  name: string
  content: string
  updated_at: string
}

export function isTauriDirectoryHandle(handle: unknown): handle is TauriDirectoryHandle {
  return Boolean(handle && typeof handle === 'object' && (handle as TauriDirectoryHandle).kind === 'tauri')
}

export function tauriFileSystemAvailable(): boolean {
  return isTauriRuntime()
}

export async function getTauriDirectoryHandle(): Promise<TauriDirectoryHandle | null> {
  if (!tauriFileSystemAvailable()) return null
  const path = window.localStorage.getItem(STORAGE_KEY)
  if (!path) return null
  const exists = await invoke<boolean>('directory_exists', { path })
  return exists ? { kind: 'tauri', path } : null
}

export async function pickTauriDirectory(): Promise<TauriDirectoryHandle> {
  const path = await invoke<string | null>('pick_data_directory')
  if (!path) {
    const error = new Error('用户取消选择')
    error.name = 'AbortError'
    throw error
  }

  const handle = { kind: 'tauri' as const, path }
  await validateTauriDataDirectory(handle)
  window.localStorage.setItem(STORAGE_KEY, path)
  return handle
}

export function clearTauriDirectoryHandle(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export async function validateTauriDataDirectory(handle: TauriDirectoryHandle): Promise<void> {
  const [hasNestedScripts, hasRootMarkdown] = await Promise.all([
    invoke<boolean>('has_directory', { root: handle.path, name: 'scripts' }),
    invoke<boolean>('has_markdown_files', { root: handle.path }),
  ])

  if (!hasNestedScripts && hasRootMarkdown) {
    throw new Error('请选择数据根目录，不要选择 scripts 子目录')
  }
}

export async function readTauriText(handle: TauriDirectoryHandle, relativePath: string): Promise<string | null> {
  return invoke<string | null>('read_text_file', { root: handle.path, relativePath })
}

export async function writeTauriText(
  handle: TauriDirectoryHandle,
  relativePath: string,
  contents: string,
  validateJson = false,
): Promise<void> {
  await invoke('write_text_file', { root: handle.path, relativePath, contents, validateJson })
}

export async function deleteTauriFile(handle: TauriDirectoryHandle, relativePath: string): Promise<void> {
  await invoke('delete_file', { root: handle.path, relativePath })
}

export async function listTauriMarkdownFiles(
  handle: TauriDirectoryHandle,
  relativeDir: string,
): Promise<NativeTextFile[]> {
  return invoke<NativeTextFile[]>('list_markdown_files', { root: handle.path, relativeDir })
}

export async function readTauriBytes(handle: TauriDirectoryHandle, relativePath: string): Promise<Uint8Array | null> {
  const bytes = await invoke<number[] | null>('read_binary_file', { root: handle.path, relativePath })
  return bytes ? new Uint8Array(bytes) : null
}

export async function writeTauriBytes(
  handle: TauriDirectoryHandle,
  relativePath: string,
  bytes: Uint8Array,
): Promise<void> {
  await invoke('write_binary_file', { root: handle.path, relativePath, bytes: Array.from(bytes) })
}
