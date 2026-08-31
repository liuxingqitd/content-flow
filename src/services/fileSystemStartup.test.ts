import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAppData } from './defaultData'

const tauriMocks = vi.hoisted(() => ({
  files: new Map<string, string>(),
  listMarkdownFiles: vi.fn(),
  readText: vi.fn(async (_handle: unknown, path: string) => tauriMocks.files.get(path) ?? null),
  writeText: vi.fn(async (_handle: unknown, path: string, contents: string) => {
    tauriMocks.files.set(path, contents)
  }),
}))

vi.mock('./tauriFileSystem', () => ({
  clearTauriDirectoryHandle: vi.fn(),
  deleteTauriFile: vi.fn(),
  getTauriDirectoryHandle: vi.fn(async () => ({ kind: 'tauri', path: '/test-data' })),
  isTauriDirectoryHandle: (handle: unknown) =>
    Boolean(handle && typeof handle === 'object' && (handle as { kind?: string }).kind === 'tauri'),
  listTauriMarkdownFiles: tauriMocks.listMarkdownFiles,
  pickTauriDirectory: vi.fn(),
  readTauriBytes: vi.fn(),
  readTauriCoverThumbnail: vi.fn(),
  readTauriText: tauriMocks.readText,
  renameTauriFile: vi.fn(),
  tauriFileSystemAvailable: vi.fn(() => true),
  writeTauriBytes: vi.fn(),
  writeTauriText: tauriMocks.writeText,
}))

function seedSplitData(version: string) {
  const defaults = defaultAppData()
  tauriMocks.files.set('videos.json', JSON.stringify([{
    id: 'vid_test',
    title: '测试视频',
    status: 'idea',
    tagIds: [],
    platforms: [],
    statusHistory: [],
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
  }]))
  tauriMocks.files.set('videoRelations.json', '[]')
  tauriMocks.files.set('topics.json', '[]')
  tauriMocks.files.set('scripts.json', '[]')
  tauriMocks.files.set('metrics.json', '[]')
  tauriMocks.files.set('tags.json', JSON.stringify(defaults.tags))
  tauriMocks.files.set('checklists.json', JSON.stringify({
    checklistItems: defaults.checklistItems,
    transitionChecklists: defaults.transitionChecklists,
  }))
  tauriMocks.files.set('settings.json', JSON.stringify(defaults.settings))
  tauriMocks.files.set('douyinRecords.json', '[]')
  tauriMocks.files.set('shipinhaoRecords.json', '[]')
  tauriMocks.files.set('xiaohongshuRecords.json', '[]')
  tauriMocks.files.set('version.json', JSON.stringify({ version }))
}

describe('desktop startup script migration', () => {
  beforeEach(() => {
    vi.resetModules()
    tauriMocks.files.clear()
    tauriMocks.listMarkdownFiles.mockReset()
    tauriMocks.readText.mockClear()
    tauriMocks.writeText.mockClear()
  })

  it('does not enumerate Markdown after the 1.2 migration completed', async () => {
    seedSplitData('1.2')
    tauriMocks.listMarkdownFiles.mockRejectedValue(new Error('MARKDOWN_SCAN_FORBIDDEN'))
    const { readAppData } = await import('./fileSystem')

    const data = await readAppData()

    expect(data.version).toBe('1.2')
    expect(tauriMocks.listMarkdownFiles).not.toHaveBeenCalled()
  })

  it('runs the legacy migration once and skips it on the next load', async () => {
    seedSplitData('1.1')
    tauriMocks.listMarkdownFiles.mockResolvedValue([])
    const { readAppData } = await import('./fileSystem')

    const migrated = await readAppData()
    const loadedAgain = await readAppData()

    expect(migrated.version).toBe('1.2')
    expect(loadedAgain.version).toBe('1.2')
    expect(tauriMocks.listMarkdownFiles).toHaveBeenCalledTimes(1)
  })

  it('reads an indexed script directly without scanning every Markdown file', async () => {
    const markdown = '---\ncontentflow_id: script_test\ncontentflow_schema: 1\n---\n正文内容'
    tauriMocks.files.set('scripts/测试稿--test.md', markdown)
    tauriMocks.listMarkdownFiles.mockRejectedValue(new Error('MARKDOWN_SCAN_FORBIDDEN'))
    const { readScriptContent } = await import('./fileSystem')

    const content = await readScriptContent({
      id: 'script_test',
      title: '测试稿',
      fileName: '测试稿--test.md',
    })

    expect(content).toBe('正文内容')
    expect(tauriMocks.readText).toHaveBeenCalledWith(
      { kind: 'tauri', path: '/test-data' },
      'scripts/测试稿--test.md',
    )
    expect(tauriMocks.listMarkdownFiles).not.toHaveBeenCalled()
  })

  it('uses the legacy id filename before falling back to a directory scan', async () => {
    tauriMocks.files.set('scripts/script_legacy.md', '旧格式正文')
    tauriMocks.listMarkdownFiles.mockRejectedValue(new Error('MARKDOWN_SCAN_FORBIDDEN'))
    const { readScriptContent } = await import('./fileSystem')

    await expect(readScriptContent('script_legacy')).resolves.toBe('旧格式正文')
    expect(tauriMocks.listMarkdownFiles).not.toHaveBeenCalled()
  })

  it('treats a new indexed draft without a filename as empty without scanning', async () => {
    tauriMocks.listMarkdownFiles.mockRejectedValue(new Error('MARKDOWN_SCAN_FORBIDDEN'))
    const { readScriptContent } = await import('./fileSystem')

    await expect(readScriptContent({
      id: 'script_new',
      title: '尚未保存的新稿',
      fileName: undefined,
    })).resolves.toBe('')
    expect(tauriMocks.listMarkdownFiles).not.toHaveBeenCalled()
  })
})
