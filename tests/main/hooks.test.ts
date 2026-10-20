import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KNOWN_HOOKS, listHooks, readHook, setHookEnabled } from '@main/git/hooks'

describe('hooks manager', () => {
  let repo: string
  let hooksDir: string

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitgui-hooks-'))
    hooksDir = join(repo, '.git', 'hooks')
    mkdirSync(hooksDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  it('lists all standard hooks with exists=false when the dir is empty', async () => {
    const hooks = await listHooks(repo)
    expect(hooks.length).toBeGreaterThanOrEqual(KNOWN_HOOKS.length)
    const preCommit = hooks.find((h) => h.name === 'pre-commit')
    expect(preCommit).toMatchObject({ exists: false, enabled: false, custom: false })
  })

  it('detects an executable hook as enabled', async () => {
    const path = join(hooksDir, 'pre-commit')
    writeFileSync(path, '#!/bin/sh\necho hi\n')
    chmodSync(path, 0o755)

    const hooks = await listHooks(repo)
    const preCommit = hooks.find((h) => h.name === 'pre-commit')
    expect(preCommit).toMatchObject({ exists: true, enabled: true })
  })

  it('a present-but-non-executable hook counts as disabled', async () => {
    const path = join(hooksDir, 'commit-msg')
    writeFileSync(path, '#!/bin/sh\nexit 0\n')
    chmodSync(path, 0o644)

    const hooks = await listHooks(repo)
    const commitMsg = hooks.find((h) => h.name === 'commit-msg')
    expect(commitMsg).toMatchObject({ exists: true, enabled: false })
  })

  it('setHookEnabled toggles the executable bit', async () => {
    const path = join(hooksDir, 'pre-push')
    writeFileSync(path, '#!/bin/sh\nexit 0\n')
    chmodSync(path, 0o644)

    await setHookEnabled(repo, 'pre-push', true)
    let hooks = await listHooks(repo)
    expect(hooks.find((h) => h.name === 'pre-push')?.enabled).toBe(true)

    await setHookEnabled(repo, 'pre-push', false)
    hooks = await listHooks(repo)
    expect(hooks.find((h) => h.name === 'pre-push')?.enabled).toBe(false)
    // file survives the disable
    expect((await readHook(repo, 'pre-push'))).toContain('exit 0')
  })

  it('setHookEnabled on a missing hook throws', async () => {
    await expect(setHookEnabled(repo, 'pre-commit', true)).rejects.toThrow(/not found/)
  })

  it('rejects invalid hook names (path traversal)', async () => {
    await expect(readHook(repo, '../config')).rejects.toThrow(/invalid/)
    await expect(setHookEnabled(repo, 'a/b', true)).rejects.toThrow(/invalid/)
  })

  it('surfaces custom hooks after the standard list', async () => {
    const path = join(hooksDir, 'my-custom-hook')
    writeFileSync(path, '#!/bin/sh\n')
    chmodSync(path, 0o755)
    // .sample files must not count as custom hooks
    writeFileSync(join(hooksDir, 'pre-commit.sample'), '#!/bin/sh\n')

    const hooks = await listHooks(repo)
    const custom = hooks.filter((h) => h.custom)
    expect(custom.map((h) => h.name)).toEqual(['my-custom-hook'])
    expect(hooks.find((h) => h.name === 'pre-commit')?.sampleExists).toBe(true)
  })

  it('readHook returns the script text, empty for missing hooks', async () => {
    writeFileSync(join(hooksDir, 'commit-msg'), '#!/bin/sh\n# lint the message\n')
    expect(await readHook(repo, 'commit-msg')).toContain('lint the message')
    expect(await readHook(repo, 'pre-push')).toBe('')
  })
})
