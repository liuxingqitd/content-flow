import { useMemo, type ReactNode } from 'react'
import { CopilotKitProvider, CopilotSidebar } from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { providerHeaders, type AIProviderConfig } from './providerConfig'
import { CopilotHeaderTitle } from './CopilotHeader'
import { CopilotPageFocusProvider } from './CopilotPageFocusProvider'
import { CopilotProviderReady } from './providerReady'
import { apiUrl } from '@/utils/api'

export function CopilotShell({ children, config }: { children: ReactNode; config: AIProviderConfig }) {
  const headers = useMemo(() => providerHeaders(config), [config])

  return (
    <CopilotKitProvider
      runtimeUrl={apiUrl('/api/copilotkit')}
      headers={headers}
      showDevConsole={false}
      onError={({ error }) => console.error('[AI Companion]', error.message)}
    >
      <CopilotPageFocusProvider>
        <CopilotProviderReady>
          <CopilotSidebar
            agentId="default"
            defaultOpen={false}
            position="right"
            width={440}
            header={{ titleContent: CopilotHeaderTitle }}
            labels={{
              modalHeaderTitle: 'ContentFlow AI',
              welcomeMessageText: '我会跟随当前页面，并在需要时读取或搜索你的逐字稿 Vault。',
              chatInputPlaceholder: '询问当前页面或搜索历史逐字稿…',
            }}
          />
          {children}
        </CopilotProviderReady>
      </CopilotPageFocusProvider>
    </CopilotKitProvider>
  )
}
