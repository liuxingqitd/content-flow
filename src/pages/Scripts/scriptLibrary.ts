import type { Script } from '@/types'

export type ScriptSourceFilter = 'all' | 'ai' | 'human' | 'unmarked'

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

export const sortScriptsByCreated = (scripts: Script[]) =>
  [...scripts].sort((a, b) =>
    timestamp(b.createdAt) - timestamp(a.createdAt)
    || a.id.localeCompare(b.id),
  )

export function filterScriptsBySource(scripts: Script[], filter: ScriptSourceFilter) {
  if (filter === 'all') return scripts
  if (filter === 'unmarked') return scripts.filter(script => !script.writingSource)
  return scripts.filter(script => script.writingSource === filter)
}

export function getRecentScriptGroups(scripts: Script[], limit = 4) {
  return {
    recentEdited: sortScriptsByLastEdited(scripts).slice(0, limit),
    recentCreated: sortScriptsByCreated(scripts).slice(0, limit),
  }
}
