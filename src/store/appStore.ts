import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { AppData, Video, Topic, Script, Tag, VideoMetrics, AppSettings, VideoStatus, Platform, PlatformPublish, TransitionKey, DouyinRawRecord, ShipinhaoRawRecord, XiaohongshuRawRecord, VideoRelation } from '@/types'
import { now } from '@/utils/date'
import { videoId, topicId, scriptId, tagId, metricId, checklistItemId, videoRelationId } from '@/utils/id'
import { readAppData, writeAppData } from '@/services/fileSystem'

interface AppState {
  data: AppData | null
  loading: boolean
  saving: boolean
  error: string | null

  // Lifecycle
  loadData: () => Promise<void>
  saveData: () => Promise<void>

  // Videos
  addVideo: (v: Omit<Video, 'id' | 'statusHistory' | 'createdAt' | 'updatedAt'>) => void
  updateVideo: (id: string, patch: Partial<Video>) => void
  deleteVideo: (id: string) => void
  moveVideo: (id: string, status: VideoStatus) => void
  updateVideoCover: (id: string, orientation: 'portrait' | 'landscape', ext: string | undefined) => void

  // Video relations
  addVideoRelation: (fromVideoId: string, toVideoId: string, note?: string) => void
  updateVideoRelation: (id: string, note: string | undefined) => void
  deleteVideoRelation: (id: string) => void

  // Topics
  addTopic: (t: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTopic: (id: string, patch: Partial<Topic>) => void
  deleteTopic: (id: string) => void
  adoptTopic: (id: string) => void
  abandonTopic: (id: string) => void
  linkTopicToVideo: (topicId: string, videoId: string) => void

  // Scripts
  addScript: (s: Omit<Script, 'id' | 'version' | 'createdAt' | 'updatedAt'>) => void
  updateScript: (id: string, patch: Partial<Script>) => void
  deleteScript: (id: string) => void

  // Tags
  addTag: (t: Omit<Tag, 'id' | 'createdAt'>) => void
  updateTag: (id: string, patch: Partial<Tag>) => void
  deleteTag: (id: string) => void

  // Platform entries
  setPlatformEntry: (videoId: string, platform: Platform, entry: Omit<PlatformPublish, 'platform'> | null) => void
  updatePlatformPublishedAt: (videoId: string, platform: Platform, publishedAt: string) => void
  updatePromotionCost: (videoId: string, platform: Platform, cost: number | undefined) => void

  // Metrics
  addMetric: (m: Omit<VideoMetrics, 'id' | 'recordedAt'>) => void
  deleteMetric: (id: string) => void

  // ChecklistItems
  addChecklistItem: (text: string) => void
  updateChecklistItem: (id: string, text: string) => void
  deleteChecklistItem: (id: string) => void

  // TransitionChecklists
  addTransitionChecklistItem: (key: TransitionKey, text: string) => void
  updateTransitionChecklistItem: (key: TransitionKey, id: string, text: string) => void
  deleteTransitionChecklistItem: (key: TransitionKey, id: string) => void

  // Platform raw records
  setDouyinRecords: (records: DouyinRawRecord[]) => void
  setShipinhaoRecords: (records: ShipinhaoRawRecord[]) => void
  setXiaohongshuRecords: (records: XiaohongshuRawRecord[]) => void
  deleteDouyinRecord: (id: string) => void
  deleteShipinhaoRecord: (id: string) => void
  deleteXiaohongshuRecord: (id: string) => void

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave = false

const scheduleSave = (getState: () => AppState) => {
  pendingSave = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    pendingSave = false
    getState().saveData()
  }, 600)
}

const isSameVideoPair = (relation: VideoRelation, a: string, b: string) =>
  (relation.fromVideoId === a && relation.toVideoId === b) ||
  (relation.fromVideoId === b && relation.toVideoId === a)

