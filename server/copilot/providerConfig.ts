export interface RequestProviderConfig {
  baseURL: string
  apiKey: string
  model: string
}

function required(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim()
  if (!trimmed) throw new Error(`缺少 ${field}，请先在设置中配置 AI 模型`)
  return trimmed
}

export function validateProviderConfig(input: {
  baseURL?: string | null
  apiKey?: string | null
  model?: string | null
}): RequestProviderConfig {
  const baseURL = required(input.baseURL, 'API 地址')
  const apiKey = required(input.apiKey, 'API Key')
  const model = required(input.model, '模型名称')
  const url = new URL(baseURL)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('API 地址只支持 http:// 或 https://')
  }
  return { baseURL: url.toString().replace(/\/$/, ''), apiKey, model }
}

export function providerConfigFromRequest(request: Request): RequestProviderConfig {
  return validateProviderConfig({
    baseURL: request.headers.get('x-contentflow-ai-base-url'),
    apiKey: request.headers.get('x-contentflow-ai-api-key'),
    model: request.headers.get('x-contentflow-ai-model'),
  })
}
