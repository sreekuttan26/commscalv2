'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase/firebase'
import PostDetail from '../../Components/PostDetail'

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
}

interface Props {
  postId: string
}

export default function PostPageClient({ postId }: Props) {
  const router = useRouter()
  const [user, setUser]           = useState<CurrentUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  if (!authReady) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <PostDetail
      postId={postId}
      user={user}
      onClose={() => router.push('/smcal')}
    />
  )
}
