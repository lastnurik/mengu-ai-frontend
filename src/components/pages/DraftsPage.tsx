import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, CheckCircle, Send, Clock } from 'lucide-react'
import { Topbar } from '@/components/layout/Sidebar'
import { Spinner, Pagination } from '@/components/ui'
import { toast } from '@/components/ui/toast'
import { draftsService } from '@/services'
import { draftStatusLabel, LIVE_POLL_INTERVAL_MS } from '@/utils/helpers'
import type { DraftListItem } from '@/types'

const STATUS_TABS = [
  { value: '',                 label: 'All' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'sent',             label: 'Sent' },
]

export function DraftsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['drafts', status, page],
    queryFn: () => draftsService.getAll({ status: status || undefined, page, per_page: 20 }),
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => draftsService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast('Draft approved and sent', 'success')
    },
    onError: () => toast('Failed to approve draft', 'error'),
  })

  const drafts = data?.data ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Drafts" />

      <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-navy-800 border-b border-gray-100 dark:border-navy-600 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1) }}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              status === tab.value
                ? 'bg-magenta-500 text-white'
                : 'bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center pt-16"><Spinner /></div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-gray-400 dark:text-gray-500">
            <Send size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No drafts yet</p>
            <p className="text-xs mt-1">Drafts are generated automatically after actions complete</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                isExpanded={expanded === draft.id}
                onToggle={() => setExpanded(expanded === draft.id ? null : draft.id)}
                onApprove={() => approveMutation.mutate(draft.id)}
                approving={approveMutation.isPending}
              />
            ))}
          </div>
        )}
        {data && data.total > 20 && (
          <div className="max-w-3xl mx-auto mt-4">
            <Pagination page={page} perPage={20} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}

function DraftRow({ draft, isExpanded, onToggle, onApprove, approving }: {
  draft: DraftListItem
  isExpanded: boolean
  onToggle: () => void
  onApprove: () => void
  approving: boolean
}) {
  const { data: full, isLoading } = useQuery({
    queryKey: ['draft', draft.id],
    queryFn: () => draftsService.getById(draft.id),
    enabled: isExpanded,
  })

  const statusIcon = draft.status === 'sent'
    ? <Send size={12} className="text-blue-400" />
    : draft.status === 'approved'
    ? <CheckCircle size={12} className="text-emerald-400" />
    : <Clock size={12} className="text-amber-400" />

  return (
    <div className="bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{draft.subject}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">To: {draft.recipient}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            draft.status === 'pending_approval' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
            draft.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
          }`}>
            {draftStatusLabel(draft.status as any)}
          </span>
          {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-navy-600 px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 dark:bg-navy-900 rounded-lg p-3 mb-3">
                {full?.body ?? ''}
              </pre>
              {draft.status === 'pending_approval' && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={approving}
                  className="btn-primary text-xs"
                >
                  {approving ? <Spinner className="w-3 h-3 text-white" /> : <Send size={12} />}
                  Approve & Send
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
