'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { auth, firestore } from '../firebase/firebase'
import Navbar from '../Components/Navbar'
import SmCalendar from '../Components/SmCalendar'
import PostModal from '../Components/PostModal'
import PostDetail from '../Components/PostDetail'
import type { SMPost } from './types'

export default function SmCalPage() {
  const [user, setUser]                 = useState<any>(null)
  const [posts, setPosts]               = useState<SMPost[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [showNewPost, setShowNewPost]   = useState(false)
  const [prefilledDate, setPrefilledDate] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'posts'), (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SMPost)))
    })
    return () => unsub()
  }, [])

  const openNewPost = (dateStr = '') => {
    setPrefilledDate(dateStr)
    setShowNewPost(true)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <Navbar current_page="SM Cal" />

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        <SmCalendar
          posts={posts}
          onPostClick={(id) => setSelectedPostId(id)}
          onCellClick={(dateStr) => openNewPost(dateStr)}
          onNewPost={() => openNewPost()}
        />
      </div>

      {showNewPost && (
        <PostModal
          user={user}
          prefilledDate={prefilledDate}
          onClose={() => setShowNewPost(false)}
        />
      )}

      {selectedPostId && (
        <PostDetail
          postId={selectedPostId}
          user={user}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  )
}
