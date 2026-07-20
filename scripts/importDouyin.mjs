// 导入抖音 CSV 数据到系统
// 运行: node scripts/importDouyin.mjs
import fs from 'fs'
import { randomUUID } from 'crypto'

const DATA_DIR = '/Users/liuxingqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/SecondBrain/IPC'

// 读取现有数据
const existingVideos = JSON.parse(fs.readFileSync(`${DATA_DIR}/videos.json`, 'utf-8'))
const existingRecords = JSON.parse(fs.readFileSync(`${DATA_DIR}/douyinRecords.json`, 'utf-8'))

// 解析 CSV
const csv = fs.readFileSync('/Users/liuxingqi/Downloads/抖音作品列表.csv', 'utf-8')
const lines = csv.split('\n').filter(l => l.trim())

// 处理引号多行
let records = []
let current = ''
let inQuotes = false
for (const line of lines) {
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    current += ch
  }
  if (!inQuotes) {
    records.push(current)
    current = ''
  } else {
    current += '\n'
  }
}

// CSV 解析
function parseRow(row) {
  const parts = []
  let cur = ''
  let inQ = false
  for (const ch of row) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === ',' && !inQ) { parts.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  parts.push(cur.trim())
  return {
    title: parts[0] || '',
    publishedAt: parts[1] || '',
    genre: parts[2] || '',
    auditStatus: parts[3] || '',
    plays: parseInt(parts[4]) || 0,
    completionRate: parseFloat(parts[5]) || 0,
    fiveSecRate: parseFloat(parts[6]) || 0,
    coverCtr: parts[7] || '-',
    twoSecBounceRate: parseFloat(parts[8]) || 0,
    avgPlayDuration: parseFloat(parts[9]) || 0,
    likes: parseInt(parts[10]) || 0,
    shares: parseInt(parts[11]) || 0,
    comments: parseInt(parts[12]) || 0,
    saves: parseInt(parts[13]) || 0,
    profileVisits: parseInt(parts[14]) || 0,
    followerGain: parseInt(parts[15]) || 0,
  }
}

