import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getSubmoduleRecurse,
  getSubmoduleUpdate,
  setSubmoduleRecurse,
  setSubmoduleUpdate,
  submoduleDetails,
  submoduleInit,
  submoduleUpdate
} from '@main/git/submodule'

const env = {
  ...process.env,
  LC_ALL: 'C',
  // newer git blocks file:// clones by default; our fixtures are local paths
  GIT_ALLOW_PROTOCOL: 'file',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@e.com',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@e.com'
}

describe('submodule management', () => {
  let root: string
  let parent: string
  let child: string

  const pgit = (...args: string[]): string =>
    execFileSync('git', ['-C', parent, ...args], { encoding: 'utf8', env }).trim()

  const cgit = (...args: string[]): string =>
    execFileSync('git', ['-C', child, ...args], { encoding: 'utf8', env }).trim()

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gitgui-sub-'))
    child = join(root, 'lib')
    parent = join(root, 'app')

    // child repo with one commit
    execFileSync('git', ['init', '-q', '-b', 'main', child], { env })
    execFileSync('git', ['-C', child, 'config', 'user.name', 'T'], { env })
    execFileSync('git', ['-C', child, 'config', 'user.email', 't@e.com'], { env })
    execFileSync('git', ['-C', child, 'config', 'commit.gpgsign', 'false'], { env })
    writeFileSync(join(child, 'lib.txt'), 'v1\n')
    cgit('add', '-A')
    cgit('commit', '-m', 'v1')

    // parent repo that records it as a submodule (file transport)
    execFileSync('git', ['init', '-q', '-b', 'main', parent], { env })
    pgit('config', 'user.name', 'T')
    pgit('config', 'user.email', 't@e.com')
    execFileSync('git', ['-C', parent, 'submodule', 'add', child, 'lib'], { env })
    pgit('commit', '-m', 'add submodule')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('lists the submodule as initialized and up to date', async () => {
    const details = await submoduleDetails(parent)
    expect(details).toHaveLength(1)
    expect(details[0]?.path).toBe('lib')
    expect(details[0]?.status).toBe(' ')
    expect(details[0]?.update).toBeNull()
  })

  it('update policy: unset by default, settable, and unsettable', async () => {
    expect(await getSubmoduleUpdate(parent, 'lib')).toBeNull()

    await setSubmoduleUpdate(parent, 'lib', 'rebase')
    expect(await getSubmoduleUpdate(parent, 'lib')).toBe('rebase')
    expect((await submoduleDetails(parent))[0]?.update).toBe('rebase')

    await setSubmoduleUpdate(parent, 'lib', null)
    expect(await getSubmoduleUpdate(parent, 'lib')).toBeNull()
  })

  it('rejects empty submodule paths', async () => {
    await expect(setSubmoduleUpdate(parent, '', 'merge')).rejects.toThrow(/invalid submodule path/)
  })

  it('recurse flag round-trips', async () => {
    expect(await getSubmoduleRecurse(parent)).toBe(false)
    await setSubmoduleRecurse(parent, true)
    expect(await getSubmoduleRecurse(parent)).toBe(true)
    await setSubmoduleRecurse(parent, false)
    expect(await getSubmoduleRecurse(parent)).toBe(false)
  })

  it('init/update bring a new checkout back in sync', async () => {
    // delete the submodule worktree to fake a fresh clone without checkout
    rmSync(join(parent, 'lib'), { recursive: true, force: true })
    expect(existsSync(join(parent, 'lib', 'lib.txt'))).toBe(false)

    await submoduleInit(parent, 'lib')
    await submoduleUpdate(parent, 'lib')

    expect(existsSync(join(parent, 'lib', 'lib.txt'))).toBe(true)
    const [sub] = await submoduleDetails(parent)
    expect(sub?.status).toBe(' ')
  })

  it('shows "+" status when the submodule checkout diverges from the recorded oid', async () => {
    // commit inside the submodule checkout (not the source repo)
    writeFileSync(join(parent, 'lib', 'lib.txt'), 'v2\n')
    execFileSync('git', ['-C', join(parent, 'lib'), 'add', '-A'], { env })
    execFileSync('git', ['-C', join(parent, 'lib'), 'commit', '-m', 'v2'], { env })

    const [sub] = await submoduleDetails(parent)
    expect(sub?.status).toBe('+')

    // update would reset it back to the recorded oid (discarding the local commit)
    await submoduleUpdate(parent, 'lib')
    const [after] = await submoduleDetails(parent)
    expect(after?.status).toBe(' ')
  })
})
