import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function secretsDir(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron')
    if (electron && typeof electron === 'object' && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData')
    }
  } catch {
    /* not in electron */
  }
  return process.env['GIT_GUI_USER_DATA'] || join(tmpdir(), 'git-gui-data')
}

function secretsFile(): string {
  return join(secretsDir(), 'secrets.json')
}

function getSafeStorage(): typeof import('electron').safeStorage | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron')
    if (typeof electron === 'object' && electron !== null && electron.safeStorage) {
      if (
        typeof electron.safeStorage.isEncryptionAvailable === 'function' &&
        electron.safeStorage.isEncryptionAvailable()
      ) {
        return electron.safeStorage
      }
    }
  } catch {
    /* fallback */
  }
  return null
}

function fallbackKey(): Buffer {
  const seed = process.env['GIT_GUI_SECRET_KEY'] || 'git-gui-fallback-secret-seed-2026'
  return createHash('sha256').update(seed).digest()
}

/** Encrypt a plain-text secret using Electron safeStorage or AES-GCM fallback. */
export function encryptSecret(plain: string): string {
  const ss = getSafeStorage()
  if (ss) {
    return 'ss:' + ss.encryptString(plain).toString('base64')
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', fallbackKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return 'fb:' + Buffer.concat([iv, tag, enc]).toString('base64')
}

/** Decrypt a secret produced by encryptSecret. */
export function decryptSecret(cipherText: string): string {
  if (cipherText.startsWith('ss:')) {
    const ss = getSafeStorage()
    if (ss) {
      const buf = Buffer.from(cipherText.slice(3), 'base64')
      return ss.decryptString(buf)
    }
    throw new Error('OS keychain unavailable to decrypt secret')
  }
  if (cipherText.startsWith('fb:')) {
    const raw = Buffer.from(cipherText.slice(3), 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const enc = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', fallbackKey(), iv)
    decipher.setAuthTag(tag)
    return decipher.update(enc) + decipher.final('utf8')
  }
  return cipherText
}

async function loadSecretsMap(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(secretsFile(), 'utf8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

async function saveSecretsMap(map: Record<string, string>): Promise<void> {
  await mkdir(secretsDir(), { recursive: true })
  await writeFile(secretsFile(), JSON.stringify(map, null, 2), 'utf8')
}

export async function setSecret(key: string, secret: string): Promise<void> {
  const map = await loadSecretsMap()
  map[key] = encryptSecret(secret)
  await saveSecretsMap(map)
}

export async function getSecret(key: string): Promise<string | null> {
  const map = await loadSecretsMap()
  const cipher = map[key]
  if (!cipher) return null
  try {
    return decryptSecret(cipher)
  } catch {
    return null
  }
}

export async function deleteSecret(key: string): Promise<void> {
  const map = await loadSecretsMap()
  if (key in map) {
    delete map[key]
    await saveSecretsMap(map)
  }
}

export async function clearAllSecrets(): Promise<void> {
  await saveSecretsMap({})
}
