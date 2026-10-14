import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd: dir,
    env: {
      ...process.env,
      LC_ALL: 'C',
      LANG: 'C',
      GIT_AUTHOR_NAME: 'Test User',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test User',
      GIT_COMMITTER_EMAIL: 'test@example.com'
    },
    encoding: 'utf8'
  })
}

export interface TempRepo {
  dir: string
  cleanup: () => void
}

export function makeTempRepo(): TempRepo {
  const dir = mkdtempSync(join(tmpdir(), 'gitgui-test-'))
  git(dir, 'init', '-b', 'main')
  return {
    dir,
    cleanup: () => {
      execFileSync('rm', ['-rf', dir])
    }
  }
}

export function writeFile(repo: string, relPath: string, content: string): void {
  const full = join(repo, relPath)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

export function commitFile(repo: string, relPath: string, content: string, message: string): string {
  writeFile(repo, relPath, content)
  git(repo, 'add', relPath)
  git(repo, 'commit', '-m', message)
  return git(repo, 'rev-parse', 'HEAD').trim()
}

/** Build a repo with a merge commit: main <- feature (merged). */
export function makeMergeRepo(): TempRepo {
  const repo = makeTempRepo()
  const d = repo.dir
  commitFile(d, 'a.txt', 'a1\n', 'initial')
  git(d, 'checkout', '-b', 'feature')
  commitFile(d, 'b.txt', 'b1\n', 'feature work')
  git(d, 'checkout', 'main')
  commitFile(d, 'c.txt', 'c1\n', 'main work')
  git(d, 'merge', '--no-ff', 'feature', '-m', 'merge feature')
  return repo
}

/** Build a repo with two diverging branches plus a merge (criss-cross-ish topology helper). */
export function makeBranchyRepo(): TempRepo {
  const repo = makeMergeRepo()
  const d = repo.dir
  git(d, 'checkout', '-b', 'side')
  commitFile(d, 'side.txt', 's1\n', 'side work')
  git(d, 'checkout', 'main')
  commitFile(d, 'a.txt', 'a2\n', 'more main')
  return repo
}
