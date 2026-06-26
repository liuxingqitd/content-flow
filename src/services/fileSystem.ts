import type { AppData, DouyinRawRecord, ShipinhaoRawRecord, XiaohongshuRawRecord, Script, Video } from '@/types'
import { defaultAppData } from './defaultData'
import { nanoid } from 'nanoid'
import {
  clearTauriDirectoryHandle,
  deleteTauriFile,
  getTauriDirectoryHandle,
  isTauriDirectoryHandle,
  listTauriMarkdownFiles,
  pickTauriDirectory,
  readTauriBytes,
  readTauriText,
  tauriFileSystemAvailable,
  type TauriDirectoryHandle,
  writeTauriBytes,
  writeTauriText,
} from './tauriFileSystem'

const DOUYIN_SEED: Omit<DouyinRawRecord, 'id' | 'createdAt'>[] = [
  { title: '每天花一小时玩AI，比你报千元课都管用', publishedAt: '2026-05-18 18:49:34', genre: '1-3min视频', status: '公开', plays: 1500, completionRate: 0.031092, fiveSecRate: 0.416063, coverCtr: '-', twoSecBounceRate: 0.347597, avgPlayDuration: 13.551408, likes: 34, shares: 1, comments: 1, saves: 5, profileVisits: 4, followerGain: 4 },
  { title: '我做了个可视化skill工具可以一键安装、同步skill', publishedAt: '2026-05-16 17:33:33', genre: '1-3min视频', status: '公开', plays: 3387, completionRate: 0.034909, fiveSecRate: 0.350379, coverCtr: '-', twoSecBounceRate: 0.356872, avgPlayDuration: 16.264848, likes: 54, shares: 7, comments: 6, saves: 51, profileVisits: 52, followerGain: 3 },
  { title: 'AI做的3D可交互的细胞结构模型，效果太炸裂！', publishedAt: '2026-05-15 18:59:28', genre: '1min-视频', status: '公开', plays: 2342, completionRate: 0.043687, fiveSecRate: 0.345805, coverCtr: '-', twoSecBounceRate: 0.404490, avgPlayDuration: 8.903808, likes: 52, shares: 1, comments: 1, saves: 54, profileVisits: 23, followerGain: 4 },
  { title: 'Claude Code 新手必学的三个命令', publishedAt: '2026-05-14 23:18:00', genre: '1-3min视频', status: '公开', plays: 18573, completionRate: 0.043936, fiveSecRate: 0.343382, coverCtr: '-', twoSecBounceRate: 0.385556, avgPlayDuration: 13.689828, likes: 430, shares: 47, comments: 12, saves: 399, profileVisits: 117, followerGain: 38 },
]

