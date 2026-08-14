import type { AppData, Script, Video } from '@/types'

type TopicLinkedData = Pick<AppData, 'topics' | 'videos' | 'scripts'>

type TopicCascadeData = Pick<
  AppData,
  | 'topics'
  | 'videos'
  | 'scripts'
  | 'videoRelations'
  | 'metrics'
  | 'douyinRecords'
  | 'xiaohongshuRecords'
>

export interface TopicCascadeDeletion {
  videos: Video[]
  scripts: Script[]
}

export function getTopicCascadeDeletion(
  data: TopicLinkedData,
  topicId: string,
): TopicCascadeDeletion | null {
  const topic = data.topics.find(item => item.id === topicId)
  if (!topic) return null

  const videoIds = new Set(
    data.videos
      .filter(video => video.topicId === topicId || video.id === topic.linkedVideoId)
      .map(video => video.id),
  )
  const scriptIds = new Set(
    data.scripts
      .filter(script => script.topicId === topicId)
      .map(script => script.id),
  )

  let changed = true
  while (changed) {
    changed = false

    data.scripts.forEach(script => {
      if (
        !scriptIds.has(script.id) &&
        ((script.videoId && videoIds.has(script.videoId)) ||
          data.videos.some(video => videoIds.has(video.id) && video.scriptId === script.id))
      ) {
        scriptIds.add(script.id)
        changed = true
      }
    })

    data.videos.forEach(video => {
      if (
        !videoIds.has(video.id) &&
        ((video.scriptId && scriptIds.has(video.scriptId)) ||
          data.scripts.some(script => scriptIds.has(script.id) && script.videoId === video.id))
      ) {
        videoIds.add(video.id)
        changed = true
      }
    })
  }

  return {
    videos: data.videos.filter(video => videoIds.has(video.id)),
    scripts: data.scripts.filter(script => scriptIds.has(script.id)),
  }
}

export function deleteTopicWithLinkedContent(data: TopicCascadeData, topicId: string): boolean {
  const deletion = getTopicCascadeDeletion(data, topicId)
  if (!deletion) return false

  const videoIds = new Set(deletion.videos.map(video => video.id))
  const scriptIds = new Set(deletion.scripts.map(script => script.id))

  data.topics = data.topics.filter(topic => topic.id !== topicId)
  data.videos = data.videos.filter(video => !videoIds.has(video.id))
  data.scripts = data.scripts.filter(script => !scriptIds.has(script.id))
  data.videoRelations = data.videoRelations.filter(
    relation => !videoIds.has(relation.fromVideoId) && !videoIds.has(relation.toVideoId),
  )
  data.metrics = data.metrics.filter(metric => !videoIds.has(metric.videoId))

  data.topics.forEach(topic => {
    if (topic.linkedVideoId && videoIds.has(topic.linkedVideoId)) delete topic.linkedVideoId
  })
  data.videos.forEach(video => {
    if (video.scriptId && scriptIds.has(video.scriptId)) delete video.scriptId
  })
  data.scripts.forEach(script => {
    if (script.videoId && videoIds.has(script.videoId)) delete script.videoId
  })
  data.douyinRecords.forEach(record => {
    if (record.videoId && videoIds.has(record.videoId)) delete record.videoId
  })
  data.xiaohongshuRecords.forEach(record => {
    if (record.videoId && videoIds.has(record.videoId)) delete record.videoId
  })

  return true
}

export function deleteTopicAndDetach(data: TopicLinkedData, topicId: string, updatedAt: string): boolean {
  const topicIndex = data.topics.findIndex(topic => topic.id === topicId)
  if (topicIndex === -1) return false

  data.topics.splice(topicIndex, 1)

  data.videos.forEach(video => {
    if (video.topicId !== topicId) return
    delete video.topicId
    video.updatedAt = updatedAt
  })

  data.scripts.forEach(script => {
    if (script.topicId !== topicId) return
    if (!script.contentUpdatedAt) script.contentUpdatedAt = script.updatedAt
    delete script.topicId
    script.updatedAt = updatedAt
  })

  return true
}
