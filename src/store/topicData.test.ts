import { describe, expect, it } from 'vitest'
import type { AppData, Script, Topic, Video } from '@/types'
import { deleteTopicAndDetach, deleteTopicWithLinkedContent, getTopicCascadeDeletion } from './topicData'

const timestamp = '2026-07-29T12:00:00.000Z'

const makeTopic = (id: string): Topic => ({
  id,
  title: id,
  status: 'inspiration',
  tagIds: [],
  createdAt: timestamp,
  updatedAt: timestamp,
})

const makeVideo = (id: string, topicId?: string): Video => ({
  id,
  title: id,
  status: 'topic',
  tagIds: [],
  topicId,
  statusHistory: [{ status: 'topic', changedAt: timestamp }],
  platforms: [],
  createdAt: timestamp,
  updatedAt: timestamp,
})

const makeScript = (id: string, topicId?: string): Script => ({
  id,
  title: id,
  topicId,
  wordCount: 0,
  estimatedDuration: 0,
  tagIds: [],
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
})

describe('deleteTopicAndDetach', () => {
  it('deletes the topic, preserves linked content, and clears reverse references', () => {
    const data = {
      topics: [makeTopic('target'), makeTopic('other')],
      videos: [makeVideo('linked-video', 'target'), makeVideo('other-video', 'other')],
      scripts: [makeScript('linked-script', 'target'), makeScript('other-script', 'other')],
    }
    const updatedAt = '2026-07-29T13:00:00.000Z'

    expect(deleteTopicAndDetach(data, 'target', updatedAt)).toBe(true)
    expect(data.topics.map(topic => topic.id)).toEqual(['other'])
    expect(data.videos.map(video => video.id)).toEqual(['linked-video', 'other-video'])
    expect(data.scripts.map(script => script.id)).toEqual(['linked-script', 'other-script'])
    expect(data.videos[0].topicId).toBeUndefined()
    expect(data.videos[0].updatedAt).toBe(updatedAt)
    expect(data.scripts[0].topicId).toBeUndefined()
    expect(data.scripts[0].updatedAt).toBe(updatedAt)
    expect(data.scripts[0].contentUpdatedAt).toBe(timestamp)
    expect(data.videos[1].topicId).toBe('other')
    expect(data.scripts[1].topicId).toBe('other')
  })

  it('is a no-op when the topic does not exist', () => {
    const data = { topics: [makeTopic('other')], videos: [], scripts: [] }
    expect(deleteTopicAndDetach(data, 'missing', timestamp)).toBe(false)
    expect(data.topics).toHaveLength(1)
  })
})

type CascadeData = Pick<
  AppData,
  | 'topics'
  | 'videos'
  | 'scripts'
  | 'videoRelations'
  | 'metrics'
  | 'douyinRecords'
  | 'xiaohongshuRecords'
>

const makeCascadeData = (): CascadeData => ({
  topics: [
    { ...makeTopic('target'), linkedVideoId: 'linked-video' },
    { ...makeTopic('other'), linkedVideoId: 'other-video' },
  ],
  videos: [
    { ...makeVideo('linked-video'), scriptId: 'linked-script' },
    { ...makeVideo('reverse-linked-video'), scriptId: 'reverse-linked-script' },
    { ...makeVideo('other-video', 'other'), scriptId: 'other-script' },
  ],
  scripts: [
    { ...makeScript('linked-script'), videoId: 'linked-video' },
    { ...makeScript('reverse-linked-script', 'target'), videoId: 'reverse-linked-video' },
    { ...makeScript('other-script', 'other'), videoId: 'other-video' },
  ],
  videoRelations: [
    { id: 'linked-relation', fromVideoId: 'linked-video', toVideoId: 'other-video', createdAt: timestamp, updatedAt: timestamp },
    { id: 'other-relation', fromVideoId: 'other-video', toVideoId: 'unrelated-video', createdAt: timestamp, updatedAt: timestamp },
  ],
  metrics: [
    { id: 'linked-metric', videoId: 'linked-video', platform: 'douyin', recordedAt: timestamp, dataDate: '2026-07-29', plays: 1, likes: 1, comments: 1, shares: 1 },
    { id: 'other-metric', videoId: 'other-video', platform: 'douyin', recordedAt: timestamp, dataDate: '2026-07-29', plays: 1, likes: 1, comments: 1, shares: 1 },
  ],
  douyinRecords: [
    { id: 'douyin-linked', title: 'linked', videoId: 'linked-video', publishedAt: timestamp, genre: '视频', status: '正常', plays: 1, completionRate: 0, fiveSecRate: 0, coverCtr: '-', twoSecBounceRate: 0, avgPlayDuration: 0, likes: 0, shares: 0, comments: 0, saves: 0, profileVisits: 0, followerGain: 0, createdAt: timestamp },
  ],
  xiaohongshuRecords: [
    { id: 'xhs-linked', title: 'linked', videoId: 'reverse-linked-video', publishedAt: timestamp, genre: '视频', impressions: 1, views: 1, coverCtr: 0, likes: 0, comments: 0, saves: 0, follows: 0, shares: 0, avgWatchDuration: 0, danmaku: 0, createdAt: timestamp },
  ],
})

describe('deleteTopicWithLinkedContent', () => {
  it('finds the complete video and script association chain', () => {
    const deletion = getTopicCascadeDeletion(makeCascadeData(), 'target')

    expect(deletion?.videos.map(video => video.id)).toEqual(['linked-video', 'reverse-linked-video'])
    expect(deletion?.scripts.map(script => script.id)).toEqual(['linked-script', 'reverse-linked-script'])
  })

  it('deletes linked content and dependent records while preserving unrelated data', () => {
    const data = makeCascadeData()

    expect(deleteTopicWithLinkedContent(data, 'target')).toBe(true)
    expect(data.topics.map(topic => topic.id)).toEqual(['other'])
    expect(data.videos.map(video => video.id)).toEqual(['other-video'])
    expect(data.scripts.map(script => script.id)).toEqual(['other-script'])
    expect(data.videoRelations.map(relation => relation.id)).toEqual(['other-relation'])
    expect(data.metrics.map(metric => metric.id)).toEqual(['other-metric'])
    expect(data.douyinRecords[0].videoId).toBeUndefined()
    expect(data.xiaohongshuRecords[0].videoId).toBeUndefined()
    expect(data.topics[0].linkedVideoId).toBe('other-video')
  })

  it('is a no-op when the topic does not exist', () => {
    const data = makeCascadeData()
    const snapshot = structuredClone(data)

    expect(deleteTopicWithLinkedContent(data, 'missing')).toBe(false)
    expect(data).toEqual(snapshot)
  })
})