const SHIPINHAO_SEED: Omit<ShipinhaoRawRecord, 'id' | 'createdAt'>[] = [
  { description: '学AI最快的路径，不是看教程，而是Learning by Playing。', videoId: 'export/UzFfBgAAxJCDaEA3BjLrjMzT4DCa4hcv0-bdtO-54xQoW6Io6w', publishedAt: '2026/05/18', completionRate: 0.0808, avgPlayDuration: '24.67秒', plays: 805, recommendations: 1, likes: 4, comments: 1, shares: 4, follows: 3, forwardChat: 4, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: '学vibecoding前必须了解git是什么！', videoId: 'export/UzFfBgAAxLWDeHwbNTHpjMzT4DCaZ86KiaJIGgORiQDOikaPaQ', publishedAt: '2026/05/17', completionRate: 0.0192, avgPlayDuration: '24.88秒', plays: 9578, recommendations: 27, likes: 143, comments: 2, shares: 291, follows: 303, forwardChat: 291, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: 'skill不会装？换个agent要重装？我做了一个开源工具一键解决', videoId: 'export/UzFfBgAAxIyDLBUhGl7pjMzT4DCaPLBhs5_c6gHw5tkiqhS6Gg', publishedAt: '2026/05/16', completionRate: 0.0784, avgPlayDuration: '19.49秒', plays: 1071, recommendations: 4, likes: 11, comments: 2, shares: 25, follows: 2, forwardChat: 25, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: '分享Dilum Sanjaya用AI做的可3D交互的细胞结构模型', videoId: 'export/UzFfBgAAxLeDRAcEHjLvjMzT4DCa-mTpRD8l7v9mvM8DX6GU2g', publishedAt: '2026/05/15', completionRate: 0.0722, avgPlayDuration: '16.39秒', plays: 720, recommendations: 1, likes: 7, comments: 1, shares: 15, follows: 2, forwardChat: 15, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: 'Claude Code 新手必学的3个命令。', videoId: 'export/UzFfBgAAxJKDdH1UGB_sjMzT4DCaaBLRZiN8puwdosHmgUpDnA', publishedAt: '2026/05/14', completionRate: 0.1272, avgPlayDuration: '28.04秒', plays: 5426, recommendations: 13, likes: 48, comments: 3, shares: 163, follows: 20, forwardChat: 163, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: 'Mac上必装的5个App，vibe coding效率翻倍！', videoId: 'export/UzFfBgAAxOmDdEktLUXtjMzT4DCanq7GekUztn2pRHAzvs_hxw', publishedAt: '2026/05/13', completionRate: 0.1164, avgPlayDuration: '27.94秒', plays: 1752, recommendations: 2, likes: 20, comments: 5, shares: 32, follows: 1, forwardChat: 32, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
  { description: '2步做出你的第一个skill,0基础AI小白教程。', videoId: 'export/UzFfBgAAxICDGAQSclvijMzT4DCa5O6p0lO2_w2vKF8pbpN_9Q', publishedAt: '2026/05/12', completionRate: 0.0478, avgPlayDuration: '15.97秒', plays: 5780, recommendations: 7, likes: 33, comments: 5, shares: 147, follows: 26, forwardChat: 147, setRingtone: 0, setStatus: 0, setMomentCover: 0 },
]

const XIAOHONGSHU_SEED: Omit<XiaohongshuRawRecord, 'id' | 'createdAt'>[] = [
  { title: '做了一个工具，可视化管理本地所有的skill', publishedAt: '2026年06月02日20时34分44秒', genre: '视频', impressions: 493, views: 176, coverCtr: 0.068, likes: 6, comments: 4, saves: 4, follows: 0, shares: 2, avgWatchDuration: 8, danmaku: 0 },
  { title: '手把手教你用deepseek跑Claude workflow', publishedAt: '2026年06月01日22时14分26秒', genre: '视频', impressions: 4157, views: 1689, coverCtr: 0.046, likes: 37, comments: 5, saves: 93, follows: 15, shares: 9, avgWatchDuration: 18, danmaku: 0 },
  { title: '抓住AI时代的红利，普通人就做这三件事', publishedAt: '2026年05月31日09时27分28秒', genre: '视频', impressions: 1024, views: 480, coverCtr: 0.066, likes: 15, comments: 2, saves: 26, follows: 15, shares: 3, avgWatchDuration: 37, danmaku: 0 },
  { title: 'AI时代最稀缺的岗位 FDE', publishedAt: '2026年05月30日10时30分45秒', genre: '视频', impressions: 72, views: 11, coverCtr: 0.155, likes: 0, comments: 0, saves: 0, follows: 0, shares: 0, avgWatchDuration: 21, danmaku: 0 },
  { title: '比Opus4.8更重要的功能更新，不亚于skill', publishedAt: '2026年05月29日19时49分34秒', genre: '视频', impressions: 1831, views: 1606, coverCtr: 0.063, likes: 31, comments: 2, saves: 38, follows: 12, shares: 1, avgWatchDuration: 16, danmaku: 0 },
  { title: '2周4万人收藏的开源设计工具open-design', publishedAt: '2026年05月28日20时47分37秒', genre: '视频', impressions: 1071, views: 230, coverCtr: 0.1, likes: 3, comments: 2, saves: 3, follows: 2, shares: 0, avgWatchDuration: 50, danmaku: 0 },
  { title: '分享3个免费的联网搜索skill', publishedAt: '2026年05月28日19时35分29秒', genre: '视频', impressions: 51, views: 4, coverCtr: 0.098, likes: 0, comments: 0, saves: 0, follows: 0, shares: 0, avgWatchDuration: 90, danmaku: 0 },
  { title: 'Claude和Codex怎么选？', publishedAt: '2026年05月27日19时58分56秒', genre: '视频', impressions: 817, views: 397, coverCtr: 0.098, likes: 11, comments: 0, saves: 8, follows: 5, shares: 1, avgWatchDuration: 67, danmaku: 0 },
  { title: 'AI时代的通用语言Markdown，学5个符号掌握', publishedAt: '2026年05月26日19时36分17秒', genre: '视频', impressions: 1823, views: 308, coverCtr: 0.051, likes: 4, comments: 2, saves: 11, follows: 1, shares: 3, avgWatchDuration: 55, danmaku: 0 },
  { title: 'Claude额度不够？6个技巧省70%token', publishedAt: '2026年05月25日22时12分26秒', genre: '视频', impressions: 77, views: 8, coverCtr: 0.12, likes: 0, comments: 0, saves: 0, follows: 0, shares: 0, avgWatchDuration: 61, danmaku: 0 },
  { title: '我的AI学习信源，推荐9个值得关注的博主！', publishedAt: '2026年05月24日21时15分30秒', genre: '视频', impressions: 3763, views: 1467, coverCtr: 0.061, likes: 39, comments: 13, saves: 78, follows: 21, shares: 10, avgWatchDuration: 45, danmaku: 0 },
  { title: '20万人收藏的开源项目superpowers新手指南', publishedAt: '2026年05月23日18时30分32秒', genre: '视频', impressions: 2199, views: 525, coverCtr: 0.146, likes: 25, comments: 0, saves: 27, follows: 7, shares: 1, avgWatchDuration: 47, danmaku: 0 },
  { title: 'AI新手别在选模型上浪费时间了！', publishedAt: '2026年05月22日20时20分45秒', genre: '视频', impressions: 572, views: 234, coverCtr: 0.064, likes: 5, comments: 0, saves: 6, follows: 2, shares: 2, avgWatchDuration: 7, danmaku: 0 },
  { title: '我做了一个可视化的管理skill的工具', publishedAt: '2026年05月21日23时59分17秒', genre: '视频', impressions: 167, views: 15, coverCtr: 0.12, likes: 1, comments: 0, saves: 1, follows: 1, shares: 0, avgWatchDuration: 52, danmaku: 0 },
  { title: 'Karpathy不是单纯的"跳槽"而是在"下注"', publishedAt: '2026年05月20日16时27分24秒', genre: '视频', impressions: 2591, views: 1460, coverCtr: 0.078, likes: 31, comments: 0, saves: 26, follows: 42, shares: 11, avgWatchDuration: 16, danmaku: 0 },
]

const IDB_DB = 'ip_content'
const IDB_STORE = 'handles'
const HANDLE_KEY = 'rootDir'
const DEMO_ID_PREFIXES = ['vid_demo', 'script_demo', 'topic_demo']

type DataDirectoryHandle = FileSystemDirectoryHandle | TauriDirectoryHandle

type FileSystemPermissionDescriptor = { mode?: 'read' | 'readwrite' }
type PermissionDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>
  requestPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>
}
type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemHandle>
  removeEntry: (name: string) => Promise<void>
}
type WritableFileHandle = FileSystemFileHandle & {
  createWritable: () => Promise<FileSystemWritableFileStream>
}
type DirectoryPickerWindow = Window & {
  showDirectoryPicker: (options: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

const withPermissions = (handle: FileSystemDirectoryHandle): PermissionDirectoryHandle =>
  handle as PermissionDirectoryHandle

const asIterableDirectory = (handle: FileSystemDirectoryHandle): IterableDirectoryHandle =>
  handle as IterableDirectoryHandle

const asWritableFile = (handle: FileSystemFileHandle): WritableFileHandle =>
  handle as WritableFileHandle

const getDirectoryPickerWindow = (): DirectoryPickerWindow =>
  window as unknown as DirectoryPickerWindow

// ===== IndexedDB helpers for persisting directory handle =====

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ===== Directory handle management =====

let _dirHandle: DataDirectoryHandle | null = null

export async function getDirectoryHandle(): Promise<DataDirectoryHandle | null> {
  if (_dirHandle) return _dirHandle
  const tauriHandle = await getTauriDirectoryHandle()
  if (tauriHandle) {
    _dirHandle = tauriHandle
    return _dirHandle
  }
  const stored = await getStoredHandle()
  if (stored) {
    const permissionHandle = withPermissions(stored)
    // Re-verify permission
    const perm = await permissionHandle.queryPermission?.({ mode: 'readwrite' })
    if (perm === 'granted') {
      _dirHandle = stored
      return _dirHandle
    }
    // Try to re-request
    const req = await permissionHandle.requestPermission?.({ mode: 'readwrite' })
    if (req === 'granted') {
      _dirHandle = stored
      return _dirHandle
    }
  }
  return null
}

export async function pickDirectory(): Promise<DataDirectoryHandle> {
  if (tauriFileSystemAvailable()) {
    const handle = await pickTauriDirectory()
    _dirHandle = handle
    return handle
  }
  const handle = await getDirectoryPickerWindow().showDirectoryPicker({ mode: 'readwrite' })
  await validateDataDirectory(handle)
  _dirHandle = handle
  await storeHandle(handle)
  return handle
}

export async function clearStoredHandle(): Promise<void> {
  _dirHandle = null
  if (tauriFileSystemAvailable()) {
    clearTauriDirectoryHandle()
    return
  }
  const db = await openIDB()
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
  })
}

