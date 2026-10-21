import { afterEach, describe, expect, it } from 'vitest'
import {
  activeTerminalCount,
  createTerminal,
  defaultShell,
  killAllTerminals,
  killTerminal,
  resizeTerminal,
  setTerminalListeners,
  writeTerminal
} from '@main/terminal'

interface Captured {
  data: string[]
  exits: { id: string; code: number }[]
}

function capture(): Captured {
  const cap: Captured = { data: [], exits: [] }
  setTerminalListeners({
    onData: (_id, data) => cap.data.push(data),
    onExit: (id, code) => cap.exits.push({ id, code })
  })
  return cap
}

/** Poll until `ok()` is true or the timeout elapses. */
async function waitFor(ok: () => boolean, ms = 10_000): Promise<void> {
  const start = Date.now()
  while (!ok()) {
    if (Date.now() - start > ms) throw new Error('timeout waiting for condition')
    await new Promise((r) => setTimeout(r, 50))
  }
}

function spawnSh(): string {
  // Force a deterministic, non-interactive-friendly shell for assertions.
  process.env['SHELL'] = '/bin/sh'
  return createTerminal({ cols: 80, rows: 24 })
}

const originalShell = process.env['SHELL']

afterEach(() => {
  killAllTerminals()
  setTerminalListeners(null)
  if (originalShell === undefined) delete process.env['SHELL']
  else process.env['SHELL'] = originalShell
})

describe('defaultShell', () => {
  it('returns SHELL when set, otherwise a platform default', () => {
    process.env['SHELL'] = '/bin/bash'
    expect(defaultShell()).toBe('/bin/bash')
    delete process.env['SHELL']
    expect(defaultShell()).toBeTruthy()
  })
})

describe('terminal sessions', () => {
  it('runs a command and streams output back', async () => {
    const cap = capture()
    const id = spawnSh()
    expect(activeTerminalCount()).toBe(1)
    writeTerminal(id, 'echo PONG_$((6*7))\n')
    await waitFor(() => cap.data.join('').includes('PONG_42'))
  })

  it('kill terminates the session and fires onExit', async () => {
    const cap = capture()
    const id = spawnSh()
    killTerminal(id)
    await waitFor(() => cap.exits.some((e) => e.id === id))
    await waitFor(() => activeTerminalCount() === 0)
  })

  it('write/resize/kill on an unknown id are safe no-ops', () => {
    expect(() => writeTerminal('nope', 'x')).not.toThrow()
    expect(() => resizeTerminal('nope', 80, 24)).not.toThrow()
    expect(() => killTerminal('nope')).not.toThrow()
  })

  it('accepts a resize after create', async () => {
    const id = spawnSh()
    expect(() => resizeTerminal(id, 120, 40)).not.toThrow()
  })

  it('falls back to the home dir for a nonexistent cwd', () => {
    process.env['SHELL'] = '/bin/sh'
    expect(() => createTerminal({ cwd: '/definitely/not/a/dir', cols: 80, rows: 24 })).not.toThrow()
  })
})
