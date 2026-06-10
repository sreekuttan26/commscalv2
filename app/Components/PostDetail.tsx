'use client'
import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase/firebase'
import type { SMPost, SMComment, HistoryEvent, PostActor, AppNotification } from '../smcal/types'
import { convertDriveUrl, convertDriveUrlFull, getDriveDownloadUrl } from '../../lib/driveUrl'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import CommentThread from './CommentThread'
import HistoryLog from './HistoryLog'
import ImageSlotList from './ImageSlotList'
import { useUsers } from '../constants'
import { notify } from '../../lib/notifications'
import { emailToColor, getInitial } from '../../lib/assignColor'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { badge: 'bg-gray-100   text-gray-600   border-gray-200',   icon: '✏️',  label: 'Draft'     },
  scheduled: { badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🕐', label: 'Scheduled' },
  approved:  { badge: 'bg-blue-100   text-blue-700   border-blue-200',   icon: '✓',  label: 'Approved'  },
  posted:    { badge: 'bg-green-100  text-green-700  border-green-200',  icon: '📤', label: 'Posted'    },
} as const

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
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
  const [editingDocUrl,   setEditingDocUrl]   = useState(false)
  const [docUrlDraft,     setDocUrlDraft]     = useState('')

  // Image comment panel
  const [selectedImg, setSelectedImg] = useState<number | null>(null)

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Assignment
  const { users } = useUsers()
  const [showAssignMenu, setShowAssignMenu] = useState(false)

  // Share link
  const [copied, setCopied] = useState(false)
  const copyShareLink = () => {
    if (!post) return
    const url      = `${window.location.origin}/smcal/${postId}`
    const dateTime = formatIST(post.scheduledAt)
    const text     = `${post.title} — ${dateTime}\n${url}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
      query(collection(firestore, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')),
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
  // Assignee acts as "creator" for permission purposes; falls back to createdBy for
  // legacy posts that predate the assignedTo field.
  const isAssignee  = post.assignedTo
    ? post.assignedTo === user?.email
    : post.createdBy?.uid === user?.uid
  const isAdmin     = users.find((u) => u.email === user?.email)?.role === 'admin'
  const cfg         = STATUS_CFG[post.status] ?? STATUS_CFG.draft
  const myApproval  = (post.approvedBy || []).find((a) => a.uid === user?.uid)
  const hasApproval = (post.approvedBy?.length ?? 0) > 0

  const actor: PostActor = {
    uid:      user?.uid      || '',
    name:     user?.displayName || 'User',
    photoURL: user?.photoURL || '',
    email:    user?.email || '',
  }

  const notifyActor = {
    email:    user?.email || '',
    name:     user?.displayName || 'User',
    photoURL: user?.photoURL || '',
  }

  // Recipients for post-level notifications: creator + current assignee
  const ownerRecipients = [post.createdBy?.email, post.assignedTo]

  const notifyOwners = async (type: AppNotification['type'], message: string) => {
    await notify({
      recipients: ownerRecipients,
      actor: notifyActor,
      type,
      postId,
      postTitle: post.title,
      message,
    })
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
    await notifyOwners('post_edited', `${actor.name} changed the title of "${post.title}"`)
    // Rename the Drive subfolder to match the new title (fire-and-forget)
    fetch('/api/rename-sm-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, newTitle: titleDraft.trim() }),
    }).catch(() => {})
    setSaving(false); setEditingTitle(false)
  }

  const saveSchedule = async () => {
    setSaving(true)
    const newDate = dayjs.tz(scheduleDraft, IST).toDate()
    const before  = formatIST(post.scheduledAt)
    const after   = dayjs.tz(scheduleDraft, IST).format('DD MMM YYYY, hh:mm A')
    await updateDoc(doc(firestore, 'posts', postId), { scheduledAt: Timestamp.fromDate(newDate) })
    await log('schedule_changed', before, after)
    await notifyOwners('post_edited', `${actor.name} rescheduled "${post.title}"`)
    setSaving(false); setEditingSchedule(false)
  }

  const saveBody = async () => {
    if (bodyDraft === post.bodyCopy) { setEditingBody(false); return }
    setSaving(true)
    await updateDoc(doc(firestore, 'posts', postId), { bodyCopy: bodyDraft })
    await log('body_edit', post.bodyCopy, bodyDraft)
    await notifyOwners('post_edited', `${actor.name} edited the body copy of "${post.title}"`)
    setSaving(false); setEditingBody(false)
  }

  const saveImages = async () => {
    setSaving(true)
    const trimmed = imagesDraft.filter((u) => u.trim())
    const oldSet  = new Set(post.images)
    const newSet  = new Set(trimmed)
    const added   = trimmed.filter((u) => !oldSet.has(u))
    const removed = post.images.filter((u) => !newSet.has(u))
    // Detect reorder: URLs that exist in both old and new, but in a different order
    const oldKept = post.images.filter((u) => newSet.has(u))
    const newKept = trimmed.filter((u) => oldSet.has(u))
    const reordered = oldKept.length === newKept.length && oldKept.some((u, i) => u !== newKept[i])
    await updateDoc(doc(firestore, 'posts', postId), { images: trimmed })
    for (const url of added)   await log('image_added',   undefined, url)
    for (const url of removed) await log('image_removed', url, undefined)
    if (reordered) await log('image_reordered', JSON.stringify(oldKept), JSON.stringify(newKept))
    if (added.length || removed.length || reordered) {
      await notifyOwners('post_edited', `${actor.name} updated the images of "${post.title}"`)
    }
    setSaving(false); setEditingImages(false)
  }

  const saveDocUrl = async () => {
    const trimmed = docUrlDraft.trim()
    if (trimmed === (post.docUrl || '')) { setEditingDocUrl(false); return }
    setSaving(true)
    await updateDoc(doc(firestore, 'posts', postId), { docUrl: trimmed })
    await log('doc_url_edit', post.docUrl || '', trimmed)
    await notifyOwners('post_edited', `${actor.name} updated the document URL of "${post.title}"`)
    setSaving(false); setEditingDocUrl(false)
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
      await notifyOwners('approval_reverted', `${actor.name} revoked their approval on "${post.title}"`)
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
      await notifyOwners('post_approved', `${actor.name} approved "${post.title}"`)
    }
  }

  // ── Status change ────────────────────────────────────────────────────────────
  const setStatus = async (status: SMPost['status']) => {
    if ((status === 'scheduled' || status === 'posted') && !hasApproval) return
    const prev = post.status
    await updateDoc(doc(firestore, 'posts', postId), { status })
    await log('status_changed', prev, status)
    await notifyOwners('status_changed', `${actor.name} changed the status of "${post.title}" from ${prev} to ${status}`)

    // Bidirectional sync with linked task
    if (post.sourceTaskId) {
      const taskRef = doc(firestore, 'tasks', post.sourceTaskId)
      if (status === 'posted') {
        await updateDoc(taskRef, { current_status: 'Posted' })
      } else if (prev === 'posted') {
        const taskSnap = await getDoc(taskRef)
        if (taskSnap.exists() && taskSnap.data().current_status === 'Posted') {
          await updateDoc(taskRef, { current_status: 'In Progress' })
        }
      }
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    await deleteDoc(doc(firestore, 'posts', postId))
    onClose()
  }

  // ── Reassign ─────────────────────────────────────────────────────────────────
  const reassign = async (newEmail: string) => {
    setShowAssignMenu(false)
    if (newEmail === post.assignedTo) return
    const newUser = users.find((u) => u.email === newEmail)
    const newName = newUser?.displayName || newEmail
    const before = JSON.stringify({ email: post.assignedTo || '', name: post.assignedToName || '' })
    const after  = JSON.stringify({ email: newEmail, name: newName })
    await updateDoc(doc(firestore, 'posts', postId), {
      assignedTo: newEmail,
      assignedToName: newName,
    })
    await log('assignment_changed', before, after)
    await notify({
      recipients: [newEmail],
      actor: notifyActor,
      type: 'post_assigned',
      postId,
      postTitle: post.title,
      message: `${actor.name} assigned you to "${post.title}"`,
    })
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
  const startEditImages = () => { setImagesDraft([...(post.images || [])]); setEditingImages(true) }
  const startEditDocUrl = () => { setDocUrlDraft(post.docUrl || ''); setEditingDocUrl(true) }

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

          <button
            onClick={copyShareLink}
            title="Copy shareable link"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200
              bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700
              transition-colors whitespace-nowrap"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>
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

          {/* Assigned to */}
          <div className="relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Assigned to
            </p>
            <div
              className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer group' : ''}`}
              onClick={() => isAdmin && setShowAssignMenu((v) => !v)}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs
                  font-bold text-white flex-shrink-0"
                style={{ backgroundColor: emailToColor(post.assignedTo || post.createdBy?.email || '') }}
                title={post.assignedToName || post.createdBy?.name}
              >
                {getInitial(post.assignedToName || post.createdBy?.name || '?')}
              </div>
              <p className="text-sm font-medium text-gray-800">
                {post.assignedToName || post.createdBy?.name}
              </p>
              {isAdmin && (
                <span className="text-gray-300 text-xs group-hover:text-gray-500">▾</span>
              )}
            </div>

            {showAssignMenu && (
              <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white
                border border-gray-200 rounded-xl shadow-lg py-1">
                {users.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => reassign(u.email)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50
                      flex items-center gap-2
                      ${u.email === post.assignedTo ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center
                        text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: emailToColor(u.email) }}
                    >
                      {getInitial(u.displayName || u.email)}
                    </div>
                    <span className="truncate">{u.displayName || u.email}</span>
                  </button>
                ))}
              </div>
            )}
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

          {/* Document URL */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Document URL
            </p>
            {editingDocUrl ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="flex-1 min-w-0 border border-blue-300 rounded-lg px-2 py-1.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="https://docs.google.com/…"
                  value={docUrlDraft}
                  onChange={(e) => setDocUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDocUrl()
                    if (e.key === 'Escape') setEditingDocUrl(false)
                  }}
                  autoFocus
                />
                <button
                  onClick={saveDocUrl}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg
                    hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingDocUrl(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {post.docUrl ? (
                  <a
                    href={post.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {post.docUrl}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">No document linked.</p>
                )}
                <button
                  onClick={startEditDocUrl}
                  className="text-gray-300 hover:text-gray-600 flex-shrink-0 text-base"
                  title="Edit document URL"
                >
                  ✎
                </button>
              </div>
            )}
          </div>
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
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Paste a Google Drive link or click <strong>Upload</strong> to upload directly.
                Uploaded files are shared automatically.
              </p>
              <ImageSlotList
                initialUrls={imagesDraft}
                postId={postId}
                postTitle={post.title}
                onChange={setImagesDraft}
              />
            </div>
          ) : (post.images?.length ?? 0) > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(post.images || []).map((url, i) => {
                  const count     = unresolvedFor(`image:${i}`)
                  const isSelected = selectedImg === i
                  return (
                    <div key={i} className="relative group">
                      <div
                        onClick={() => setSelectedImg(isSelected ? null : i)}
                        className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer
                          relative transition-all
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
                        {/* View / Download overlay */}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center
                          gap-2 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(url) }}
                            className="text-white text-[11px] font-medium px-2.5 py-1 rounded-lg
                              bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors"
                          >
                            View
                          </button>
                          <a
                            href={getDriveDownloadUrl(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-white text-[11px] font-medium px-2.5 py-1 rounded-lg
                              bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors"
                          >
                            Download
                          </a>
                        </div>
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
                    isAssignee={isAssignee}
                    title={`Comments — Image ${selectedImg + 1}`}
                    onClose={() => setSelectedImg(null)}
                    postTitle={post.title}
                    creatorEmail={post.createdBy?.email}
                    assigneeEmail={post.assignedTo}
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
                isAssignee={isAssignee}
                title="Comments on body copy"
                postTitle={post.title}
                creatorEmail={post.createdBy?.email}
                assigneeEmail={post.assignedTo}
              />
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-bold text-gray-800 mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {/* Approve / revoke — universal */}
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

            {/* Mark as Posted: creator always; any user once post is approved/posted */}
            {user && (isAssignee || post.status === 'approved' || post.status === 'posted') && post.status !== 'posted' && (
              <button
                onClick={() => setStatus('posted')}
                disabled={!hasApproval}
                title={!hasApproval ? 'Requires at least one approval' : undefined}
                className="px-4 py-2 rounded-xl text-sm font-medium border
                  bg-green-50 text-green-700 border-green-200 hover:bg-green-100
                  transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  disabled:hover:bg-green-50"
              >
                Mark as Posted
              </button>
            )}

            {/* Set to Scheduled: creator always; any user once post is approved/posted */}
            {user && (isAssignee || post.status === 'approved' || post.status === 'posted') && post.status !== 'scheduled' && (
              <button
                onClick={() => setStatus('scheduled')}
                disabled={!hasApproval}
                title={!hasApproval ? 'Requires at least one approval' : undefined}
                className="px-4 py-2 rounded-xl text-sm font-medium border
                  bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100
                  transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  disabled:hover:bg-purple-50"
              >
                Set to Scheduled
              </button>
            )}

            {/* Approval warning — for anyone who can see the above buttons */}
            {user && (isAssignee || post.status === 'approved' || post.status === 'posted') && !hasApproval && (
              <p className="w-full text-xs text-amber-600 bg-amber-50 border border-amber-200
                rounded-xl px-3 py-2 mt-1">
                Scheduling and posting require at least one approval.
              </p>
            )}

            {/* Creator-only: revert to draft + delete */}
            {isAssignee && (
              <>
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

      {/* ── Image lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center
            bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
              rounded-full bg-white/10 hover:bg-white/25 text-white text-lg transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <img
            src={convertDriveUrlFull(lightboxUrl)}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