// ===== 多文件读写（新格式） =====

async function writeSingleFile(dir: FileSystemDirectoryHandle, filename: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value, null, 2)
  const tmpName = `${filename}.tmp`
  const tmpHandle = await dir.getFileHandle(tmpName, { create: true })
  const tmpWritable = await asWritableFile(tmpHandle).createWritable()
  try {
    await tmpWritable.write(json)
    await tmpWritable.close()
  } catch (e) {
    await tmpWritable.abort?.()
    throw e
  }
  // 验证可解析
  const tmpFile = await tmpHandle.getFile()
  JSON.parse(await tmpFile.text())
  // 写正式文件
  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await asWritableFile(fileHandle).createWritable()
  try {
    await writable.write(json)
    await writable.close()
  } catch (e) {
    await writable.abort?.()
    throw e
  }
  try { await asIterableDirectory(dir).removeEntry(tmpName) } catch { /* ignore */ }
}

async function readJsonFile<T>(dir: FileSystemDirectoryHandle, filename: string, fallback: T): Promise<T> {
  try {
    const fileHandle = await dir.getFileHandle(filename, { create: false })
    const file = await fileHandle.getFile()
    return JSON.parse(await file.text()) as T
  } catch {
    return fallback
  }
}

async function writeTauriJsonFile(dir: TauriDirectoryHandle, filename: string, value: unknown): Promise<void> {
  await writeTauriText(dir, filename, JSON.stringify(value, null, 2), true)
}

