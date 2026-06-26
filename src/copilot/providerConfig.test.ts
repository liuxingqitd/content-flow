import { describe, expect, it } from 'vitest'
import { EMPTY_AI_PROVIDER_CONFIG, isProviderConfigured, providerHeaders, redactProviderConfig } from './providerConfig'

describe('AI provider config', () => {
  it('requires enabled provider credentials', () => {
    expect(isProviderConfigured(EMPTY_AI_PROVIDER_CONFIG)).toBe(false)
    expect(isProviderConfigured({
      enabled: true,
      name: 'Custom',
      baseUrl: 'https://example.com/v1',
      apiKey: 'secret',
      model: 'model-1',
    })).toBe(true)
  })

  it('redacts keys in diagnostics but keeps full request headers', () => {
    const config = {
      enabled: true,
      name: 'Custom',
      baseUrl: 'https://example.com/v1',
      apiKey: 'sk-super-secret',
      model: 'model-1',
    }
    expect(redactProviderConfig(config).apiKey).not.toContain('super-secret')
    expect(providerHeaders(config)['x-contentflow-ai-api-key']).toBe('sk-super-secret')
  })
})
