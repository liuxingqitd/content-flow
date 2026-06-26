const DESKTOP_API_ORIGIN = 'http://127.0.0.1:3001'

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as TauriWindow).__TAURI_INTERNALS__)
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return isTauriRuntime() ? `${DESKTOP_API_ORIGIN}${normalizedPath}` : normalizedPath
}
