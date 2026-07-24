#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto'
import { copyFile, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const PLATFORM_FILES = {
  douyin: 'douyinRecords.json',
  xiaohongshu: 'xiaohongshuRecords.json',
  shipinhao: 'shipinhaoRecords.json',
}

const TARGET_FILES = ['videos.json', ...Object.values(PLATFORM_FILES)]
const VIDEO_PREFIX = 'vid_'

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  if (command === '--help' || command === '-h') return { command: 'help', options: {} }
  const options = { source: [] }
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) fail(`无法识别的参数: ${token}`)
    const key = token.slice(2)
    if (key === 'apply' || key === 'help') {
      options[key] = true
      continue
    }
    const value = rest[index + 1]
    if (!value || value.startsWith('--')) fail(`参数 --${key} 缺少值`)
    index += 1
    if (key === 'source') options.source.push(path.resolve(value))
    else options[key.replaceAll('-', '_')] = value
  }
  return { command, options }
}

function printHelp() {
  console.log(`ContentFlow 三平台视频数据导入

用法:
  import-platform-data.mjs prepare --project-dir <repo> --data-dir <dir> --out <plan.json> --source <file> [--source <file>...]
  import-platform-data.mjs validate --plan <plan.json>
  import-platform-data.mjs apply --data-dir <dir> --plan <plan.json> [--report <report.json>] [--apply]

apply 默认只做 dry-run；显式传入 --apply 才会写入目标目录。`)
}

async function readJson(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    fail(`无法读取 ${file}: ${error.message}`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    fail(`JSON 无法解析 ${file}: ${error.message}`)
  }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function hashFile(file) {
  const buffer = await readFile(file)
  return createHash('sha256').update(buffer).digest('hex')
}

async function snapshotFiles(files) {
  const result = {}
  for (const file of files) {
    const info = await stat(file)
    result[path.basename(file)] = {
      sha256: await hashFile(file),
      size: info.size,
      mtimeMs: info.mtimeMs,
    }
  }
  return result
}

function normalizeHeader(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/[\s_\-—（）()]/g, '').toLowerCase()
}

function normalizeIdentity(value) {
  return String(value ?? '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/#[^#\s]+/g, '')
    .replace(/[^\p{Letter}\p{Number}\u3400-\u9FFF]+/gu, '')
    .toLowerCase()
}

function coreText(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/#[^#\s]+/g, ' ')
    .replace(/@[^\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function charBigrams(value) {
  const text = normalizeIdentity(value)
  if (text.length < 2) return new Set(text ? [text] : [])
  const grams = new Set()
  for (let index = 0; index < text.length - 1; index += 1) grams.add(text.slice(index, index + 2))
  return grams
}

function dice(a, b) {
  const left = charBigrams(a)
  const right = charBigrams(b)
  if (!left.size || !right.size) return 0
  let overlap = 0
  for (const item of left) if (right.has(item)) overlap += 1
  return (2 * overlap) / (left.size + right.size)
}

function similarity(a, b) {
  const left = normalizeIdentity(a)
  const right = normalizeIdentity(b)
  if (!left || !right) return 0
  if (left === right) return 1
  if (Math.min(left.length, right.length) >= 6 && (left.includes(right) || right.includes(left))) return 0.94
  return Number(dice(left, right).toFixed(4))
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(String(value ?? '').replaceAll(',', '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function toPlaybackNumber(value, label) {
  const text = String(value ?? '').replaceAll(',', '').trim()
  if (!text) fail(`${label}为空，无法判断是否应导入`)
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) fail(`${label}不是有效的非负数: ${value}`)
  return parsed
}

function toRatio(value) {
  const text = String(value ?? '').trim()
  const parsed = toNumber(text.replace('%', ''))
  if (text.includes('%')) return parsed / 100
  return parsed > 1 ? parsed / 100 : parsed
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function canonicalDate(value, dateOnly = false) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString()
  const text = String(value ?? '').trim()
  if (!text) return ''
  let match = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(?:(\d{1,2})时(\d{1,2})分(\d{1,2})秒)?$/)
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}.000Z`
  }
  match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    if (dateOnly) return `${year}/${pad2(month)}/${pad2(day)}`
    return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}.000Z`
  }
  return text
}

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some(cell => String(cell).trim())) rows.push(row)
      row = []
      value = ''
    } else value += char
  }
  row.push(value)
  if (row.some(cell => String(cell).trim())) rows.push(row)
  return rows
}

