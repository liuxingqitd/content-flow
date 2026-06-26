import type { AppData } from '@/types'

export type AgentPageType =
  | 'dashboard'
  | 'kanban'
  | 'videos'
  | 'video-detail'
  | 'topics'
  | 'scripts'
  | 'analytics'
  | 'settings'
  | 'unknown'

export interface PageAgentContext {
  route: string
  pageType: AgentPageType
  pageTitle: string
  contextRevision: string
  focusedEntity?: {
    type: 'video' | 'script'
    id: string
    title: string
    updatedAt: string
  }
  currentScript?: {
    id: string
    title: string
    videoId?: string
  }
  summary: Record<string, unknown>
}

const PAGE_TITLES: Record<AgentPageType, string> = {
  dashboard: '概览',
  kanban: '内容看板',
  videos: '视频库',
  'video-detail': '视频详情',
  topics: '选题库',
  scripts: '逐字稿',
  analytics: '数据分析',
  settings: '设置',
  unknown: '未知页面',
}

export function pageTypeFromRoute(route: string): AgentPageType {
  if (route === '/dashboard') return 'dashboard'
  if (route === '/kanban') return 'kanban'
  if (route === '/videos') return 'videos'
  if (route.startsWith('/videos/')) return 'video-detail'
  if (route === '/topics') return 'topics'
  if (route === '/scripts' || route.startsWith('/scripts/')) return 'scripts'
  if (route === '/analytics') return 'analytics'
  if (route === '/settings') return 'settings'
  return 'unknown'
}

export function resolveCurrentScript(route: string, data: AppData) {
  const pageType = pageTypeFromRoute(route)
  const entityId = route.split('/')[2]

  if (pageType === 'scripts' && entityId) {
    return data.scripts.find(item => item.id === entityId)
  }

  if (pageType === 'video-detail' && entityId) {
    const video = data.videos.find(item => item.id === entityId)
    if (!video) return undefined
    return video.scriptId
      ? data.scripts.find(item => item.id === video.scriptId)
      : data.scripts.find(item => item.videoId === video.id)
  }
}

export function resolveCurrentScriptId(route: string, data: AppData) {
  const pageType = pageTypeFromRoute(route)
  const entityId = route.split('/')[2]
  if (pageType === 'scripts') return entityId
  if (pageType !== 'video-detail' || !entityId) return undefined
  const video = data.videos.find(item => item.id === entityId)
  return video?.scriptId ?? data.scripts.find(item => item.videoId === entityId)?.id
}

export function buildPageAgentContext(route: string, data: AppData): PageAgentContext {
  const pageType = pageTypeFromRoute(route)
  const entityId = route.split('/')[2]
  const currentScript = resolveCurrentScript(route, data)
  const currentScriptId = resolveCurrentScriptId(route, data)

  const base: PageAgentContext = {
    route,
    pageType,
    pageTitle: PAGE_TITLES[pageType],
    contextRevision: `${route}:${currentScript?.updatedAt ?? 'list'}`,
    currentScript: currentScript
      ? { id: currentScript.id, title: currentScript.title, videoId: currentScript.videoId }
      : currentScriptId
        ? { id: currentScriptId, title: currentScriptId }
        : undefined,
    summary: {
      videos: data.videos.length,
      topics: data.topics.length,
      scripts: data.scripts.length,
      tags: data.tags.map(tag => tag.name),
    },
  }

  if (pageType === 'video-detail' && entityId) {
    const video = data.videos.find(item => item.id === entityId)
    if (video) {
      const relatedScript = currentScript ?? (video.scriptId
        ? { id: video.scriptId, title: video.title, videoId: video.id }
        : undefined)
      base.focusedEntity = {
        type: 'video',
        id: video.id,
        title: video.title,
        updatedAt: video.updatedAt,
      }
      base.summary = {
        status: video.status,
        description: video.description,
        platforms: video.platforms.map(item => ({
          platform: item.platform,
          status: item.status,
          publishedAt: item.publishedAt,
        })),
        tagIds: video.tagIds,
        scriptId: relatedScript?.id,
        topicId: video.topicId,
      }
      base.currentScript = relatedScript
      base.contextRevision = `${route}:${video.updatedAt}:${relatedScript?.id ?? 'no-script'}`
    }
  }

  if (pageType === 'scripts' && entityId) {
    const script = data.scripts.find(item => item.id === entityId)
    if (script) {
      base.focusedEntity = {
        type: 'script',
        id: script.id,
        title: script.title,
        updatedAt: script.updatedAt,
      }
      base.summary = {
        wordCount: script.wordCount,
        version: script.version,
        videoId: script.videoId,
        topicId: script.topicId,
        tagIds: script.tagIds,
      }
      base.contextRevision = `${route}:${script.updatedAt}`
    }
  }

  if (pageType === 'analytics') {
    base.summary = {
      douyinRecords: data.douyinRecords.length,
      xiaohongshuRecords: data.xiaohongshuRecords.length,
      shipinhaoRecords: data.shipinhaoRecords.length,
      metrics: data.metrics.length,
    }
  }

  if (pageType === 'settings') {
    base.summary = {
      theme: data.settings.theme,
      tags: data.tags.map(tag => tag.name),
      defaultPlatforms: data.settings.defaultPlatforms,
    }
  }

  return base
}
