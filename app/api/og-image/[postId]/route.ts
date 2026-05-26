import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminDb } from '../../../../lib/firebaseAdmin'
import { extractDriveFileId } from '../../../../lib/driveUrl'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params

  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY  = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  try {
    // Fetch post from Firestore via Admin SDK
    const snap = await getAdminDb().collection('posts').doc(postId).get()
    if (!snap.exists) {
      return new NextResponse('Not found', { status: 404 })
    }

    const data   = snap.data() as { images?: string[] }
    const images = data.images ?? []
    if (images.length === 0) {
      return new NextResponse('No image', { status: 404 })
    }

    const fileId = extractDriveFileId(images[0])
    if (!fileId) {
      return new NextResponse('Cannot resolve Drive file ID', { status: 400 })
    }

    // Download image bytes from Drive using service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key:  PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const metaRes = await drive.files.get({
      fileId,
      fields: 'mimeType',
      supportsAllDrives: true,
    })
    const mimeType = metaRes.data.mimeType ?? 'image/jpeg'

    const dlRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    )

    const buffer = Buffer.from(dlRes.data as ArrayBuffer)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':  mimeType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[og-image] error:', err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
