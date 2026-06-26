import { useCopilotPageFocus } from './pageFocus'

export function CopilotHeaderTitle() {
  const focus = useCopilotPageFocus()?.pageContext
  const focusedTitle = focus?.focusedEntity?.title

  return (
    <div className="contentflow-ai-header">
      <div className="contentflow-ai-mark">AI</div>
      <div className="contentflow-ai-header-copy">
        <strong>ContentFlow AI</strong>
        <span title={focusedTitle}>
          {focus ? `${focus.pageTitle}${focusedTitle ? ` · ${focusedTitle}` : ''}` : '准备理解当前页面'}
        </span>
      </div>
    </div>
  )
}
