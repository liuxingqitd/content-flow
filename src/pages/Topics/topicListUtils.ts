import type { Topic } from '@/types'

export type TopicSortMode = 'default' | 'score-desc' | 'score-asc'

export function getTopicCreationSourceLabel(source: Topic['creationSource']) {
  if (source === 'ai') return 'AI'
  if (source === 'human') return '人工'
  return null
}

export interface PotentialScoreParseResult {
  value?: number
  error?: string
}

export function parsePotentialScore(rawValue: string): PotentialScoreParseResult {
  const value = rawValue.trim()
  if (!value) return {}
  if (!/^\d+$/.test(value)) return { error: '潜力分必须是 0–100 的整数' }

  const score = Number(value)
  if (score < 0 || score > 100) return { error: '潜力分必须在 0–100 之间' }
  return { value: score }
}

export function sortTopics(topics: readonly Topic[], mode: TopicSortMode): Topic[] {
  const sorted = [...topics]
  if (mode === 'default') return sorted

  return sorted.sort((a, b) => {
    const aHasScore = typeof a.potentialScore === 'number'
    const bHasScore = typeof b.potentialScore === 'number'

    if (aHasScore !== bHasScore) return aHasScore ? -1 : 1
    if (aHasScore && bHasScore && a.potentialScore !== b.potentialScore) {
      return mode === 'score-desc'
        ? b.potentialScore! - a.potentialScore!
        : a.potentialScore! - b.potentialScore!
    }

    const updatedAtOrder = b.updatedAt.localeCompare(a.updatedAt)
    return updatedAtOrder || a.id.localeCompare(b.id)
  })
}
