import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Append a path to .gitignore (no-op if already listed). */
export async function addToGitignore(repoPath: string, path: string): Promise<void> {
  const file = join(repoPath, '.gitignore')
  let content = ''
  try {
    content = await readFile(file, 'utf8')
  } catch {
    // no .gitignore yet
  }
  const lines = content.split('\n')
  if (lines.some((l) => l.trim() === path || l.trim() === `${path}/`)) return
  let next = content
  if (next.length > 0 && !next.endsWith('\n')) next += '\n'
  next += `${path}\n`
  await writeFile(file, next, 'utf8')
}
