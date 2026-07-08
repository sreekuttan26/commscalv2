'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { db } from '../firebase/firebase'
import { ref, remove, push, set, update } from 'firebase/database'
import { FaPencilAlt, FaTrash, FaPlus, FaDownload, FaUpload } from 'react-icons/fa'
import type { EnvDay } from '../hooks/useEnvDays'
import EnvDayModal from './EnvDayModal'
import EnvDayPopover from './EnvDayPopover'
import { formatISTTimestamp } from '../../lib/time'
import {
  ENV_DAY_CATEGORIES,
  categoryStyle,
  daysInMonth,
  daysUntil,
  formatDateWithYear,
  formatShortDate,
  nextOccurrence,
  relativeCountdown,
} from '../../lib/envDays'

const LOOKAHEAD_KEY = 'smcal.envDaysLookahead'
const DEFAULT_LOOKAHEAD = 30
const CSV_COLUMNS = ['name', 'month', 'day', 'year', 'category', 'description']

type Props = {
  days: EnvDay[]
  isAdmin: boolean
  currentUserEmail: string
}

type CsvRow = {
  name: string
  month: number
  day: number
  year: number | null
  category: string
  description: string
}

function formatMeta(entry: EnvDay): string {
  const parts: string[] = []
  if (entry.createdBy) {
    parts.push(`Added by ${entry.createdBy.split('@')[0]}${entry.createdAt ? ` · ${entry.createdAt.slice(0, 10)}` : ''}`)
  }
  if (entry.editedBy) {
    parts.push(`Edited by ${entry.editedBy.split('@')[0]}${entry.editedAt ? ` · ${entry.editedAt.slice(0, 10)}` : ''}`)
  }
  return parts.join(' · ')
}

function validateRow(row: any, index: number): string | CsvRow {
  const rowNum = index + 2 // +1 for 0-index, +1 for header row

  if (!row.name || !String(row.name).trim()) return `Row ${rowNum}: Missing name`
  const name = String(row.name).trim()

  const m = Number(row.month)
  if (!Number.isInteger(m) || m < 1 || m > 12) return `Row ${rowNum}: Invalid month "${row.month}"`

  const yearRaw = row.year !== undefined ? String(row.year).trim() : ''
  let year: number | null = null
  if (yearRaw !== '') {
    const y = Number(yearRaw)
    if (!Number.isInteger(y) || yearRaw.length !== 4 || y < 1900 || y > 2100) {
      return `Row ${rowNum}: Invalid year "${row.year}"`
    }
    year = y
  }

  const d = Number(row.day)
  const maxDay = daysInMonth(m, year ?? undefined)
  if (!Number.isInteger(d) || d < 1 || d > maxDay) return `Row ${rowNum}: Invalid day "${row.day}" for month ${m}`

  const category = row.category ? String(row.category).trim() : ''
  if (category && !(ENV_DAY_CATEGORIES as readonly string[]).includes(category)) {
    return `Row ${rowNum}: Invalid category "${category}" (allowed: ${ENV_DAY_CATEGORIES.join(', ')})`
  }

  return {
    name,
    month: m,
    day: d,
    year,
    category,
    description: row.description ? String(row.description).trim() : '',
  }
}