async function loadRows(file, projectDir) {
  const extension = path.extname(file).toLowerCase()
  if (extension === '.csv') return parseCsv(await readFile(file, 'utf8'))
  if (extension === '.json') {
    const rows = await readJson(file)
    if (!Array.isArray(rows)) fail(`${file} 的 JSON 顶层必须是数组`)
    if (!rows.length) return []
    if (Array.isArray(rows[0])) return rows
    const headers = [...new Set(rows.flatMap(Object.keys))]
    return [headers, ...rows.map(item => headers.map(header => item[header] ?? ''))]
  }
  if (extension !== '.xlsx' && extension !== '.xls') fail(`不支持的源文件类型: ${file}`)
  const require = createRequire(path.join(path.resolve(projectDir), 'package.json'))
  let XLSX
  try {
    XLSX = require('xlsx')
  } catch {
    fail(`无法从 ${projectDir} 加载 xlsx 依赖；请确认这是 ContentFlow 仓库且已安装依赖`)
  }
  const workbook = XLSX.readFile(file, { cellDates: false, raw: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
}

const HEADER_HINTS = {
  douyin: ['作品名称', '体裁', '播放量', '5s完播率'],
  xiaohongshu: ['笔记标题', '体裁', '曝光', '观看量'],
  shipinhao: ['视频描述', '视频id', '播放量', '推荐'],
}

function findHeader(rows) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeHeader)
    for (const [platform, hints] of Object.entries(HEADER_HINTS)) {
      if (hints.every(hint => headers.includes(normalizeHeader(hint)))) {
        return { platform, rowIndex, headers: rows[rowIndex].map(value => String(value ?? '').trim()) }
      }
    }
  }
  const seen = rows.slice(0, 5).flat().map(String).filter(Boolean)
  fail(`无法识别平台或表头。前几行字段: ${seen.slice(0, 40).join(' | ')}`)
}

function rowsToObjects(rows, header) {
  const normalized = header.headers.map(normalizeHeader)
  return rows.slice(header.rowIndex + 1)
    .filter(row => row.some(cell => String(cell ?? '').trim()))
    .map(row => Object.fromEntries(normalized.map((key, index) => [key, row[index] ?? ''])))
}

function field(row, ...aliases) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)]
    if (value !== undefined) return value
  }
  return ''
}

