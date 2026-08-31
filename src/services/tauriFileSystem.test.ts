import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('@/utils/api', () => ({ isTauriRuntime: () => true }))

describe('iCloud text materialization', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    invokeMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reissues an accepted download request when iCloud makes no progress', async () => {
    let downloadRequests = 0
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'request_icloud_download') {
        downloadRequests += 1
        return undefined
      }
      if (command === 'text_file_state') return downloadRequests >= 2 ? 'local' : 'cloud'
      if (command === 'read_text_file') return '逐字稿正文'
      throw new Error(`unexpected command: ${command}`)
    })
    const { readTauriMaterializedText } = await import('./tauriFileSystem')

    const reading = readTauriMaterializedText(
      { kind: 'tauri', path: '/iCloud/data' },
      'scripts/test.md',
    )
    await vi.advanceTimersByTimeAsync(10_500)

    await expect(reading).resolves.toBe('逐字稿正文')
    expect(downloadRequests).toBe(2)
    expect(invokeMock).toHaveBeenLastCalledWith('read_text_file', {
      root: '/iCloud/data',
      relativePath: 'scripts/test.md',
    })
  })
})
