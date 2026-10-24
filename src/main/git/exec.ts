import { spawn } from 'node:child_process'

export interface GitExecOptions {
  cwd: string
  args: string[]
  signal?: AbortSignal
  timeoutMs?: number
  stdin?: string
  onStderr?: (chunk: string) => void
  env?: Record<string, string>
  /** Collect stdout as raw bytes (binary-safe). `stdout` stays empty. */
  binary?: boolean
}

export interface GitExecResult {
  stdout: string
  /** Populated only when `binary: true`. */
  stdoutBuf?: Buffer
  stderr: string
  code: number
}

/**
 * Strips non-fatal informational warning banners emitted by OpenSSH / Git
 * such as the OpenSSH 9.8+ post-quantum key exchange advisory banner.
 */
export function cleanGitStderr(stderr: string): string {
  if (!stderr) return ''
  return stderr
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('** WARNING: connection is not using a post-quantum key exchange algorithm')) return false
      if (trimmed.startsWith('** This session may be vulnerable to "store now, decrypt later" attacks')) return false
      if (trimmed.startsWith('** The server may need to be upgraded. See https://openssh.com/pq.html')) return false
      return true
    })
    .join('\n')
    .trim()
}

export class GitExecError extends Error {
  constructor(
    public readonly result: GitExecResult,
    public readonly args: string[]
  ) {
    const cleaned = cleanGitStderr(result.stderr)
    super(`git ${args.join(' ')} exited with code ${result.code}: ${cleaned || result.stdout.trim()}`)
    this.name = 'GitExecError'
  }
}

export function gitBin(): string {
  return process.env.GIT_GUI_GIT_PATH || 'git'
}

export interface ActiveProfileConfig {
  name?: string
  email?: string
  signingKey?: string
}

let activeProfileConfig: ActiveProfileConfig | null = null

export function setActiveProfileConfig(cfg: ActiveProfileConfig | null): void {
  activeProfileConfig = cfg
}

export function getActiveProfileConfig(): ActiveProfileConfig | null {
  return activeProfileConfig
}

export function execGit(opts: GitExecOptions): Promise<GitExecResult> {
  return new Promise((resolve, reject) => {
    const profileArgs: string[] = []
    if (activeProfileConfig) {
      if (activeProfileConfig.name) profileArgs.push('-c', `user.name=${activeProfileConfig.name}`)
      if (activeProfileConfig.email) profileArgs.push('-c', `user.email=${activeProfileConfig.email}`)
      if (activeProfileConfig.signingKey) profileArgs.push('-c', `user.signingkey=${activeProfileConfig.signingKey}`)
    }

    const child = spawn(gitBin(), ['-c', 'core.quotepath=false', ...profileArgs, ...opts.args], {
      cwd: opts.cwd,
      windowsHide: true,
      env: {
        ...process.env,
        ...opts.env,
        LC_ALL: 'C',
        LANG: 'C',
        LANGUAGE: 'C',
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_PAGER: 'cat',
        PAGER: 'cat'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    const stdoutChunks: Buffer[] = []
    let settled = false

    const kill = (): void => {
      if (!child.killed) child.kill('SIGTERM')
    }

    const timer =
      opts.timeoutMs != null
        ? setTimeout(() => {
            kill()
          }, opts.timeoutMs)
        : undefined

    const onAbort = (): void => kill()
    opts.signal?.addEventListener('abort', onAbort, { once: true })

    const cleanup = (): void => {
      if (timer) clearTimeout(timer)
      opts.signal?.removeEventListener('abort', onAbort)
    }

    if (opts.binary) {
      child.stdout.on('data', (d: Buffer) => {
        stdoutChunks.push(d)
      })
    } else {
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (d: string) => {
        stdout += d
      })
    }
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (d: string) => {
      stderr += d
      opts.onStderr?.(d)
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      cleanup()
      resolve({
        stdout,
        stdoutBuf: opts.binary ? Buffer.concat(stdoutChunks) : undefined,
        stderr,
        code: code ?? -1
      })
    })

    if (opts.stdin != null) {
      child.stdin.end(opts.stdin)
    } else {
      child.stdin.end()
    }
  })
}

export async function execGitOrThrow(opts: GitExecOptions): Promise<GitExecResult> {
  const result = await execGit(opts)
  if (result.code !== 0) {
    throw new GitExecError(result, opts.args)
  }
  return result
}
