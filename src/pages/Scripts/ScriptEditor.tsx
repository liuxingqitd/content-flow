interface ScriptEditorProps {
  content: string
  onChange: (content: string) => void
}

export function ScriptEditor({ content, onChange }: ScriptEditorProps) {
  return (
    <div style={{
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
    }}>
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          width: '100%',
          boxSizing: 'border-box',
          resize: 'none',
          border: 'none',
          outline: 'none',
          padding: '28px 36px 48px',
          maxWidth: 780,
          margin: '0 auto',
          display: 'block',
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.75,
          letterSpacing: '-0.01em',
          caretColor: 'var(--accent)',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          overflowY: 'auto',
          height: '100%',
        }}
      />
    </div>
  )
}
