import { describe, expect, it } from 'vitest'
import { validateProviderConfig } from './providerConfig'

describe('server provider config', () => {
  it('normalizes a valid OpenAI-compatible provider', () => {
    expect(validateProviderConfig({
      baseURL: 'https://example.com/v1/',
      apiKey: 'secret',
      model: 'model-1',
    })).toEqual({
      baseURL: 'https://example.com/v1',
      apiKey: 'secret',
      model: 'model-1',
    })
  })

  it('rejects missing or unsafe provider URLs', () => {
    expect(() => validateProviderConfig({ baseURL: 'file:///tmp/key', apiKey: 'x', model: 'm' })).toThrow('http://')
    expect(() => validateProviderConfig({ baseURL: 'https://example.com', apiKey: '', model: 'm' })).toThrow('API Key')
  })
})
