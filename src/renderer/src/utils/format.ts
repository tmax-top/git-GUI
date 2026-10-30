export function relativeTime(tsSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - tsSeconds
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`
  const d = new Date(tsSeconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fullDate(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toLocaleString()
}

/**
 * Compact timestamp for the commit list: 今天/昨天/前天 + HH:mm, anything older
 * gets 月-日 + HH:mm (year included when it differs from now).
 */
export function commitTimeLabel(
  tsSeconds: number,
  labels: { today: string; yesterday: string; dayBefore: string }
): string {
  const d = new Date(tsSeconds * 1000)
  const now = new Date()
  const startOfDay = (x: Date): number =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  // Math.round keeps the bucket right across DST switches (23h/25h days).
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`
  if (days === 0) return `${labels.today} ${time}`
  if (days === 1) return `${labels.yesterday} ${time}`
  if (days === 2) return `${labels.dayBefore} ${time}`
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const date =
    d.getFullYear() === now.getFullYear() ? `${month}-${day}` : `${d.getFullYear()}-${month}-${day}`
  return `${date} ${time}`
}

export function shortPath(p: string): string {
  const parts = p.split('/')
  if (parts.length <= 2) return p
  return `…/${parts.slice(-2).join('/')}`
}

export function basename(p: string): string {
  const parts = p.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1] || p
}

export function statusLetter(f: {
  indexStatus: string
  worktreeStatus: string
  untracked?: boolean
  unmerged?: boolean
}): string {
  if (f.untracked) return 'U'
  if (f.unmerged) return '!'
  const i = f.indexStatus === ' ' || f.indexStatus === '.' ? '' : f.indexStatus
  const w = f.worktreeStatus === '.' || f.worktreeStatus === ' ' ? '' : f.worktreeStatus
  return (i + w) || 'M'
}
