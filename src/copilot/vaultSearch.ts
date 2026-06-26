import type { ScriptMarkdownDocument } from '@/services/fileSystem'
import type { Script } from '@/types'

const DEFAULT_RESULT_LIMIT = 8
const SNIPPET_RADIUS = 80

export interface VaultScriptSearchResult {
  scriptId: string
  title: string
  videoId?: string
  snippet: string
  updatedAt: string
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

const markdownTitle = (content: string, fallback: string) =>
  content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback

function buildSnippet(content: string, normalizedQuery: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  const index = normalize(compact).indexOf(normalizedQuery)
  if (index < 0) return compact.slice(0, SNIPPET_RADIUS * 2)
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(compact.length, index + normalizedQuery.length + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${compact.slice(start, end)}${end < compact.length ? '…' : ''}`
}

export function searchVaultScripts(
  documents: ScriptMarkdownDocument[],
  scripts: Script[],
  query: string,
  limit = DEFAULT_RESULT_LIMIT,
): VaultScriptSearchResult[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  const scriptIndex = new Map(scripts.map(script => [script.id, script]))

  return documents
    .map(document => {
      const indexed = scriptIndex.get(document.scriptId)
      const title = indexed?.title || markdownTitle(document.content, document.scriptId)
      const titleIndex = normalize(title).indexOf(normalizedQuery)
      const contentIndex = normalize(document.content).indexOf(normalizedQuery)
      if (titleIndex < 0 && contentIndex < 0) return null
      return {
        score: (titleIndex === 0 ? 4 : titleIndex > 0 ? 2 : 1) + (indexed ? 1 : 0),
        result: {
          scriptId: document.scriptId,
          title,
          videoId: indexed?.videoId,
          snippet: buildSnippet(document.content, normalizedQuery),
          updatedAt: document.updatedAt,
        },
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score || b.result.updatedAt.localeCompare(a.result.updatedAt))
    .slice(0, Math.max(1, Math.min(limit, DEFAULT_RESULT_LIMIT)))
    .map(item => item.result)
}
