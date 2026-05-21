'use client'
import { useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase/firebase'
import type { SMComment, CommentReply } from '../smcal/types'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
}

interface Props {
  postId: string
  target: string         // "body" | "image:0" | "image:1" …
  comments: SMComment[]
  currentUser: CurrentUser | null
  isCreator: boolean
  title?: string
  onClose?: () => void
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-blue-100 flex items-center justify-center
        text-[10px] font-bold text-blue-600 flex-shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatTS(ts: Timestamp | undefined): string {
  if (!ts?.toDate) return ''
  return dayjs(ts.toDate()).tz(IST).format('DD MMM, hh:mm A')
}

export default function CommentThread({
  postId,
  target,
  comments,
  currentUser,
  isCreator,
  title,
  onClose,
}: Props) {
  const [newText, setNewText] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openReply, setOpenReply] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const unresolved = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  // ── add top-level comment ──────────────────────────────────────────────────
  const addComment = async () => {
    if (!newText.trim() || !currentUser) return
    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'posts', postId, 'comments'), {
        target,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || 'User',
        authorPhoto: currentUser.photoURL || '',
        text: newText.trim(),
        createdAt: serverTimestamp(),
        resolved: false,
        replies: [],
      })
      setNewText('')
    } finally {
      setSubmitting(false)
    }
  }

  // ── add reply ──────────────────────────────────────────────────────────────
  const addReply = async (comment: SMComment) => {
    const text = replyDrafts[comment.id!]?.trim()
    if (!text || !currentUser || !comment.id) return
    const reply: CommentReply = {
      uid: currentUser.uid,
      name: currentUser.displayName || 'User',
      photo: currentUser.photoURL || '',
      text,
      createdAt: Timestamp.now(),
    }
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id), {
      replies: [...(comment.replies || []), reply],
    })
    setReplyDrafts((prev) => ({ ...prev, [comment.id!]: '' }))
    setOpenReply(null)
  }

  // ── resolve comment ────────────────────────────────────────────────────────
  const resolveComment = async (commentId: string) => {
    await updateDoc(doc(firestore, 'posts', postId, 'comments', commentId), {
      resolved: true,
    })
  }

  // ── delete comment ─────────────────────────────────────────────────────────
  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(firestore, 'posts', postId, 'comments', commentId))
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Optional header */}
      {(title || onClose) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {title && (
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {unresolved.length === 0 && resolved.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">
            No comments yet.
          </p>
        )}

        {unresolved.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar name={comment.authorName} size={6} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">
                  {comment.authorName}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatTS(comment.createdAt)}
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                {comment.text}
              </p>

              {/* Action row */}
              <div className="flex gap-3 mt-1.5">
                <button
                  onClick={() =>
                    setOpenReply(
                      openReply === comment.id ? null : comment.id!
                    )
                  }
                  className="text-[10px] text-blue-500 hover:text-blue-700"
                >
                  Reply
                </button>
                {isCreator && (
                  <button
                    onClick={() => resolveComment(comment.id!)}
                    className="text-[10px] text-green-600 hover:text-green-800"
                  >
                    Resolve
                  </button>
                )}
                {currentUser?.uid === comment.authorUid && (
                  <button
                    onClick={() => deleteComment(comment.id!)}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Nested replies */}
              {(comment.replies || []).length > 0 && (
                <div className="mt-2 ml-1 space-y-2 border-l-2 border-gray-100 pl-3">
                  {comment.replies.map((reply, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-600">
                          {reply.name}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {formatTS(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 leading-relaxed">
                        {reply.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {openReply === comment.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5
                      focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Add a reply…"
                    value={replyDrafts[comment.id!] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [comment.id!]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addReply(comment)
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => addReply(comment)}
                    className="text-[10px] bg-blue-500 text-white px-2.5 py-1.5 rounded-lg
                      hover:bg-blue-600 whitespace-nowrap"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Resolved (collapsed) */}
        {resolved.length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-gray-400 cursor-pointer select-none">
              {resolved.length} resolved comment
              {resolved.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2 opacity-50">
              {resolved.map((comment) => (
                <div key={comment.id} className="flex gap-2 items-start">
                  <Avatar name={comment.authorName} size={5} />
                  <div>
                    <span className="text-[10px] text-gray-500 line-through">
                      {comment.text}
                    </span>
                    <span className="ml-2 text-[9px] text-green-500">
                      ✓ resolved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* New comment input */}
      {currentUser && (
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <input
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Add a comment…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addComment()
                }
              }}
            />
            <button
              onClick={addComment}
              disabled={!newText.trim() || submitting}
              className="text-xs bg-blue-500 text-white px-3 py-2 rounded-lg
                hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed
                whitespace-nowrap"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