// 提取干净标题（去掉描述+标签）
function cleanTitle(raw) {
  let t = raw.split('\n')[0]
  t = t.replace(/#\S+/g, '').trim()
  t = t.replace(/@\S+/g, '').trim()
  return t
}

// 提取视频标题（取第一句，最多35字）
function shortTitle(raw) {
  let t = cleanTitle(raw)
  const emoji = /[👇🔥🛠️🎤🎙️🎬🌟⭐💡⚡🔧🎯🚀📊🖥️💻👆👉❓]/g

  // 按句号/换行切分（不按问号和感叹号，因为它们是标题的一部分）
  const sents = t.split(/[。\n]/)
  if (sents[0]) {
    const s = sents[0].replace(emoji, '').trim()
    if (s.length >= 6 && s.length <= 35) return s
  }
  // 取前35字
  let truncated = t.replace(emoji, '').trim().slice(0, 35).trim()
  return truncated.replace(/^[，,\s]+|[，,\s]+$/g, '').trim()
}

// 完整标题（用作description/notes）
function fullDescription(raw) {
  return cleanTitle(raw).split('\n')[0].slice(0, 200)
}

// === 现有系统视频标题（用于匹配）===
const sysTitleMap = {}
existingVideos.forEach(v => {
  const key = v.title.replace(/[，。！？、：；""''（）《》\.\?\!\s\-\—～·]/g, '').toLowerCase()
  sysTitleMap[key] = v
})

// 系统已有视频的 "匹配键"
const existingKeys = new Set(Object.keys(sysTitleMap))

// 判断是否已存在（仅用手动匹配表，避免误判）
function existsInSystem(csvTitle) {
  return { matched: false }
}

// 手动确认的匹配表（CSV标题前缀 → 系统标题）
const manualMatches = {
  'Claude和Codex怎么选': 'Claude 和 Codex 怎么选？',
  'AI时代的通用语言Markdown': 'AI时代的通用语言——Markdown，普通人学5个符号就能掌握',
  'Claude额度不够？6个技巧省70%token': 'Claude额度不够？6个技巧省70%token',
  '我的AI学习信源，推荐9个值得关注的博主': '我的AI学习信源，推荐9个值得关注的博主',
  'superpowers怎么用？新手必装这4个skill': '20万人收藏的Superpowers是什么？ 新手必装这4个Skill',
  '一条视频讲清楚Claude Skill，0基础AI小白必看': 'Claude Skill 0基础看这一条就够了',
  '测评主流做PPT的skill，这三个最好用': '测评主流画HTML/PPT的skill，这3个最好用',
  'Karpathy不是单纯的': 'karpathy加入anthropic',
  'AI新手别在选模型上浪费时间': 'AI新手别在选模型上浪费时间了',
  '每天花一小时玩AI': '每天花一小时玩AI，比你报千元课都管用',
  '学vibe coding之前必须了解git是什么': '什么是Git',
  '我做了个可视化skill工具可以一键安装': 'skill不会装？太多难管理？我做了一个可视化skill的工具',
  'AI做的3D可交互的细胞结构模型': '国外大神做了个3D"细胞模拟器"，太酷炫了！',
  'Claude Code 新手必学的三个命令': 'Claude Code新手必学的三个命令',
  'Mac上必装的5个App': 'Mac上必装的5个App，vibe coding效率翻倍',
  '2步做出你的第一个skill': '2步做出你的第一个skill，0基础AI小白教程',
}

// 检查是否匹配已知的手动项
function findManualMatch(csvTitle) {
  const clean = cleanTitle(csvTitle)
  for (const [prefix, sysTitle] of Object.entries(manualMatches)) {
    if (clean.startsWith(prefix)) return { sysTitle }
  }
  return null
}

// ===== 处理所有CSV记录 =====
const csvData = records.slice(1).map(r => parseRow(r))

const allNewRecords = [] // 所有 CSV 记录（去重后添加到 douyinRecords）
const newVideos = []     // 需要新建的视频条目
const matchedList = []   // 已经匹配到的
const unmatchedList = [] // 未匹配的 CSV 条目

// 去重：相同 cleanTitle 只创建一条视频，但保留所有记录
const seenTitles = new Set()

csvData.forEach((d, idx) => {
  const ct = cleanTitle(d.title)
  const st = shortTitle(d.title)

  // 匹配
  const manual = findManualMatch(d.title)
  if (manual) {
    matchedList.push({ csvTitle: ct, sysTitle: manual.sysTitle, data: d })
    allNewRecords.push(d)
    return
  }

  const auto = existsInSystem(d.title)
  if (auto && auto.matched) {
    matchedList.push({ csvTitle: ct, sysTitle: auto.reason, data: d })
    allNewRecords.push(d)
    return
  }

  // 未匹配 — 需要创建新视频
  unmatchedList.push({ csvTitle: ct, data: d })
  allNewRecords.push(d)

  // 去重：相同 cleanTitle 不重复创建视频
  if (!seenTitles.has(ct)) {
    seenTitles.add(ct)
    newVideos.push(d)
  }
})

// ===== 生成新视频条目 =====
function generateId() {
  return 'vid_' + randomUUID().replace(/-/g, '').substring(0, 10)
}

function makeVideoEntry(d) {
  const title = shortTitle(d.title)
  const desc = fullDescription(d.title)
  const publishedDate = new Date(d.publishedAt.replace(' ', 'T') + '+08:00')
  const now = new Date().toISOString()

  const status = d.auditStatus === '公开' ? 'published' : 'violated'

  return {
    id: generateId(),
    title,
    description: desc,
    status: 'published', // 所有已发布的视频
    tagIds: [],
    platforms: [{
      platform: 'douyin',
      status,
      publishedAt: publishedDate.toISOString(),
      ...(status === 'violated' ? { violation: { reason: '仅自己可见', reportedAt: now } } : {}),
    }],
    statusHistory: [
      { status: 'topic', changedAt: publishedDate.toISOString() },
      { status: 'published', changedAt: publishedDate.toISOString() },
    ],
    createdAt: publishedDate.toISOString(),
    updatedAt: now,
  }
}

// ===== 生成 DouyinRawRecord 条目 =====
function makeRecordEntry(d) {
  const now = new Date().toISOString()
  const id = randomUUID().replace(/-/g, '')
  const title = d.title.replace(/\n/g, ' ') // 去换行
  return {
    id,
    title,
    publishedAt: d.publishedAt,
    genre: d.genre,
    status: d.auditStatus,
    plays: d.plays,
    completionRate: d.completionRate,
    fiveSecRate: d.fiveSecRate,
    coverCtr: d.coverCtr,
    twoSecBounceRate: d.twoSecBounceRate,
    avgPlayDuration: d.avgPlayDuration,
    likes: d.likes,
    shares: d.shares,
    comments: d.comments,
    saves: d.saves,
    profileVisits: d.profileVisits,
    followerGain: d.followerGain,
    createdAt: now,
  }
}

// ===== 构建新数据 =====
const newVideoEntries = newVideos.map(d => makeVideoEntry(d))
const newRecordEntries = allNewRecords.map(d => makeRecordEntry(d))

const updatedVideos = [...existingVideos, ...newVideoEntries]
const updatedRecords = newRecordEntries // 替换全部

// ===== 写出 =====
fs.writeFileSync(`${DATA_DIR}/videos.json`, JSON.stringify(updatedVideos, null, 2), 'utf-8')
fs.writeFileSync(`${DATA_DIR}/douyinRecords.json`, JSON.stringify(updatedRecords, null, 2), 'utf-8')

console.log('========================================')
console.log('导入完成！')
console.log('========================================')
console.log('')
console.log('CSV 总记录数:', csvData.length)
console.log('已有 douyinRecords:', existingRecords.length, '条（将被替换）')
console.log('已有 videos:', existingVideos.length, '条')
console.log('')
console.log(`已导入 douyinRecords: ${updatedRecords.length} 条`)
console.log(`新增视频: ${newVideoEntries.length} 条`)
console.log(`更新后视频总数: ${updatedVideos.length} 条`)
console.log('')

// 输出系统中的视频（已有）+ 新导入的
console.log('=== 系统中已有的视频（匹配到的 ' + matchedList.length + ' 条）===')
matchedList.forEach((m, i) => {
  console.log(`  ${(i+1).toString().padStart(2)}. ${m.csvTitle.substring(0, 50)}`)
})

console.log('')
console.log(`=== 缺失的：CSV中有但之前视频库里没有的（共 ${unmatchedList.length} 条，已导入 ${newVideoEntries.length} 条视频）===`)
unmatchedList.forEach((m, i) => {
  const display = cleanTitle(m.csvTitle).substring(0, 50)
  console.log(`  ${(i+1).toString().padStart(2)}. ${display}`)
})
