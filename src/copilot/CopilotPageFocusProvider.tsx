import { useMemo, useState, type ReactNode } from 'react'
import type { PageAgentContext } from './context'
import { CopilotPageFocusContext } from './pageFocus'

export function CopilotPageFocusProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<PageAgentContext | null>(null)
  const value = useMemo(() => ({ pageContext, setPageContext }), [pageContext])
  return (
    <CopilotPageFocusContext.Provider value={value}>
      {children}
    </CopilotPageFocusContext.Provider>
  )
}
