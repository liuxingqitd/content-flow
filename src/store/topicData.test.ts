import { describe, expect, it } from 'vitest'
import type { Script, Topic, Video } from '@/types'
import { deleteTopicAndDetach } from './topicData'

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
