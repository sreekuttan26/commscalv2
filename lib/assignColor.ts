const BADGE_COLORS = [
  'hsl(0, 65%, 50%)',
  'hsl(25, 70%, 48%)',
  'hsl(50, 70%, 42%)',
  'hsl(95, 45%, 42%)',
  'hsl(150, 50%, 38%)',
  'hsl(190, 55%, 42%)',
  'hsl(215, 60%, 50%)',
  'hsl(255, 55%, 55%)',
  'hsl(290, 50%, 48%)',
  'hsl(330, 60%, 50%)',
]

export function emailToColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length]
}

export function getInitial(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?'
}