async function readTauriJsonFile<T>(dir: TauriDirectoryHandle, filename: string, fallback: T): Promise<T> {
  const text = await readTauriText(dir, filename)
  if (!text) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

async function writeSplitAppData(dir: FileSystemDirectoryHandle, data: AppData): Promise<void> {
  await Promise.all([
    writeSingleFile(dir, 'videos.json', data.videos),
    writeSingleFile(dir, 'videoRelations.json', data.videoRelations),
    writeSingleFile(dir, 'topics.json', data.topics),
    writeSingleFile(dir, 'scripts.json', data.scripts),
    writeSingleFile(dir, 'metrics.json', data.metrics),
    writeSingleFile(dir, 'tags.json', data.tags),
    writeSingleFile(dir, 'checklists.json', {
      checklistItems: data.checklistItems,
      transitionChecklists: data.transitionChecklists,
    }),
    writeSingleFile(dir, 'settings.json', data.settings),
    writeSingleFile(dir, 'douyinRecords.json', data.douyinRecords),
    writeSingleFile(dir, 'shipinhaoRecords.json', data.shipinhaoRecords),
    writeSingleFile(dir, 'xiaohongshuRecords.json', data.xiaohongshuRecords),
  ])
  // version 文件留存供将来使用
  await writeSingleFile(dir, 'version.json', { version: data.version ?? '1.0' })
}

async function writeTauriSplitAppData(dir: TauriDirectoryHandle, data: AppData): Promise<void> {
  await Promise.all([
    writeTauriJsonFile(dir, 'videos.json', data.videos),
    writeTauriJsonFile(dir, 'videoRelations.json', data.videoRelations),
    writeTauriJsonFile(dir, 'topics.json', data.topics),
    writeTauriJsonFile(dir, 'scripts.json', data.scripts),
    writeTauriJsonFile(dir, 'metrics.json', data.metrics),
    writeTauriJsonFile(dir, 'tags.json', data.tags),
    writeTauriJsonFile(dir, 'checklists.json', {
      checklistItems: data.checklistItems,
      transitionChecklists: data.transitionChecklists,
    }),
    writeTauriJsonFile(dir, 'settings.json', data.settings),
    writeTauriJsonFile(dir, 'douyinRecords.json', data.douyinRecords),
    writeTauriJsonFile(dir, 'shipinhaoRecords.json', data.shipinhaoRecords),
    writeTauriJsonFile(dir, 'xiaohongshuRecords.json', data.xiaohongshuRecords),
  ])
  await writeTauriJsonFile(dir, 'version.json', { version: data.version ?? '1.0' })
}

async function readSplitAppData(dir: FileSystemDirectoryHandle): Promise<AppData> {
  const defaults = defaultAppData()
  const [
    videos, videoRelations, topics, scripts, metrics, tags, checklists, settings, douyinRecords, shipinhaoRecords, xiaohongshuRecords, versionData,
  ] = await Promise.all([
    readJsonFile(dir, 'videos.json', [] as AppData['videos']),
    readJsonFile(dir, 'videoRelations.json', [] as AppData['videoRelations']),
    readJsonFile(dir, 'topics.json', [] as AppData['topics']),
    readJsonFile(dir, 'scripts.json', [] as AppData['scripts']),
    readJsonFile(dir, 'metrics.json', [] as AppData['metrics']),
    readJsonFile(dir, 'tags.json', defaults.tags),
    readJsonFile(dir, 'checklists.json', {
      checklistItems: defaults.checklistItems,
      transitionChecklists: defaults.transitionChecklists,
    }),
    readJsonFile(dir, 'settings.json', defaults.settings),
    readJsonFile(dir, 'douyinRecords.json', [] as AppData['douyinRecords']),
    readJsonFile(dir, 'shipinhaoRecords.json', [] as AppData['shipinhaoRecords']),
    readJsonFile(dir, 'xiaohongshuRecords.json', [] as AppData['xiaohongshuRecords']),
    readJsonFile(dir, 'version.json', { version: defaults.version }),
  ])

  return {
    version: versionData.version ?? defaults.version,
    videos,
    videoRelations,
    topics,
    scripts,
    metrics,
    tags,
    checklistItems: checklists.checklistItems ?? defaults.checklistItems,
    transitionChecklists: checklists.transitionChecklists ?? defaults.transitionChecklists,
    settings,
    douyinRecords,
    shipinhaoRecords,
    xiaohongshuRecords,
  }
}

async function readTauriSplitAppData(dir: TauriDirectoryHandle): Promise<AppData> {
  const defaults = defaultAppData()
  const [
    videos, videoRelations, topics, scripts, metrics, tags, checklists, settings, douyinRecords, shipinhaoRecords, xiaohongshuRecords, versionData,
  ] = await Promise.all([
    readTauriJsonFile(dir, 'videos.json', [] as AppData['videos']),
    readTauriJsonFile(dir, 'videoRelations.json', [] as AppData['videoRelations']),
    readTauriJsonFile(dir, 'topics.json', [] as AppData['topics']),
    readTauriJsonFile(dir, 'scripts.json', [] as AppData['scripts']),
    readTauriJsonFile(dir, 'metrics.json', [] as AppData['metrics']),
    readTauriJsonFile(dir, 'tags.json', defaults.tags),
    readTauriJsonFile(dir, 'checklists.json', {
      checklistItems: defaults.checklistItems,
      transitionChecklists: defaults.transitionChecklists,
    }),
    readTauriJsonFile(dir, 'settings.json', defaults.settings),
    readTauriJsonFile(dir, 'douyinRecords.json', [] as AppData['douyinRecords']),
    readTauriJsonFile(dir, 'shipinhaoRecords.json', [] as AppData['shipinhaoRecords']),
    readTauriJsonFile(dir, 'xiaohongshuRecords.json', [] as AppData['xiaohongshuRecords']),
    readTauriJsonFile(dir, 'version.json', { version: defaults.version }),
  ])

  return {
    version: versionData.version ?? defaults.version,
    videos,
    videoRelations,
    topics,
    scripts,
    metrics,
    tags,
    checklistItems: checklists.checklistItems ?? defaults.checklistItems,
    transitionChecklists: checklists.transitionChecklists ?? defaults.transitionChecklists,
    settings,
    douyinRecords,
    shipinhaoRecords,
    xiaohongshuRecords,
  }
}

// 检测旧 data.json 是否存在，如存在则迁移到多文件格式，旧文件重命名为 data.json.bak
async function migrateToSplitFormat(dir: FileSystemDirectoryHandle): Promise<void> {
  // 已迁移过则跳过（videos.json 存在说明已是新格式）
  try {
    await dir.getFileHandle('videos.json', { create: false })
    return
  } catch (e) {
    if (!isNotFoundError(e)) throw e
  }
  // 旧 data.json 不存在则跳过（全新安装）
  let oldText: string
  try {
    const oldHandle = await dir.getFileHandle('data.json', { create: false })
    oldText = await (await oldHandle.getFile()).text()
  } catch (e) {
    if (isNotFoundError(e)) return
    throw e
  }

  const oldData = JSON.parse(oldText) as AppData
  const migratedData = { ...oldData, videoRelations: oldData.videoRelations ?? [] }
  await writeSplitAppData(dir, migratedData)

  // 写备份文件
  const bakHandle = await dir.getFileHandle('data.json.bak', { create: true })
  const bakWritable = await asWritableFile(bakHandle).createWritable()
  try {
    await bakWritable.write(oldText)
    await bakWritable.close()
  } catch (e) {
    await bakWritable.abort?.()
    throw e
  }
  // 删除旧 data.json
  try { await asIterableDirectory(dir).removeEntry('data.json') } catch { /* ignore */ }
}

async function migrateTauriToSplitFormat(dir: TauriDirectoryHandle): Promise<void> {
  const videos = await readTauriText(dir, 'videos.json')
  if (videos) return

  const oldText = await readTauriText(dir, 'data.json')
  if (!oldText) return

  const oldData = JSON.parse(oldText) as AppData
  const migratedData = { ...oldData, videoRelations: oldData.videoRelations ?? [] }
  await writeTauriSplitAppData(dir, migratedData)
  await writeTauriText(dir, 'data.json.bak', oldText)
  await deleteTauriFile(dir, 'data.json')
}

// ===== data.json read / write（对外接口保持不变） =====

export async function readAppData(): Promise<AppData> {
  const dir = await getDirectoryHandle()
  if (!dir) throw new Error('NO_DIRECTORY')

  if (isTauriDirectoryHandle(dir)) {
    return readTauriAppData(dir)
  }

  // 一次性迁移：旧 data.json → 多文件
  try {
    await migrateToSplitFormat(dir)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`MIGRATE_FAILED: ${msg}`, { cause: e })
  }

  // 读取多文件格式
  let data: AppData
  try {
    data = await readSplitAppData(dir)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`READ_DATA_FAILED: ${msg}`, { cause: e })
  }

  // 全新目录：从 scripts/ 目录中恢复
  const isEmpty = data.videos.length === 0 && data.scripts.length === 0 && data.topics.length === 0
  if (isEmpty) {
    const imported = await buildInitialDataFromDirectory(dir)
    if (imported.videos.length > 0) {
      data = { ...data, videos: imported.videos, videoRelations: data.videoRelations ?? [], scripts: imported.scripts }
      await writeAppData(data)
      return data
    }
  }

  let changed = false

  // One-time migration: add video relations collection for existing installations
  if (!data.videoRelations) {
    data.videoRelations = []
    changed = true
  }

  // One-time migration: remove demo metrics seeded by old defaultData
  if (data.metrics?.some(m => m.videoId === 'vid_demo01')) {
    data.metrics = data.metrics.filter(m => m.videoId !== 'vid_demo01')
    changed = true
  }
  // One-time migration: add checklistItems for existing installations
  if (!data.checklistItems) {
    data.checklistItems = defaultAppData().checklistItems
    changed = true
  }
  // One-time migration: add transitionChecklists for existing installations
  if (!data.transitionChecklists) {
    data.transitionChecklists = defaultAppData().transitionChecklists
    changed = true
  }
  // One-time migration: add new TransitionKey entries for existing installations
  {
    const defaults = defaultAppData().transitionChecklists
    const keys = Object.keys(defaults) as (keyof typeof defaults)[]
    for (const key of keys) {
      if (!data.transitionChecklists[key]) {
        data.transitionChecklists[key] = defaults[key]
        changed = true
      }
    }
  }
  // One-time migration: add platform raw records (seed with exported data)
  if (!data.douyinRecords) {
    const now2 = new Date().toISOString()
    data.douyinRecords = DOUYIN_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }
  if (!data.shipinhaoRecords) {
    const now2 = new Date().toISOString()
    data.shipinhaoRecords = SHIPINHAO_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }
  if (!data.xiaohongshuRecords || data.xiaohongshuRecords.length === 0) {
    const now2 = new Date().toISOString()
    data.xiaohongshuRecords = XIAOHONGSHU_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }
  // One-time migration: TopicStatus rename (idea→inspiration, approved→adopted, rejected→inspiration)
  const topicStatusMap: Record<string, string> = {
    idea: 'inspiration',
    approved: 'adopted',
    rejected: 'inspiration',
  }
  const needsTopicMigration = data.topics?.some(t => t.status in topicStatusMap)
  if (needsTopicMigration) {
    data.topics = data.topics.map(t => ({
      ...t,
      status: (topicStatusMap[t.status] ?? t.status) as typeof t.status,
    }))
    changed = true
  }
  // One-time migration: add violation/skip reason presets for existing installations
  if (!data.settings.violationReasons) {
    data.settings.violationReasons = ['违反社区公约', '涉嫌第三方导流']
    changed = true
  }
  if (!data.settings.skipReasons) {
    data.settings.skipReasons = ['该平台不适合此类内容', '本期跳过发布']
    changed = true
  }
  if (data.settings.hidePromotionCost === undefined) {
    data.settings.hidePromotionCost = false
    changed = true
  }
  if (data.settings.hideCommercialAmount === undefined) {
    data.settings.hideCommercialAmount = false
    changed = true
  }

  const recovered = await recoverDemoIndexFromMarkdown(dir, data)
  if (recovered) {
    data = recovered
    changed = true
  }

  if (changed) await writeAppData(data)
  return data
}