function parseRecord(platform, row, importedAt) {
  if (platform === 'douyin') {
    const title = String(field(row, '作品名称', 'title')).trim()
    if (!title) return null
    return {
      title,
      publishedAt: canonicalDate(field(row, '发布时间', 'publishedAt')),
      genre: String(field(row, '体裁', 'genre')).trim(),
      status: String(field(row, '审核状态', 'status')).trim(),
      plays: toPlaybackNumber(field(row, '播放量', 'plays'), `抖音《${title}》播放量`),
      completionRate: toRatio(field(row, '完播率', 'completionRate')),
      fiveSecRate: toRatio(field(row, '5s完播率', 'fiveSecRate')),
      coverCtr: String(field(row, '封面点击率', 'coverCtr')).trim() || '-',
      twoSecBounceRate: toRatio(field(row, '2s跳出率', 'twoSecBounceRate')),
      avgPlayDuration: toNumber(field(row, '平均播放时长', 'avgPlayDuration')),
      likes: toNumber(field(row, '点赞量', '点赞', 'likes')),
      shares: toNumber(field(row, '分享量', '分享', 'shares')),
      comments: toNumber(field(row, '评论量', '评论', 'comments')),
      saves: toNumber(field(row, '收藏量', '收藏', 'saves')),
      profileVisits: toNumber(field(row, '主页访问量', 'profileVisits')),
      followerGain: toNumber(field(row, '粉丝增量', 'followerGain')),
      createdAt: importedAt,
    }
  }
  if (platform === 'xiaohongshu') {
    const title = String(field(row, '笔记标题', 'title')).trim()
    if (!title) return null
    return {
      title,
      publishedAt: canonicalDate(field(row, '首次发布时间', 'publishedAt')),
      genre: String(field(row, '体裁', 'genre')).trim(),
      impressions: toNumber(field(row, '曝光', 'impressions')),
      views: toPlaybackNumber(field(row, '观看量', 'views'), `小红书《${title}》观看量`),
      coverCtr: toRatio(field(row, '封面点击率', 'coverCtr')),
      likes: toNumber(field(row, '点赞', 'likes')),
      comments: toNumber(field(row, '评论', 'comments')),
      saves: toNumber(field(row, '收藏', 'saves')),
      follows: toNumber(field(row, '涨粉', 'follows')),
      shares: toNumber(field(row, '分享', 'shares')),
      avgWatchDuration: toNumber(field(row, '人均观看时长', 'avgWatchDuration')),
      danmaku: toNumber(field(row, '弹幕', 'danmaku')),
      createdAt: importedAt,
    }
  }
  const description = String(field(row, '视频描述', 'description')).trim()
  if (!description) return null
  const platformVideoId = String(field(row, '视频ID', 'platformVideoId', 'videoId')).trim()
  return {
    description,
    platformVideoId,
    publishedAt: canonicalDate(field(row, '发布时间', 'publishedAt'), true),
    completionRate: toRatio(field(row, '完播率', 'completionRate')),
    avgPlayDuration: String(field(row, '平均播放时长', 'avgPlayDuration')).trim(),
    plays: toPlaybackNumber(field(row, '播放量', 'plays'), `视频号《${description}》播放量`),
    recommendations: toNumber(field(row, '推荐', 'recommendations')),
    likes: toNumber(field(row, '喜欢', '点赞', 'likes')),
    comments: toNumber(field(row, '评论量', '评论', 'comments')),
    shares: toNumber(field(row, '分享量', '分享', 'shares')),
    follows: toNumber(field(row, '关注量', 'follows')),
    forwardChat: toNumber(field(row, '转发聊天和朋友圈', 'forwardChat')),
    setRingtone: toNumber(field(row, '设为铃声', 'setRingtone')),
    setStatus: toNumber(field(row, '设为状态', 'setStatus')),
    setMomentCover: toNumber(field(row, '设为朋友圈封面', 'setMomentCover')),
    createdAt: importedAt,
  }
}

function importFilterReasons(platform, record) {
  const reasons = []
  const genre = String(record.genre ?? '').trim()
  const normalizedGenre = normalizeIdentity(genre)
  const explicitVideoGenre = ['视频', '短视频', '视频作品', '视频笔记'].includes(normalizedGenre)
    || (normalizedGenre.endsWith('视频') && !normalizedGenre.includes('非视频'))
  if (platform !== 'shipinhao' && !explicitVideoGenre) {
    reasons.push(genre ? `体裁为${genre}，本 Skill 仅导入视频` : '体裁为空，无法确认是视频')
  }
  const playback = platform === 'xiaohongshu' ? record.views : record.plays
  if (playback === 0) reasons.push('播放/观看量为 0，按导入规则排除')
  return reasons
}

function recordTitle(platform, record) {
  return coreText(platform === 'shipinhao' ? record.description : record.title)
}

function stableKey(platform, record) {
  if (platform === 'shipinhao') {
    const nativeId = record.platformVideoId || (record.videoId && !String(record.videoId).startsWith(VIDEO_PREFIX) ? record.videoId : '')
    if (nativeId) return `shipinhao:id:${nativeId}`
    return `shipinhao:fallback:${canonicalDate(record.publishedAt, true)}:${normalizeIdentity(record.description)}`
  }
  const title = normalizeIdentity(record.title)
  return `${platform}:${canonicalDate(record.publishedAt)}:${title}`
}

function lookupKeys(platform, record) {
  const primary = stableKey(platform, record)
  if (platform !== 'shipinhao') return [primary]
  const fallback = `shipinhao:fallback:${canonicalDate(record.publishedAt, true)}:${normalizeIdentity(record.description)}`
  return primary === fallback ? [primary] : [primary, fallback]
}

