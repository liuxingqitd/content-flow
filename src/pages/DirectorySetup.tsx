import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { pickDirectory, isFileSystemSupported, isSecureContext } from '@/services/fileSystem'
import { useAppStore } from '@/store/appStore'
import { isTauriRuntime } from '@/utils/api'

export function DirectorySetup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadData = useAppStore(s => s.loadData)
  const isDesktop = isTauriRuntime()

  const handlePick = async () => {
    if (!isSecureContext()) {
      setError('当前不在安全上下文中（需要 localhost 或 HTTPS）。Docker 部署时请通过 http://localhost:5174 访问，而非 IP 地址。')
      return
    }
    if (!isFileSystemSupported()) {
      setError('您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。')
      return
    }
    setLoading(true)
    setError('')
    try {
      await pickDirectory()
      await loadData()
      // 如果 loadData 完成后 data 仍为 null，说明有错误，读取 store error
      const storeError = useAppStore.getState().error
      if (storeError) {
        setError(`加载数据失败：${storeError}`)
      }
    } catch (e) {
      const err = e as Error
      if (err.name !== 'AbortError') {
        setError(`选择目录失败：${err.message || '请重试'}`)
        console.error('[DirectorySetup] pick failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 24,
      background: 'var(--bg-root)',
    }}>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center',
        padding: '32px 32px 28px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        boxShadow: 'none',
      }}>
        {/* Logo */}
        <div style={{
          width: 42, height: 42, borderRadius: 'var(--radius-lg)',
          background: 'var(--text-primary)', color: 'var(--text-inverse)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          border: '1px solid var(--border-strong)', fontSize: 13, fontWeight: 750,
        }}>
          CF
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 5 }}>设置 ContentFlow</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
          选择一个本地文件夹作为数据目录，<br />
          您的所有数据将安全地存储在本地。
        </p>

        {/* Steps */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          marginBottom: 20, textAlign: 'left',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-raised)',
          overflow: 'hidden',
        }}>
          {['选择或新建一个专属的本地文件夹', '所有数据以 JSON 和 Markdown 格式保存', '随时备份、迁移，完全掌控'].map((text, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderBottom: i < 2 ? '1px solid var(--border-faint)' : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        <Button variant="primary" size="lg" loading={loading} onClick={handlePick} style={{ width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.5 10v2.5a1 1 0 001 1h11a1 1 0 001-1V10M8 1.5v8M5 5.5l3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          选择数据目录
        </Button>

        {error && (
          <p style={{
            fontSize: 12, color: 'var(--danger)', marginTop: 12,
            padding: '8px 10px', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.08)',
            textAlign: 'left', lineHeight: 1.6,
          }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16 }}>
          {isDesktop ? '桌面客户端使用原生文件访问能力' : '需要 Chrome 86+ 或 Edge 86+ 以上版本'}
        </p>
      </div>
    </div>
  )
}
