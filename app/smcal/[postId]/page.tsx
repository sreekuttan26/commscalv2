import type { Metadata } from 'next'
import { adminDb } from '@/lib/firebaseAdmin'
import { extractDriveFileId } from '@/lib/driveUrl'
import PostPageClient from './PostPageClient'

type Props = {
  params: Promise<{ postId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  try {
    const docSnap = await adminDb.collection('posts').doc(postId).get()
    if (!docSnap.exists) {
      return { title: 'Post not found' }
    }

    const post       = docSnap.data() as { title?: string; bodyCopy?: string; images?: string[] }
    const title       = post.title    ?? 'Social Media Post'
    const description = (post.bodyCopy ?? '').slice(0, 200)
    const hasImage    = Array.isArray(post.images) && post.images.length > 0
    const fileId      = hasImage ? extractDriveFileId(post.images![0]) : null
    const ogImageUrl  = fileId ? `${appUrl}/api/og-image/${postId}` : undefined

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url:    `${appUrl}/smcal/${postId}`,
        type:   'article',
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : [],
      },
      twitter: {
        card:        'summary_large_image',
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    }
  } catch (err) {
    console.error('[generateMetadata] error for post', postId, err)
    return { title: 'Social Media Post' }
  }
}

export default async function Page({ params }: Props) {
  const { postId } = await params
  return <PostPageClient postId={postId} />
}
