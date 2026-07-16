import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
  }

  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY  = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.get({
      fileId,
      fields: 'mimeType',
      supportsAllDrives: true,
    })

    const mimeType = res.data.mimeType ?? 'application/octet-stream'

    return NextResponse.json(
      { mimeType },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } },
    )
  } catch (err) {
    // A file the service account can't see (private, not shared) is the most
    // common expected case here — the client falls back to image treatment.
    console.error('[media-type] error for file', fileId, err)
    return NextResponse.json({ error: 'Failed to fetch media type' }, { status: 500 })
  }
}
