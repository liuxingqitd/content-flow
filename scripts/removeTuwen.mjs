import fs from 'fs'

const DATA_DIR = '/Users/liuxingqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/SecondBrain/IPC'

const videos = JSON.parse(fs.readFileSync(`${DATA_DIR}/videos.json`, 'utf-8'))
const records = JSON.parse(fs.readFileSync(`${DATA_DIR}/douyinRecords.json`, 'utf-8'))

// 重新解析 CSV 找出所有 图文 记录
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
  return { title: parts[0] || '', genre: parts[2] || '' }
}
function cleanTitle(raw) {
  let t = raw.split('\n')[0]
  t = t.replace(/#\S+/g, '').trim()
  t = t.replace(/@\S+/g, '').trim()
  return t
}

// 图文记录的 cleanTitle
const tuwen = csvRows.slice(1).map(r => parseRow(r)).filter(d => d.genre === '图文')
const tuwenCleanTitles = tuwen.map(d => cleanTitle(d.title))

console.log('图文记录 cleanTitle：')
tuwenCleanTitles.forEach((t, i) => console.log(`${i+1}. ${t.substring(0, 50)}`))

// 从 douyinRecords 删除
const beforeR = records.length
const remainingRecords = records.filter(r => {
  const ct = cleanTitle(r.title)
  return !tuwenCleanTitles.some(tc => ct.startsWith(tc))
})
const removedR = beforeR - remainingRecords.length

// 从 videos 删除 — 匹配视频标题（取 cleanTitle 的前30字互相比对）
const tuwenVideoKeys = tuwenCleanTitles.map(t => t.replace(/[，。！？、：；""''（）《》\.\?\!\s\-\—～·#@👇🔥🛠️🎤🎙️🎬🌟⭐💡⚡🔧🎯🚀📊🖥️💻👆👉❓]/g, '').substring(0, 25))
const beforeV = videos.length
const remainingVideos = videos.filter(v => {
  const vKey = v.title.replace(/[，。！？、：；""''（）《》\.\?\!\s\-\—～·#@👇🔥🛠️🎤🎙️🎬🌟⭐💡⚡🔧🎯🚀📊🖥️💻👆👉❓]/g, '').substring(0, 25)
  return !tuwenVideoKeys.some(tk => vKey.includes(tk) || tk.includes(vKey))
})
const removedV = beforeV - remainingVideos.length

// 写出
fs.writeFileSync(`${DATA_DIR}/videos.json`, JSON.stringify(remainingVideos, null, 2))
fs.writeFileSync(`${DATA_DIR}/douyinRecords.json`, JSON.stringify(remainingRecords, null, 2))

console.log(`\n清理完成！`)
console.log(`videos: ${beforeV} → ${remainingVideos.length}（删除 ${removedV} 条）`)
console.log(`douyinRecords: ${beforeR} → ${remainingRecords.length}（删除 ${removedR} 条）`)