export default function UpcomingEnvDays({ days, isAdmin, currentUserEmail }: Props) {
  const [lookahead, setLookahead] = useState(DEFAULT_LOOKAHEAD)
  const [editMode, setEditMode] = useState(false)
  const [minimize, setMinimize] = useState(true)
  const [modalDay, setModalDay] = useState<EnvDay | null | undefined>(undefined) // undefined = closed, null = adding
  const [popupDay, setPopupDay] = useState<EnvDay | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const [importErrors, setImportErrors] = useState<string[] | null>(null)
  const [importPreview, setImportPreview] = useState<{ updated: number; added: number; rows: CsvRow[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(LOOKAHEAD_KEY)
    if (stored) {
      const n = Number(stored)
      if (Number.isFinite(n) && n >= 1 && n <= 365) setLookahead(n)
    }
  }, [])

  const updateLookahead = (n: number) => {
    const clamped = Math.min(365, Math.max(1, n))
    setLookahead(clamped)
    window.localStorage.setItem(LOOKAHEAD_KEY, String(clamped))
  }

  const showToast = (message: string) => {
    setToastMsg(message)
    window.setTimeout(() => setToastMsg(null), 3000)
  }

  const today = useMemo(() => new Date(), [])

  const upcoming = useMemo(() => {
    return days
      .map((d) => ({ day: d, occ: nextOccurrence(d, today) }))
      .filter((x): x is { day: EnvDay; occ: Date } => x.occ !== null)
      .map((x) => ({ day: x.day, daysAway: daysUntil(x.occ, today) }))
      .filter((x) => x.daysAway >= 0 && x.daysAway <= lookahead)
      .sort((a, b) => a.daysAway - b.daysAway)
  }, [days, lookahead, today])

  const allSorted = useMemo(() => {
    return [...days].sort((a, b) => (a.month - b.month) || (a.day - b.day))
  }, [days])

  const openPopup = (d: EnvDay, e: React.MouseEvent<HTMLElement>) => {
    setPopupDay(d)
    setPopupAnchor(e.currentTarget)
  }

  const handleDelete = async (d: EnvDay) => {
    const ok = window.confirm(`Delete '${d.name}'?`)
    if (!ok) return
    try {
      await remove(ref(db, `/envDays/${d.id}`))
    } catch (err) {
      console.error('Failed to delete env day:', err)
    }
  }

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    const rows = allSorted.map((d) => ({
      name: d.name,
      month: d.month,
      day: d.day,
      year: d.year ?? '',
      category: d.category ?? '',
      description: d.description ?? '',
    }))
    const csv = Papa.unparse(rows, { columns: CSV_COLUMNS })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `env-days-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const errors: string[] = []
        const validRows: CsvRow[] = []
        results.data.forEach((row: any, i: number) => {
          const outcome = validateRow(row, i)
          if (typeof outcome === 'string') errors.push(outcome)
          else validRows.push(outcome)
        })

        if (errors.length > 0) {
          setImportErrors(errors)
        } else {
          const existingNames = new Set(days.map((d) => d.name.trim()))
          let updated = 0
          let added = 0
          validRows.forEach((r) => (existingNames.has(r.name) ? updated++ : added++))
          setImportPreview({ updated, added, rows: validRows })
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    })
  }

  const confirmImport = async () => {
    if (!importPreview) return
    setImporting(true)

    const existingByName: Record<string, EnvDay> = {}
    days.forEach((d) => { existingByName[d.name.trim()] = d })

    const now = formatISTTimestamp(new Date())
    const ops: Promise<any>[] = []

    for (const row of importPreview.rows) {
      const existing = existingByName[row.name]
      if (existing) {
        ops.push(update(ref(db, `/envDays/${existing.id}`), {
          ...row,
          editedBy: currentUserEmail,
          editedAt: now,
        }))
      } else {
        const newRef = push(ref(db, '/envDays'))
        ops.push(set(newRef, {
          ...row,
          createdBy: currentUserEmail,
          createdAt: now,
          editedBy: '',
          editedAt: '',
        }))
      }
    }

    try {
      await Promise.all(ops)
      showToast(`Imported: ${importPreview.updated} updated, ${importPreview.added} added`)
    } catch (err) {
      console.error('Failed to import env days:', err)
      showToast('Import failed partway through. Check console for details.')
    } finally {
      setImporting(false)
      setImportPreview(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div onClick={()=>setMinimize(!minimize)} className={`text-xs cursor-pointer p-4 ${minimize?'flex':"hidden"}`}>Upcoming Important Days</div>
       {!minimize && <div>

     
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
       
        <h2 className={`text-sm font-bold text-gray-800 `}>Upcoming Important days</h2>
        {isAdmin &&  (
          editMode ? (
            <button
              onClick={() => setEditMode(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              × Close
            </button>
          ) : (<div className='gap-5 flex'>

            <button
              onClick={() => setMinimize(true)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Minimize
            </button>
            <button
              onClick={() => setEditMode(true)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Edit
            </button>
            </div>
          )
        )}
      </div>

      {!editMode ? (
        <div className="px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            Next:
            <input
              type="number"
              min={1}
              max={365}
              value={lookahead}
              onChange={(e) => updateLookahead(Number(e.target.value))}
              className="w-14 text-xs p-1 border border-gray-200 rounded-lg text-center"
            />
            days
          </label>

          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No environmental days in the next {lookahead} days. Try increasing the lookahead.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {upcoming.map(({ day: d, daysAway }) => {
                const style = categoryStyle(d.category)
                return (
                  <button
                    key={d.id}
                    onClick={(e) => openPopup(d, e)}
                    className="flex items-start gap-2 py-2 text-left hover:bg-gray-50/70 rounded-lg px-1 -mx-1"
                  >
                    <span className="text-sm leading-5">🌿</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        {d.name} — {formatShortDate(d.month, d.day)}{' '}
                        <span className="text-gray-400 font-normal">({relativeCountdown(daysAway)})</span>
                      </p>
                      {d.category && (
                        <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                          {d.category}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setModalDay(null)}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-blue-700"
            >
              <FaPlus size={10} /> Add day
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
            >
              <FaDownload size={10} /> Download CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
            >
              <FaUpload size={10} /> Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>

          {allSorted.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No environmental days yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {allSorted.map((d) => {
                const style = categoryStyle(d.category)
                const meta = formatMeta(d)
                return (
                  <div key={d.id} className="flex items-start justify-between gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">🌿</span>
                        <p className="text-sm text-gray-800 truncate">
                          {d.name} — {formatDateWithYear(d.month, d.day, d.year)}
                        </p>
                        {d.category && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                            {d.category}
                          </span>
                        )}
                      </div>
                      {meta && <p className="text-[10px] text-gray-400 mt-1">{meta}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setModalDay(d)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <FaPencilAlt size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalDay !== undefined && (
        <EnvDayModal
          day={modalDay}
          currentUserEmail={currentUserEmail}
          onClose={() => setModalDay(undefined)}
          onSaved={() => setModalDay(undefined)}
        />
      )}

      {popupDay && popupAnchor && (
        <EnvDayPopover
          day={popupDay}
          anchor={popupAnchor}
          onClose={() => { setPopupDay(null); setPopupAnchor(null) }}
        />
      )}

      {/* CSV validation errors */}
      {importErrors && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setImportErrors(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-4 flex flex-col gap-3 max-h-[80vh]">
            <h1 className="font-bold text-lg text-gray-800">Import failed</h1>
            <p className="text-xs text-gray-500">Please fix these errors and try again:</p>
            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-lg p-2">
              <ul className="text-xs text-red-600 list-disc pl-4 space-y-1">
                {importErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
            <button
              onClick={() => setImportErrors(null)}
              className="self-end p-2 px-4 bg-gray-100 rounded-xl text-sm hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CSV import preview / confirm */}
      {importPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!importing) setImportPreview(null) }} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl z-10 p-4 flex flex-col gap-3">
            <h1 className="font-bold text-lg text-gray-800">Confirm import</h1>
            <p className="text-sm text-gray-600">
              Ready to update <span className="font-semibold">{importPreview.updated}</span> day(s) and add{' '}
              <span className="font-semibold">{importPreview.added}</span> new day(s). Continue?
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setImportPreview(null)}
                disabled={importing}
                className="p-2 px-4 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="p-2 px-4 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-4 right-4 z-[80] bg-white border-2 border-blue-300 shadow-2xl rounded-2xl px-4 py-3 text-sm text-gray-700">
          {toastMsg}
        </div>
      )}
    </div>}
    </div>
  )
}
