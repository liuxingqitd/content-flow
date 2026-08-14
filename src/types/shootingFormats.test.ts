import { describe, expect, it } from 'vitest'
import { ALL_SHOOTING_FORMATS, SHOOTING_FORMAT_LABELS } from './index'

describe('shooting formats', () => {
  it('offers image-and-text content in video details', () => {
    expect(ALL_SHOOTING_FORMATS).toContain('image_text')
    expect(SHOOTING_FORMAT_LABELS.image_text).toBe('图文')
  })
})
