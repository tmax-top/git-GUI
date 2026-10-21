import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { spawn, type IPty } from 'node-pty'

export interface TerminalEvents {
  onData: (id: string, data: string) => void
  onExit: (id: string, exitCode: number) => void
}

export interface CreateTerminalOptions {
  cwd?: string
  cols: number
  rows: number
}

/** Default interactive shell for the embedded terminal. */
export function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env['COMSPEC'] ?? 'powershell.exe'
  }
  return process.env['SHELL'] ?? '/bin/zsh'
}

/** cwd must exist — node-pty throws otherwise; fall back to the home dir. */
function resolveCwd(cwd?: string): string {
  if (cwd && existsSync(cwd)) return cwd
  return homedir()
}

const sessions = new Map<string, IPty>()
let listeners: TerminalEvents | null = null

/** Wire up data/exit forwarding (called by ipc.ts at registration time). */
export function setTerminalListeners(l: TerminalEvents | null): void {
  listeners = l
}

export function createTerminal(opts: CreateTerminalOptions): string {
  const id = randomUUID().replace(/-/g, '').slice(0, 16)
  const pty = spawn(defaultShell(), [], {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: resolveCwd(opts.cwd),
    env: { ...process.env, TERM: 'xterm-256color' }
  })
  pty.onData((data) => listeners?.onData(id, data))
  pty.onExit(({ exitCode }) => {
    sessions.delete(id)
    listeners?.onExit(id, exitCode)
  })
  sessions.set(id, pty)
  return id
}

export function writeTerminal(id: string, data: string): void {
  sessions.get(id)?.write(data)
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const pty = sessions.get(id)
  if (!pty) return
  // A dead pty can still be in the map for a tick before onExit fires.
  try {
    pty.resize(cols, rows)
  } catch {
    /* ignore resize on exiting pty */
  }
}

export function killTerminal(id: string): void {
  const pty = sessions.get(id)
  if (!pty) return
  sessions.delete(id)
  try {
    pty.kill()
  } catch {
    /* already dead */
  }
}

export function activeTerminalCount(): number {
  return sessions.size
}

/** Kill every live pty (app quit). */
export function killAllTerminals(): void {
  for (const id of [...sessions.keys()]) killTerminal(id)
  listeners = null
}
