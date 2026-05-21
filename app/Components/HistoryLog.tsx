'use client'
import { Timestamp } from 'firebase/firestore'
import type { HistoryEvent } from '../smcal/types'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import DiffView from './DiffView'

interface Props {
  history: HistoryEvent[]
}

function formatTS(ts: Timestamp | undefined): string {
  if (!ts?.toDate) return ''
  return dayjs(ts.toDate()).tz(IST).format('DD MMM YYYY, hh:mm A')
}

function eventLabel(event: HistoryEvent): string {
  switch (event.type) {
    case 'title_edit':
      return `Changed title`
    case 'body_edit':
      return 'Edited body copy'
    case 'image_added':
      return 'Added an image'
    case 'image_removed':
      return 'Removed an image'
    case 'schedule_changed':
      return `Rescheduled: ${event.before} → ${event.after}`
    case 'status_changed':
      return `Status: ${event.before} → ${event.after}`
    case 'approved':
      return 'Approved the post'
    case 'approval_reverted':
      return 'Revoked their approval'
    case 'comment_resolved':
      return 'Resolved a comment'
    default:
      return 'Made a change'
  }
}

export default function HistoryLog({ history }: Props) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">No history yet.</p>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((event) => (
        <div key={event.id} className="flex gap-3">
          {/* Actor avatar */}
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
            {event.actor?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">
                {event.actor?.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatTS(event.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{eventLabel(event)}</p>

            {event.type === 'title_edit' && event.before && event.after && (
              <div className="mt-1 text-xs text-gray-500">
                <span className="line-through text-red-400">{event.before}</span>
                <span className="mx-2 text-gray-300">→</span>
                <span className="text-green-600">{event.after}</span>
              </div>
            )}

            {event.type === 'body_edit' &&
              event.before !== undefined &&
              event.after !== undefined && (
                <div className="mt-2">
                  <DiffView before={event.before} after={event.after} />
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  )
}
