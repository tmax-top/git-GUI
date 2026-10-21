import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repoQueue } from './queue'
import { execGit } from './exec'
import type { PatchApplyResultDto, PatchExportResultDto } from '../../shared/ipc'

export async function exportPatch(
  repoPath: string,
  opts: { oid?: string; targetPath?: string }
): Promise<PatchExportResultDto> {
  return repoQueue.run(repoPath, async () => {
    const args = opts.oid
      ? ['format-patch', '-1', opts.oid, '--stdout']
      : ['diff', 'HEAD']

    const res = await execGit({ cwd: repoPath, args })
    if (res.code !== 0) {
      throw new Error(`导出补丁失败: ${res.stderr.trim() || 'git command failed'}`)
    }

    const patch = res.stdout
    if (opts.targetPath) {
      await writeFile(opts.targetPath, patch, 'utf8')
    }

    return { patch, targetPath: opts.targetPath }
  })
}

export async function applyPatch(
  repoPath: string,
  opts: { patchPath?: string; patchContent?: string }
): Promise<PatchApplyResultDto> {
  return repoQueue.run(repoPath, async () => {
    let filePath = opts.patchPath
    let isTemp = false

    if (!filePath) {
      if (typeof opts.patchContent !== 'string') {
        throw new Error('未指定补丁文件或补丁内容')
      }
      filePath = join(tmpdir(), `gitgui-patch-${randomUUID().slice(0, 8)}.patch`)
      await writeFile(filePath, opts.patchContent, 'utf8')
      isTemp = true
    }

    const cleanup = async (): Promise<void> => {
      if (isTemp && filePath) {
        await unlink(filePath).catch(() => {})
      }
    }

    try {
      // 1. Try git am --3way first (applies mailbox format and creates commits)
      const amRes = await execGit({ cwd: repoPath, args: ['am', '--3way', filePath] })
      if (amRes.code === 0) {
        await cleanup()
        return {
          mode: 'am',
          message: '补丁已成功应用并创建提交 (Applied via git am)'
        }
      }

      // If git am failed, abort any dirty am state before trying git apply
      await execGit({ cwd: repoPath, args: ['am', '--abort'] }).catch(() => {})

      // 2. Fallback to git apply --3way (applies diff directly to working tree)
      const applyRes = await execGit({ cwd: repoPath, args: ['apply', '--3way', filePath] })
      if (applyRes.code === 0) {
        await cleanup()
        return {
          mode: 'apply',
          message: '补丁已应用到工作区文件 (Applied via git apply)'
        }
      }

      await cleanup()
      throw new Error(
        `应用补丁失败: ${applyRes.stderr.trim() || amRes.stderr.trim() || 'git am & git apply failed'}`
      )
    } catch (e) {
      await cleanup()
      throw e
    }
  })
}
