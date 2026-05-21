'use client'
import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase/firebase'
import type { SMPost, SMComment, HistoryEvent, PostActor } from '../smcal/types'
import { convertDriveUrl } from '../../lib/driveUrl'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import CommentThread from './CommentThread'
import HistoryLog from './HistoryLog'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { badge: 'bg-gray-100   text-gray-600  border-gray-200',  icon: '✏️',  label: 'Draft'     },
  scheduled: { badge: 'bg-blue-100   text-blue-700  border-blue-200',  icon: '🕐', label: 'Scheduled' },
  approved:  { badge: 'bg-green-100  text-green-700 border-green-200', icon: '✓',  label: 'Approved'  },
  posted:    { badge: 'bg-purple-100 text-purple-700 border-purple-200',icon: '📤', label: 'Posted'    },
} as const

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
}

interface Props {
  postId: string
  user: CurrentUser | null
  onClose: () => void
}

function formatIST(ts: Timestamp | null | undefined): string {
  if (!ts?.toDate) return '—'
  return dayjs(ts.toDate()).tz(IST).format('DD MMM YYYY, hh:mm A')
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PostDetail({ postId, user, onClose }: Props) {
  const [post, setPost]       = useState<SMPost | null>(null)
  const [comments, setComments] = useState<SMComment[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Edit states
  const [editingTitle,    setEditingTitle]    = useState(false)
  const [titleDraft,      setTitleDraft]      = useState('')
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleDraft,   setScheduleDraft]   = useState('')
  const [editingBody,     setEditingBody]     = useState(false)
  const [bodyDraft,       setBodyDraft]       = useState('')
  const [editingImages,   setEditingImages]   = useState(false)
  const [imagesDraft,     setImagesDraft]     = useState<string[]>([])

  // Image comment panel
  const [selectedImg, setSelectedImg] = useState<number | null>(null)

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Firestore listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, 'posts', postId), (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() } as SMPost)
      setLoading(false)
    })
    return () => unsub()
  }, [postId])

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, 'posts', postId, 'comments'),
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SMComment)))
    )
    return () => unsub()
  }, [postId])

  useEffect(() => {
    const q = query(
      collection(firestore, 'posts', postId, 'history'),
      orderBy('timestamp', 'desc')
    )
    const unsub = onSnapshot(q, (snap) =>
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEvent)))
    )
    return () => unsub()
  }, [postId])

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading post…</p>
      </div>
    )
  }
  if (!post) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">Post not found.</p>
          <button onClick={onClose} className="text-sm text-blue-500 hover:underline">← Back</button>
        </div>
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const isCreator = post.createdBy?.uid === user?.uid
  const cfg = STATUS_CFG[post.status] ?? STATUS_CFG.draft
  const myApproval = (post.approvedBy || []).find((a) => a.uid === user?.uid)

  const actor: PostActor = {
    uid:      user?.uid      || '',
    name:     user?.displayName || 'User',
    photoURL: user?.photoURL || '',
  }

  const unresolvedFor = (target: string) =>
    comments.filter((c) => c.target === target && !c.resolved).length

  const approvalLabel = () => {
    const approvers = post.approvedBy || []
    if (approvers.length === 0) return null
    if (approvers.length === 1) return `Approved by ${approvers[0].name}`
    if (approvers.length === 2) return `Approved by ${approvers[0].name} and ${approvers[1].name}`
    return `Approved by ${approvers[0].name}, ${approvers[1].name}, and ${approvers.length - 2} other${approvers.length - 2 > 1 ? 's' : ''}`
  }

  // ── History logger ───────────────────────────────────────────────────────────
  const log = async (type: HistoryEvent['type'], before?: string, after?: string) => {
    await addDoc(collection(firestore, 'posts', postId, 'history'), {
      type,
      actor,
      timestamp: serverTimestamp(),
      ...(before !== undefined ? { before } : {}),
      ...(after  !== undefined ? { after  } : {}),
    })
  }

  // ── Saves ────────────────────────────────────────────────────────────────────

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === post.title) { setEditingTitle(false); return }
    setSaving(true)
    await updateDoc(doc(firestore, 'posts', postId), { title: titleDraft.trim() })
    await log('title_edit', post.title, titleDraft.trim())
    setSaving(false); setEditingTitle(false)
  }

  const saveSchedule = async () => {
    setSaving(true)
    const newDate = dayjs.tz(scheduleDraft, IST).toDate()
    const before  = formatIST(post.scheduledAt)
    const after   = dayjs.tz(scheduleDraft, IST).format('DD MMM YYYY, hh:mm A')
    await updateDoc(doc(firestore, 'posts', postId), { scheduledAt: Timestamp.fromDate(newDate) })
    await log('schedule_changed', before, after)
    setSaving(false); setEditingSchedule(false)
  }

  const saveBody = async () => {
    if (bodyDraft === post.bodyCopy) { setEditingBody(false); return }
    setSaving(true)
    await updateDoc(doc(firestore, 'posts', postId), { bodyCopy: bodyDraft })
    await log('body_edit', post.bodyCopy, bodyDraft)
    setSaving(false); setEditingBody(false)
  }

  const saveImages = async () => {
    setSaving(true)
    const trimmed  = imagesDraft.filter((u) => u.trim())
    const oldSet   = new Set(post.images)
    const newSet   = new Set(trimmed)
    const added    = trimmed.filter((u) => !oldSet.has(u))
    const removed  = post.images.filter((u) => !newSet.has(u))
    await updateDoc(doc(firestore, 'posts', postId), { images: trimmed })
    for (const url of added)   await log('image_added',   undefined, url)
    for (const url of removed) await log('image_removed', url, undefined)
    setSaving(false); setEditingImages(false)
  }

  // ── Approve / revoke ─────────────────────────────────────────────────────────
  const toggleApprove = async () => {
    if (myApproval) {
      const newApprovedBy = (post.approvedBy || []).filter((a) => a.uid !== user?.uid)
      const newStatus =
        newApprovedBy.length === 0 && post.status === 'approved' ? 'scheduled' : post.status
      await updateDoc(doc(firestore, 'posts', postId), {
        approvedBy: newApprovedBy,
        status: newStatus,
      })
      await log('approval_reverted')
      if (newStatus !== post.status) await log('status_changed', post.status, newStatus)
    } else {
      const approval = {
        uid:      user!.uid,
        name:     user!.displayName || 'User',
        photoURL: user!.photoURL || '',
        approvedAt: Timestamp.now(),
      }
      const newApprovedBy = [...(post.approvedBy || []), approval]
      const prevStatus = post.status
      await updateDoc(doc(firestore, 'posts', postId), {
        approvedBy: newApprovedBy,
        status: 'approved',
      })
      await log('approved')
      if (prevStatus !== 'approved') await log('status_changed', prevStatus, 'approved')
    }
  }

  // ── Status change ────────────────────────────────────────────────────────────
  const setStatus = async (status: SMPost['status']) => {
    const prev = post.status
    await updateDoc(doc(firestore, 'posts', postId), { status })
    await log('status_changed', prev, status)
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    await deleteDoc(doc(firestore, 'posts', postId))
    onClose()
  }

  // ── Edit helpers ─────────────────────────────────────────────────────────────
  const startEditTitle = () => { setTitleDraft(post.title); setEditingTitle(true) }
  const startEditSchedule = () => {
    setScheduleDraft(
      post.scheduledAt?.toDate
        ? dayjs(post.scheduledAt.toDate()).tz(IST).format('YYYY-MM-DDTHH:mm')
        : dayjs().tz(IST).format('YYYY-MM-DDTHH:mm')
    )
    setEditingSchedule(true)
  }
  const startEditBody   = () => { setBodyDraft(post.bodyCopy || ''); setEditingBody(true) }
  const startEditImages = () => { setImagesDraft([...(post.images || []), '']); setEditingImages(true) }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
          >
            ← Back
          </button>

          {/* Title (editable) */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            {editingTitle ? (
              <>
                <input
                  className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-base
                    font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 max-w-lg"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') setEditingTitle(false)
                  }}
                  autoFocus
                />
                <button
                  onClick={saveTitle}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg
                    hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-lg font-bold text-gray-900 truncate">{post.title}</h1>
                <button
                  onClick={startEditTitle}
                  className="text-gray-300 hover:text-gray-600 flex-shrink-0 text-base"
                  title="Edit title"
                >
                  ✎
                </button>
              </>
            )}
          </div>

          <span
            className={`px-3 py-1 text-xs rounded-full border font-medium flex-shrink-0 ${cfg.badge}`}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8 pb-16">

        {/* ── Meta card ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-5
          border border-gray-100">

          {/* Scheduled */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Scheduled (IST)
            </p>
            {editingSchedule ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="datetime-local"
                  className="border border-blue-300 rounded-lg px-2 py-1.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={scheduleDraft}
                  onChange={(e) => setScheduleDraft(e.target.value)}
                />
                <button
                  onClick={saveSchedule}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg
                    hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSchedule(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">
                  {formatIST(post.scheduledAt)}
                </p>
                <button
                  onClick={startEditSchedule}
                  className="text-gray-300 hover:text-gray-600 text-base"
                  title="Edit schedule"
                >
                  ✎
                </button>
              </div>
            )}
          </div>

          {/* Creator */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Created by
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center
                text-xs font-bold text-blue-600 flex-shrink-0">
                {post.createdBy?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{post.createdBy?.name}</p>
                {post.createdAt && (
                  <p className="text-[10px] text-gray-400">{formatIST(post.createdAt)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Approvals */}
          {(post.approvedBy?.length ?? 0) > 0 && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Approvals
              </p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {(post.approvedBy || []).slice(0, 4).map((a, i) => (
                    <div
                      key={i}
                      title={a.name}
                      className="w-7 h-7 rounded-full bg-green-100 border-2 border-white
                        flex items-center justify-center text-xs font-bold text-green-700"
                    >
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{approvalLabel()}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Images ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">Images</h2>
            {!editingImages ? (
              <button
                onClick={startEditImages}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Edit Images
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveImages}
                  disabled={saving}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg
                    hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingImages(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 border
                    border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editingImages ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Paste Google Drive share links. Set each file to{' '}
                <strong>Anyone with the link can view</strong>.
              </p>
              {imagesDraft.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="https://drive.google.com/file/d/…"
                    value={url}
                    onChange={(e) => {
                      const next = [...imagesDraft]
                      next[i] = e.target.value
                      setImagesDraft(next)
                    }}
                  />
                  <button
                    onClick={() => setImagesDraft((p) => p.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl
                      bg-red-50 hover:bg-red-100 text-red-400 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setImagesDraft((p) => [...p, ''])}
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 font-medium"
              >
                <span className="text-lg leading-none">+</span> Add image
              </button>
            </div>
          ) : (post.images?.length ?? 0) > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(post.images || []).map((url, i) => {
                  const count     = unresolvedFor(`image:${i}`)
                  const isSelected = selectedImg === i
                  return (
                    <div key={i} className="relative">
                      <div
                        onClick={() => setSelectedImg(isSelected ? null : i)}
                        className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer
                          transition-all
                          ${isSelected
                            ? 'border-blue-400 shadow-lg ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300'
                          }`}
                      >
                        <img
                          src={convertDriveUrl(url)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const wrap = (e.target as HTMLImageElement).parentElement!
                            wrap.innerHTML = `
                              <div class="w-full h-full bg-gray-50 flex flex-col items-center
                                justify-center gap-1.5 p-3">
                                <p class="text-xs text-gray-400 text-center">Preview unavailable</p>
                                <a href="${url}" target="_blank" rel="noopener noreferrer"
                                  class="text-[10px] text-blue-400 underline text-center">
                                  Open in Drive ↗
                                </a>
                              </div>`
                          }}
                        />
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500
                          text-white text-[10px] rounded-full flex items-center justify-center
                          font-bold shadow-sm">
                          {count}
                        </span>
                      )}
                      {count === 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200
                          text-gray-500 text-[10px] rounded-full flex items-center justify-center
                          font-bold">
                          0
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Inline comment panel for selected image */}
              {selectedImg !== null && (
                <div className="mt-4 border border-blue-200 rounded-2xl overflow-hidden
                  bg-blue-50/30 min-h-[200px]">
                  <CommentThread
                    postId={postId}
                    target={`image:${selectedImg}`}
                    comments={comments.filter((c) => c.target === `image:${selectedImg}`)}
                    currentUser={user}
                    isCreator={isCreator}
                    title={`Comments — Image ${selectedImg + 1}`}
                    onClose={() => setSelectedImg(null)}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No images added.{' '}
              <button
                onClick={startEditImages}
                className="text-blue-400 hover:underline not-italic"
              >
                Add one?
              </button>
            </p>
          )}
        </section>

        {/* ── Body + Comment thread ── */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Body Copy</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editable body */}
            <div>
              {editingBody ? (
                <div>
                  <textarea
                    className="w-full border border-blue-300 rounded-2xl px-4 py-3 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y min-h-[180px]"
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveBody}
                      disabled={saving}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl
                        hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBody(false)}
                      className="text-sm text-gray-400 hover:text-gray-600 border
                        border-gray-200 px-4 py-2 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onClick={startEditBody}
                    className="min-h-[180px] border border-gray-200 rounded-2xl px-4 py-3
                      text-sm text-gray-700 cursor-pointer hover:border-blue-300
                      hover:bg-gray-50/50 transition-all whitespace-pre-wrap"
                  >
                    {post.bodyCopy || (
                      <span className="text-gray-300">Click to add body copy…</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1">Click to edit</p>
                </div>
              )}
            </div>

            {/* Body comment thread */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white
              min-h-[200px]">
              <CommentThread
                postId={postId}
                target="body"
                comments={comments.filter((c) => c.target === 'body')}
                currentUser={user}
                isCreator={isCreator}
                title="Comments on body copy"
              />
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-bold text-gray-800 mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {/* Approve / revoke — available to all signed-in users */}
            <button
              onClick={toggleApprove}
              disabled={!user}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${myApproval
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {myApproval ? '✓ Approved — click to revoke' : 'Approve'}
            </button>

            {/* Creator-only actions */}
            {isCreator && (
              <>
                {post.status !== 'posted' && (
                  <button
                    onClick={() => setStatus('posted')}
                    className="px-4 py-2 rounded-xl text-sm font-medium border
                      bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100
                      transition-all"
                  >
                    Mark as Posted
                  </button>
                )}
                {post.status !== 'scheduled' && (
                  <button
                    onClick={() => setStatus('scheduled')}
                    className="px-4 py-2 rounded-xl text-sm font-medium border
                      bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100
                      transition-all"
                  >
                    Set to Scheduled
                  </button>
                )}
                {post.status !== 'draft' && (
                  <button
                    onClick={() => setStatus('draft')}
                    className="px-4 py-2 rounded-xl text-sm font-medium border
                      bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100
                      transition-all"
                  >
                    Revert to Draft
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border
                    bg-red-50 text-red-600 border-red-200 hover:bg-red-100
                    transition-all"
                >
                  Delete Post
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── History ── */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">History</h2>
          <HistoryLog history={history} />
        </section>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center
          bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Post?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete{' '}
              <strong>"{post.title}"</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm
                  text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm
                  font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