const syncLinkedTitles = (
  data: AppData,
  source: { type: 'video' | 'topic' | 'script'; id: string },
  title: string,
  updatedAt: string,
) => {
  let video = source.type === 'video' ? data.videos.find(v => v.id === source.id) : undefined
  let topic = source.type === 'topic' ? data.topics.find(t => t.id === source.id) : undefined
  let script = source.type === 'script' ? data.scripts.find(sc => sc.id === source.id) : undefined

  if (video) {
    const currentVideo = video
    topic = currentVideo.topicId
      ? data.topics.find(t => t.id === currentVideo.topicId)
      : data.topics.find(t => t.linkedVideoId === currentVideo.id)
    script = currentVideo.scriptId
      ? data.scripts.find(sc => sc.id === currentVideo.scriptId)
      : data.scripts.find(sc => sc.videoId === currentVideo.id)
  }

  if (topic) {
    const currentTopic = topic
    if (!video) {
      video = currentTopic.linkedVideoId
        ? data.videos.find(v => v.id === currentTopic.linkedVideoId)
        : data.videos.find(v => v.topicId === currentTopic.id)
    }
    if (!script) {
      const currentVideo = video
      script = currentVideo?.scriptId
        ? data.scripts.find(sc => sc.id === currentVideo.scriptId)
        : currentVideo
          ? data.scripts.find(sc => sc.videoId === currentVideo.id) ?? data.scripts.find(sc => sc.topicId === currentTopic.id)
          : data.scripts.find(sc => sc.topicId === currentTopic.id)
    }
  }

  if (script) {
    const currentScript = script
    if (!video) {
      video = currentScript.videoId
        ? data.videos.find(v => v.id === currentScript.videoId)
        : data.videos.find(v => v.scriptId === currentScript.id)
    }
    if (!topic) {
      const currentVideo = video
      topic = currentScript.topicId
        ? data.topics.find(t => t.id === currentScript.topicId)
        : currentVideo?.topicId
          ? data.topics.find(t => t.id === currentVideo.topicId)
          : currentVideo
            ? data.topics.find(t => t.linkedVideoId === currentVideo.id)
            : undefined
    }
  }

  if (video && video.title !== title) {
    video.title = title
    video.updatedAt = updatedAt
  }

  if (topic && topic.title !== title) {
    topic.title = title
    topic.updatedAt = updatedAt
  }

  if (script && script.title !== title) {
    script.title = title
    script.updatedAt = updatedAt
  }
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    data: null,
    loading: false,
    saving: false,
    error: null,

    loadData: async () => {
      set(s => { s.loading = true; s.error = null })
      try {
        const data = await readAppData()
        set(s => { s.data = data; s.loading = false })
        document.documentElement.setAttribute('data-theme', data.settings.theme)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        set(s => { s.loading = false; s.error = msg })
      }
    },

    saveData: async () => {
      const { data } = get()
      if (!data) return
      set(s => { s.saving = true; s.error = null })
      try {
        await writeAppData(data)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        set(s => { s.error = `保存失败：${msg}` })
      } finally {
        set(s => { s.saving = false })
      }
    },

    // ---- Videos ----
    addVideo: (v) => {
      set(s => {
        if (!s.data) return
        const id = videoId()
        s.data.videos.push({
          ...v,
          id,
          statusHistory: [{ status: v.status, changedAt: now() }],
          createdAt: now(),
          updatedAt: now(),
        })
      })
      scheduleSave(get)
    },

    updateVideo: (id, patch) => {
      set(s => {
        if (!s.data) return
        const idx = s.data.videos.findIndex(v => v.id === id)
        if (idx === -1) return
        const updatedAt = now()
        const video = s.data.videos[idx]
        const previousTopicId = video.topicId
        const previousScriptId = video.scriptId
        Object.assign(video, patch, { updatedAt })
        if (
          typeof patch.title === 'string' ||
          Object.prototype.hasOwnProperty.call(patch, 'topicId') ||
          Object.prototype.hasOwnProperty.call(patch, 'scriptId')
        ) {
          if (previousTopicId && previousTopicId !== video.topicId) {
            const previousTopic = s.data.topics.find(t => t.id === previousTopicId)
            if (previousTopic?.linkedVideoId === id) {
              delete previousTopic.linkedVideoId
              previousTopic.updatedAt = updatedAt
            }
          }
          if (video.topicId) {
            const nextTopic = s.data.topics.find(t => t.id === video.topicId)
            if (nextTopic && nextTopic.linkedVideoId !== id) {
              nextTopic.linkedVideoId = id
              nextTopic.updatedAt = updatedAt
            }
          }

          if (previousScriptId && previousScriptId !== video.scriptId) {
            const previousScript = s.data.scripts.find(sc => sc.id === previousScriptId)
            if (previousScript?.videoId === id) {
              delete previousScript.videoId
              previousScript.updatedAt = updatedAt
            }
          }
          if (video.scriptId) {
            const nextScript = s.data.scripts.find(sc => sc.id === video.scriptId)
            if (nextScript && nextScript.videoId !== id) {
              nextScript.videoId = id
              nextScript.updatedAt = updatedAt
            }
          }

          syncLinkedTitles(s.data, { type: 'video', id }, video.title, updatedAt)
        }
      })
      scheduleSave(get)
    },

    updateVideoCover: (id, orientation, ext) => {
      set(s => {
        if (!s.data) return
        const v = s.data.videos.find(v => v.id === id)
        if (!v) return
        if (orientation === 'portrait') {
          if (ext) v.coverPortrait = ext; else delete v.coverPortrait
        } else {
          if (ext) v.coverLandscape = ext; else delete v.coverLandscape
        }
        v.updatedAt = now()
      })
      get().saveData()
    },

    addVideoRelation: (fromVideoId, toVideoId, note) => {
      set(s => {
        if (!s.data) return
        if (fromVideoId === toVideoId) return
        const fromVideo = s.data.videos.find(v => v.id === fromVideoId)
        const toVideo = s.data.videos.find(v => v.id === toVideoId)
        if (!fromVideo || !toVideo) return
        if (s.data.videoRelations.some(r => isSameVideoPair(r, fromVideoId, toVideoId))) return

        const timestamp = now()
        const trimmedNote = note?.trim()
        s.data.videoRelations.push({
          id: videoRelationId(),
          fromVideoId,
          toVideoId,
          note: trimmedNote || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      })
      scheduleSave(get)
    },

    updateVideoRelation: (id, note) => {
      set(s => {
        if (!s.data) return
        const relation = s.data.videoRelations.find(r => r.id === id)
        if (!relation) return
        const trimmedNote = note?.trim()
        if (trimmedNote) {
          relation.note = trimmedNote
        } else {
          delete relation.note
        }
        relation.updatedAt = now()
      })
      scheduleSave(get)
    },

    deleteVideoRelation: (id) => {
      set(s => {
        if (!s.data) return
        s.data.videoRelations = s.data.videoRelations.filter(r => r.id !== id)
      })
      scheduleSave(get)
    },

    deleteVideo: (id) => {
      set(s => {
        if (!s.data) return
        const video = s.data.videos.find(v => v.id === id)
        if (video) {
          const topic = s.data.topics.find(t => t.id === video.topicId || t.linkedVideoId === video.id)
          if (topic && topic.status === 'in_progress') {
            topic.status = 'adopted'
            topic.updatedAt = now()
          }
        }
        s.data.videos = s.data.videos.filter(v => v.id !== id)
        s.data.videoRelations = s.data.videoRelations.filter(
          r => r.fromVideoId !== id && r.toVideoId !== id,
        )
      })
      scheduleSave(get)
    },

    moveVideo: (id, status) => {
      set(s => {
        if (!s.data) return
        const v = s.data.videos.find(v => v.id === id)
        if (!v) return
        const updatedAt = now()
        v.status = status
        v.statusHistory.push({ status, changedAt: updatedAt })
        v.updatedAt = updatedAt
        if (status === 'scripting' && !v.scriptId) {
          const sid = scriptId()
          s.data.scripts.push({
            id: sid,
            videoId: v.id,
            topicId: v.topicId,
            title: v.title,
            wordCount: 0,
            estimatedDuration: 0,
            tagIds: [],
            version: 1,
            createdAt: updatedAt,
            updatedAt,
          })
          v.scriptId = sid
        }
        if (status === 'published') {
          const topic = s.data.topics.find(t => t.id === v.topicId || t.linkedVideoId === v.id)
          if (topic && topic.status === 'in_progress') {
            topic.status = 'done'
            topic.updatedAt = updatedAt
            // 修复断链：同步双向引用
            if (!v.topicId) v.topicId = topic.id
            if (!topic.linkedVideoId) topic.linkedVideoId = v.id
            syncLinkedTitles(s.data, { type: 'video', id: v.id }, v.title, updatedAt)
          }
        }
      })
      scheduleSave(get)
    },

    // ---- Topics ----
    addTopic: (t) => {
      set(s => {
        if (!s.data) return
        s.data.topics.push({ ...t, id: topicId(), createdAt: now(), updatedAt: now() })
      })
      scheduleSave(get)
    },

    updateTopic: (id, patch) => {
      set(s => {
        if (!s.data) return
        const idx = s.data.topics.findIndex(t => t.id === id)
        if (idx === -1) return
        const updatedAt = now()
        const topic = s.data.topics[idx]
        const previousLinkedVideoId = topic.linkedVideoId
        Object.assign(topic, patch, { updatedAt })
        if (
          typeof patch.title === 'string' ||
          Object.prototype.hasOwnProperty.call(patch, 'linkedVideoId')
        ) {
          if (previousLinkedVideoId && previousLinkedVideoId !== topic.linkedVideoId) {
            const previousVideo = s.data.videos.find(v => v.id === previousLinkedVideoId)
            if (previousVideo?.topicId === id) {
              delete previousVideo.topicId
              previousVideo.updatedAt = updatedAt
            }
          }
          if (topic.linkedVideoId) {
            const nextVideo = s.data.videos.find(v => v.id === topic.linkedVideoId)
            if (nextVideo && nextVideo.topicId !== id) {
              nextVideo.topicId = id
              nextVideo.updatedAt = updatedAt
            }
          }

          syncLinkedTitles(s.data, { type: 'topic', id }, topic.title, updatedAt)
        }
      })
      scheduleSave(get)
    },

    deleteTopic: (id) => {
      set(s => {
        if (!s.data) return
        s.data.topics = s.data.topics.filter(t => t.id !== id)
      })
      scheduleSave(get)
    },

    adoptTopic: (id) => {
      set(s => {
        if (!s.data) return
        const topic = s.data.topics.find(t => t.id === id)
        if (!topic) return
        const alreadyConverted = s.data.videos.some(v => v.topicId === id)
        if (alreadyConverted) return
        const vid = videoId()
        const updatedAt = now()
        s.data.videos.push({
          id: vid,
          title: topic.title,
          description: topic.description,
          status: 'topic',
          tagIds: [...topic.tagIds],
          platforms: [],
          topicId: id,
          statusHistory: [{ status: 'topic', changedAt: updatedAt }],
          createdAt: updatedAt,
          updatedAt,
        })
        topic.status = 'in_progress'
        topic.linkedVideoId = vid
        topic.updatedAt = updatedAt
        const existingScript = s.data.scripts.find(sc => sc.topicId === id)
        if (existingScript) {
          const newVideo = s.data.videos.find(v => v.id === vid)
          if (newVideo) {
            newVideo.scriptId = existingScript.id
            existingScript.videoId = vid
            existingScript.title = topic.title
            existingScript.updatedAt = updatedAt
          }
        }
      })
      scheduleSave(get)
    },

    abandonTopic: (id) => {
      set(s => {
        if (!s.data) return
        const topic = s.data.topics.find(t => t.id === id)
        if (!topic) return
        const linkedVideo = s.data.videos.find(v => v.topicId === id || v.id === topic.linkedVideoId)
        if (linkedVideo) {
          linkedVideo.status = 'archived'
          linkedVideo.statusHistory.push({ status: 'archived', changedAt: now() })
          linkedVideo.updatedAt = now()
        }
        topic.abandonedAt = now()
        topic.updatedAt = now()
        s.data.topics = s.data.topics.filter(t => t.id !== id)
      })
      scheduleSave(get)
    },

    linkTopicToVideo: (tid, vid) => {
      set(s => {
        if (!s.data) return
        const topic = s.data.topics.find(t => t.id === tid)
        const video = s.data.videos.find(v => v.id === vid)
        if (!topic || !video) return
        const updatedAt = now()
        const previousVideo = topic.linkedVideoId
          ? s.data.videos.find(v => v.id === topic.linkedVideoId)
          : undefined
        if (previousVideo?.topicId === tid && previousVideo.id !== vid) {
          delete previousVideo.topicId
          previousVideo.updatedAt = updatedAt
        }

        const previousTopic = video.topicId
          ? s.data.topics.find(t => t.id === video.topicId)
          : undefined
        if (previousTopic?.linkedVideoId === vid && previousTopic.id !== tid) {
          delete previousTopic.linkedVideoId
          previousTopic.updatedAt = updatedAt
        }

        // 建立双向引用
        topic.linkedVideoId = vid
        topic.updatedAt = updatedAt
        video.topicId = tid
        video.updatedAt = updatedAt
        syncLinkedTitles(s.data, { type: 'video', id: vid }, video.title, updatedAt)
        // 如果视频已发布，选题直接标为完成
        if (video.status === 'published') {
          topic.status = 'done'
        } else {
          topic.status = 'in_progress'
        }
      })
      scheduleSave(get)
    },

    // ---- Scripts ----
    addScript: (s_) => {
      set(s => {
        if (!s.data) return
        s.data.scripts.push({ ...s_, id: scriptId(), version: 1, createdAt: now(), updatedAt: now() })
      })
      scheduleSave(get)
    },

    updateScript: (id, patch) => {
      set(s => {
        if (!s.data) return
        const idx = s.data.scripts.findIndex(sc => sc.id === id)
        if (idx === -1) return
        const sc = s.data.scripts[idx]
        const updatedAt = now()
        const previousVideoId = sc.videoId
        Object.assign(sc, patch, { version: sc.version + 1, updatedAt })
        if (
          typeof patch.title === 'string' ||
          Object.prototype.hasOwnProperty.call(patch, 'topicId') ||
          Object.prototype.hasOwnProperty.call(patch, 'videoId')
        ) {
          if (previousVideoId && previousVideoId !== sc.videoId) {
            const previousVideo = s.data.videos.find(v => v.id === previousVideoId)
            if (previousVideo?.scriptId === id) {
              delete previousVideo.scriptId
              previousVideo.updatedAt = updatedAt
            }
          }
          if (sc.videoId) {
            const nextVideo = s.data.videos.find(v => v.id === sc.videoId)
            if (nextVideo && nextVideo.scriptId !== id) {
              nextVideo.scriptId = id
              nextVideo.updatedAt = updatedAt
            }
          }

          syncLinkedTitles(s.data, { type: 'script', id }, sc.title, updatedAt)
        }
      })
      scheduleSave(get)
    },

    deleteScript: (id) => {
      set(s => {
        if (!s.data) return
        s.data.scripts = s.data.scripts.filter(sc => sc.id !== id)
      })
      scheduleSave(get)
    },

    // ---- Tags ----
    addTag: (t) => {
      set(s => {
        if (!s.data) return
        s.data.tags.push({ ...t, id: tagId(), createdAt: now() })
      })
      scheduleSave(get)
    },

    updateTag: (id, patch) => {
      set(s => {
        if (!s.data) return
        const idx = s.data.tags.findIndex(t => t.id === id)
        if (idx === -1) return
        Object.assign(s.data.tags[idx], patch)
      })
      scheduleSave(get)
    },

    deleteTag: (id) => {
      set(s => {
        if (!s.data) return
        s.data.tags = s.data.tags.filter(t => t.id !== id)
        s.data.videos.forEach(v => { v.tagIds = v.tagIds.filter(tid => tid !== id) })
        s.data.topics.forEach(t => { t.tagIds = t.tagIds.filter(tid => tid !== id) })
        s.data.scripts.forEach(sc => { sc.tagIds = sc.tagIds.filter(tid => tid !== id) })
      })
      scheduleSave(get)
    },

    // ---- Platform entries ----
    setPlatformEntry: (videoId, platform, entry) => {
      set(s => {
        if (!s.data) return
        const video = s.data.videos.find(v => v.id === videoId)
        if (!video) return
        video.platforms = video.platforms.filter(p => p.platform !== platform)
        if (entry !== null) {
          video.platforms.push({ platform, ...entry })
        }
        video.updatedAt = now()
      })
      scheduleSave(get)
    },

    updatePlatformPublishedAt: (videoId, platform, publishedAt) => {
      set(s => {
        if (!s.data) return
        const video = s.data.videos.find(v => v.id === videoId)
        if (!video) return
        const entry = video.platforms.find(p => p.platform === platform)
        if (!entry || (entry.status ?? 'published') !== 'published') return
        entry.publishedAt = publishedAt
        video.updatedAt = now()
      })
      scheduleSave(get)
    },

    updatePromotionCost: (videoId, platform, cost) => {
      set(s => {
        if (!s.data) return
        const video = s.data.videos.find(v => v.id === videoId)
        if (!video) return
        const entry = video.platforms.find(p => p.platform === platform)
        if (!entry) return
        if (cost === undefined || cost === 0) {
          delete entry.promotionCost
        } else {
          entry.promotionCost = cost
        }
        video.updatedAt = now()
      })
      scheduleSave(get)
    },

    // ---- Metrics ----
    addMetric: (m) => {
      set(s => {
        if (!s.data) return
        const idx = s.data.metrics.findIndex(x => x.videoId === m.videoId && x.platform === m.platform)
        const entry = { ...m, id: metricId(), recordedAt: now() }
        if (idx !== -1) {
          s.data.metrics[idx] = entry
        } else {
          s.data.metrics.push(entry)
        }
      })
      scheduleSave(get)
    },

    deleteMetric: (id) => {
      set(s => {
        if (!s.data) return
        s.data.metrics = s.data.metrics.filter(m => m.id !== id)
      })
      scheduleSave(get)
    },

    // ---- ChecklistItems ----
    addChecklistItem: (text) => {
      set(s => {
        if (!s.data) return
        s.data.checklistItems.push({ id: checklistItemId(), text, createdAt: now() })
      })
      scheduleSave(get)
    },

    updateChecklistItem: (id, text) => {
      set(s => {
        if (!s.data) return
        const item = s.data.checklistItems.find(c => c.id === id)
        if (item) item.text = text
      })
      scheduleSave(get)
    },

    deleteChecklistItem: (id) => {
      set(s => {
        if (!s.data) return
        s.data.checklistItems = s.data.checklistItems.filter(c => c.id !== id)
      })
      scheduleSave(get)
    },

    // ---- TransitionChecklists ----
    addTransitionChecklistItem: (key, text) => {
      set(s => {
        if (!s.data) return
        s.data.transitionChecklists[key].push({ id: checklistItemId(), text, createdAt: now() })
      })
      scheduleSave(get)
    },

    updateTransitionChecklistItem: (key, id, text) => {
      set(s => {
        if (!s.data) return
        const item = s.data.transitionChecklists[key].find(c => c.id === id)
        if (item) item.text = text
      })
      scheduleSave(get)
    },

    deleteTransitionChecklistItem: (key, id) => {
      set(s => {
        if (!s.data) return
        s.data.transitionChecklists[key] = s.data.transitionChecklists[key].filter(c => c.id !== id)
      })
      scheduleSave(get)
    },

    // ---- Platform raw records ----
    setDouyinRecords: (records) => {
      set(s => { if (s.data) s.data.douyinRecords = records })
      scheduleSave(get)
    },

    setShipinhaoRecords: (records) => {
      set(s => { if (s.data) s.data.shipinhaoRecords = records })
      scheduleSave(get)
    },

    setXiaohongshuRecords: (records) => {
      set(s => { if (s.data) s.data.xiaohongshuRecords = records })
      scheduleSave(get)
    },

    deleteDouyinRecord: (id) => {
      set(s => {
        if (!s.data) return
        s.data.douyinRecords = s.data.douyinRecords.filter(r => r.id !== id)
      })
      scheduleSave(get)
    },

    deleteShipinhaoRecord: (id) => {
      set(s => {
        if (!s.data) return
        s.data.shipinhaoRecords = s.data.shipinhaoRecords.filter(r => r.id !== id)
      })
      scheduleSave(get)
    },

    deleteXiaohongshuRecord: (id) => {
      set(s => {
        if (!s.data) return
        s.data.xiaohongshuRecords = s.data.xiaohongshuRecords.filter(r => r.id !== id)
      })
      scheduleSave(get)
    },

    // ---- Settings ----
    updateSettings: (patch) => {
      set(s => {
        if (!s.data) return
        Object.assign(s.data.settings, patch)
        if (patch.theme) {
          document.documentElement.setAttribute('data-theme', patch.theme)
        }
      })
      scheduleSave(get)
    },
  }))
)

// 页面关闭前强制刷盘，避免 600ms 节流窗口内的修改丢失
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingSave && saveTimer) {
      clearTimeout(saveTimer)
      pendingSave = false
      useAppStore.getState().saveData()
    }
  })
}
