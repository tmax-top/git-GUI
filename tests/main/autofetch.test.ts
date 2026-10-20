import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AutoFetchScheduler, type AutoFetchDeps } from '@main/autofetch'
import {
  initActivityLog,
  listActivity,
  resetActivityForTests
} from '@main/log/activity'

const MIN = 60_000

interface Harness {
  dir: string
  scheduler: AutoFetchScheduler
  fetches: { repoPath: string; prune: boolean }[]
  changed: string[]
  interval: number
  prune: boolean
  repos: string[]
  now: number
  failFor: Set<string>
}

async function makeHarness(): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), 'gitgui-autofetch-'))
  resetActivityForTests()
  await initActivityLog(dir)

  const h: Harness = {
    dir,
    scheduler: null as unknown as AutoFetchScheduler,
    fetches: [],
    changed: [],
    interval: 5,
    prune: true,
    repos: ['/r/a', '/r/b'],
    now: 1_000_000_000_000,
    failFor: new Set()
  }

  const deps: AutoFetchDeps = {
    loadSettings: async () => ({ autoFetchInterval: h.interval, autoPrune: h.prune }),
    loadSession: async () => ({ openRepos: h.repos }),
    fetch: async (repoPath, opts) => {
      h.fetches.push({ repoPath, prune: opts.prune })
      if (h.failFor.has(repoPath)) throw new Error('boom')
    },
    onChanged: (repoPath) => h.changed.push(repoPath),
    now: () => h.now
  }
  h.scheduler = new AutoFetchScheduler(deps)
  return h
}

describe('AutoFetchScheduler', () => {
  let h: Harness

  beforeEach(async () => {
    h = await makeHarness()
  })

  afterEach(() => {
    h.scheduler.stop()
    resetActivityForTests()
    rmSync(h.dir, { recursive: true, force: true })
  })

  it('does nothing when interval is 0 (disabled)', async () => {
    h.interval = 0
    h.now += 60 * MIN
    await h.scheduler.tick()
    expect(h.fetches).toEqual([])
    expect(listActivity()).toEqual([])
  })

  it('fetches every open repo on the first tick', async () => {
    await h.scheduler.tick()
    expect(h.fetches).toEqual([
      { repoPath: '/r/a', prune: true },
      { repoPath: '/r/b', prune: true }
    ])
    expect(h.changed).toEqual(['/r/a', '/r/b'])
    const log = listActivity()
    expect(log).toHaveLength(2)
    expect(log.every((e) => e.kind === 'auto-fetch' && e.ok)).toBe(true)
  })

  it('skips within the interval and fetches again after it elapses', async () => {
    await h.scheduler.tick()
    h.now += 4 * MIN
    await h.scheduler.tick()
    expect(h.fetches).toHaveLength(2) // still just the first pass

    h.now += 1 * MIN // 5 minutes total → due again
    await h.scheduler.tick()
    expect(h.fetches).toHaveLength(4)
  })

  it('passes autoPrune=false through to fetch', async () => {
    h.prune = false
    await h.scheduler.tick()
    expect(h.fetches.every((f) => f.prune === false)).toBe(true)
  })

  it('logs failures per repo and keeps fetching the others', async () => {
    h.failFor.add('/r/a')
    await h.scheduler.tick()

    const log = listActivity()
    expect(log).toHaveLength(2)
    const failed = log.find((e) => e.repoPath === '/r/a')
    const ok = log.find((e) => e.repoPath === '/r/b')
    expect(failed?.ok).toBe(false)
    expect(failed?.message).toBe('boom')
    expect(ok?.ok).toBe(true)
    // only the successful repo triggers a renderer refresh
    expect(h.changed).toEqual(['/r/b'])
  })

  it('skips the tick while shouldSkip() reports a manual op in flight', async () => {
    let skip = false
    const deps: AutoFetchDeps = {
      loadSettings: async () => ({ autoFetchInterval: 5, autoPrune: true }),
      loadSession: async () => ({ openRepos: ['/r/a'] }),
      fetch: async (repoPath) => {
        h.fetches.push({ repoPath, prune: true })
      },
      onChanged: () => undefined,
      shouldSkip: () => skip,
      now: () => h.now
    }
    const s = new AutoFetchScheduler(deps)
    skip = true
    await s.tick()
    expect(h.fetches).toEqual([])

    skip = false
    await s.tick()
    expect(h.fetches).toHaveLength(1)
    s.stop()
  })

  it('does not run two ticks concurrently', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const deps: AutoFetchDeps = {
      loadSettings: async () => ({ autoFetchInterval: 5, autoPrune: true }),
      loadSession: async () => ({ openRepos: ['/r/a'] }),
      fetch: async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((r) => setTimeout(r, 20))
        inFlight--
      },
      onChanged: () => undefined,
      now: () => h.now
    }
    const s = new AutoFetchScheduler(deps)
    await Promise.all([s.tick(), s.tick(), s.tick()])
    expect(maxInFlight).toBe(1)
    s.stop()
  })

  it('start/stop are idempotent', () => {
    h.scheduler.start()
    h.scheduler.start()
    h.scheduler.stop()
    h.scheduler.stop()
  })

  it('resetForTests clears per-repo timing so the next tick fetches again', async () => {
    await h.scheduler.tick()
    h.scheduler.resetForTests()
    await h.scheduler.tick()
    expect(h.fetches).toHaveLength(4)
  })
})