async function readTauriAppData(dir: TauriDirectoryHandle): Promise<AppData> {
  try {
    await migrateTauriToSplitFormat(dir)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`MIGRATE_FAILED: ${msg}`, { cause: e })
  }

  let data: AppData
  try {
    data = await readTauriSplitAppData(dir)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`READ_DATA_FAILED: ${msg}`, { cause: e })
  }

  const isEmpty = data.videos.length === 0 && data.scripts.length === 0 && data.topics.length === 0
  if (isEmpty) {
    const imported = await buildInitialDataFromTauriDirectory(dir)
    if (imported.videos.length > 0) {
      data = { ...data, videos: imported.videos, videoRelations: data.videoRelations ?? [], scripts: imported.scripts }
      await writeAppData(data)
      return data
    }
  }

  let changed = false

  if (!data.videoRelations) {
    data.videoRelations = []
    changed = true
  }
  if (data.metrics?.some(m => m.videoId === 'vid_demo01')) {
    data.metrics = data.metrics.filter(m => m.videoId !== 'vid_demo01')
    changed = true
  }
  if (!data.checklistItems) {
    data.checklistItems = defaultAppData().checklistItems
    changed = true
  }
  if (!data.transitionChecklists) {
    data.transitionChecklists = defaultAppData().transitionChecklists
    changed = true
  }
  {
    const defaults = defaultAppData().transitionChecklists
    const keys = Object.keys(defaults) as (keyof typeof defaults)[]
    for (const key of keys) {
      if (!data.transitionChecklists[key]) {
        data.transitionChecklists[key] = defaults[key]
        changed = true
      }
    }
  }
  if (!data.douyinRecords) {
    const now2 = new Date().toISOString()
    data.douyinRecords = DOUYIN_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }
  if (!data.shipinhaoRecords) {
    const now2 = new Date().toISOString()
    data.shipinhaoRecords = SHIPINHAO_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }
  if (!data.xiaohongshuRecords || data.xiaohongshuRecords.length === 0) {
    const now2 = new Date().toISOString()
    data.xiaohongshuRecords = XIAOHONGSHU_SEED.map(r => ({ ...r, id: nanoid(), createdAt: now2 }))
    changed = true
  }

  const topicStatusMap: Record<string, string> = {
    idea: 'inspiration',
    approved: 'adopted',
    rejected: 'inspiration',
  }
  const needsTopicMigration = data.topics?.some(t => t.status in topicStatusMap)
  if (needsTopicMigration) {
    data.topics = data.topics.map(t => ({
      ...t,
      status: (topicStatusMap[t.status] ?? t.status) as typeof t.status,
    }))
    changed = true
  }
  if (!data.settings.violationReasons) {
    data.settings.violationReasons = ['违反社区公约', '涉嫌第三方导流']
    changed = true
  }
  if (!data.settings.skipReasons) {
    data.settings.skipReasons = ['该平台不适合此类内容', '本期跳过发布']
    changed = true
  }
  if (data.settings.hidePromotionCost === undefined) {
    data.settings.hidePromotionCost = false
    changed = true
  }
  if (data.settings.hideCommercialAmount === undefined) {
    data.settings.hideCommercialAmount = false
    changed = true
  }

  const recovered = await recoverDemoIndexFromTauriMarkdown(dir, data)
  if (recovered) {
    data = recovered
    changed = true
  }

  if (changed) await writeAppData(data)
  return data
}

