import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  initActivityLog,
  listActivity,
  logActivity,
  resetActivityForTests,
  setActivityListener
} from '@main/log/activity'

describe('activity log', () => {
  let dir: string

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'gitgui-activity-'))
    resetActivityForTests()
    await initActivityLog(dir)
  })

  afterEach(() => {
    resetActivityForTests()
    rmSync(dir, { recursive: true, force: true })
  })

  it('logs an entry and lists it newest-first', async () => {
    await logActivity({ kind: 'fetch', repoPath: '/r/a', ok: true })
    await logActivity({ kind: 'pull', repoPath: '/r/a', ok: false, message: 'conflict' })

    const list = listActivity()
    expect(list).toHaveLength(2)
    expect(list[0].kind).toBe('pull')
    expect(list[0].ok).toBe(false)
    expect(list[0].message).toBe('conflict')
    expect(list[1].kind).toBe('fetch')
    expect(list[1].id).not.toBe(list[0].id)
    expect(list[1].ts).toBeLessThanOrEqual(list[0].ts)
  })

  it('honors the limit argument', async () => {
    for (let i = 0; i < 10; i++) {
      await logActivity({ kind: 'auto-fetch', repoPath: '/r', ok: true })
    }
    expect(listActivity(3)).toHaveLength(3)
    expect(listActivity()).toHaveLength(10)
  })

  it('persists across re-init (reload from disk)', async () => {
    await logActivity({ kind: 'push', repoPath: '/r/b', ok: true, message: 'main -> main' })
    resetActivityForTests()
    await initActivityLog(dir)

    const list = listActivity()
    expect(list).toHaveLength(1)
    expect(list[0].kind).toBe('push')
    expect(list[0].message).toBe('main -> main')
  })

  it('tolerates a torn last line on reload', async () => {
    await logActivity({ kind: 'fetch', repoPath: '/r', ok: true })
    const { appendFileSync } = await import('node:fs')
    appendFileSync(join(dir, 'activity.log'), '{"id":"partial', 'utf8')

    resetActivityForTests()
    await initActivityLog(dir)
    expect(listActivity()).toHaveLength(1)
  })

  it('notifies the listener for each new entry', async () => {
    const seen: string[] = []
    setActivityListener((e) => seen.push(e.kind))
    await logActivity({ kind: 'fetch', repoPath: '/r', ok: true })
    await logActivity({ kind: 'auto-fetch', repoPath: '/r', ok: false, message: 'x' })
    setActivityListener(null)
    await logActivity({ kind: 'pull', repoPath: '/r', ok: true })
    expect(seen).toEqual(['fetch', 'auto-fetch'])
  })

  it('caps the in-memory ring at 500 entries', async () => {
    for (let i = 0; i < 510; i++) {
      await logActivity({ kind: 'fetch', repoPath: `/r/${i}`, ok: true })
    }
    expect(listActivity(1000)).toHaveLength(500)
    expect(listActivity(1000)[0].repoPath).toBe('/r/509')
  })

  it('returns [] when never initialized', () => {
    resetActivityForTests()
    expect(listActivity()).toEqual([])
  })
})