function migrateShipinhaoRecord(record) {
  const migrated = { ...record }
  if (!migrated.platformVideoId && migrated.videoId && !String(migrated.videoId).startsWith(VIDEO_PREFIX)) {
    migrated.platformVideoId = migrated.videoId
    delete migrated.videoId
  }
  return migrated
}

async function buildVideoEvidence(dataDir, videos, scripts, rawByPlatform) {
  const scriptsById = new Map(scripts.map(item => [item.id, item]))
  const aliases = new Map(videos.map(video => [video.id, []]))
  for (const [platform, records] of Object.entries(rawByPlatform)) {
    for (const record of records) {
      if (record.videoId && aliases.has(record.videoId)) aliases.get(record.videoId).push({ platform, title: recordTitle(platform, record) })
    }
  }
  const evidence = []
  for (const video of videos) {
    const script = video.scriptId ? scriptsById.get(video.scriptId) : scripts.find(item => item.videoId === video.id)
    let transcriptExcerpt = ''
    if (script?.id) {
      try {
        transcriptExcerpt = coreText((await readFile(path.join(dataDir, 'scripts', `${script.id}.md`), 'utf8')).slice(0, 1800)).slice(0, 700)
      } catch { /* transcript is optional evidence */ }
    }
    evidence.push({
      videoId: video.id,
      videoTitle: video.title,
      scriptId: script?.id,
      scriptTitle: script?.title,
      transcriptExcerpt,
      aliases: aliases.get(video.id) ?? [],
      platformDates: (video.platforms ?? []).map(item => ({ platform: item.platform, publishedAt: item.publishedAt })),
    })
  }
  return evidence
}

function rankCandidates(sourceTitle, evidence) {
  return evidence.map(item => {
    const texts = [item.videoTitle, item.scriptTitle, item.transcriptExcerpt, ...item.aliases.map(alias => alias.title)].filter(Boolean)
    const scored = texts.map(text => ({ text, score: similarity(sourceTitle, text) })).sort((a, b) => b.score - a.score)
    return { ...item, score: scored[0]?.score ?? 0, matchedText: scored[0]?.text ?? '' }
  }).sort((a, b) => b.score - a.score).slice(0, 5)
}

