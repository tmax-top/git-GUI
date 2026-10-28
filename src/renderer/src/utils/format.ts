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
