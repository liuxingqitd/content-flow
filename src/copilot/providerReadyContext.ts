import { createContext, useContext } from 'react'

export const CopilotProviderReadyContext = createContext(false)

export function useCopilotProviderReady() {
  return useContext(CopilotProviderReadyContext)
}
