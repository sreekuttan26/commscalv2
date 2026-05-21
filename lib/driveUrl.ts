// Extracts the Google Drive file ID from any common share URL format
// and returns a thumbnail URL safe for use in <img src="...">
export function convertDriveUrl(url: string): string {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,   // /file/d/{id}/view
    /[?&]id=([a-zA-Z0-9_-]+)/,       // ?id={id} or &id={id}
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`
    }
  }
  return url
}
