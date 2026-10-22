import { spawn } from 'node:child_process'
import type { ExternalToolKind } from '../shared/ipc'

export interface ExternalToolCommand {
  editor: string
  diffTool: string
  mergeTool: string
  terminal: string
}

export const EMPTY_TOOLS: ExternalToolCommand = {
  editor: '',
  diffTool: '',
  mergeTool: '',
  terminal: ''
}

export function toolForKind(tools: ExternalToolCommand, kind: ExternalToolKind): string {
  return tools[kind] ?? ''
}

/**
 * Expand {repo} / {path} placeholders in a user-entered command line.
 * Quoted segments stay one argument: code -g "{path}".
 */
export function parseToolCommand(command: string, vars: { repo: string; path?: string }): string[] {
  const replaced = command
    .replaceAll('{repo}', vars.repo)
    .replaceAll('{path}', vars.path ?? '')
    .trim()
  if (replaced === '') return []
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (const ch of replaced) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === ' ') {
      if (current !== '') {
        parts.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current !== '') parts.push(current)
  return parts
}

/**
 * Launch an external tool detached from the app (so the app closing does
 * not kill it). Throws when the command is empty or cannot be spawned.
 */
export function openExternalTool(
  command: string,
  vars: { repo: string; path?: string }
): Promise<void> {
  const args = parseToolCommand(command, vars)
  const [bin, ...rest] = args
  if (!bin) return Promise.reject(new Error('empty command'))
  return new Promise((resolve, reject) => {
    const child = spawn(bin, rest, {
      cwd: vars.path ? undefined : vars.repo,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.on('error', (err) => reject(err))
    child.unref()
    // resolved once spawned; later crash of the child is its own business
    resolve()
  })
}
