import type { AppData } from '@/types'

type TopicLinkedData = Pick<AppData, 'topics' | 'videos' | 'scripts'>

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
