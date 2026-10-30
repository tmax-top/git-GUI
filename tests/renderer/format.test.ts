import { describe, expect, it } from 'vitest'
import { commitTimeLabel } from '@renderer/utils/format'

const L = { today: '今天', yesterday: '昨天', dayBefore: '前天' }

function ts(d: Date): number {
  return Math.floor(d.getTime() / 1000)
}

describe('commitTimeLabel', () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  it('uses 今天/昨天/前天 with HH:mm for the last three days', () => {
    expect(commitTimeLabel(ts(new Date(y, m, d, 9, 5)), L)).toBe('今天 09:05')
    expect(commitTimeLabel(ts(new Date(y, m, d - 1, 18, 30)), L)).toBe('昨天 18:30')
    expect(commitTimeLabel(ts(new Date(y, m, d - 2, 0, 0)), L)).toBe('前天 00:00')
  })

  it('falls back to month-day + HH:mm beyond that', () => {
    const old = new Date(y, m, d - 10, 15, 48)
    const mm = String(old.getMonth() + 1).padStart(2, '0')
    const dd = String(old.getDate()).padStart(2, '0')
    // Crossing into another year (early January) legitimately adds the year.
    const prefix = old.getFullYear() === y ? `${mm}-${dd}` : `${old.getFullYear()}-${mm}-${dd}`
    expect(commitTimeLabel(ts(old), L)).toBe(`${prefix} 15:48`)
  })

  it('includes the year when it differs from now', () => {
    expect(commitTimeLabel(ts(new Date(y - 1, 0, 15, 8, 0)), L)).toBe(`${y - 1}-01-15 08:00`)
  })
})
