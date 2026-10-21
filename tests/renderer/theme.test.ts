import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../../src/renderer/src/theme'

describe('theme resolution', () => {
  it('resolves explicit dark theme', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('resolves explicit light theme', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('resolves system theme based on matchMedia or fallback', () => {
    const res = resolveTheme('system')
    expect(['dark', 'light']).toContain(res)
  })
})
