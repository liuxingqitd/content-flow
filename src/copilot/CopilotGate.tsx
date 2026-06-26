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
        <a className="ai-companion-setup" href="/settings" title="配置 AI Companion">
          AI
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
