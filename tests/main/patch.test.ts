import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyPatch, exportPatch } from '../../src/main/git/patch'

describe('git patch export and import', () => {
  let repoA: string
  let repoB: string
  const env = { ...process.env, LC_ALL: 'C' }

  beforeEach(() => {
    repoA = mkdtempSync(join(tmpdir(), 'gitgui-patch-a-'))
    repoB = mkdtempSync(join(tmpdir(), 'gitgui-patch-b-'))

    // init repoA with initial commit
    execFileSync('git', ['init', '-q', '-b', 'main', repoA], { env })
    execFileSync('git', ['-C', repoA, 'config', 'user.name', 'Patch Author'], { env })
    execFileSync('git', ['-C', repoA, 'config', 'user.email', 'author@example.com'], { env })
    writeFileSync(join(repoA, 'base.txt'), 'base\n')
    execFileSync('git', ['-C', repoA, 'add', '-A'], { env })
    execFileSync('git', ['-C', repoA, 'commit', '-qm', 'initial base'], { env })

    // init repoB cloned from repoA
    execFileSync('git', ['clone', '-q', repoA, repoB], { env })
    execFileSync('git', ['-C', repoB, 'config', 'user.name', 'Patch Receiver'], { env })
    execFileSync('git', ['-C', repoB, 'config', 'user.email', 'receiver@example.com'], { env })
  })

  afterEach(() => {
    rmSync(repoA, { recursive: true, force: true })
    rmSync(repoB, { recursive: true, force: true })
  })

  it('exports commit as format-patch file and applies it via git am in another repo', async () => {
    // 1. Create a feature commit in repoA
    writeFileSync(join(repoA, 'feature.txt'), 'awesome feature\n')
    execFileSync('git', ['-C', repoA, 'add', 'feature.txt'], { env })
    execFileSync('git', ['-C', repoA, 'commit', '-qm', 'feat: add awesome feature'], { env })

    const headOid = execFileSync('git', ['-C', repoA, 'rev-parse', 'HEAD'], { env }).toString().trim()
    const patchFile = join(tmpdir(), `test-patch-${Date.now()}.patch`)

    // 2. Export patch via exportPatch
    const res = await exportPatch(repoA, { oid: headOid, targetPath: patchFile })
    expect(res.patch).toContain('From: Patch Author <author@example.com>')
    expect(res.patch).toContain('Subject: [PATCH] feat: add awesome feature')
    expect(res.patch).toContain('+awesome feature')
    expect(readFileSync(patchFile, 'utf8')).toBe(res.patch)

    // 3. Apply patch in repoB via applyPatch (uses git am)
    const applyRes = await applyPatch(repoB, { patchPath: patchFile })
    expect(applyRes.mode).toBe('am')

    // 4. Verify repoB has the new commit with the original author and content
    const repoBLog = execFileSync('git', ['-C', repoB, 'log', '-1', '--format=%an <%ae> %s'], { env })
      .toString()
      .trim()
    expect(repoBLog).toBe('Patch Author <author@example.com> feat: add awesome feature')
    expect(readFileSync(join(repoB, 'feature.txt'), 'utf8')).toBe('awesome feature\n')

    rmSync(patchFile, { force: true })
  })

  it('exports working directory changes as diff patch and applies via git apply', async () => {
    // 1. Make uncommitted changes in repoA
    writeFileSync(join(repoA, 'base.txt'), 'base\nmodified line\n')

    // 2. Export patch (no oid -> diff HEAD)
    const res = await exportPatch(repoA, {})
    expect(res.patch).toContain('diff --git a/base.txt b/base.txt')
    expect(res.patch).toContain('+modified line')

    // 3. Apply patch content directly into repoB
    const applyRes = await applyPatch(repoB, { patchContent: res.patch })
    expect(applyRes.mode).toBe('apply')

    // 4. Verify working tree in repoB has the uncommitted change
    expect(readFileSync(join(repoB, 'base.txt'), 'utf8')).toBe('base\nmodified line\n')
    const statusB = execFileSync('git', ['-C', repoB, 'status', '--porcelain'], { env }).toString().trim()
    expect(statusB).toMatch(/M\s+base\.txt/)
  })
})
