import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const FOLDER_ID    = process.env.GOOGLE_DRIVE_FOLDER_ID_SM
  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY  = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!FOLDER_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Missing env variables' }, { status: 500 })
  }

  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as Blob | null
    const fileName  = formData.get('fileName') as string | null
    const postId    = formData.get('postId') as string | null
    const postTitle = formData.get('postTitle') as string | null

    if (!file || !fileName || !postId || !postTitle) {
      return NextResponse.json({ error: 'Missing required fields (file, fileName, postId, postTitle)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" is not allowed. Use PNG, JPEG, WebP or GIF.` }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 10 MB size limit.' }, { status: 400 })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
    const drive = google.drive({ version: 'v3', auth })

    // ── Find or create the post subfolder ────────────────────────────────────
    // Sanitize postId for Drive query (Firestore IDs are alphanumeric + hyphen, but be safe)
    const safePostId = postId.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const searchRes = await drive.files.list({
      // No parent constraint: includeItemsFromAllDrives requires omitting 'in parents' for Shared Drives
      q: `name contains '${safePostId}_' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    let folderId: string
    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id!
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: `${postId}_${postTitle}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [FOLDER_ID],
        },
        fields: 'id',
        supportsAllDrives: true,
      })
      folderId = folderRes.data.id!
    }

    // ── Upload the file ───────────────────────────────────────────────────────
    const buffer    = Buffer.from(await file.arrayBuffer())
    const uploadRes = await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: file.type, body: Readable.from(buffer) },
      fields: 'id, name, webViewLink',
    })

    const uploaded = uploadRes.data

    // ── Make file publicly readable so thumbnails work ────────────────────────
    await drive.permissions.create({
      fileId: uploaded.id!,
      supportsAllDrives: true,
      requestBody: { type: 'anyone', role: 'reader' },
    })

    return NextResponse.json({
      fileID:   uploaded.id,
      filename: uploaded.name,
      filelink: uploaded.webViewLink,
      folderID: folderId,
    }, { status: 200 })

  } catch (error) {
    console.error('upload-sm error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