function isNotFoundError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'NotFoundError'
}

async function buildInitialDataFromDirectory(dir: FileSystemDirectoryHandle): Promise<AppData> {
  const data = emptyAppData()
  const imported = await importMarkdownScripts(dir)
  if (!imported) return data
  return {
    ...data,
    videos: imported.videos,
    topics: [],
    scripts: imported.scripts,
  }
}

async function buildInitialDataFromTauriDirectory(dir: TauriDirectoryHandle): Promise<AppData> {
  const data = emptyAppData()
  const imported = await importTauriMarkdownScripts(dir)
  if (!imported) return data
  return {
    ...data,
    videos: imported.videos,
    topics: [],
    scripts: imported.scripts,
  }
}

function emptyAppData(): AppData {
  return {
    ...defaultAppData(),
    videos: [],
    videoRelations: [],
    topics: [],
    scripts: [],
    metrics: [],
  }
}

async function recoverDemoIndexFromMarkdown(
  dir: FileSystemDirectoryHandle,
  data: AppData,
): Promise<AppData | null> {
  if (!isDemoIndex(data)) return null
  const imported = await importMarkdownScripts(dir)
  if (!imported) return null
  return {
    ...data,
    videos: imported.videos,
    videoRelations: data.videoRelations ?? [],
    topics: data.topics.filter(t => !DEMO_ID_PREFIXES.some(prefix => t.id.startsWith(prefix))),
    scripts: imported.scripts,
    metrics: data.metrics.filter(m => !m.videoId.startsWith('vid_demo')),
  }
}

async function recoverDemoIndexFromTauriMarkdown(
  dir: TauriDirectoryHandle,
  data: AppData,
): Promise<AppData | null> {
  if (!isDemoIndex(data)) return null
  const imported = await importTauriMarkdownScripts(dir)
  if (!imported) return null
  return {
    ...data,
    videos: imported.videos,
    videoRelations: data.videoRelations ?? [],
    topics: data.topics.filter(t => !DEMO_ID_PREFIXES.some(prefix => t.id.startsWith(prefix))),
    scripts: imported.scripts,
    metrics: data.metrics.filter(m => !m.videoId.startsWith('vid_demo')),
  }
}

function isDemoIndex(data: AppData): boolean {
  const hasDemoVideos = data.videos.some(v => v.id.startsWith('vid_demo'))
  const hasDemoScripts = data.scripts.some(s => s.id.startsWith('script_demo'))
  const hasRealIndexedContent =
    data.videos.some(v => !v.id.startsWith('vid_demo')) ||
    data.scripts.some(s => !s.id.startsWith('script_demo'))
  return (hasDemoVideos || hasDemoScripts) && !hasRealIndexedContent
}