async function prepare(options) {
  const dataDir = path.resolve(options.data_dir ?? fail('--data-dir 必填'))
  const projectDir = path.resolve(options.project_dir ?? process.cwd())
  const out = path.resolve(options.out ?? fail('--out 必填'))
  if (!options.source?.length) fail('至少需要一个 --source')

  const targetPaths = TARGET_FILES.map(name => path.join(dataDir, name))
  const [videos, scripts, douyin, xiaohongshu, shipinhaoLegacy] = await Promise.all([
    readJson(path.join(dataDir, 'videos.json')),
    readJson(path.join(dataDir, 'scripts.json')),
    readJson(path.join(dataDir, PLATFORM_FILES.douyin)),
    readJson(path.join(dataDir, PLATFORM_FILES.xiaohongshu)),
    readJson(path.join(dataDir, PLATFORM_FILES.shipinhao)),
  ])
  const shipinhao = shipinhaoLegacy.map(migrateShipinhaoRecord)
  for (const [label, value] of Object.entries({ videos, scripts, douyin, xiaohongshu, shipinhao })) {
    if (!Array.isArray(value)) fail(`${label} 目标 JSON 必须是数组`)
  }
  const rawByPlatform = { douyin, xiaohongshu, shipinhao }
  const evidence = await buildVideoEvidence(dataDir, videos, scripts, rawByPlatform)
  const videoIds = new Set(videos.map(video => video.id))
  const existingIndexes = Object.fromEntries(Object.entries(rawByPlatform).map(([platform, records]) => {
    const index = new Map()
    records.forEach((record, recordIndex) => lookupKeys(platform, record).forEach(key => index.set(key, { record, index: recordIndex })))
    return [platform, index]
  }))
  const importedAt = new Date().toISOString()
  const items = []
  const sources = []

  for (const source of options.source) {
    const rows = await loadRows(source, projectDir)
    const header = findHeader(rows)
    const parsed = rowsToObjects(rows, header).map(row => parseRecord(header.platform, row, importedAt)).filter(Boolean)
    sources.push({ file: source, platform: header.platform, rows: parsed.length, sha256: await hashFile(source), headers: header.headers })
    for (const record of parsed) {
      const platform = header.platform
      const key = stableKey(platform, record)
      const title = recordTitle(platform, record)
      const filterReasons = importFilterReasons(platform, record)
      const existing = filterReasons.length ? undefined : lookupKeys(platform, record).map(candidate => existingIndexes[platform].get(candidate)?.record).find(Boolean)
      const existingLink = existing?.videoId && videoIds.has(existing.videoId) ? existing.videoId : undefined
      const candidates = filterReasons.length ? [] : rankCandidates(title, evidence)
      const exact = candidates.filter(candidate => candidate.score === 1)
      let decision = { action: 'pending', locked: false, confidence: null, reason: '', evidence: [], runnerUp: null }
      if (filterReasons.length) {
        decision = { action: 'skip', locked: true, confidence: 1, reason: filterReasons.join('；'), evidence: [record.genre ? `genre=${record.genre}` : '', `playback=${platform === 'xiaohongshu' ? record.views : record.plays}`].filter(Boolean), runnerUp: null }
      } else if (existingLink) {
        decision = { action: 'match', targetVideoId: existingLink, locked: true, confidence: 1, reason: '复用已有有效系统关联', evidence: [`existing raw -> ${existingLink}`], runnerUp: null }
      } else if (exact.length === 1) {
        decision = { action: 'match', targetVideoId: exact[0].videoId, locked: true, confidence: 1, reason: '唯一规范化精确匹配', evidence: [exact[0].matchedText], runnerUp: candidates[1] ? { videoId: candidates[1].videoId, score: candidates[1].score } : null }
      }
      items.push({
        id: createHash('sha256').update(`${source}\0${platform}\0${key}`).digest('hex').slice(0, 16),
        sourceFile: source,
        platform,
        stableKey: key,
        sourceTitle: title,
        publishedAt: record.publishedAt,
        existingRawId: existing?.id,
        existingLink: existingLink ?? null,
        record,
        candidates,
        decision,
      })
    }
  }

  const duplicateSources = items.map(item => `${item.platform}|${item.stableKey}`).filter((value, index, all) => all.indexOf(value) !== index)
  if (duplicateSources.length) fail(`源文件中出现重复稳定键: ${[...new Set(duplicateSources)].join(', ')}`)
  const plan = {
    schemaVersion: 1,
    generatedAt: importedAt,
    projectDir,
    dataDir,
    sources,
    targetSnapshot: await snapshotFiles(targetPaths),
    videoIds: [...videoIds],
    summary: {
      total: items.length,
      locked: items.filter(item => item.decision.locked).length,
      pending: items.filter(item => item.decision.action === 'pending').length,
      byPlatform: Object.fromEntries(Object.keys(PLATFORM_FILES).map(platform => [platform, items.filter(item => item.platform === platform).length])),
    },
    items,
  }
  await writeJson(out, plan)
  console.log(JSON.stringify({ plan: out, summary: plan.summary, sources }, null, 2))
}

