import { app, dialog, ipcMain, BrowserWindow, type WebContents } from 'electron'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import {
  IPC,
  IPC_EVENTS,
  activityListRequestSchema,
  applyHunkRequestSchema,
  blobRequestSchema,
  branchDeleteRequestSchema,
  branchRenameRequestSchema,
  cancelRequestSchema,
  cherryPickRequestSchema,
  checkoutRequestSchema,
  cloneRequestSchema,
  commitDiffRequestSchema,
  commitRequestSchema,
  diffRequestSchema,
  gitStatusRequestSchema,
  graphRequestSchema,
  ignoreRequestSchema,
  initRequestSchema,
  mergeRequestSchema,
  opRepoSchema,
  openRepoRequestSchema,
  pathsRequestSchema,
  pickDirectorySchema,
  rebaseInteractiveRequestSchema,
  rebaseRangeRequestSchema,
  conflictFileRequestSchema,
  conflictResolveRequestSchema,
  conflictSideRequestSchema,
  searchRequestSchema,
  rebaseRequestSchema,
  refsRequestSchema,
  resetRequestSchema,
  sessionPatchSchema,
  settingsPatchSchema,
  stashApplyRequestSchema,
  stashDropRequestSchema,
  stashPushRequestSchema,
  syncRequestSchema,
  tagCreateRequestSchema,
  tagDeleteRequestSchema,
  undoApplyRequestSchema,
  undoRecordRequestSchema,
  undoSnapshotRequestSchema,
  watchRequestSchema,
  worktreeAddRequestSchema,
  worktreeFileSchema,
  worktreeRemoveRequestSchema
} from '../shared/ipc'
import type {
  ActivityEntryDto,
  AppInfoDto,
  BlobDto,
  CommitDto,
  ConflictsDto,
  GitStatusDto,
  GraphPageDto,
  OpStateDto,
  ProgressEventDto,
  RebaseRangeCommitDto,
  ConflictFileDto,
  RefsDto,
  RepoValidateDto,
  UndoApplyResultDto,
  UndoSnapshotDto,
  UndoStackStateDto,
  WorktreeInfoDto
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
  unstagePaths,
  getOpState,
  merge,
  abortOp,
  continueOp,
  skipOp,
  rebase,
  rebaseInteractive,
  rebaseRange,
  cherryPick,
  revertCommits,
  reset,
  stashPush,
  stashApply,
  stashDrop,
  tagCreate,
  tagDelete,
  deleteBranch,
  renameBranch,
  getConflictFile,
  resolveConflict,
  acceptConflictSide,
  searchCommits,
  searchFiles,
  searchContent,
  captureUndoSnapshot,
  recordUndoEntry,
  applyUndo,
  undoList,
  listWorktrees,
  addWorktree,
  removeWorktree
} from './git'
import { loadSession, loadSettings, updateSession, updateSettings } from './settings'
import { RepoWatcher } from './watcher'
import { AutoFetchScheduler } from './autofetch'
import { initActivityLog, listActivity, logActivity, setActivityListener } from './log/activity'
import { notifyForSync, showDesktopNotification } from './notify'

const abortControllers = new Map<string, AbortController>()
const watcher = new RepoWatcher()

/** Fire a desktop notification for a sync outcome if settings allow it. */
async function notifyForOutcome(
  kind: ActivityEntryDto['kind'],
  ok: boolean,
  message?: string
): Promise<void> {
  const settings = await loadSettings()
  if (!settings.notifications) return
  const lang =
    settings.language === 'system' ? (app.getLocale().startsWith('zh') ? 'zh' : 'en') : settings.language
  const n = notifyForSync(lang, kind, ok, message)
  if (n) showDesktopNotification(n)
}

