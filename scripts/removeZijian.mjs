import fs from 'fs'

const DATA_DIR = '/Users/liuxingqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/SecondBrain/IPC'

// 当前数据
const videos = JSON.parse(fs.readFileSync(`${DATA_DIR}/videos.json`, 'utf-8'))
const records = JSON.parse(fs.readFileSync(`${DATA_DIR}/douyinRecords.json`, 'utf-8'))

// 重新解析 CSV 找出所有 自见（纯视频，非图文）的记录
const csv = fs.readFileSync('/Users/liuxingqi/Downloads/抖音作品列表.csv', 'utf-8')
const lines = csv.split('\n').filter(l => l.trim())
let csvRows = []
let current = ''
let inQuotes = false
for (const line of lines) {
  for (const ch of line) { if (ch === '"') inQuotes = !inQuotes; current += ch }
  if (!inQuotes) { csvRows.push(current); current = '' } else { current += '\n' }
}
function parseRow(row) {
  const parts = []
  let cur = '', inQ = false
  for (const ch of row) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === ',' && !inQ) { parts.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  parts.push(cur.trim())
  return { title: parts[0] || '', genre: parts[2] || '', auditStatus: parts[3] || '' }
}
function cleanTitle(raw) {
  let t = raw.split('\n')[0]
  t = t.replace(/#\S+/g, '').trim()
  t = t.replace(/@\S+/g, '').trim()
  return t
}

const csvData = csvRows.slice(1).map(r => parseRow(r))

// 自见 纯视频记录的 cleanTitle
const zijianClean = csvData
  .filter(d => d.auditStatus === '自见' && d.genre !== '图文')
  .map(d => cleanTitle(d.title))

console.log(`自见视频记录数: ${zijianClean.length}`)

// 已有视频的标题（导入前就在系统中的19条）
const existingVideoTitles = [
  '2步做出你的第一个skill，0基础AI小白教程',
  'Mac上必装的5个App，vibe coding效率翻倍',
  'Claude Code新手必学的三个命令',
  '国外大神做了个3D"细胞模拟器"，太酷炫了！',
  '什么是Git',
  'skill不会装？太多难管理？我做了一个可视化skill的工具',
  '每天花一小时玩AI，比你报千元课都管用',
  'AI新手别在选模型上浪费时间了',
  '20万人收藏的Superpowers是什么？ 新手必装这4个Skill',
  '测评主流画HTML/PPT的skill，这3个最好用',
  '我的AI学习信源，推荐9个值得关注的博主',
  'AI程序员每天在用的工具',
  'AI时代的通用语言——Markdown，普通人学5个符号就能掌握',
  'karpathy加入anthropic',
  'Claude Skill 0基础看这一条就够了',
  'Claude额度不够？6个技巧省70%token',
  'Claude 和 Codex 怎么选？',
  '信源 skill',
  'Cowork+HTML输出太权威了',
]

// ===== 从 douyinRecords 中删除 自见 =====
const beforeR = records.length
const remainingRecords = records.filter(r => {
  const ct = cleanTitle(r.title)
  return !zijianClean.some(zc => ct.startsWith(zc))
})
const removedR = beforeR - remainingRecords.length

// ===== 从 videos 中删除新导入的自见视频 =====
// 自见记录的 key（去特殊字符前30字）
const zijianKeys = zijianClean.map(t =>
  t.replace(/[，。！？、：；""''（）《》\.\?\!\s\-\—～·#@👇🔥🛠️🎤🎙️🎬🌟⭐💡⚡🔧🎯🚀📊🖥️💻👆👉❓]/g, '').substring(0, 25)
)

const beforeV = videos.length
const remainingVideos = videos.filter(v => {
  // 已有视频保留
  if (existingVideoTitles.includes(v.title)) return true
  // 新导入的自见视频删除
  const vKey = v.title.replace(/[，。！？、：；""''（）《》\.\?\!\s\-\—～·#@👇🔥🛠️🎤🎙️🎬🌟⭐💡⚡🔧🎯🚀📊🖥️💻👆👉❓]/g, '').substring(0, 25)
  return !zijianKeys.some(zk => vKey.includes(zk) || zk.includes(vKey))
})
const removedV = beforeV - remainingVideos.length

// 写出
fs.writeFileSync(`${DATA_DIR}/videos.json`, JSON.stringify(remainingVideos, null, 2))
fs.writeFileSync(`${DATA_DIR}/douyinRecords.json`, JSON.stringify(remainingRecords, null, 2))

console.log(`\ndouyinRecords: ${beforeR} → ${remainingRecords.length}（删除 ${removedR} 条自见）`)
console.log(`videos: ${beforeV} → ${remainingVideos.length}（删除 ${removedV} 条新导入的自见视频）`)