function validatePlan(plan) {
  const errors = []
  const videoIds = new Set(plan.videoIds ?? [])
  const groups = new Map()
  if (plan.schemaVersion !== 1) errors.push(`不支持的 plan schemaVersion: ${plan.schemaVersion}`)
  if (!Array.isArray(plan.items) || !plan.items.length) errors.push('plan.items 为空')
  for (const item of plan.items ?? []) {
    const decision = item.decision ?? {}
    if (decision.action === 'pending' || decision.action === 'review' || !decision.action) {
      errors.push(`${item.id}: 尚未完成语义判断 (${decision.action ?? 'missing'})`)
      continue
    }
    if (decision.action === 'match') {
      if (!videoIds.has(decision.targetVideoId)) errors.push(`${item.id}: targetVideoId 不存在: ${decision.targetVideoId}`)
      if (!decision.locked) {
        if (!(Number(decision.confidence) >= 0.9)) errors.push(`${item.id}: 语义匹配 confidence 必须 >= 0.90`)
        const runnerUpConfidence = Number(decision.runnerUpConfidence ?? 0)
        if (Number(decision.confidence) - runnerUpConfidence < 0.15) errors.push(`${item.id}: 与第二候选置信度差必须 >= 0.15`)
        if (!String(decision.reason ?? '').trim()) errors.push(`${item.id}: 缺少匹配理由`)
      }
    } else if (decision.action === 'create') {
      if (!String(decision.newGroupId ?? '').trim()) errors.push(`${item.id}: create 缺少 newGroupId`)
      if (!String(decision.canonicalTitle ?? '').trim()) errors.push(`${item.id}: create 缺少 canonicalTitle`)
      if (!(Number(decision.confidence) >= 0.9)) errors.push(`${item.id}: create confidence 必须 >= 0.90`)
      if (decision.newGroupId) {
        const previous = groups.get(decision.newGroupId)
        if (previous && previous !== decision.canonicalTitle) errors.push(`${item.id}: 同一 newGroupId 的 canonicalTitle 不一致`)
        groups.set(decision.newGroupId, decision.canonicalTitle)
      }
    } else if (decision.action === 'skip') {
      if (!String(decision.reason ?? '').trim()) errors.push(`${item.id}: skip 缺少理由`)
    } else errors.push(`${item.id}: 不支持的 action ${decision.action}`)
  }
  return errors
}

async function validate(options) {
  const planFile = path.resolve(options.plan ?? fail('--plan 必填'))
  const plan = await readJson(planFile)
  const errors = validatePlan(plan)
  const result = { valid: errors.length === 0, errors, summary: plan.summary }
  console.log(JSON.stringify(result, null, 2))
  if (errors.length) process.exitCode = 2
}

function newId(prefix) {
  return `${prefix}_${randomBytes(8).toString('base64url').slice(0, 10)}`
}

function ensurePlatformEntry(video, platform, record, now) {
  video.platforms ??= []
  const index = video.platforms.findIndex(item => item.platform === platform)
  const nativeId = platform === 'shipinhao' ? record.platformVideoId : undefined
  const status = platform === 'douyin' && record.status && record.status !== '公开' ? 'violated' : 'published'
  const nextEntry = {
    platform,
    status,
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    ...(nativeId ? { platformVideoId: nativeId } : {}),
  }
  let changed = false
  if (index === -1) {
    video.platforms.push(nextEntry)
    changed = true
  } else {
    const previous = video.platforms[index]
    const patch = {
      ...(!previous.publishedAt && record.publishedAt ? { publishedAt: record.publishedAt } : {}),
      ...(nativeId && previous.platformVideoId !== nativeId ? { platformVideoId: nativeId } : {}),
    }
    if (Object.keys(patch).length) {
      video.platforms[index] = { ...previous, ...patch }
      changed = true
    }
  }
  if (changed) video.updatedAt = now
  return changed
}

function createVideo(groupId, canonicalTitle, groupItems, now) {
  const dates = groupItems.map(item => item.record.publishedAt).filter(Boolean).sort()
  const id = newId('vid')
  const video = {
    id,
    title: canonicalTitle,
    status: 'published',
    tagIds: [],
    platforms: [],
    statusHistory: [{ status: 'published', changedAt: dates[0] ?? now }],
    createdAt: dates[0] ?? now,
    updatedAt: now,
  }
  for (const item of groupItems) ensurePlatformEntry(video, item.platform, item.record, now)
  return { groupId, video }
}

