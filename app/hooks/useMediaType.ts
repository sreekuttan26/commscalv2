'use client'
import { useEffect, useState } from 'react'
import { getMediaType, isLikelyVideo } from '../../lib/driveUrl'

// Resolves synchronously to 'video' when the URL already carries the upload-time
// marker or a recognizable extension (the common case — no network call). For
// manually-pasted URLs with neither, it optimistically renders as 'image' (today's
// existing behavior, so plain images never flash a loading state) and upgrades to
// 'video' in the background if the Drive metadata lookup says otherwise.
export function useMediaType(url: string | undefined): 'image' | 'video' {
  const [type, setType] = useState<'image' | 'video'>(() => (url && isLikelyVideo(url)) ? 'video' : 'image')

  useEffect(() => {
    if (!url || isLikelyVideo(url)) {
      setType(url && isLikelyVideo(url) ? 'video' : 'image')
      return
    }
    let cancelled = false
    getMediaType(url).then((t) => {
      if (!cancelled && t === 'video') setType('video')
    })
    return () => { cancelled = true }
  }, [url])

  return type
}
