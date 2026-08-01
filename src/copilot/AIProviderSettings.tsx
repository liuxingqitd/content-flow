import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiUrl } from '@/utils/api'
import {
  loadAIProviderConfig,
  redactProviderConfig,
  saveAIProviderConfig,
  type AIProviderConfig,
} from './providerConfig'

type TestState = { type: 'idle' | 'loading' | 'success' | 'error'; message?: string }

export function AIProviderSettings() {
  const [config, setConfig] = useState<AIProviderConfig>(() => loadAIProviderConfig())
  const [testState, setTestState] = useState<TestState>({ type: 'idle' })

  const update = (patch: Partial<AIProviderConfig>) => setConfig(current => ({ ...current, ...patch }))

  const save = () => {
    saveAIProviderConfig(config)
    setTestState({ type: 'success', message: '配置已保存到当前浏览器' })
  }

  const testConnection = async () => {
    setTestState({ type: 'loading' })
    try {
      const response = await fetch(apiUrl('/api/ai-provider/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '连接失败')
      setTestState({ type: 'success', message: result.message || '连接成功' })
    } catch (error) {
      setTestState({ type: 'error', message: error instanceof Error ? error.message : '连接失败' })
    }
  }

  const diagnostic = redactProviderConfig(config)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>内容助手</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          使用你自己的 OpenAI-compatible API。密钥仅保存在当前浏览器，并发送给本机服务。
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={config.enabled} onChange={event => update({ enabled: event.target.checked })} />
          启用内容助手
        </label>
        <Input label="服务商名称" value={config.name} placeholder="例如 DeepSeek" onChange={event => update({ name: event.target.value })} />
        <Input label="API 地址" value={config.baseUrl} placeholder="https://api.example.com/v1" onChange={event => update({ baseUrl: event.target.value })} />
        <Input label="模型" value={config.model} placeholder="模型名称" onChange={event => update({ model: event.target.value })} />
        <Input label="API Key" type="password" value={config.apiKey} placeholder="sk-..." onChange={event => update({ apiKey: event.target.value })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="primary" size="sm" onClick={save}>保存配置</Button>
          <Button variant="secondary" size="sm" loading={testState.type === 'loading'} onClick={testConnection}>测试连接</Button>
          {testState.message && (
            <span style={{ fontSize: 11, color: testState.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
              {testState.message}
            </span>
          )}
        </div>
        <details style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          <summary>配置诊断信息</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(diagnostic, null, 2)}</pre>
        </details>
      </div>
    </section>
  )
}
