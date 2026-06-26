import { createContext, useContext } from 'react'
import type { PageAgentContext } from './context'

export interface CopilotPageFocusValue {
  pageContext: PageAgentContext | null
  setPageContext: (context: PageAgentContext | null) => void
}

export const CopilotPageFocusContext = createContext<CopilotPageFocusValue | null>(null)

export function useCopilotPageFocus() {
  return useContext(CopilotPageFocusContext)
}
