import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import {
  AI_PROVIDER_CHANGE_EVENT,
  isProviderConfigured,
  loadAIProviderConfig,
  type AIProviderConfig,
} from './providerConfig'

const ActiveCopilotShell = lazy(() => import('./CopilotShell').then(module => ({ default: module.CopilotShell })))

export function CopilotGate({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIProviderConfig>(() => loadAIProviderConfig())

  useEffect(() => {
    const update = () => setConfig(loadAIProviderConfig())
    window.addEventListener(AI_PROVIDER_CHANGE_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(AI_PROVIDER_CHANGE_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  if (!isProviderConfigured(config)) {
    return (
      <>
        {children}
        <a className="ai-companion-setup" href="/settings" title="配置内容助手" aria-label="配置内容助手">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m8 2 .65 2.25A4.5 4.5 0 0 0 11.75 7L14 8l-2.25 1a4.5 4.5 0 0 0-3.1 2.75L8 14l-.65-2.25A4.5 4.5 0 0 0 4.25 9L2 8l2.25-1a4.5 4.5 0 0 0 3.1-2.75L8 2Z"/>
          </svg>
        </a>
      </>
    )
  }

  return (
    <Suspense fallback={children}>
      <ActiveCopilotShell config={config}>{children}</ActiveCopilotShell>
    </Suspense>
  )
}