function verifyResult(videos, rawByPlatform) {
  const errors = []
  const ids = videos.map(item => item.id)
  if (new Set(ids).size !== ids.length) errors.push('videos.json 存在重复 ID')
  const videoIds = new Set(ids)
  for (const [platform, records] of Object.entries(rawByPlatform)) {
    const rawIds = records.map(item => item.id)
    if (new Set(rawIds).size !== rawIds.length) errors.push(`${platform} raw 存在重复 ID`)
    const keys = records.map(record => stableKey(platform, record))
    if (new Set(keys).size !== keys.length) errors.push(`${platform} raw 存在重复稳定键`)
    for (const record of records) {
      if (record.videoId && !videoIds.has(record.videoId)) errors.push(`${platform}/${record.id} 引用不存在的 ${record.videoId}`)
      if (platform === 'shipinhao' && record.videoId && !String(record.videoId).startsWith(VIDEO_PREFIX)) errors.push(`${platform}/${record.id} 的 videoId 仍是平台原生 ID`)
    }
  }
  for (const video of videos) {
    const platforms = (video.platforms ?? []).map(item => item.platform)
    if (new Set(platforms).size !== platforms.length) errors.push(`${video.id} 存在重复平台发布条目`)
  }
  return errors
}

async function assertSnapshot(dataDir, snapshot) {
  for (const [name, expected] of Object.entries(snapshot)) {
    const current = await hashFile(path.join(dataDir, name))
    if (current !== expected.sha256) fail(`目标文件在 plan 生成后发生变化: ${name}`)
  }
}

