import { execGitOrThrow } from './exec'

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i

export interface BlobResult {
  base64: string
  isImage: boolean
  size: number
}

/**
 * Read a file's raw content from any git object (`HEAD:path`, a commit, an oid).
 * Returns base64 so binary content survives IPC intact.
 */
export async function getFileBlob(repoPath: string, spec: string): Promise<BlobResult> {
  const { stdoutBuf } = await execGitOrThrow({
    cwd: repoPath,
    args: ['cat-file', 'blob', spec],
    binary: true
  })
  const buf = stdoutBuf ?? Buffer.alloc(0)
  const path = spec.includes(':') ? spec.slice(spec.indexOf(':') + 1) : spec
  return {
    base64: buf.toString('base64'),
    isImage: IMAGE_EXT.test(path),
    size: buf.length
  }
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path)
}
