import { describe, expect, it } from 'vitest'
import { parseToolCommand, toolForKind, type ExternalToolCommand } from '@main/tools'

const vars = { repo: '/tmp/my repo', path: '/tmp/my repo/a b.txt' }

describe('parseToolCommand', () => {
  it('quoted {repo} with spaces stays one arg; unquoted splits (documented)', () => {
    expect(parseToolCommand('code -g "{repo}"', vars)).toEqual(['code', '-g', '/tmp/my repo'])
    expect(parseToolCommand('code -g {repo}', vars)).toEqual(['code', '-g', '/tmp/my', 'repo'])
  })

  it('expands {path} too', () => {
    expect(parseToolCommand('code -g "{path}"', vars)).toEqual([
      'code',
      '-g',
      '/tmp/my repo/a b.txt'
    ])
  })

  it('keeps quoted segments with spaces as one arg', () => {
    expect(parseToolCommand('open -a Terminal "{repo}"', vars)).toEqual([
      'open',
      '-a',
      'Terminal',
      '/tmp/my repo'
    ])
  })

  it('handles single quotes', () => {
    expect(parseToolCommand("subl '{repo}/src'", vars)).toEqual(['subl', '/tmp/my repo/src'])
  })

  it('collapses extra whitespace and trims', () => {
    expect(parseToolCommand('  code   -n  ', vars)).toEqual(['code', '-n'])
  })

  it('empty command yields no args', () => {
    expect(parseToolCommand('', vars)).toEqual([])
    expect(parseToolCommand('   ', vars)).toEqual([])
  })

  it('missing {path} expands to empty and drops the arg', () => {
    expect(parseToolCommand('code {path}', { repo: '/r' })).toEqual(['code'])
    expect(parseToolCommand('code "{path}"', { repo: '/r' })).toEqual(['code'])
  })
})

describe('toolForKind', () => {
  const tools: ExternalToolCommand = {
    editor: 'code',
    diffTool: 'bcompare',
    mergeTool: 'meld',
    terminal: ''
  }

  it('maps each kind to its field', () => {
    expect(toolForKind(tools, 'editor')).toBe('code')
    expect(toolForKind(tools, 'diffTool')).toBe('bcompare')
    expect(toolForKind(tools, 'mergeTool')).toBe('meld')
    expect(toolForKind(tools, 'terminal')).toBe('')
  })
})
