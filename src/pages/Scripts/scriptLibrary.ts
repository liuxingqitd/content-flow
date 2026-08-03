import type { Script, Video } from '@/types'

export type ScriptPublicationStatus = 'unpublished' | 'published'

const timestamp = (value?: string) => {
  const parsed = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export const getScriptLastEditedAt = (script: Script) =>
  script.contentUpdatedAt ?? script.updatedAt

export const sortScriptsByLastEdited = (scripts: Script[]) =>
  [...scripts].sort((a, b) =>
    timestamp(getScriptLastEditedAt(b)) - timestamp(getScriptLastEditedAt(a))
    || timestamp(b.createdAt) - timestamp(a.createdAt)
    || a.id.localeCompare(b.id),
  )

export const isScriptPublished = (script: Script, videos: Video[]) => {
  const linkedVideo = (script.videoId
    ? videos.find(video => video.id === script.videoId)
    : undefined)
    ?? videos.find(video => video.scriptId === script.id)
  return linkedVideo?.status === 'published'
}

export const filterScriptsByPublicationStatus = (
  scripts: Script[],
  videos: Video[],
  status: ScriptPublicationStatus,
) => scripts.filter(script => isScriptPublished(script, videos) === (status === 'published'))
