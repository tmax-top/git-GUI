import { app, dialog, ipcMain, BrowserWindow, type WebContents } from 'electron'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import {
  IPC,
  IPC_EVENTS,
  applyHunkRequestSchema,
  blobRequestSchema,
  cancelRequestSchema,
  checkoutRequestSchema,
  cloneRequestSchema,
  commitDiffRequestSchema,
  commitRequestSchema,
  diffRequestSchema,
  gitStatusRequestSchema,
  graphRequestSchema,
  ignoreRequestSchema,
  initRequestSchema,
  openRepoRequestSchema,
  pathsRequestSchema,
  pickDirectorySchema,
  refsRequestSchema,
  sessionPatchSchema,
  settingsPatchSchema,
  syncRequestSchema,
  watchRequestSchema,
  worktreeFileSchema
} from '../shared/ipc'
import type {
  AppInfoDto,
  BlobDto,
  CommitDto,
  GitStatusDto,
  GraphPageDto,
  ProgressEventDto,
  RefsDto,
  RepoValidateDto
} from '../shared/ipc'
import {
  addToGitignore,
  applyPatchToIndex,
  checkout,
  cleanPaths,
  cloneRepo,
  commit,
  discardPaths,
  execGit,
  fetch,
  getFileBlob,
  getCommitDiffText,
  getDiffText,
  getUntrackedDiff,
  getStatus,
  getLog,
  initRepo,
  isImagePath,
  isRepo,
  listBranches,
  listStashes,
  listSubmodules,
  listTags,
  pull,
  push,
  addPaths,
  unstagePaths
} from './git'
import { loadSession, loadSettings, updateSession, updateSettings } from './settings'
import { RepoWatcher } from './watcher'

const abortControllers = new Map<string, AbortController>()
const watcher = new RepoWatcher()

function handle<S extends z.ZodTypeAny, R>(
  channel: string,
  schema: S,
  fn: (arg: z.infer<S>) => Promise<R> | R
): void {
  ipcMain.handle(channel, async (_event, raw: unknown): Promise<R> => {
    return fn(schema.parse(raw))
  })
}

function progressSender(opId: string, contents: WebContents): (e: ProgressEventDto) => void {
  return (e) => {
    if (!contents.isDestroyed()) contents.send(IPC_EVENTS.gitProgress, { opId, event: e })
  }
}

function broadcastRepoChanged(repoPath: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.repoChanged, { repoPath })
  }
}

function registerAbort(opId: string): AbortController {
  const existing = abortControllers.get(opId)
  if (existing) existing.abort()
  const controller = new AbortController()
  abortControllers.set(opId, controller)
  return controller
}

function finishAbort(opId: string): void {
  abortControllers.delete(opId)
}

/** Run a sync op with abort support; maps abort → clean cancellation error. */
async function withAbort(
  opId: string,
  fn: (signal: AbortSignal, onProgress: (e: ProgressEventDto) => void, contents: WebContents) => Promise<void>
): Promise<void> {
  const controller = registerAbort(opId)
  const contents = BrowserWindow.getAllWindows()[0]?.webContents
  try {
    await fn(
      controller.signal,
      contents ? progressSender(opId, contents) : () => {},
      contents as WebContents
    )
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('operation cancelled', { cause: err })
    }
    throw err
  } finally {
    finishAbort(opId)
  }
}

