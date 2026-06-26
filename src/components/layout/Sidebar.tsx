import { NavLink } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

const NAV = [
  {
    path: '/dashboard',
    label: '概览',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="5" height="5" rx="1.2"/><rect x="9.5" y="1.5" width="5" height="5" rx="1.2"/><rect x="1.5" y="9.5" width="5" height="5" rx="1.2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1.2"/></svg>,
  },
  {
    path: '/kanban',
    label: '看板',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1.5" y="2.5" width="3.5" height="11" rx="1.2"/><rect x="6.25" y="2.5" width="3.5" height="8" rx="1.2"/><rect x="11" y="2.5" width="3.5" height="5.5" rx="1.2"/></svg>,
  },
  {
    path: '/topics',
    label: '选题库',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l1.8 3.6 4 .58-2.9 2.83.69 3.99L8 10.4l-3.59 1.9.69-4L2.2 5.68l4-.58z"/></svg>,
  },
  {
    path: '/scripts',
    label: '逐字稿',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="1.5" width="12" height="13" rx="1.5"/><line x1="5" y1="5.5" x2="11" y2="5.5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="10.5" x2="9" y2="10.5"/></svg>,
  },
  {
    path: '/videos',
    label: '视频库',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="10" height="10" rx="1.5"/><path d="M11 6.5l4-2v7l-4-2"/></svg>,
  },
  {
    path: '/analytics',
    label: '数据分析',
    icon: <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7.5 8.5,10 12,5 15,3"/></svg>,
  },
]

export function Sidebar() {
  const saving = useAppStore(s => s.saving)
  const saveError = useAppStore(s => s.error?.startsWith('保存失败') ? s.error : null)
  const theme = useAppStore(s => s.data?.settings.theme ?? 'dark')
  const updateSettings = useAppStore(s => s.updateSettings)

  return (
    <aside
      style={{
        width: 224,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* Logo */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(124,92,252,0.25)',
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <polygon points="3,2 13,7.5 3,13" fill="white" opacity="0.95"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              起哥的AI实战
            </div>
            {(saveError || saving) && (
              <div style={{
                fontSize: 11, marginTop: 1,
                color: saveError ? 'var(--danger)' : 'var(--text-tertiary)',
              }}>
                {saveError ? '保存失败' : '保存中…'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 12px', flexShrink: 0 }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: 8, overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: isActive ? 550 : 420,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-subtle)' : 'transparent',
              textDecoration: 'none',
              transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
              marginBottom: 1,
              letterSpacing: '-0.01em',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              if (!el.getAttribute('aria-current')) {
                el.style.background = 'var(--bg-hover)'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              if (!el.getAttribute('aria-current')) {
                el.style.background = 'transparent'
              }
            }}
          >
            <span style={{ opacity: 0.7, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '8px 8px 12px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 420, letterSpacing: '-0.01em',
            color: 'var(--text-secondary)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-hover)'
            el.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'transparent'
            el.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ opacity: 0.7, flexShrink: 0, display: 'flex' }}>
            {theme === 'dark' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15"/><line x1="1" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15" y2="8"/><line x1="3.05" y1="3.05" x2="4.1" y2="4.1"/><line x1="11.9" y1="11.9" x2="12.95" y2="12.95"/><line x1="3.05" y1="12.95" x2="4.1" y2="11.9"/><line x1="11.9" y1="4.1" x2="12.95" y2="3.05"/></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 9.5A6.5 6.5 0 016.5 2 6.5 6.5 0 1014 9.5z"/></svg>
            )}
          </span>
          {theme === 'dark' ? '浅色模式' : '深色模式'}
        </button>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: isActive ? 550 : 420,
            letterSpacing: '-0.01em',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-subtle)' : 'transparent',
            textDecoration: 'none',
            transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
          })}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            if (!el.getAttribute('aria-current')) {
              el.style.background = 'var(--bg-hover)'
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            if (!el.getAttribute('aria-current')) {
              el.style.background = 'transparent'
            }
          }}
        >
          <span style={{ opacity: 0.7, flexShrink: 0, display: 'flex' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2"/>
              <path d="M14 8c0-.35-.03-.7-.09-1.03l1.6-1.25-1.5-2.6-1.9.77a5.2 5.2 0 00-1.78-1.03L9.9 1H6.1l-.43 1.86A5.2 5.2 0 003.9 3.9l-1.9-.78-1.5 2.6 1.6 1.25A5.3 5.3 0 002 8c0 .35.03.7.09 1.03L.5 10.28l1.5 2.6 1.9-.77c.53.43 1.12.77 1.78 1.03L6.1 15h3.8l.43-1.86a5.2 5.2 0 001.78-1.03l1.9.78 1.5-2.6-1.6-1.25C13.97 8.7 14 8.35 14 8z"/>
            </svg>
          </span>
          设置
        </NavLink>
      </div>
    </aside>
  )
}
