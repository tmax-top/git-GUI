import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearAllSecrets, deleteSecret, getSecret, setSecret } from '../../src/main/secrets'

describe('secrets storage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'gitgui-secrets-test-'))
    process.env['GIT_GUI_USER_DATA'] = tmpDir
  })

  afterEach(async () => {
    await clearAllSecrets()
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env['GIT_GUI_USER_DATA']
  })

  it('stores, retrieves, and deletes an encrypted secret', async () => {
    expect(await getSecret('token:test')).toBeNull()

    await setSecret('token:test', 'ghp_secretToken1234567890')
    const retrieved = await getSecret('token:test')
    expect(retrieved).toBe('ghp_secretToken1234567890')

    await deleteSecret('token:test')
    expect(await getSecret('token:test')).toBeNull()
  })

  it('overwrites an existing secret', async () => {
    await setSecret('provider:github', 'token_A')
    expect(await getSecret('provider:github')).toBe('token_A')

    await setSecret('provider:github', 'token_B')
    expect(await getSecret('provider:github')).toBe('token_B')
  })
})
