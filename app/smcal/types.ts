import { Timestamp } from 'firebase/firestore'

export type PostStatus = 'draft' | 'scheduled' | 'approved' | 'posted'

export type PostActor = {
  uid: string
  name: string
  photoURL: string
}

export type Approval = {
  uid: string
  name: string
  photoURL: string
  approvedAt: Timestamp
}

export type SMPost = {
  id?: string
  title: string
  bodyCopy: string
  images: string[]
  scheduledAt: Timestamp
  status: PostStatus
  createdBy: PostActor
  createdAt: Timestamp
  approvedBy: Approval[]
}

export type CommentReply = {
  uid: string
  name: string
  photo: string
  text: string
  createdAt: Timestamp
}

export type SMComment = {
  id?: string
  target: string   // "body" | "image:0" | "image:1" etc.
  authorUid: string
  authorName: string
  authorPhoto: string
  text: string
  createdAt: Timestamp
  resolved: boolean
  replies: CommentReply[]
}

export type HistoryEventType =
  | 'body_edit'
  | 'title_edit'
  | 'image_added'
  | 'image_removed'
  | 'schedule_changed'
  | 'status_changed'
  | 'approved'
  | 'approval_reverted'
  | 'comment_resolved'

export type HistoryEvent = {
  id?: string
  type: HistoryEventType
  actor: PostActor
  timestamp: Timestamp
  before?: string
  after?: string
}
