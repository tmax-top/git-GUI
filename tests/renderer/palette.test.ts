import { describe, expect, it } from 'vitest'
import { zh, en } from '../../src/renderer/src/i18n'

describe('command palette and shortcuts keys', () => {
  it('defines all required palette i18n keys in both languages', () => {
    const keys = ['palette.title', 'palette.placeholder', 'palette.empty', 'palette.hint'] as const
    for (const k of keys) {
      expect(zh[k]).toBeTruthy()
      expect(en[k]).toBeTruthy()
    }
  })

  it('defines all shortcuts category keys in both languages', () => {
    const keys = [
      'shortcuts.title',
      'shortcuts.category.general',
      'shortcuts.category.navigation',
      'shortcuts.category.git',
      'shortcuts.category.rebase'
    ] as const
    for (const k of keys) {
      expect(zh[k]).toBeTruthy()
      expect(en[k]).toBeTruthy()
    }
  })
})
