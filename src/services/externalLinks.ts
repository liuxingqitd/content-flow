import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/utils/api'

export async function openExternalLink(url: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke('open_external_url', { url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