async function importMarkdownScripts(
  dir: FileSystemDirectoryHandle,
): Promise<{ scripts: Script[]; videos: Video[] } | null> {
  let scriptsDir: FileSystemDirectoryHandle
  try {
    scriptsDir = await dir.getDirectoryHandle('scripts', { create: false })
  } catch (e) {
    if (isNotFoundError(e)) return null
    throw e
  }

  const scripts: Script[] = []
  const videos: Video[] = []
  const nowIso = new Date().toISOString()

  for await (const handle of asIterableDirectory(scriptsDir).values()) {
    if (handle.kind !== 'file' || !handle.name.endsWith('.md')) continue
    const scriptHandle = handle as FileSystemFileHandle
    const id = handle.name.replace(/\.md$/, '')
    if (id.startsWith('script_demo')) continue
    const file = await scriptHandle.getFile()
    const content = await file.text()
    const title = extractMarkdownTitle(content, id)
    const wordCount = countScriptWords(content)
    const videoIdForScript = `vid_${id.replace(/^script_/, '')}`
    const createdAt = file.lastModified ? new Date(file.lastModified).toISOString() : nowIso

    scripts.push({
      id,
      videoId: videoIdForScript,
      title,
      wordCount,
      estimatedDuration: Math.max(1, Math.round(wordCount / 3.5)),
      tagIds: [],
      version: 1,
      createdAt,
      updatedAt: createdAt,
    })
    videos.push({
      id: videoIdForScript,
      title,
      status: 'scripting',
      tagIds: [],
      scriptId: id,
      statusHistory: [{ status: 'scripting', changedAt: createdAt }],
      platforms: [],
      createdAt,
      updatedAt: createdAt,
    })
  }

  if (scripts.length === 0) return null

  const orderedIndexes = scripts
    .map((script, index) => ({ script, video: videos[index] }))
    .sort((a, b) => b.script.updatedAt.localeCompare(a.script.updatedAt))

  return {
    scripts: orderedIndexes.map(item => item.script),
    videos: orderedIndexes.map(item => item.video),
  }
}

async function importTauriMarkdownScripts(
  dir: TauriDirectoryHandle,
): Promise<{ scripts: Script[]; videos: Video[] } | null> {
  const files = await listTauriMarkdownFiles(dir, 'scripts')
  const scripts: Script[] = []
  const videos: Video[] = []
  const nowIso = new Date().toISOString()

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue
    const id = file.name.replace(/\.md$/, '')
    if (id.startsWith('script_demo')) continue
    const content = file.content
    const title = extractMarkdownTitle(content, id)
    const wordCount = countScriptWords(content)
    const videoIdForScript = `vid_${id.replace(/^script_/, '')}`
    const timestamp = Number(file.updated_at)
    const createdAt = timestamp > 0 ? new Date(timestamp).toISOString() : nowIso

    scripts.push({
      id,
      videoId: videoIdForScript,
      title,
      wordCount,
      estimatedDuration: Math.max(1, Math.round(wordCount / 3.5)),
      tagIds: [],
      version: 1,
      createdAt,
      updatedAt: createdAt,
    })
    videos.push({
      id: videoIdForScript,
      title,
      status: 'scripting',
      tagIds: [],
      scriptId: id,
      statusHistory: [{ status: 'scripting', changedAt: createdAt }],
      platforms: [],
      createdAt,
      updatedAt: createdAt,
    })
  }

  if (scripts.length === 0) return null

  const orderedIndexes = scripts
    .map((script, index) => ({ script, video: videos[index] }))
    .sort((a, b) => b.script.updatedAt.localeCompare(a.script.updatedAt))

  return {
    scripts: orderedIndexes.map(item => item.script),
    videos: orderedIndexes.map(item => item.video),
  }
}

function extractMarkdownTitle(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading

  const firstLine = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean)
  return firstLine ? firstLine.replace(/^#+\s*/, '').slice(0, 80) : fallback
}

function countScriptWords(content: string): number {
  return content.replace(/\s+/g, '').length
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function validateDataDirectory(dir: FileSystemDirectoryHandle): Promise<void> {
  const hasNestedScripts = await hasDirectory(dir, 'scripts')
  const hasRootMarkdown = await hasMarkdownFiles(dir)

  if (!hasNestedScripts && hasRootMarkdown) {
    throw new Error('请选择数据根目录，不要选择 scripts 子目录')
  }
}

async function hasDirectory(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getDirectoryHandle(name, { create: false })
    return true
  } catch (e) {
    if (isNotFoundError(e)) return false
    throw e
  }
}

async function hasMarkdownFiles(dir: FileSystemDirectoryHandle): Promise<boolean> {
  for await (const handle of asIterableDirectory(dir).values()) {
    if (handle.kind === 'file' && handle.name.endsWith('.md')) return true
  }
  return false
}

export async function writeAppData(data: AppData): Promise<void> {
  const dir = await getDirectoryHandle()
  if (!dir) throw new Error('NO_DIRECTORY')
  if (isTauriDirectoryHandle(dir)) {
    await writeTauriSplitAppData(dir, data)
    return
  }
  await writeSplitAppData(dir, data)
}

// ===== scripts/<id>.md read / write =====

async function getScriptsDir(dir: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return dir.getDirectoryHandle('scripts', { create: true })
}

export async function readScriptContent(scriptId: string): Promise<string> {
  const dir = await getDirectoryHandle()
  if (!dir) return ''
  if (isTauriDirectoryHandle(dir)) {
    return (await readTauriText(dir, `scripts/${scriptId}.md`)) ?? ''
  }
  try {
    const scriptsDir = await getScriptsDir(dir)
    const fileHandle = await scriptsDir.getFileHandle(`${scriptId}.md`, { create: false })
    const file = await fileHandle.getFile()
    return file.text()
  } catch {
    return ''
  }
}

