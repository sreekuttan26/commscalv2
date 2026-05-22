import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  const FOLDER_ID    = process.env.GOOGLE_DRIVE_FOLDER_ID_SM
  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY  = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!FOLDER_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Missing env variables' }, { status: 500 })
  }

  try {
    const { postId, newTitle } = await req.json()
    if (!postId || !newTitle) {
      return NextResponse.json({ error: 'Missing postId or newTitle' }, { status: 400 })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const searchRes = await drive.files.list({
      q: `name contains '${postId}_' and '${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
    })

    if (!searchRes.data.files || searchRes.data.files.length === 0) {
      // No folder yet — no uploads have happened for this post; nothing to rename
      return NextResponse.json({ message: 'No folder found — nothing to rename' }, { status: 200 })
    }

    const folder = searchRes.data.files[0]
    await drive.files.update({
      fileId: folder.id!,
      supportsAllDrives: true,
      requestBody: { name: `${postId}_${newTitle}` },
    })

    return NextResponse.json({ message: 'Folder renamed successfully' }, { status: 200 })

  } catch (error) {
    console.error('rename-sm-folder error:', error)
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 })
  }
}
