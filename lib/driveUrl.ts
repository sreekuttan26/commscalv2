const DRIVE_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
]

function extractDriveId(url: string): string | null {
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
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
