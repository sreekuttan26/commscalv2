'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { EnvDay } from '../hooks/useEnvDays'
import { categoryStyle, formatShortDate } from '../../lib/envDays'

type Props = {
  day: EnvDay
  anchor: HTMLElement
  onClose: () => void
}

export default function EnvDayPopover({ day, anchor, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect()
    const width = 256
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    if (left < 8) left = 8
    let top = rect.bottom + 6
    if (top + 140 > window.innerHeight) top = Math.max(8, rect.top - 6 - 140)
    setPos({ top, left })
  }, [anchor])

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (anchor.contains(target)) return
      onClose()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchor, onClose])

  const style = categoryStyle(day.category)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className="z-[60] w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3"
    >
      <p className="text-sm font-bold text-gray-800">{day.name}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{formatShortDate(day.month, day.day)}</p>
      {day.category && (
        <span className={`inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {day.category}
        </span>
      )}
      {day.description && (
        <p className="text-xs text-gray-600 mt-2 leading-snug">{day.description}</p>
      )}
    </div>
  )
}
