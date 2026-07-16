const DRIVE_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
]

export function extractDriveFileId(url: string): string | null {
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractDriveId(url: string): string | null {
  return extractDriveFileId(url)
}

// Returns a thumbnail URL safe for use in <img src="...">
export function convertDriveUrl(url: string): string {
  const id = extractDriveId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url
}

// Returns a higher-resolution thumbnail for lightbox display
export function convertDriveUrlFull(url: string): string {
  const id = extractDriveId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w2000` : url
}

// Returns a URL that triggers a file download
export function getDriveDownloadUrl(url: string): string {
  const id = extractDriveId(url)
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url
}

// Drive's webViewLink never carries the original filename/extension, so a plain
// extension check can't detect videos uploaded through this app. The upload route
// appends a `mediaType=video` marker to the returned link for that case; we also
// check for a real file extension as a best-effort fallback for manually-pasted,
// non-Drive video URLs.
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v)($|\?)/i

export function isLikelyVideo(url: string): boolean {
  return /[?&]mediaType=video(&|$)/i.test(url) || VIDEO_EXTENSIONS.test(url)
}

// For manually-pasted Drive URLs with no marker or extension, the only reliable
// signal is the file's actual MIME type from Drive. Cached in-memory per file ID
// so a given URL is only checked once per session (see app/hooks/useMediaType.ts).
const mediaTypeCache = new Map<string, 'image' | 'video'>()

export async function getMediaType(url: string): Promise<'image' | 'video'> {
  if (isLikelyVideo(url)) return 'video'

  const fileId = extractDriveFileId(url)
  if (!fileId) return 'image'

  const cached = mediaTypeCache.get(fileId)
  if (cached) return cached

  try {
    const res = await fetch(`/api/media-type/${fileId}`)
    if (!res.ok) {
      mediaTypeCache.set(fileId, 'image')
      return 'image'
    }
    const { mimeType } = await res.json()
    const type: 'image' | 'video' = mimeType?.startsWith('video/') ? 'video' : 'image'
    mediaTypeCache.set(fileId, type)
    return type
  } catch {
    mediaTypeCache.set(fileId, 'image')
    return 'image'
  }
}
