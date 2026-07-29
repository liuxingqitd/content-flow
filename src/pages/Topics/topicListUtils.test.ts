import { describe, expect, it } from 'vitest'
import type { Topic } from '@/types'
import { parsePotentialScore, sortTopics } from './topicListUtils'

const topic = (id: string, potentialScore: number | undefined, updatedAt: string): Topic => ({
  id,
  title: id,
  status: 'inspiration',
  tagIds: [],
  potentialScore,
  createdAt: updatedAt,
  updatedAt,
})

describe('parsePotentialScore', () => {
  it('accepts empty input and integer boundaries', () => {
    expect(parsePotentialScore('')).toEqual({})
    expect(parsePotentialScore('  ')).toEqual({})
    expect(parsePotentialScore('0')).toEqual({ value: 0 })
    expect(parsePotentialScore('100')).toEqual({ value: 100 })
  })

  it('rejects decimals, non-numbers, and values outside 0–100', () => {
    expect(parsePotentialScore('10.5').error).toBeTruthy()
    expect(parsePotentialScore('abc').error).toBeTruthy()
    expect(parsePotentialScore('-1').error).toBeTruthy()
    expect(parsePotentialScore('101').error).toBeTruthy()
  })
})

describe('sortTopics', () => {
  const topics = [
    topic('unscored', undefined, '2026-07-29T12:00:00.000Z'),
    topic('low', 0, '2026-07-29T11:00:00.000Z'),
    topic('high-old', 90, '2026-07-28T10:00:00.000Z'),
    topic('high-new', 90, '2026-07-29T10:00:00.000Z'),
    topic('mid', 60, '2026-07-29T09:00:00.000Z'),
  ]

  it('sorts scores descending and keeps unscored topics last', () => {
    expect(sortTopics(topics, 'score-desc').map(t => t.id)).toEqual([
      'high-new', 'high-old', 'mid', 'low', 'unscored',
    ])
  })

  it('sorts scores ascending and still keeps unscored topics last', () => {
    expect(sortTopics(topics, 'score-asc').map(t => t.id)).toEqual([
      'low', 'mid', 'high-new', 'high-old', 'unscored',
    ])
  })

  it('preserves the default order and never mutates the input array', () => {
    const before = topics.map(t => t.id)
    expect(sortTopics(topics, 'default').map(t => t.id)).toEqual(before)
    expect(topics.map(t => t.id)).toEqual(before)
  })
})
