import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Clock, Building2, Brain, CheckCircle, XCircle, AlertTriangle, RotateCw, FileText, Mail } from 'lucide-react'
import { Topbar } from '@/components/layout/Sidebar'
import { Card, Spinner, Pagination } from '@/components/ui'
import { toast } from '@/components/ui/toast'
import { eventsService, draftsService } from '@/services'
import { timeAgo, eventStatusClass, formatDateTime, actionStatusClass, actionStatusLabel, draftStatusLabel, LIVE_POLL_INTERVAL_MS } from '@/utils/helpers'
import type { EventStatus, FullEvent, ActionLog, Draft } from '@/types'

const STATUS_FILTERS: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
]

const SOURCE_LABELS: Record<string, string> = {
  email: 'Email',
  api: 'API',
  webhook: 'Webhook',
}

export function InboxPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [processingAll, setProcessingAll] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['events', statusFilter, page],
    queryFn: () => eventsService.getAll({ status: statusFilter, page }),
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })

  const { data: fullEvent, isLoading: loadingDetail } = useQuery({
    queryKey: ['event', selectedId],
    queryFn: () => eventsService.getById(selectedId!),
    enabled: !!selectedId,
  })

  const reanalyzeMutation = useMutation({
    mutationFn: (id: string) => eventsService.reanalyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedId] })
    },
    onError: () => {
      toast('Не удалось переанализировать событие. Попробуйте снова.', 'error')
    },
  })

  const approveDraftMutation = useMutation({
    mutationFn: (id: string) => draftsService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedId] })
    },
    onError: () => {
      toast('Не удалось одобрить черновик. Попробуйте снова.', 'error')
    },
  })

  const events = data?.data ?? []
  const newCount = events.filter((e) => e.status === 'new').length

  async function handleProcessAll() {
    if (processingAll || newCount === 0) return
    setProcessingAll(true)
    const newEvents = events.filter((e) => e.status === 'new')
    for (const e of newEvents) {
      try {
        await eventsService.reanalyze(e.id)
      } catch {
        // ignore individual failures
      }
    }
    setProcessingAll(false)
    queryClient.invalidateQueries({ queryKey: ['events'] })
    toast(`Processed ${newEvents.length} events`, 'success')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Inbox AI"
        actions={
          <button
            type="button"
            onClick={handleProcessAll}
            disabled={processingAll || newCount === 0}
            className="btn-primary"
          >
            {processingAll ? (
              <Spinner className="text-white w-4 h-4" />
            ) : (
              <Sparkles size={14} />
            )}
            {processingAll ? 'Processing...' : `Process All (${newCount})`}
          </button>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: list */}
        <div className={`w-full md:w-[420px] md:min-w-[420px] flex flex-col border-r border-gray-100 dark:border-navy-600 overflow-hidden ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          {/* AI banner */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-pink-50 dark:bg-pink-500/10 border-b border-pink-100 dark:border-pink-500/20">
            <Sparkles size={14} className="text-magenta-500" />
            <span className="text-xs text-magenta-600 dark:text-pink-300 font-medium">
              AI processed {events.filter((e) => e.status === 'completed').length} events · {newCount} awaiting analysis
            </span>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 px-3 py-2.5 border-b border-gray-100 dark:border-navy-600 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === f.value
                    ? 'bg-magenta-500 text-white'
                    : 'bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-600'
                }`}
              >
                {f.label}
                {f.value === 'new' && (
                  <span className="ml-1.5 bg-white/30 rounded-full px-1">{newCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">No events</div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedId(event.id)}
                  className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-navy-700 cursor-pointer transition-colors ${
                    selectedId === event.id
                      ? 'bg-pink-50 dark:bg-pink-500/10 border-l-2 border-l-magenta-500'
                      : 'hover:bg-gray-50 dark:hover:bg-navy-800'
                  }`}
                >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                          {event.sender?.split('@')[0] ?? 'Unknown'}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
                        {event.subject}
                      </div>
                    <div className="flex items-center gap-2">
                      <span className={eventStatusClass(event.status)}>
                        {event.status}
                      </span>
                      <span className="text-[10px] bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        {SOURCE_LABELS[event.source] ?? event.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {data && data.total > 0 && (
            <Pagination
              page={page}
              perPage={data.per_page}
              total={data.total}
              onPageChange={setPage}
            />
          )}
        </div>

        {/* Right: detail panel */}
        <div className={`flex-1 overflow-y-auto ${selectedId ? 'block' : 'hidden md:block'}`}>
          {selectedId ? (
            <>
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center gap-1.5 px-4 py-2 text-xs text-magenta-500 hover:text-magenta-600 border-b border-gray-100 dark:border-navy-600 w-full bg-white dark:bg-navy-800"
              >
                ← Назад к списку
              </button>
              {loadingDetail || !fullEvent ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : (
                <EventDetail
                event={fullEvent}
                onReanalyze={() => reanalyzeMutation.mutate(fullEvent.event.id)}
                reanalyzing={reanalyzeMutation.isPending}
                onApproveDraft={(draftId) => approveDraftMutation.mutate(draftId)}
                approvingDraft={approveDraftMutation.isPending}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-14 h-14 bg-pink-50 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-magenta-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select an event</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                AI will analyze the content and suggest actions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Event Detail Panel ───────────────────────────────────────────────────────

interface EventDetailProps {
  event: FullEvent
  onReanalyze: () => void
  reanalyzing: boolean
  onApproveDraft: (draftId: string) => void
  approvingDraft: boolean
}

function EventDetail({ event: fullEvent, onReanalyze, reanalyzing, onApproveDraft, approvingDraft }: EventDetailProps) {
  // FullEvent is {event: IncomingEvent, analysis?, action_logs?} — a nested
  // wrapper, not the event itself (see types/index.ts FullEvent comment).
  const event = fullEvent.event
  const analysis = fullEvent.analysis
  const actionLogs = fullEvent.action_logs ?? []

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={eventStatusClass(event.status)}>{event.status}</span>
          <span className="text-xs bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
            {event.source}
          </span>
        </div>
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          {event.metadata.subject ?? 'No subject'}
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Building2 size={12} /> {event.metadata.sender}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {timeAgo(event.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail size={12} /> {event.source}
          </span>
        </div>
      </div>

      <Card title="Email Content">
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {event.raw_content}
        </p>
      </Card>

      {event.metadata.attachments && event.metadata.attachments.length > 0 && (
        <Card title="Attachments">
          <div className="space-y-2">
            {event.metadata.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm bg-gray-50 dark:bg-navy-700 rounded-lg px-3 py-2">
                <FileText size={14} className="text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{att.filename}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  {(att.size / 1024).toFixed(0)} KB
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis ? (
        <Card title="AI Analysis" className="bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} className="text-magenta-500" />
            <span className="text-xs font-medium text-magenta-600 dark:text-pink-300">
              Intent: {analysis.intent.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              Confidence: {(analysis.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="space-y-1.5">
            {analysis.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-navy-800/70 rounded-lg px-3 py-2">
                <CheckCircle size={12} className="text-emerald-500" />
                <span className="font-medium capitalize">{action.type.replace(/_/g, ' ')}</span>
                <span className="text-gray-400 dark:text-gray-500">
                  {Object.entries(action.data).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onReanalyze}
            disabled={reanalyzing}
            className="mt-3 text-xs text-magenta-500 hover:text-magenta-600 flex items-center gap-1"
          >
            <RotateCw size={12} className={reanalyzing ? 'animate-spin' : ''} />
            Re-analyze with AI
          </button>
        </Card>
      ) : (
        <Card title="AI Analysis" className="bg-gray-50 dark:bg-navy-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Brain size={14} />
            <span>Waiting for analysis...</span>
          </div>
        </Card>
      )}

      {actionLogs.length > 0 && (
        <Card title="Action Logs">
          <div className="space-y-2">
            {actionLogs.map((log) => (
              <ActionLogRow key={log.id} log={log} />
            ))}
          </div>
        </Card>
      )}

      {analysis && (
        <DraftSection
          eventId={event.id}
          onApprove={onApproveDraft}
          approving={approvingDraft}
        />
      )}

      <div className="flex gap-2 flex-wrap pt-2">
        <button
          type="button"
          onClick={onReanalyze}
          disabled={reanalyzing}
          className="btn-primary"
        >
          {reanalyzing ? <Spinner className="text-white w-4 h-4" /> : <Brain size={14} />}
          Re-analyze
        </button>
      </div>
    </div>
  )
}

// ─── Action Log Row ───────────────────────────────────────────────────────────

function ActionLogRow({ log }: { log: ActionLog }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-gray-50 dark:border-navy-700 last:border-0">
      {log.status === 'success' ? (
        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : log.status === 'failed' ? (
        <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">
            {log.action_type.replace(/_/g, ' ')}
          </span>
          <span className={actionStatusClass(log.status)}>
            {actionStatusLabel(log.status)}
          </span>
        </div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(log.created_at)}</div>
        {log.error_message && (
          <div className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">{log.error_message}</div>
        )}
      </div>
    </div>
  )
}

// ─── Draft Section ────────────────────────────────────────────────────────────

function DraftSection({ eventId, onApprove, approving }: {
  eventId: string
  onApprove: (id: string) => void
  approving: boolean
}) {
  const { data: draftsData, isLoading } = useQuery({
    queryKey: ['event-drafts', eventId],
    queryFn: () => eventsService.getDrafts(eventId),
    enabled: !!eventId,
  })

  const drafts = draftsData?.data ?? []

  return (
    <Card title="Draft Replies">
      {isLoading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">No drafts yet — drafts are generated automatically after actions complete.</div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draftId={draft.id}
              subject={draft.subject}
              recipient={draft.recipient}
              status={draft.status}
              onApprove={onApprove}
              approving={approving}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

// DraftListItem (from GET /events/:id/drafts) has no `body` field — only
// the full Draft (GET /drafts/:id) does. We fetch it lazily, only once this
// card is expanded, rather than eagerly fetching every draft's full body
// up front for an event that might have several.
function DraftCard({ draftId, subject, recipient, status, onApprove, approving }: {
  draftId: string
  subject: string
  recipient: string
  status: string
  onApprove: (id: string) => void
  approving: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const queryClient = useQueryClient()

  const { data: fullDraft, isLoading } = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => draftsService.getById(draftId),
    enabled: expanded,
  })

  const updateDraftMutation = useMutation({
    mutationFn: (body: string) => draftsService.update(draftId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] })
      setEditing(false)
    },
    onError: () => {
      toast('Не удалось сохранить черновик. Попробуйте снова.', 'error')
    },
  })

  return (
    <Card title={`Draft: ${subject}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        To: {recipient} · {draftStatusLabel(status as Draft['status'])}
      </div>

      {!expanded ? (
        <button type="button" onClick={() => setExpanded(true)} className="text-xs text-magenta-500 hover:text-magenta-600">
          View content
        </button>
      ) : isLoading || !fullDraft ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : editing ? (
        <div>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={6}
            className="w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg p-3 resize-none outline-none focus:border-magenta-400"
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => updateDraftMutation.mutate(editBody)}
              disabled={updateDraftMutation.isPending}
              className="btn-primary text-xs py-1.5"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 dark:bg-navy-700 rounded-lg p-3">
            {fullDraft.body}
          </pre>
          <div className="flex gap-2 mt-3">
            {fullDraft.status === 'pending_approval' && (
              <button
                type="button"
                onClick={() => onApprove(draftId)}
                disabled={approving}
                className="btn-primary text-xs py-1.5"
              >
                {approving ? <Spinner className="text-white w-4 h-4" /> : <CheckCircle size={12} />}
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={() => { setEditing(true); setEditBody(fullDraft.body) }}
              className="btn-secondary text-xs py-1.5"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
