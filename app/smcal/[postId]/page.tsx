import type { Metadata } from 'next'
import { getAdminDb } from '../../../lib/firebaseAdmin'
import { extractDriveFileId } from '../../../lib/driveUrl'
import PostPageClient from './PostPageClient'

interface Props {
  params: Promise<{ postId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  try {
    const snap = await getAdminDb().collection('posts').doc(postId).get()
    if (!snap.exists) {
      return { title: 'Post not found' }
    }

    const data = snap.data() as {
      title?: string
      bodyCopy?: string
      images?: string[]
    }

    const title       = data.title    ?? 'Social Media Post'
    const description = (data.bodyCopy ?? '').slice(0, 200)
    const firstImage  = data.images?.[0] ?? ''
    const fileId      = firstImage ? extractDriveFileId(firstImage) : null
    const ogImage     = fileId
      ? `${appUrl}/api/og-image/${postId}`
      : undefined

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url:    `${appUrl}/smcal/${postId}`,
        type:   'article',
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card:        ogImage ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    }
  } catch {
    return { title: 'Social Media Post' }
  }
}

export default async function PostPage({ params }: Props) {
  const { postId } = await params
  return <PostPageClient postId={postId} />
}
