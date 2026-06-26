import { useEffect, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { DirectorySetup } from '@/pages/DirectorySetup'
import { useAppStore } from '@/store/appStore'
import { getDirectoryHandle } from '@/services/fileSystem'
import { CopilotGate } from '@/copilot/CopilotGate'
import { useCopilotProviderReady } from '@/copilot/providerReadyContext'

const CopilotBridge = lazy(() => import('@/copilot/CopilotBridge').then(m => ({ default: m.CopilotBridge })))
const Dashboard   = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Kanban      = lazy(() => import('@/pages/Kanban').then(m => ({ default: m.Kanban })))
const Videos      = lazy(() => import('@/pages/Videos').then(m => ({ default: m.Videos })))
const VideoDetail = lazy(() => import('@/pages/Videos/VideoDetail').then(m => ({ default: m.VideoDetail })))
const Topics      = lazy(() => import('@/pages/Topics').then(m => ({ default: m.Topics })))
const Scripts     = lazy(() => import('@/pages/Scripts').then(m => ({ default: m.Scripts })))
const Analytics   = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })))
const Settings    = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppShell() {
  const copilotProviderReady = useCopilotProviderReady()

  return (
    <div className="app-shell">
      {copilotProviderReady && (
        <Suspense fallback={null}>
          <CopilotBridge />
        </Suspense>
      )}
      <Sidebar />
      <main className="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard',   element: <Dashboard /> },
      { path: '/kanban',      element: <Kanban /> },
      { path: '/videos',      element: <Videos /> },
      { path: '/videos/:id',  element: <VideoDetail /> },
      { path: '/topics',      element: <Topics /> },
      { path: '/scripts',     element: <Scripts /> },
      { path: '/scripts/:id', element: <Scripts /> },
      { path: '/analytics',   element: <Analytics /> },
      { path: '/settings',    element: <Settings /> },
    ],
  },
])

export function App() {
  const { data, loading, error } = useAppStore()
  const theme = useAppStore(s => s.data?.settings.theme ?? 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    getDirectoryHandle().then(handle => {
      if (handle) useAppStore.getState().loadData()
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">加载数据中…</p>
        </div>
      </div>
    )
  }

  if (error && error !== 'NO_DIRECTORY') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return <DirectorySetup />

  return (
    <CopilotGate>
      <RouterProvider router={router} />
    </CopilotGate>
  )
}
