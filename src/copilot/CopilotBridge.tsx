import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAgentContext, useConfigureSuggestions, useFrontendTool, useHumanInTheLoop } from '@copilotkit/react-core/v2'
import { z } from 'zod'
import { useAppStore } from '@/store/appStore'
import { listScriptMarkdownDocuments, readScriptContent } from '@/services/fileSystem'
import { buildPageAgentContext, resolveCurrentScriptId } from './context'
import { Button } from '@/components/ui/Button'
import { searchVaultScripts } from './vaultSearch'
import { useCopilotPageFocus } from './pageFocus'

const MAX_SEARCH_RESULTS = 12

export function CopilotBridge() {
  const location = useLocation()
  const data = useAppStore(state => state.data)
  const addTopic = useAppStore(state => state.addTopic)
  const setPageContext = useCopilotPageFocus()?.setPageContext
  const pageContext = useMemo(
    () => data ? buildPageAgentContext(location.pathname, data) : null,
    [data, location.pathname],
  )

  useAgentContext({
    description: 'ContentFlow 当前页面与最小必要业务上下文',
    value: pageContext ? JSON.parse(JSON.stringify(pageContext)) : null,
  })

  useEffect(() => {
    setPageContext?.(pageContext)
  }, [pageContext, setPageContext])

  const suggestions = useMemo(() => {
    if (pageContext?.currentScript) {
      return [
        { title: '总结当前稿件', message: '请读取并总结当前稿件，列出核心观点和结构。' },
        { title: '搜索相似稿件', message: '请搜索 Vault 中与当前稿件主题相似的历史逐字稿。' },
        { title: '优化开头', message: '请读取当前稿件，分析开头并给出三个优化方案。' },
        { title: '优化标题', message: '请读取当前稿件，判断现有标题是否有爆款潜力，说明依据并给出2到3个不超过20字符的修改版本。' },
      ]
    }
    return [
      { title: '总结当前页面', message: '请总结当前页面能看到的内容和可执行的操作。' },
      { title: '搜索历史稿件', message: '请帮我在逐字稿 Vault 中搜索相关内容。' },
    ]
  }, [pageContext?.currentScript])

  useConfigureSuggestions({ suggestions, available: 'before-first-message' }, [suggestions])

  useFrontendTool(
    {
      name: 'get_current_page_context',
      description: '读取用户当前所在页面和当前聚焦内容的摘要。',
      parameters: z.object({}),
      handler: async () => pageContext,
    },
    [pageContext],
  )

  useFrontendTool(
    {
      name: 'search_content',
      description: '按标题搜索 ContentFlow 中的视频、选题和逐字稿。结果最多返回 12 条。',
      parameters: z.object({ query: z.string().min(1) }),
      handler: async ({ query }) => {
        if (!data) return []
        const normalized = query.trim().toLocaleLowerCase()
        return [
          ...data.videos.map(item => ({ type: 'video', id: item.id, title: item.title, status: item.status })),
          ...data.topics.map(item => ({ type: 'topic', id: item.id, title: item.title, status: item.status })),
          ...data.scripts.map(item => ({ type: 'script', id: item.id, title: item.title, version: item.version })),
        ].filter(item => item.title.toLocaleLowerCase().includes(normalized)).slice(0, MAX_SEARCH_RESULTS)
      },
    },
    [data],
  )

  useFrontendTool(
    {
      name: 'get_video_details',
      description: '按视频 ID 读取视频详情、关联内容、平台状态和已录入指标。',
      parameters: z.object({ videoId: z.string().min(1) }),
      handler: async ({ videoId }) => {
        if (!data) return { error: '数据尚未加载' }
        const video = data.videos.find(item => item.id === videoId)
        if (!video) return { error: '视频不存在' }
        return {
          video,
          topic: data.topics.find(item => item.id === video.topicId),
          script: data.scripts.find(item => item.id === video.scriptId),
          metrics: data.metrics.filter(item => item.videoId === video.id),
        }
      },
    },
    [data],
  )

  useFrontendTool({
    name: 'read_current_script',
    description: '读取当前逐字稿页面或当前视频所关联逐字稿的完整 Markdown 正文。总结、分析或改写当前稿件前必须调用。',
    parameters: z.object({}),
    handler: async () => {
      if (!data) return { error: '数据尚未加载' }
      const scriptId = resolveCurrentScriptId(location.pathname, data)
      if (!scriptId) return { error: '当前页面没有关联逐字稿' }
      const content = await readScriptContent(scriptId)
      if (!content.trim()) return { error: '当前逐字稿正文文件不存在或为空', scriptId }
      const script = data.scripts.find(item => item.id === scriptId)
      return { scriptId, title: script?.title ?? pageContext?.focusedEntity?.title ?? scriptId, content }
    },
  }, [data, location.pathname, pageContext])

  useFrontendTool({
    name: 'search_vault_scripts',
    description: '在 Obsidian Vault 的 scripts/*.md 中搜索历史逐字稿，返回最多 8 条标题和命中片段。',
    parameters: z.object({ query: z.string().min(1) }),
    handler: async ({ query }) => {
      if (!data) return []
      const documents = await listScriptMarkdownDocuments()
      return searchVaultScripts(documents, data.scripts, query)
    },
  }, [data])

  useFrontendTool({
    name: 'get_script_content',
    description: '按逐字稿 ID 读取 Vault 中的完整 Markdown 正文。可读取搜索发现但尚未进入 scripts.json 索引的稿件。',
    parameters: z.object({ scriptId: z.string().regex(/^script_[A-Za-z0-9_-]+$/) }),
    handler: async ({ scriptId }) => {
      const script = data?.scripts.find(item => item.id === scriptId)
      const content = await readScriptContent(scriptId)
      if (!content.trim()) return { error: '逐字稿正文文件不存在或为空', scriptId }
      const markdownTitle = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
      return { id: scriptId, title: script?.title ?? markdownTitle ?? scriptId, content }
    },
  }, [data])

  useFrontendTool({
    name: 'get_analytics_summary',
    description: '读取各平台内容数据的聚合摘要，不返回完整原始记录。',
    parameters: z.object({}),
    handler: async () => {
      if (!data) return { error: '数据尚未加载' }
      const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
      return {
        douyin: {
          records: data.douyinRecords.length,
          plays: sum(data.douyinRecords.map(item => item.plays)),
          likes: sum(data.douyinRecords.map(item => item.likes)),
          shares: sum(data.douyinRecords.map(item => item.shares)),
          comments: sum(data.douyinRecords.map(item => item.comments)),
        },
        xiaohongshu: {
          records: data.xiaohongshuRecords.length,
          views: sum(data.xiaohongshuRecords.map(item => item.views)),
          likes: sum(data.xiaohongshuRecords.map(item => item.likes)),
          saves: sum(data.xiaohongshuRecords.map(item => item.saves)),
          comments: sum(data.xiaohongshuRecords.map(item => item.comments)),
        },
        shipinhao: {
          records: data.shipinhaoRecords.length,
          plays: sum(data.shipinhaoRecords.map(item => item.plays)),
          likes: sum(data.shipinhaoRecords.map(item => item.likes)),
          shares: sum(data.shipinhaoRecords.map(item => item.shares)),
          comments: sum(data.shipinhaoRecords.map(item => item.comments)),
        },
      }
    },
  }, [data])

  useHumanInTheLoop({
    name: 'create_topic_draft',
    description: '创建一个新的选题草稿。必须展示预览并由用户确认后才会真正创建。',
    parameters: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      inspiration: z.string().optional(),
    }),
    render: ({ status, args, respond }) => (
      <div style={{
        padding: 14,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>待确认的新选题</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{args.title}</div>
        {args.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{args.description}</p>}
        {args.inspiration && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>灵感：{args.inspiration}</p>}
        {status === 'executing' && respond && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button
              size="sm"
              onClick={() => {
                addTopic({
                  title: args.title.trim(),
                  description: args.description?.trim() || undefined,
                  inspiration: args.inspiration?.trim() || undefined,
                  status: 'inspiration',
                  tagIds: [],
                })
                respond({ approved: true, message: '选题草稿已创建' })
              }}
            >
              确认创建
            </Button>
            <Button variant="secondary" size="sm" onClick={() => respond({ approved: false, message: '用户取消创建' })}>
              取消
            </Button>
          </div>
        )}
      </div>
    ),
  })

  return null
}
