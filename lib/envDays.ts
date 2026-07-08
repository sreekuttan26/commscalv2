export const ENV_DAY_CATEGORIES = ['International', 'India', 'Species', 'Other'] as const

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  International: { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  India:         { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  Species:       { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  Other:         { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200'   },
}

export function categoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other
}

// Non-leap reference year so Feb 29 is never treated as a valid recurring day
// (unless a specific one-time `year` is supplied and that year happens to be a leap year).
const REFERENCE_YEAR = 2001

export function daysInMonth(month: number, year?: number): number {
  return new Date(year ?? REFERENCE_YEAR, month, 0).getDate()
}

// Recurring days (no `year`) roll over to next year once passed.
// One-time days (`year` set) resolve to that exact date, or null once it's in the past.
export function nextOccurrence(
  envDay: { month: number; day: number; year?: number | null },
  today: Date
): Date | null {
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (envDay.year) {
    const date = new Date(envDay.year, envDay.month - 1, envDay.day)
    return date >= todayMidnight ? date : null
  }
  const thisYear = new Date(today.getFullYear(), envDay.month - 1, envDay.day)
  if (thisYear >= todayMidnight) return thisYear
  return new Date(today.getFullYear() + 1, envDay.month - 1, envDay.day)
}

export function daysUntil(target: Date, today: Date): number {
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86400000)
}

export function formatShortDate(month: number, day: number): string {
  return new Date(REFERENCE_YEAR, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDateWithYear(month: number, day: number, year?: number | null): string {
  const base = formatShortDate(month, day)
  return year ? `${base} ${year}` : `${base} (annual)`
}

export function relativeCountdown(daysAway: number): string {
  if (daysAway <= 0) return 'today'
  if (daysAway === 1) return 'in 1 day'
  return `in ${daysAway} days`
}
