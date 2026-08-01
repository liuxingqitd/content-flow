import { NavLink } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

const NAV_GROUPS = [
  {
    label: '工作台',
    items: [
      {
        path: '/dashboard', label: '概览',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5"><path d="M2 2.5h5v5H2zM9 2.5h5v3H9zM2 9.5h5v4H2zM9 7.5h5v6H9z" strokeLinejoin="round"/></svg>,
      },
      {
        path: '/kanban', label: '内容看板',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5"><path d="M2 2.5h3.5v11H2zM6.25 2.5h3.5v7H6.25zM10.5 2.5H14v5h-3.5z" strokeLinejoin="round"/></svg>,
      },
    ],
  },
  {
    label: '内容资产',
    items: [
      {
        path: '/topics', label: '选题库',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.6 3.2 3.5.5-2.55 2.48.6 3.5L8 10.05l-3.15 1.63.6-3.5L2.9 5.7l3.5-.5z"/></svg>,
      },
      {
        path: '/scripts', label: '逐字稿',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h10v12H3z" strokeLinejoin="round"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3.5"/></svg>,
      },
      {
        path: '/videos', label: '视频库',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="9" height="10" rx="1"/><path d="M11 6l3-1.5v7L11 10z"/></svg>,
      },
    ],
  },
  {
    label: '经营分析',
    items: [
      {
        path: '/analytics', label: '数据分析',
        icon: <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13V8.5M6 13V5M10 13V7M14 13V2.5"/></svg>,
      },
    ],
  },
]

const ThemeIcon = ({ dark }: { dark: boolean }) => dark ? (
  <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05 4.1 4.1M11.9 11.9l1.05 1.05M3.05 12.95 4.1 11.9M11.9 4.1l1.05-1.05"/></svg>
) : (
  <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13.8 9.4A6 6 0 0 1 6.6 2.2a6 6 0 1 0 7.2 7.2Z"/></svg>
)

const SettingsIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2"/><path d="M13.5 8c0-.35-.03-.68-.1-1l1.15-.9-1.2-2.05-1.35.55a5.5 5.5 0 0 0-1.7-1L10 2.1H6l-.3 1.5a5.5 5.5 0 0 0-1.7 1l-1.35-.55-1.2 2.05L2.6 7a5 5 0 0 0 0 2l-1.15.9 1.2 2.05L4 11.4a5.5 5.5 0 0 0 1.7 1l.3 1.5h4l.3-1.5a5.5 5.5 0 0 0 1.7-1l1.35.55 1.2-2.05L13.4 9c.07-.32.1-.65.1-1Z"/></svg>
)

export function Sidebar() {
  const saving = useAppStore(s => s.saving)
  const saveError = useAppStore(s => s.error?.startsWith('保存失败') ? s.error : null)
  const theme = useAppStore(s => s.data?.settings.theme ?? 'light')
  const updateSettings = useAppStore(s => s.updateSettings)

  const saveLabel = saveError ? '保存失败' : saving ? '正在保存' : '所有更改已保存'
  const saveClass = saveError ? 'error' : saving ? 'saving' : ''

  return (
    <aside className="app-sidebar" aria-label="主导航">
      <div className="sidebar-brand">
        <div className="sidebar-mark" aria-hidden="true">CF</div>
        <div className="sidebar-brand-copy">
          <div className="sidebar-product">ContentFlow</div>
          <div className="sidebar-workspace">起哥的 AI 实战</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map(group => (
          <div className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-nav-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className={`sidebar-save-state ${saveClass}`.trim()} title={saveError ?? saveLabel}>
          <span className="sidebar-save-dot" />
          <span>{saveLabel}</span>
        </div>
        <button
          type="button"
          className="sidebar-footer-action"
          onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        >
          <span className="sidebar-nav-icon"><ThemeIcon dark={theme === 'dark'} /></span>
          {theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
        </button>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-footer-action${isActive ? ' active' : ''}`}>
          <span className="sidebar-nav-icon"><SettingsIcon /></span>
          设置
        </NavLink>
      </div>
    </aside>
  )
}
