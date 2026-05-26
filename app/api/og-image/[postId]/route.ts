import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { adminDb } from '@/lib/firebaseAdmin'
import { extractDriveFileId } from '@/lib/driveUrl'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params

  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY  = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  try {
    const docSnap = await adminDb.collection('posts').doc(postId).get()
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const post       = docSnap.data() as { images?: string[] }
    const firstImage = post.images?.[0]
    if (!firstImage) {
      return NextResponse.json({ error: 'No image' }, { status: 404 })
    }

    const fileId = extractDriveFileId(firstImage)
    if (!fileId) {
      return NextResponse.json({ error: 'Invalid Drive URL' }, { status: 400 })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key:  PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const meta = await drive.files.get({
      fileId,
      fields: 'mimeType',
      supportsAllDrives: true,
    })
    const mimeType = meta.data.mimeType ?? 'image/jpeg'

    const fileRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    )

    return new NextResponse(Buffer.from(fileRes.data as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type':  mimeType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('[og-image] error for post', postId, err)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
