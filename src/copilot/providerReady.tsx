import type { ReactNode } from 'react'
import { CopilotProviderReadyContext } from './providerReadyContext'

export function CopilotProviderReady({ children }: { children: ReactNode }) {
  return (
    <CopilotProviderReadyContext.Provider value={true}>
      {children}
    </CopilotProviderReadyContext.Provider>
  )
}
