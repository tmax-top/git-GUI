import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en, zh } from '../../src/renderer/src/i18n'

describe('i18n dictionary parity and coverage', () => {
  it('zh and en dictionaries have identical key sets', () => {
    const zhKeys = Object.keys(zh).sort()
    const enKeys = Object.keys(en).sort()

    const missingInEn = zhKeys.filter((k) => !(k in en))
    const missingInZh = enKeys.filter((k) => !(k in zh))

    expect(missingInEn, 'Keys present in zh but missing in en').toEqual([])
    expect(missingInZh, 'Keys present in en but missing in zh').toEqual([])
    expect(zhKeys).toEqual(enKeys)
  })

  it('interpolation parameters match between zh and en for every key', () => {
    const paramRegex = /\{([a-zA-Z0-9_]+)\}/g

    for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
      const zhVal = String(zh[key])
      const enVal = String(en[key])

      const zhParams = [...zhVal.matchAll(paramRegex)].map((m) => m[1]).sort()
      const enParams = [...enVal.matchAll(paramRegex)].map((m) => m[1]).sort()

      expect(
        enParams,
        `Interpolation placeholders mismatch for key "${key}": zh=${JSON.stringify(zhParams)}, en=${JSON.stringify(enParams)}`
      ).toEqual(zhParams)
    }
  })

  it('scans renderer codebase for hardcoded Chinese text outside i18n and language toggles', () => {
    const rendererDir = join(__dirname, '../../src/renderer/src')
    const files: string[] = []

    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (entry === 'i18n' || entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue
        const st = statSync(full)
        if (st.isDirectory()) walk(full)
        else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) files.push(full)
      }
    }

    walk(rendererDir)

    const chineseRegex = /[\u4e00-\u9fa5]/
    const violations: Array<{ file: string; line: number; text: string }> = []

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((lineText, idx) => {
        const trimmed = lineText.trim()
        // Ignore single-line comments and block comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return

        // Allowed UI exception: the language toggle buttons displaying the literal name "中文" / "中"
        if (trimmed === '中文' || trimmed === '中') return
        const stripped = trimmed
          .replace(/>\s*中文\s*</g, '><')
          .replace(/>\s*中\s*</g, '><')
          .replace(/['"]中文 \(Chinese\)['"]/g, '""')

        if (chineseRegex.test(stripped)) {
          violations.push({
            file: file.replace(rendererDir, 'src/renderer/src'),
            line: idx + 1,
            text: trimmed
          })
        }
      })
    }

    expect(
      violations,
      `Found ${violations.length} hardcoded Chinese text occurrences in renderer components:\n` +
        violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')
    ).toEqual([])
  })
})
