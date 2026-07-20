import { describe, expect, it } from 'vitest'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from './date'

describe('local date-time values', () => {
  it('shows an ISO timestamp in local time and stores edits as ISO', () => {
    const stored = new Date(2026, 6, 20, 14, 35, 42).toISOString()

    expect(toDateTimeLocalValue(stored)).toBe('2026-07-20T14:35')
    expect(fromDateTimeLocalValue('2026-07-20T14:35')).toBe(
      new Date(2026, 6, 20, 14, 35).toISOString(),
    )
  })
})