export interface ScriptMarkdownDocument {
  scriptId: string
  content: string
  updatedAt: string
}

export async function listScriptMarkdownDocuments(): Promise<ScriptMarkdownDocument[]> {
  const dir = await getDirectoryHandle()
  if (!dir) return []

  if (isTauriDirectoryHandle(dir)) {
    const files = await listTauriMarkdownFiles(dir, 'scripts')
    return files.map(file => ({
      scriptId: file.name.replace(/\.md$/, ''),
      content: file.content,
      updatedAt: Number(file.updated_at) > 0 ? new Date(Number(file.updated_at)).toISOString() : new Date().toISOString(),
    }))
  }

  try {
    const scriptsDir = await getScriptsDir(dir)
    const documents: ScriptMarkdownDocument[] = []
    for await (const handle of asIterableDirectory(scriptsDir).values()) {
      if (handle.kind !== 'file' || !handle.name.endsWith('.md')) continue
      const file = await (handle as FileSystemFileHandle).getFile()
      documents.push({
        scriptId: handle.name.replace(/\.md$/, ''),
        content: await file.text(),
        updatedAt: new Date(file.lastModified).toISOString(),
      })
    }
    return documents
  } catch {
    return []
  }
}

export async function writeScriptContent(scriptId: string, content: string): Promise<void> {
  const dir = await getDirectoryHandle()
  if (!dir) throw new Error('NO_DIRECTORY')
  if (isTauriDirectoryHandle(dir)) {
    await writeTauriText(dir, `scripts/${scriptId}.md`, content)
    return
  }
  const scriptsDir = await getScriptsDir(dir)
  const fileHandle = await scriptsDir.getFileHandle(`${scriptId}.md`, { create: true })
  const writable = await asWritableFile(fileHandle).createWritable()
  try {
    await writable.write(content)
    await writable.close()
  } catch (e) {
    await writable.abort?.()
    throw e
  }
}

export async function deleteScriptFile(scriptId: string): Promise<void> {
  const dir = await getDirectoryHandle()
  if (!dir) return
  if (isTauriDirectoryHandle(dir)) {
    await deleteTauriFile(dir, `scripts/${scriptId}.md`)
    return
  }
  try {
    const scriptsDir = await getScriptsDir(dir)
    await asIterableDirectory(scriptsDir).removeEntry(`${scriptId}.md`)
  } catch {
    // ignore
  }
}

// ===== covers/<videoId>_<orientation>.<ext> read / write / delete =====

async function getCoversDir(dir: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return dir.getDirectoryHandle('covers', { create: true })
}

export async function writeCoverImage(
  videoId: string,
  orientation: 'portrait' | 'landscape',
  file: File,
): Promise<string> {
  const dir = await getDirectoryHandle()
  if (!dir) throw new Error('NO_DIRECTORY')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${videoId}_${orientation}.${ext}`
  if (isTauriDirectoryHandle(dir)) {
    await writeTauriBytes(dir, `covers/${filename}`, new Uint8Array(await file.arrayBuffer()))
    return ext
  }
  const coversDir = await getCoversDir(dir)
  const fileHandle = await coversDir.getFileHandle(filename, { create: true })
  const writable = await asWritableFile(fileHandle).createWritable()
  try {
    await writable.write(file)
    await writable.close()
  } catch (e) {
    await writable.abort?.()
    throw e
  }
  return ext
}

export async function readCoverImage(
  videoId: string,
  orientation: 'portrait' | 'landscape',
  ext: string,
): Promise<string | null> {
  const dir = await getDirectoryHandle()
  if (!dir) return null
  try {
    const filename = `${videoId}_${orientation}.${ext}`
    if (isTauriDirectoryHandle(dir)) {
      const bytes = await readTauriBytes(dir, `covers/${filename}`)
      if (!bytes) return null
      const blob = new Blob([bytesToArrayBuffer(bytes)], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
      return URL.createObjectURL(blob)
    }
    const coversDir = await getCoversDir(dir)
    const fileHandle = await coversDir.getFileHandle(filename, { create: false })
    const file = await fileHandle.getFile()
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

export async function readCoverFile(
  videoId: string,
  orientation: 'portrait' | 'landscape',
  ext: string,
): Promise<File | null> {
  const dir = await getDirectoryHandle()
  if (!dir) return null
  try {
    const filename = `${videoId}_${orientation}.${ext}`
    if (isTauriDirectoryHandle(dir)) {
      const bytes = await readTauriBytes(dir, `covers/${filename}`)
      if (!bytes) return null
      return new File([bytesToArrayBuffer(bytes)], filename, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
    }
    const coversDir = await getCoversDir(dir)
    const fileHandle = await coversDir.getFileHandle(filename, { create: false })
    return await fileHandle.getFile()
  } catch {
    return null
  }
}

export async function deleteCoverImage(
  videoId: string,
  orientation: 'portrait' | 'landscape',
  ext: string,
): Promise<void> {
  const dir = await getDirectoryHandle()
  if (!dir) return
  try {
    const filename = `${videoId}_${orientation}.${ext}`
    if (isTauriDirectoryHandle(dir)) {
      await deleteTauriFile(dir, `covers/${filename}`)
      return
    }
    const coversDir = await getCoversDir(dir)
    await asIterableDirectory(coversDir).removeEntry(filename)
  } catch {
    // ignore if file doesn't exist
  }
}

export const isFileSystemSupported = (): boolean =>
  tauriFileSystemAvailable() || ('showDirectoryPicker' in window && window.isSecureContext)

export const isSecureContext = (): boolean => tauriFileSystemAvailable() || window.isSecureContext
