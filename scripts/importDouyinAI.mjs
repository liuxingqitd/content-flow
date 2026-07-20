import fs from 'fs'
import { randomUUID } from 'crypto'

const DATA_DIR = '/Users/liuxingqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/SecondBrain/IPC'

// 读取现有数据
const existingVideos = JSON.parse(fs.readFileSync(`${DATA_DIR}/videos.json`, 'utf-8'))
const existingRecords = JSON.parse(fs.readFileSync(`${DATA_DIR}/douyinRecords.json`, 'utf-8'))

// 解析 CSV
const csv = fs.readFileSync('/Users/liuxingqi/Downloads/抖音作品列表.csv', 'utf-8')
const lines = csv.split('\n').filter(l => l.trim())

// 处理引号多行（标准 CSV 解析）
let records = []
let current = ''
let inQuotes = false
for (const line of lines) {
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    current += ch
  }
  if (!inQuotes) { records.push(current); current = '' }
  else { current += '\n' }
}

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

function cleanTitle(raw) {
  let t = raw.split('\n')[0]
  t = t.replace(/#\S+/g, '').trim()
  t = t.replace(/@\S+/g, '').trim()
  return t
}

const csvData = records.slice(1).map(r => parseRow(r))

// ===== 已存在的视频（标题前缀匹配，CSV 解析会去掉引号）=====
const existingPrefixes = [
  'Claude和Codex怎么选？',
  'AI时代的通用语言Markdown，学5个符号就能掌握',
  'Claude额度不够？6个技巧省70%token',
  '我的AI学习信源，推荐9个值得关注的博主',
  'superpowers怎么用？新手必装这4个skill',
  '一条视频讲清楚Claude Skill，0基础AI小白必看',
  '测评主流做PPT的skill，这三个最好用',
  'Karpathy不是单纯的',        // 注意：CSV 解析会去掉内部引号
  'AI新手别在选模型上浪费时间，更贵的模型让你进步更慢',
  '每天花一小时玩AI，比你报千元课都管用',
  '学vibe coding之前必须了解git是什么',
  '我做了个可视化skill工具可以一键安装、同步skill',
  'AI做的3D可交互的细胞结构模型，效果太炸裂！',
  'Claude Code 新手必学的三个命令',
  'Mac上必装的5个App',
  '2步做出你的第一个skill，0基础AI小白教程',
]

function alreadyExists(rawTitle) {
  const ct = cleanTitle(rawTitle)
  return existingPrefixes.some(p => ct.startsWith(p))
}

// ===== 未匹配记录（待导入）=====
const allToImport = csvData.filter(d => !alreadyExists(d.title))

// 去重
const seen = new Set()
const uniqueRecords = []
for (const d of allToImport) {
  const ct = cleanTitle(d.title).substring(0, 40)
  if (!seen.has(ct)) { seen.add(ct); uniqueRecords.push(d) }
}

// ===== AI 识别标题：去除描述部分，保留核心标题 =====
const videoTitles = [
  // 1-10
  '同一份文件换个格式给AI，Token省一半，准确度提升',
  '5个skill解决做自媒体的5个痛点',
  '免订阅免登录，只需3步让Claude桌面端接任意模型',
  'Claude Code总是要你频繁确认？1 分钟学会免打扰',
  '给项目加一个CLAUDE.md，AI代码质量翻倍',
  'UI 和 UX 到底啥区别？',
  'ClaudeCode接入DeepSeek-V4保姆级教程',
  '装了上百个 Skill，每天真在用的就这 8 个',
  '年入千万的一人公司CEO，把创业经验做成10个免费skill',
  'Claude Skill保姆级安装教程，4种方式0基础能学会',

  // 11-20
  '分享4个很火的开源项目，让你的Claude Code直接开挂',
  '一个skill做出高级感的PPT',
  'DeepSeek V4终于来了！',
  '玩Claude前必须搞懂的一件事：上下文里到底装了什么',
  '别逐个敲字了，三个技巧让Claude Code输入效率起飞！',
  'Claude强制KYC事件解读，必须知道的三个应对方案',
  '听完这句话，我突然对AI不焦虑了',
  '一个ClaudeCode省token的技巧，90%的人不知道',
  'Claude Code国内安装教程+接任意大模型',
  'Claude Opus 4.7 模型发布',

  // 21-30
  'Anthropic推出最新模型Claude Mythos',
  '一条视频搞懂Claude全家桶怎么用',
  'Claude Code的5种存在形态，不止是命令行！',
  'Claude Code新手最容易犯的5个错误',
  '5分钟从0到1写一个自己的skill',
  '让AI教你用AI，Claude Code新手必看功能',
  '从Claude Code源码发现12个超夯的prompt技巧',
  '5分钟跑通Claude Code源码，分享我的实操和思考',
  'ClaudeCode入门：一条视频讲清楚CLAUDE.md',
  '做了一个检测短视频内容违规的skill',

  // 31-40
  'Claude Code安装配置原来这么简单，新手小白必看！',
  '只需两步！让Claude Code接入国产模型',
  '落地页没转化？就用这个skill.copywriting',
  '一个skill让你的AI学会全网查资料',
  '这个skill帮你把需求变成执行计划',
  '50 条ClaudeCode使用技巧',
  '一个skill帮你理清需求，减少返工',
  '为什么你的AI难用？',
  'Claude Code太烧钱？5招帮你省一半token',
  '这个skill让AI具备专业设计师的经验',

  // 41-50
  '一个skill让你的页面质感翻倍',
  'vibecoding了一个将任意文本内容转好看卡片的工具',
  '100个值得装的skills（skill-creator）',
  'Claude Code新手进阶必学的4个命令',
  'Skills推荐：find-skills',
  'Claude Code完整命令手册',
  '文科生也能听懂！OpenClaw到底是什么？',
  'OpenClaw真的适合你么？先问自己这4个问题',
  'ClaudeCode高手都在写的CLAUDE.md到底有什么用？',
  'Claude Code新手必学的5个命令',

  // 51-60
  '36个真实案例告诉你OpenClaw可以用来干嘛',
  'Claude Code的最佳拍档CC Switch',
  '被Claude Code界面劝退？看完这4个技巧再决定',
  '想要找到好用的skills，我只推荐这三个网站',
  '我vibecoding了一个让孩子爱上数学的神器！',
  '不写一行代码，我用AI做了个互动网页让孩子秒懂数学概念',
  '这5个skills太好用了，vibecoding必装',
  '一张图教会你选vibecoding的工具',
  'vibecoding是2026年最值得学习的技能',
  '想要文案写的好，推荐用这4个skills',
]

// ===== 生成条目 =====
function makeVideo(d, title) {
  const desc = cleanTitle(d.title).substring(0, 200)
  const dt = new Date(d.publishedAt.replace(' ', 'T') + '+08:00')
  const now = new Date().toISOString()
  const douyinStatus = d.auditStatus === '公开' ? 'published' : 'violated'
  return {
    id: 'vid_' + randomUUID().replace(/-/g, '').substring(0, 10),
    title,
    description: desc,
    status: 'published',
    tagIds: [],
    platforms: [{
      platform: 'douyin',
      status: douyinStatus,
      publishedAt: dt.toISOString(),
      ...(douyinStatus === 'violated' ? { violation: { reason: '仅自己可见', reportedAt: now } } : {}),
    }],
    statusHistory: [
      { status: 'topic', changedAt: dt.toISOString() },
      { status: 'published', changedAt: dt.toISOString() },
    ],
    createdAt: dt.toISOString(),
    updatedAt: now,
  }
}

function makeRecord(d) {
  const now = new Date().toISOString()
  const id = randomUUID().replace(/-/g, '')
  return {
    id, title: d.title.replace(/\n/g, ' '),
    publishedAt: d.publishedAt, genre: d.genre, status: d.auditStatus,
    plays: d.plays, completionRate: d.completionRate, fiveSecRate: d.fiveSecRate,
    coverCtr: d.coverCtr, twoSecBounceRate: d.twoSecBounceRate, avgPlayDuration: d.avgPlayDuration,
    likes: d.likes, shares: d.shares, comments: d.comments, saves: d.saves,
    profileVisits: d.profileVisits, followerGain: d.followerGain,
    createdAt: now,
  }
}

// ===== 构建 =====
const newVideos = uniqueRecords.map((d, i) => makeVideo(d, videoTitles[i]))
const allRecords = csvData.map(d => makeRecord(d))

const finalVideos = [...existingVideos, ...newVideos]

fs.writeFileSync(`${DATA_DIR}/videos.json`, JSON.stringify(finalVideos, null, 2))
fs.writeFileSync(`${DATA_DIR}/douyinRecords.json`, JSON.stringify(allRecords, null, 2))

console.log('========================================')
console.log('导入完成！')
console.log('========================================')
console.log(`CSV 总记录: ${csvData.length}`)
console.log(`已有视频: ${existingVideos.length}`)
console.log(`新增视频: ${newVideos.length}`)
console.log(`最终视频总数: ${finalVideos.length}`)
console.log(`douyinRecords: ${allRecords.length} 条`)
console.log('')
console.log('=== 新导入视频 ===')
newVideos.forEach((v, i) => console.log(`${(i+1).toString().padStart(2)}. ${v.title}`))
