import { execGitOrThrow } from './exec'
import { repoQueue } from './queue'

/**
 * Apply a patch to the index only (stage/unstage partial changes).
 * The patch text must be a standard unified diff (file header + hunks).
 */
export async function applyPatchToIndex(
  repoPath: string,
  patch: string,
  reverse = false
): Promise<void> {
  await repoQueue.run(repoPath, () =>
    execGitOrThrow({
      cwd: repoPath,
      args: ['apply', '--cached', '--whitespace=nowarn', ...(reverse ? ['--reverse'] : []), '-'],
      stdin: patch
    })
  )
}