export function registerIpcHandlers(): void {
  // --- app / dialogs -------------------------------------------------------
  ipcMain.handle(IPC.appInfo, (): AppInfoDto => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform
    }
  })

  handle(IPC.pickDirectory, pickDirectorySchema, async (arg) => {
    const win = BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: arg.title,
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // --- settings / session --------------------------------------------------
  handle(IPC.settingsGet, z.void(), () => loadSettings())
  handle(IPC.settingsSet, settingsPatchSchema, (patch) => updateSettings(patch))
  handle(IPC.sessionGet, z.void(), () => loadSession())
  handle(IPC.sessionSet, sessionPatchSchema, (patch) => updateSession(patch))

  // --- repo validation -----------------------------------------------------
  handle(IPC.repoValidate, openRepoRequestSchema, async (arg): Promise<RepoValidateDto> => {
    try {
      const info = await stat(arg.path)
      if (!info.isDirectory()) return { path: arg.path, isRepo: false }
    } catch {
      return { path: arg.path, isRepo: false, missing: true }
    }
    return { path: arg.path, isRepo: await isRepo(arg.path) }
  })

  // --- git data ------------------------------------------------------------
  handle(IPC.gitStatus, gitStatusRequestSchema, (arg): Promise<GitStatusDto> => getStatus(arg.repoPath))

  handle(IPC.gitGraph, graphRequestSchema, async (arg): Promise<GraphPageDto> => {
    const commits = (await getLog(arg.repoPath, {
      limit: arg.limit + 1,
      skip: arg.skip,
      all: true,
      topo: true
    })) as CommitDto[]
    const hasMore = commits.length > arg.limit
    return { commits: hasMore ? commits.slice(0, arg.limit) : commits, hasMore }
  })

  handle(IPC.gitRefs, refsRequestSchema, async (arg): Promise<RefsDto> => {
    const [branches, tags, stashes, submodules, head] = await Promise.all([
      listBranches(arg.repoPath),
      listTags(arg.repoPath),
      listStashes(arg.repoPath),
      listSubmodules(arg.repoPath),
      execGit({ cwd: arg.repoPath, args: ['branch', '--show-current'] })
    ])
    return { branches, tags, stashes, submodules, current: head.stdout.trim() || undefined }
  })

  // --- mutations -----------------------------------------------------------
  handle(IPC.gitCheckout, checkoutRequestSchema, async (arg) => {
    await checkout(arg.repoPath, arg.target)
  })

  handle(IPC.gitStage, pathsRequestSchema, async (arg) => {
    await addPaths(arg.repoPath, arg.paths)
  })

  handle(IPC.gitUnstage, pathsRequestSchema, async (arg) => {
    await unstagePaths(arg.repoPath, arg.paths)
  })

  handle(IPC.gitDiscard, pathsRequestSchema, async (arg) => {
    await discardPaths(arg.repoPath, arg.paths)
  })

  handle(IPC.gitClean, pathsRequestSchema, async (arg) => {
    await cleanPaths(arg.repoPath, arg.paths)
  })

  handle(IPC.gitIgnore, ignoreRequestSchema, async (arg) => {
    await addToGitignore(arg.repoPath, arg.path)
  })

  handle(IPC.gitCommit, commitRequestSchema, async (arg): Promise<{ oid: string }> => {
    const oid = await commit(arg.repoPath, {
      message: arg.message,
      amend: arg.amend,
      signoff: arg.signoff
    })
    return { oid }
  })

  handle(IPC.gitApplyHunk, applyHunkRequestSchema, async (arg) => {
    await applyPatchToIndex(arg.repoPath, arg.patch, arg.reverse)
  })

  // --- diff / blob ---------------------------------------------------------
  handle(IPC.gitDiffText, diffRequestSchema, (arg): Promise<string> => {
    if (arg.untracked) {
      const path = arg.paths?.[0]
      if (!path) throw new Error('untracked diff requires a path')
      return getUntrackedDiff(arg.repoPath, path)
    }
    return getDiffText(arg.repoPath, {
      cached: arg.cached,
      paths: arg.paths,
      contextLines: arg.context
    })
  })

  handle(IPC.gitCommitDiff, commitDiffRequestSchema, (arg): Promise<string> =>
    getCommitDiffText(arg.repoPath, arg.oid)
  )

  handle(IPC.gitBlob, blobRequestSchema, async (arg): Promise<BlobDto> => getFileBlob(arg.repoPath, arg.spec))

  handle(IPC.fileWorktree, worktreeFileSchema, async (arg): Promise<BlobDto> => {
    const { resolve, sep } = await import('node:path')
    const { readFile } = await import('node:fs/promises')
    const root = resolve(arg.repoPath)
    const abs = resolve(root, arg.path)
    if (abs !== root && !abs.startsWith(root + sep)) {
      throw new Error('path escapes repository')
    }
    const buf = await readFile(abs)
    return {
      base64: buf.toString('base64'),
      isImage: isImagePath(arg.path),
      size: buf.length
    }
  })

  // --- sync (fetch/pull/push) with progress + cancel ------------------------
  handle(IPC.gitFetch, syncRequestSchema, (arg) =>
    withAbort(arg.opId, (signal, onProgress) => fetch(arg.repoPath, { signal, onProgress }))
  )

  handle(IPC.gitPull, syncRequestSchema, (arg) =>
    withAbort(arg.opId, (signal, onProgress) =>
      pull(arg.repoPath, { signal, onProgress, rebase: arg.rebase })
    )
  )

  handle(IPC.gitPush, syncRequestSchema, (arg) =>
    withAbort(arg.opId, (signal, onProgress) =>
      push(arg.repoPath, {
        signal,
        onProgress,
        forceWithLease: arg.forceWithLease,
        setUpstream: arg.setUpstream
      })
    )
  )

  handle(IPC.gitCancel, cancelRequestSchema, (arg) => {
    abortControllers.get(arg.opId)?.abort()
  })

  // --- clone / init --------------------------------------------------------
  handle(IPC.gitClone, cloneRequestSchema, (arg) =>
    withAbort(arg.opId, async (signal, onProgress) => {
      const parentDir = join(arg.targetDir, '..')
      await cloneRepo(
        arg.url,
        arg.targetDir,
        { depth: arg.depth, signal, onProgress },
        parentDir
      )
    })
  )

  handle(IPC.gitInit, initRequestSchema, async (arg): Promise<{ repoPath: string }> => {
    const repoPath = join(arg.dir, arg.name)
    await mkdir(repoPath, { recursive: true })
    await initRepo(repoPath, arg.defaultBranch)
    return { repoPath }
  })

  // --- watcher -------------------------------------------------------------
  handle(IPC.watchStart, watchRequestSchema, (arg) => {
    watcher.start(arg.repoPath, broadcastRepoChanged)
  })

  handle(IPC.watchStop, watchRequestSchema, (arg) => {
    watcher.stop(arg.repoPath)
  })
}

export function disposeWatchers(): void {
  watcher.stopAll()
  for (const controller of abortControllers.values()) controller.abort()
  abortControllers.clear()
}
