import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const runner = path.join(path.dirname(fileURLToPath(import.meta.url)), 'import-platform-data.mjs')
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

async function json(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`)
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'platform-video-import-'))
  const dataDir = path.join(root, 'data')
  await mkdir(path.join(dataDir, 'scripts'), { recursive: true })
  await json(path.join(dataDir, 'videos.json'), [{
    id: 'vid_demo',
    title: '两位工程师揭秘：5步写好提示词',
    status: 'published',
    tagIds: [],
    platforms: [],
    statusHistory: [],
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
  }])
  await json(path.join(dataDir, 'scripts.json'), [])
  await json(path.join(dataDir, 'douyinRecords.json'), [])
  await json(path.join(dataDir, 'xiaohongshuRecords.json'), [])
  await json(path.join(dataDir, 'shipinhaoRecords.json'), [{
    id: 'sph_existing',
    description: '两位工程师揭秘：5步写好提示词',
    videoId: 'vid_demo',
    publishedAt: '2026/07/24',
    completionRate: 0.1,
    avgPlayDuration: '10秒',
    plays: 1,
    recommendations: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    follows: 0,
    forwardChat: 0,
    setRingtone: 0,
    setStatus: 0,
    setMomentCover: 0,
    createdAt: '2026-07-24T00:00:00.000Z'
  }])
  const source = path.join(root, 'channels.csv')
  await writeFile(source, [
    '视频描述,视频ID,发布时间,完播率,平均播放时长,播放量,推荐,喜欢,评论量,分享量,关注量,转发聊天和朋友圈,设为铃声,设为状态,设为朋友圈封面',
    '两位工程师揭秘：5步写好提示词,export/native-1,2026/07/24,20%,12秒,99,3,8,2,4,1,4,0,0,0',
  ].join('\n'))
  return { root, dataDir, source }
}

function run(...args) {
  return execFileSync(process.execPath, [runner, ...args], { encoding: 'utf8' })
}

test('migrates legacy Channels IDs and remains idempotent', async () => {
  const { root, dataDir, source } = await fixture()
  const plan = path.join(root, 'plan.json')
  const report = path.join(root, 'report.json')
  run('prepare', '--project-dir', projectDir, '--data-dir', dataDir, '--out', plan, '--source', source)
  const prepared = JSON.parse(await readFile(plan, 'utf8'))
  assert.equal(prepared.summary.pending, 0)
  assert.equal(prepared.items[0].decision.targetVideoId, 'vid_demo')

  run('validate', '--plan', plan)
  run('apply', '--data-dir', dataDir, '--plan', plan, '--report', report)
  const dryRun = JSON.parse(await readFile(report, 'utf8'))
  assert.equal(dryRun.mode, 'dry-run')
  assert.equal(dryRun.counts.shipinhao.added, 0)
  assert.equal(dryRun.counts.shipinhao.updated, 1)

  run('apply', '--data-dir', dataDir, '--plan', plan, '--report', report, '--apply')
  const records = JSON.parse(await readFile(path.join(dataDir, 'shipinhaoRecords.json'), 'utf8'))
  assert.equal(records.length, 1)
  assert.equal(records[0].id, 'sph_existing')
  assert.equal(records[0].createdAt, '2026-07-24T00:00:00.000Z')
  assert.equal(records[0].platformVideoId, 'export/native-1')
  assert.equal(records[0].videoId, 'vid_demo')
  assert.equal(records[0].plays, 99)

  const secondPlan = path.join(root, 'plan-2.json')
  const secondReport = path.join(root, 'report-2.json')
  run('prepare', '--project-dir', projectDir, '--data-dir', dataDir, '--out', secondPlan, '--source', source)
  run('apply', '--data-dir', dataDir, '--plan', secondPlan, '--report', secondReport)
  const second = JSON.parse(await readFile(secondReport, 'utf8'))
  assert.equal(second.counts.shipinhao.added, 0)
  assert.equal(second.createdVideos.length, 0)
})

test('validate blocks unresolved semantic decisions', async () => {
  const { root, dataDir } = await fixture()
  const source = path.join(root, 'ambiguous.csv')
  await writeFile(source, [
    '视频描述,视频ID,发布时间,完播率,平均播放时长,播放量,推荐,喜欢,评论量,分享量,关注量,转发聊天和朋友圈,设为铃声,设为状态,设为朋友圈封面',
    '完全不同的新主题,export/native-2,2026/07/25,20%,12秒,9,0,0,0,0,0,0,0,0,0',
  ].join('\n'))
  const plan = path.join(root, 'plan.json')
  run('prepare', '--project-dir', projectDir, '--data-dir', dataDir, '--out', plan, '--source', source)
  assert.throws(() => run('validate', '--plan', plan))
})
