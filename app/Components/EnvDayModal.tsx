'use client'
import { useEffect, useState } from 'react'
import { db } from '../firebase/firebase'
import { ref, push, set, update } from 'firebase/database'
import { formatISTTimestamp } from '../../lib/time'
import { ENV_DAY_CATEGORIES, daysInMonth } from '../../lib/envDays'
import type { EnvDay } from '../hooks/useEnvDays'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Props = {
  day: EnvDay | null   // null = adding a new day
  currentUserEmail: string
  onClose: () => void
  onSaved: () => void
}

export default function EnvDayModal({ day, currentUserEmail, onClose, onSaved }: Props) {
  const [name, setName] = useState(day?.name ?? '')
  const [month, setMonth] = useState(day?.month ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState(day?.day ?? 1)
  const [year, setYear] = useState(day?.year ? String(day.year) : '')
  const [category, setCategory] = useState(day?.category ?? '')
  const [description, setDescription] = useState(day?.description ?? '')

  const [nameError, setNameError] = useState('')
  const [dayError, setDayError] = useState('')
  const [yearError, setYearError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required.')
      return
    }
    setNameError('')

    const trimmedYear = year.trim()
    let yearNum: number | null = null
    if (trimmedYear) {
      yearNum = parseInt(trimmedYear, 10)
      if (!Number.isInteger(yearNum) || trimmedYear.length !== 4 || yearNum < 1900 || yearNum > 2100) {
        setYearError('Enter a 4-digit year between 1900 and 2100, or leave blank.')
        return
      }
    }
    setYearError('')

    const maxDay = daysInMonth(month, yearNum ?? undefined)
    if (dayOfMonth < 1 || dayOfMonth > maxDay) {
      setDayError(`Enter a valid day for ${MONTH_NAMES[month - 1]} (1-${maxDay}).`)
      return
    }
    setDayError('')
    setSubmitError('')

    setSubmitting(true)
    try {
      const payload = {
        name: trimmedName,
        month,
        day: dayOfMonth,
        year: yearNum,
        category,
        description: description.trim(),
      }

      if (day) {
        await update(ref(db, `/envDays/${day.id}`), {
          ...payload,
          editedBy: currentUserEmail,
          editedAt: formatISTTimestamp(new Date()),
        })
      } else {
        const newRef = push(ref(db, '/envDays'))
        await set(newRef, {
          ...payload,
          createdBy: currentUserEmail,
          createdAt: formatISTTimestamp(new Date()),
          editedBy: '',
          editedAt: '',
        })
      }
      onSaved()
    } catch {
      setSubmitError('Failed to save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!submitting) onClose() }} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
        <h1 className="font-bold text-lg text-gray-800">{day ? 'Edit environmental day' : 'Add environmental day'}</h1>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Name</label>
          <input
            type="text"
            placeholder="e.g., World Environment Day"
            className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError('') }}
          />
          {nameError && <p className="text-xs text-red-500">{nameError}</p>}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-500">Month</label>
            <select
              className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setDayError('') }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-20">
            <label className="text-xs font-medium text-gray-500">Day</label>
            <input
              type="number"
              min={1}
              max={31}
              className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full"
              value={dayOfMonth}
              onChange={(e) => { setDayOfMonth(Number(e.target.value)); setDayError('') }}
            />
          </div>

          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs font-medium text-gray-500">Year</label>
            <input
              type="number"
              placeholder="Annual"
              className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full"
              value={year}
              onChange={(e) => { setYear(e.target.value); setYearError('') }}
            />
          </div>
        </div>
        {dayError && <p className="text-xs text-red-500 -mt-2">{dayError}</p>}
        {yearError && <p className="text-xs text-red-500 -mt-2">{yearError}</p>}
        <p className="text-[11px] text-gray-400 -mt-2">
          Leave Year blank for a day that repeats every year. Set a specific year for a one-time event.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Category (optional)</label>
          <select
            className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">—</option>
            {ENV_DAY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Description (optional)</label>
          <textarea
            rows={3}
            placeholder="Shown in the popup when clicked"
            className="text-sm p-2 border-2 border-gray-100 rounded-xl w-full resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {submitError && <p className="text-xs text-red-500">{submitError}</p>}

        <div className="flex gap-3 justify-end mt-1">
          <button
            className="p-2 px-4 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="p-2 px-4 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