async function apply(options) {
  const planFile = path.resolve(options.plan ?? fail('--plan 必填'))
  const plan = await readJson(planFile)
  const dataDir = path.resolve(options.data_dir ?? plan.dataDir ?? fail('--data-dir 必填'))
  const reportFile = path.resolve(options.report ?? path.join(path.dirname(planFile), 'import-report.json'))
  const errors = validatePlan(plan)
  if (errors.length) fail(`plan 校验失败:\n- ${errors.join('\n- ')}`)
  if (path.resolve(plan.dataDir) !== dataDir) fail(`plan dataDir 与当前 --data-dir 不一致`)
  await assertSnapshot(dataDir, plan.targetSnapshot)

  const [videosOriginal, douyinOriginal, xiaohongshuOriginal, shipinhaoOriginal] = await Promise.all([
    readJson(path.join(dataDir, 'videos.json')),
    readJson(path.join(dataDir, PLATFORM_FILES.douyin)),
    readJson(path.join(dataDir, PLATFORM_FILES.xiaohongshu)),
    readJson(path.join(dataDir, PLATFORM_FILES.shipinhao)),
  ])
  const videos = videosOriginal.map(item => ({ ...item, platforms: (item.platforms ?? []).map(entry => ({ ...entry })) }))
  const rawByPlatform = {
    douyin: douyinOriginal.map(item => ({ ...item })),
    xiaohongshu: xiaohongshuOriginal.map(item => ({ ...item })),
    shipinhao: shipinhaoOriginal.map(migrateShipinhaoRecord),
  }
  const indexes = Object.fromEntries(Object.entries(rawByPlatform).map(([platform, records]) => {
    const index = new Map()
    records.forEach((record, recordIndex) => lookupKeys(platform, record).forEach(key => index.set(key, recordIndex)))
    return [platform, index]
  }))
  const now = new Date().toISOString()
  const createGroups = new Map()
  for (const item of plan.items) {
    if (item.decision.action !== 'create') continue
    const list = createGroups.get(item.decision.newGroupId) ?? []
    list.push(item)
    createGroups.set(item.decision.newGroupId, list)
  }
  const groupTargets = new Map()
  const createdVideos = []
  for (const [groupId, groupItems] of createGroups) {
    const { video } = createVideo(groupId, groupItems[0].decision.canonicalTitle, groupItems, now)
    videos.push(video)
    createdVideos.push({ id: video.id, title: video.title, groupId })
    groupTargets.set(groupId, video.id)
  }

  const counts = Object.fromEntries(Object.keys(PLATFORM_FILES).map(platform => [platform, { added: 0, updated: 0, linked: 0, skipped: 0 }]))
  const semanticMatches = []
  for (const item of plan.items) {
    const decision = item.decision
    if (decision.action === 'skip') {
      counts[item.platform].skipped += 1
      continue
    }
    const targetVideoId = decision.action === 'match' ? decision.targetVideoId : groupTargets.get(decision.newGroupId)
    const records = rawByPlatform[item.platform]
    const existingIndex = lookupKeys(item.platform, item.record).map(key => indexes[item.platform].get(key)).find(index => index !== undefined)
    const next = { ...item.record, videoId: targetVideoId }
    if (item.platform === 'shipinhao') next.platformVideoId = item.record.platformVideoId
    if (existingIndex !== undefined) {
      const previous = records[existingIndex]
      records[existingIndex] = { ...previous, ...next, id: previous.id, createdAt: previous.createdAt }
      counts[item.platform].updated += 1
      if (previous.videoId !== targetVideoId) counts[item.platform].linked += 1
    } else {
      records.push({ ...next, id: newId(item.platform === 'douyin' ? 'dy' : item.platform === 'xiaohongshu' ? 'xhs' : 'sph'), createdAt: now })
      lookupKeys(item.platform, next).forEach(key => indexes[item.platform].set(key, records.length - 1))
      counts[item.platform].added += 1
      counts[item.platform].linked += 1
    }
    const video = videos.find(candidate => candidate.id === targetVideoId)
    if (!video) fail(`内部错误：找不到目标 Video ${targetVideoId}`)
    ensurePlatformEntry(video, item.platform, item.record, now)
    if (decision.action === 'match' && !decision.locked) semanticMatches.push({ sourceTitle: item.sourceTitle, targetVideoId, targetTitle: video.title, confidence: decision.confidence, reason: decision.reason })
  }

  const verifyErrors = verifyResult(videos, rawByPlatform)
  if (verifyErrors.length) fail(`合并结果校验失败:\n- ${verifyErrors.join('\n- ')}`)
  const report = {
    mode: options.apply ? 'applied' : 'dry-run',
    generatedAt: now,
    plan: planFile,
    dataDir,
    counts,
    createdVideos,
    semanticMatches,
    verification: { valid: true, errors: [] },
    backupDir: null,
  }

  if (options.apply) {
    const lockPath = path.join(dataDir, '.platform-video-import.lock')
    let lock
    try {
      lock = await open(lockPath, 'wx')
    } catch {
      fail(`导入锁已存在: ${lockPath}`)
    }
    const stamp = now.replaceAll(':', '-').replaceAll('.', '-')
    const backupDir = path.join(dataDir, '.import-backups', stamp)
    const outputs = {
      'videos.json': videos,
      [PLATFORM_FILES.douyin]: rawByPlatform.douyin,
      [PLATFORM_FILES.xiaohongshu]: rawByPlatform.xiaohongshu,
      [PLATFORM_FILES.shipinhao]: rawByPlatform.shipinhao,
    }
    const tempFiles = []
    try {
      await assertSnapshot(dataDir, plan.targetSnapshot)
      await mkdir(backupDir, { recursive: true })
      for (const name of Object.keys(outputs)) await copyFile(path.join(dataDir, name), path.join(backupDir, name))
      for (const [name, value] of Object.entries(outputs)) {
        const temp = path.join(dataDir, `.${name}.${process.pid}.tmp`)
        await writeJson(temp, value)
        const parsed = await readJson(temp)
        if (!Array.isArray(parsed)) fail(`临时文件校验失败: ${temp}`)
        tempFiles.push({ temp, target: path.join(dataDir, name) })
      }
      for (const file of tempFiles) await rename(file.temp, file.target)
      report.backupDir = backupDir
    } catch (error) {
      for (const name of Object.keys(outputs)) {
        try { await copyFile(path.join(backupDir, name), path.join(dataDir, name)) } catch { /* best effort rollback */ }
      }
      throw error
    } finally {
      for (const file of tempFiles) await rm(file.temp, { force: true })
      await lock?.close()
      await rm(lockPath, { force: true })
    }
  }
  await writeJson(reportFile, report)
  console.log(JSON.stringify({ report: reportFile, ...report }, null, 2))
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (!command || options.help || command === 'help') {
    printHelp()
    return
  }
  if (command === 'prepare') await prepare(options)
  else if (command === 'validate') await validate(options)
  else if (command === 'apply') await apply(options)
  else fail(`不支持的命令: ${command}`)
}

main().catch(error => {
  console.error(`[platform-video-data-import] ${error.message}`)
  process.exitCode = 1
})