const autoFetch = new AutoFetchScheduler({
  loadSettings,
  loadSession,
  fetch: (repoPath, opts) => fetch(repoPath, { prune: opts.prune }),
  onChanged: broadcastRepoChanged,
  // Don't compete with a manual sync op (fetch/pull/push/clone in flight).
  shouldSkip: () => abortControllers.size > 0,
  onOutcome: (_repoPath, ok, message) => {
    void notifyForOutcome('auto-fetch', ok, message)
  }
})

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
  // --- activity log + auto-fetch -------------------------------------------
  void initActivityLog(join(app.getPath('userData'), 'logs')).then(() => {
    setActivityListener((entry) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.activityNew, entry)
      }
    })
    autoFetch.start()
  })

  handle(IPC.activityList, activityListRequestSchema, (arg): ActivityEntryDto[] =>
    listActivity(arg.limit)
  )

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
  /** Run a sync op and record its outcome in the activity log + notifications. */
  async function withActivity(
    kind: ActivityEntryDto['kind'],
    repoPath: string,
    fn: () => Promise<void>
  ): Promise<void> {
    try {
      await fn()
      await logActivity({ kind, repoPath, ok: true })
      await notifyForOutcome(kind, true)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await logActivity({ kind, repoPath, ok: false, message })
      await notifyForOutcome(kind, false, message)
      throw e
    }
  }

  handle(IPC.gitFetch, syncRequestSchema, (arg) =>
    withActivity('fetch', arg.repoPath, () =>
      withAbort(arg.opId, (signal, onProgress) => fetch(arg.repoPath, { signal, onProgress }))
    )
  )

  handle(IPC.gitPull, syncRequestSchema, (arg) =>
    withActivity('pull', arg.repoPath, () =>
      withAbort(arg.opId, (signal, onProgress) =>
        pull(arg.repoPath, { signal, onProgress, rebase: arg.rebase })
      )
    )
  )

  handle(IPC.gitPush, syncRequestSchema, (arg) =>
    withActivity('push', arg.repoPath, () =>
      withAbort(arg.opId, (signal, onProgress) =>
        push(arg.repoPath, {
          signal,
          onProgress,
          forceWithLease: arg.forceWithLease,
          setUpstream: arg.setUpstream
        })
      )
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

  // --- P3 advanced operations ----------------------------------------------
  handle(IPC.gitOpState, opRepoSchema, async (arg): Promise<OpStateDto> =>
    getOpState(arg.repoPath)
  )

  handle(IPC.gitMerge, mergeRequestSchema, async (arg): Promise<ConflictsDto> =>
    merge(arg.repoPath, arg.branch, {
      noFF: arg.noFF,
      ffOnly: arg.ffOnly,
      message: arg.message
    })
  )

  handle(IPC.gitOpContinue, opRepoSchema, async (arg): Promise<ConflictsDto> =>
    continueOp(arg.repoPath)
  )

  handle(IPC.gitOpAbort, opRepoSchema, async (arg) => {
    await abortOp(arg.repoPath)
  })

  handle(IPC.gitOpSkip, opRepoSchema, async (arg): Promise<ConflictsDto> => skipOp(arg.repoPath))

  handle(IPC.gitRebase, rebaseRequestSchema, async (arg): Promise<ConflictsDto> =>
    rebase(arg.repoPath, arg.upstream, { autostash: arg.autostash })
  )

  handle(
    IPC.gitRebaseInteractive,
    rebaseInteractiveRequestSchema,
    async (arg): Promise<ConflictsDto> =>
      rebaseInteractive(arg.repoPath, arg.upstream, arg.ops, { autostash: arg.autostash })
  )

  handle(IPC.gitRebaseRange, rebaseRangeRequestSchema, async (arg): Promise<RebaseRangeCommitDto[]> =>
    rebaseRange(arg.repoPath, arg.base)
  )

  handle(IPC.gitConflictRead, conflictFileRequestSchema, async (arg): Promise<ConflictFileDto> =>
    getConflictFile(arg.repoPath, arg.path)
  )

  handle(IPC.gitConflictResolve, conflictResolveRequestSchema, async (arg) => {
    await resolveConflict(arg.repoPath, arg.path, arg.content)
  })

  handle(IPC.gitConflictAccept, conflictSideRequestSchema, async (arg) => {
    await acceptConflictSide(arg.repoPath, arg.path, arg.side)
  })

  handle(IPC.gitSearch, searchRequestSchema, async (arg): Promise<unknown> => {
    if (arg.scope === 'commits') return searchCommits(arg.repoPath, arg.query, arg.limit)
    if (arg.scope === 'files') return searchFiles(arg.repoPath, arg.query, arg.limit)
    return searchContent(arg.repoPath, arg.query, arg.limit)
  })

  // --- undo / redo stack ----------------------------------------------------
  handle(IPC.gitUndoSnapshot, undoSnapshotRequestSchema, async (arg): Promise<UndoSnapshotDto> =>
    captureUndoSnapshot(arg.repoPath, { worktree: arg.worktree })
  )

  handle(IPC.gitUndoRecord, undoRecordRequestSchema, async (arg): Promise<UndoStackStateDto> =>
    recordUndoEntry(arg.repoPath, arg.description, arg.before, arg.after)
  )

  handle(IPC.gitUndoList, opRepoSchema, async (arg): Promise<UndoStackStateDto> => undoList(arg.repoPath))

  handle(IPC.gitUndoApply, undoApplyRequestSchema, async (arg): Promise<UndoApplyResultDto> =>
    applyUndo(arg.repoPath, arg.direction, arg.force)
  )

  handle(IPC.gitCherryPick, cherryPickRequestSchema, async (arg): Promise<ConflictsDto> =>
    cherryPick(arg.repoPath, arg.oids, { mainline: arg.mainline })
  )

  handle(IPC.gitRevert, cherryPickRequestSchema, async (arg): Promise<ConflictsDto> =>
    revertCommits(arg.repoPath, arg.oids, { mainline: arg.mainline })
  )

  handle(IPC.gitReset, resetRequestSchema, async (arg) => {
    await reset(arg.repoPath, arg.mode, arg.target)
  })

  handle(IPC.gitStashPush, stashPushRequestSchema, async (arg) => {
    await stashPush(arg.repoPath, {
      message: arg.message,
      untracked: arg.untracked,
      staged: arg.staged
    })
  })

  handle(IPC.gitStashApply, stashApplyRequestSchema, async (arg): Promise<ConflictsDto> =>
    stashApply(arg.repoPath, arg.ref, { pop: arg.pop })
  )

  handle(IPC.gitStashDrop, stashDropRequestSchema, async (arg) => {
    await stashDrop(arg.repoPath, arg.ref)
  })

  handle(IPC.gitTagCreate, tagCreateRequestSchema, async (arg) => {
    await tagCreate(arg.repoPath, arg.name, { message: arg.message, oid: arg.oid })
  })

  handle(IPC.gitTagDelete, tagDeleteRequestSchema, async (arg) => {
    await tagDelete(arg.repoPath, arg.names)
  })

  handle(IPC.gitBranchDelete, branchDeleteRequestSchema, async (arg) => {
    await deleteBranch(arg.repoPath, arg.name, arg.force)
  })

  handle(IPC.gitBranchRename, branchRenameRequestSchema, async (arg) => {
    await renameBranch(arg.repoPath, arg.from, arg.to)
  })

  handle(IPC.worktreeList, opRepoSchema, async (arg): Promise<WorktreeInfoDto[]> =>
    listWorktrees(arg.repoPath)
  )

  handle(IPC.worktreeAdd, worktreeAddRequestSchema, async (arg) => {
    await addWorktree(arg.repoPath, arg.path, {
      branch: arg.branch,
      startPoint: arg.startPoint
    })
  })

  handle(IPC.worktreeRemove, worktreeRemoveRequestSchema, async (arg) => {
    await removeWorktree(arg.repoPath, arg.path, arg.force)
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
  autoFetch.stop()
  setActivityListener(null)
  watcher.stopAll()
  for (const controller of abortControllers.values()) controller.abort()
  abortControllers.clear()
}
