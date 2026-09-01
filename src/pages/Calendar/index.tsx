import { useMemo, useState, type FormEvent } from 'react'
import type { CalendarEvent } from '@/types'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { openExternalLink } from '@/services/externalLinks'
import {
  buildWeekSegments,
  formatEventDateRange,
  getMonthWeeks,
  isValidEventRange,
  toDateKey,
} from './calendarModel'
import './calendar.css'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface EventDraft {
  title: string
  startDate: string
  endDate: string
  description: string
  url: string
}

interface EventErrors {
  title?: string
  endDate?: string
  url?: string
}

const emptyDraft = (date: string): EventDraft => ({
  title: '',
  startDate: date,
  endDate: date,
  description: '',
  url: '',
})

const draftFromEvent = (event: CalendarEvent): EventDraft => ({
  title: event.title,
  startDate: event.startDate,
  endDate: event.endDate,
  description: event.description ?? '',
  url: event.url ?? '',
})

function validateDraft(draft: EventDraft): EventErrors {
  const errors: EventErrors = {}
  if (!draft.title.trim()) errors.title = '请输入活动名称'
  if (!isValidEventRange(draft.startDate, draft.endDate)) errors.endDate = '结束日期不能早于开始日期'
  if (draft.url.trim()) {
    try {
      const url = new URL(draft.url.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') errors.url = '仅支持 http 或 https 链接'
    } catch {
      errors.url = '请输入完整链接，例如 https://example.com'
    }
  }
  return errors
}

function EventEditor({
  draft,
  errors,
  onChange,
}: {
  draft: EventDraft
  errors: EventErrors
  onChange: (patch: Partial<EventDraft>) => void
}) {
  return (
    <div className="calendar-event-form">
      <Input
        label="活动名称"
        value={draft.title}
        onChange={event => onChange({ title: event.target.value })}
        placeholder="例如：21 天 AI 实战黑客松"
        error={errors.title}
        autoFocus
      />
      <div className="calendar-event-date-fields">
        <Input
          label="开始日期"
          type="date"
          value={draft.startDate}
          onChange={event => onChange({ startDate: event.target.value })}
        />
        <Input
          label="结束日期（含当天）"
          type="date"
          value={draft.endDate}
          min={draft.startDate}
          onChange={event => onChange({ endDate: event.target.value })}
          error={errors.endDate}
        />
      </div>
      <Textarea
        label="活动信息"
        value={draft.description}
        onChange={event => onChange({ description: event.target.value })}
        placeholder="填写活动说明、关键节点、提交要求等"
        rows={5}
      />
      <Input
        label="活动链接"
        type="url"
        value={draft.url}
        onChange={event => onChange({ url: event.target.value })}
        placeholder="https://"
        error={errors.url}
      />
    </div>
  )
}

export function CalendarPage() {
  const events = useAppStore(state => state.data?.calendarEvents ?? [])
  const addCalendarEvent = useAppStore(state => state.addCalendarEvent)
  const updateCalendarEvent = useAppStore(state => state.updateCalendarEvent)
  const deleteCalendarEvent = useAppStore(state => state.deleteCalendarEvent)
  const today = useMemo(() => new Date(), [])
  const todayKey = toDateKey(today)
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft(todayKey))
  const [errors, setErrors] = useState<EventErrors>({})
  const [linkError, setLinkError] = useState<string | null>(null)

  const weeks = useMemo(() => getMonthWeeks(month), [month])
  const selectedEvent = selectedId ? events.find(event => event.id === selectedId) ?? null : null

  const shiftMonth = (amount: number) => {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12))
  }

  const openCreate = (date = todayKey) => {
    setEditingId(null)
    setDraft(emptyDraft(date))
    setErrors({})
    setEditorOpen(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setSelectedId(null)
    setEditingId(event.id)
    setDraft(draftFromEvent(event))
    setErrors({})
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setErrors({})
  }

  const saveEvent = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    const nextErrors = validateDraft(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      title: draft.title.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      description: draft.description.trim() || undefined,
      url: draft.url.trim() || undefined,
    }
    if (editingId) updateCalendarEvent(editingId, payload)
    else addCalendarEvent(payload)
    closeEditor()
  }

  const removeSelectedEvent = () => {
    if (!selectedEvent || !window.confirm(`确定删除活动“${selectedEvent.title}”吗？`)) return
    deleteCalendarEvent(selectedEvent.id)
    setSelectedId(null)
  }

  const openLink = async (url: string) => {
    setLinkError(null)
    try {
      await openExternalLink(url)
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : '无法打开链接')
    }
  }

  return (
    <PageContainer
      title="内容月历"
      subtitle="安排活动、征集与重要节点"
      actions={<Button variant="primary" onClick={() => openCreate()}>新建活动</Button>}
      noPadding
    >
      <div className="calendar-page">
        <div className="calendar-toolbar">
          <div className="calendar-month-navigation" aria-label="月份导航">
            <Button variant="secondary" size="sm" aria-label="上个月" onClick={() => shiftMonth(-1)}>‹</Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12))}>今天</Button>
            <Button variant="secondary" size="sm" aria-label="下个月" onClick={() => shiftMonth(1)}>›</Button>
          </div>
          <h2 className="calendar-month-title">{month.getFullYear()} 年 {month.getMonth() + 1} 月</h2>
          <div className="calendar-toolbar-note">活动可跨周、跨月连续显示</div>
        </div>

        <div className="calendar-surface">
          <div className="calendar-weekday-row" role="row">
            {WEEKDAY_LABELS.map(label => <div key={label} role="columnheader">{label}</div>)}
          </div>
          <div className="calendar-weeks">
            {weeks.map(week => {
              const segments = buildWeekSegments(events, week)
              const laneCount = segments.reduce((max, segment) => Math.max(max, segment.lane + 1), 0)
              return (
                <div
                  className="calendar-week"
                  key={toDateKey(week[0])}
                  style={{ minHeight: 58 + Math.max(2, laneCount) * 25 }}
                  role="row"
                >
                  {week.map(date => {
                    const dateKey = toDateKey(date)
                    const inMonth = date.getMonth() === month.getMonth()
                    const isToday = dateKey === todayKey
                    return (
                      <div className={`calendar-day${inMonth ? '' : ' outside-month'}`} key={dateKey} role="gridcell">
                        <button
                          type="button"
                          className={`calendar-day-number${isToday ? ' today' : ''}`}
                          onClick={() => openCreate(dateKey)}
                          aria-label={`${date.getMonth() + 1}月${date.getDate()}日新建活动`}
                        >
                          {date.getDate()}
                        </button>
                      </div>
                    )
                  })}
                  {segments.map(segment => (
                    <button
                      type="button"
                      className={`calendar-event-bar${segment.continuesBefore ? ' continues-before' : ''}${segment.continuesAfter ? ' continues-after' : ''}`}
                      style={{
                        left: `calc(${segment.startColumn * (100 / 7)}% + 3px)`,
                        width: `calc(${segment.span * (100 / 7)}% - 6px)`,
                        top: 36 + segment.lane * 25,
                      }}
                      key={`${segment.event.id}-${toDateKey(week[0])}`}
                      onClick={() => { setLinkError(null); setSelectedId(segment.event.id) }}
                      title={`${segment.event.title} · ${formatEventDateRange(segment.event.startDate, segment.event.endDate)}`}
                    >
                      {segment.continuesBefore && <span aria-hidden="true">‹</span>}
                      <span className="calendar-event-title">{segment.event.title}</span>
                      {segment.continuesAfter && <span aria-hidden="true">›</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedId(null)}
        title="活动详情"
        size="md"
        footer={selectedEvent && (
          <>
            <Button variant="danger" onClick={removeSelectedEvent}>删除</Button>
            <Button variant="secondary" onClick={() => setSelectedId(null)}>关闭</Button>
            <Button variant="primary" onClick={() => openEdit(selectedEvent)}>编辑活动</Button>
          </>
        )}
      >
        {selectedEvent && (
          <div className="calendar-event-detail">
            <div>
              <div className="calendar-detail-label">活动名称</div>
              <h3>{selectedEvent.title}</h3>
            </div>
            <div>
              <div className="calendar-detail-label">活动日期</div>
              <div className="calendar-detail-date">{formatEventDateRange(selectedEvent.startDate, selectedEvent.endDate)}</div>
            </div>
            {selectedEvent.description && (
              <div>
                <div className="calendar-detail-label">活动信息</div>
                <p>{selectedEvent.description}</p>
              </div>
            )}
            {selectedEvent.url && (
              <div>
                <div className="calendar-detail-label">活动链接</div>
                <button type="button" className="calendar-detail-link" onClick={() => openLink(selectedEvent.url!)}>
                  <span>{selectedEvent.url}</span>
                  <span aria-hidden="true">↗</span>
                </button>
                {linkError && <div className="calendar-link-error">{linkError}</div>}
              </div>
            )}
            {!selectedEvent.description && !selectedEvent.url && (
              <div className="calendar-detail-empty">暂未添加活动信息或链接</div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editingId ? '编辑活动' : '新建活动'}
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={closeEditor}>取消</Button>
            <Button variant="primary" type="submit" form="calendar-event-form">保存活动</Button>
          </>
        )}
      >
        <form id="calendar-event-form" onSubmit={saveEvent}>
          <EventEditor
            draft={draft}
            errors={errors}
            onChange={patch => {
              setDraft(current => ({ ...current, ...patch }))
              setErrors({})
            }}
          />
        </form>
      </Modal>
    </PageContainer>
  )
}
