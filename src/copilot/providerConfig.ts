export interface AIProviderConfig {
  enabled: boolean
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

export const AI_PROVIDER_STORAGE_KEY = 'contentflow.ai-provider.v1'
export const AI_PROVIDER_CHANGE_EVENT = 'contentflow:ai-provider-change'

export const EMPTY_AI_PROVIDER_CONFIG: AIProviderConfig = {
  enabled: false,
  name: '',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: '',
}

export function isProviderConfigured(config: AIProviderConfig): boolean {
  return Boolean(
    config.enabled &&
    config.baseUrl.trim() &&
    config.apiKey.trim() &&
    config.model.trim(),
  )
}

export function loadAIProviderConfig(): AIProviderConfig {
  try {
    const stored = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
    if (!stored) return EMPTY_AI_PROVIDER_CONFIG
    return { ...EMPTY_AI_PROVIDER_CONFIG, ...JSON.parse(stored) }
  } catch {
    return EMPTY_AI_PROVIDER_CONFIG
  }
}

export function saveAIProviderConfig(config: AIProviderConfig): void {
  window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(AI_PROVIDER_CHANGE_EVENT, { detail: config }))
}

export function providerHeaders(config: AIProviderConfig): Record<string, string> {
  return {
    'x-contentflow-ai-base-url': config.baseUrl.trim(),
    'x-contentflow-ai-api-key': config.apiKey.trim(),
    'x-contentflow-ai-model': config.model.trim(),
  }
}

export function redactProviderConfig(config: AIProviderConfig) {
  return {
    ...config,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 3)}••••••••` : '',
  }
}
