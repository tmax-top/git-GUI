import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  ActivityEntryDto,
  AppInfoDto,
  AppSettingsDto,
  BlobDto,
  ConflictsDto,
  ConflictFileDto,
  GitStatusDto,
  GitflowStatusDto,
  GraphPageDto,
  HookDto,
  Language,
  LfsStatusDto,
  OpStateDto,
  ProgressEventDto,
  RefsDto,
  RebaseOpDto,
  RebaseRangeCommitDto,
  RepoValidateDto,
  RepoSettingsDto,
  SearchCommitHitDto,
  SearchContentHitDto,
  SearchScope,
  SessionStateDto,
  SigningStatusDto,
  UndoApplyResultDto,
  UndoDescriptionDto,
  UndoSnapshotDto,
  UndoStackStateDto,
  WorktreeInfoDto
} from '../shared/ipc'
// NOTE: sandboxed preload cannot require external modules (e.g. zod) — channel
// constants live in their own dependency-free module.
import { IPC, IPC_EVENTS } from '../shared/channels'

type Unsub = () => void

export interface GitGuiApi {
  appInfo(): Promise<AppInfoDto>
  pickDirectory(title?: string): Promise<string | null>

  settingsGet(): Promise<AppSettingsDto>
  settingsSet(patch: Partial<AppSettingsDto>): Promise<AppSettingsDto>
  sessionGet(): Promise<SessionStateDto>
  sessionSet(patch: Partial<SessionStateDto>): Promise<SessionStateDto>

  repoValidate(path: string): Promise<RepoValidateDto>
  getPathForFile(file: File): string

  gitStatus(repoPath: string): Promise<GitStatusDto>
  gitGraph(args: { repoPath: string; limit: number; skip: number }): Promise<GraphPageDto>
  gitRefs(repoPath: string): Promise<RefsDto>
  gitCheckout(args: { repoPath: string; target: string }): Promise<void>
  gitStage(args: { repoPath: string; paths: string[] }): Promise<void>
  gitUnstage(args: { repoPath: string; paths: string[] }): Promise<void>
  gitDiscard(args: { repoPath: string; paths: string[] }): Promise<void>
  gitClean(args: { repoPath: string; paths: string[] }): Promise<void>
  gitIgnore(args: { repoPath: string; path: string }): Promise<void>
  gitCommit(args: {
    repoPath: string
    message: string
    amend?: boolean
    signoff?: boolean
  }): Promise<{ oid: string }>
  gitDiffText(args: {
    repoPath: string
    cached?: boolean
    untracked?: boolean
    paths?: string[]
    context?: number
  }): Promise<string>
  gitCommitDiff(args: { repoPath: string; oid: string }): Promise<string>
  gitApplyHunk(args: { repoPath: string; patch: string; reverse?: boolean }): Promise<void>
  gitBlob(args: { repoPath: string; spec: string }): Promise<BlobDto>
  gitWorktreeFile(args: { repoPath: string; path: string }): Promise<BlobDto>

  gitFetch(args: { repoPath: string; opId: string }): Promise<void>
  gitPull(args: {
    repoPath: string
    opId: string
    rebase?: boolean
  }): Promise<void>
  gitPush(args: {
    repoPath: string
    opId: string
    forceWithLease?: boolean
    /** branch name for `git push --set-upstream origin <name>` */
    setUpstream?: string
  }): Promise<void>
  gitCancel(opId: string): Promise<void>
  gitClone(args: {
    url: string
    targetDir: string
    depth?: number
    opId: string
  }): Promise<void>
  gitInit(args: { dir: string; name: string; defaultBranch: string }): Promise<{ repoPath: string }>

  gitOpState(repoPath: string): Promise<OpStateDto>
  gitMerge(args: {
    repoPath: string
    branch: string
    noFF?: boolean
    ffOnly?: boolean
    message?: string
  }): Promise<ConflictsDto>
  gitOpContinue(repoPath: string): Promise<ConflictsDto>
  gitOpAbort(repoPath: string): Promise<void>
  gitOpSkip(repoPath: string): Promise<ConflictsDto>
  gitRebase(args: {
    repoPath: string
    upstream: string
    autostash?: boolean
  }): Promise<ConflictsDto>
  gitRebaseInteractive(args: {
    repoPath: string
    upstream: string
    autostash?: boolean
    ops: RebaseOpDto[]
  }): Promise<ConflictsDto>
  gitRebaseRange(args: { repoPath: string; base: string }): Promise<RebaseRangeCommitDto[]>
  gitCherryPick(args: {
    repoPath: string
    oids: string[]
    mainline?: number
  }): Promise<ConflictsDto>
  gitRevert(args: { repoPath: string; oids: string[]; mainline?: number }): Promise<ConflictsDto>
  gitReset(args: { repoPath: string; mode: 'soft' | 'mixed' | 'hard'; target: string }): Promise<void>
  gitStashPush(args: {
    repoPath: string
    message?: string
    untracked?: boolean
    staged?: boolean
  }): Promise<void>
  gitStashApply(args: { repoPath: string; ref?: string; pop?: boolean }): Promise<ConflictsDto>
  gitStashDrop(args: { repoPath: string; ref?: string }): Promise<void>
  gitTagCreate(args: { repoPath: string; name: string; message?: string; oid?: string }): Promise<void>
  gitTagDelete(args: { repoPath: string; names: string[] }): Promise<void>
  gitBranchDelete(args: { repoPath: string; name: string; force?: boolean }): Promise<void>
  gitBranchRename(args: { repoPath: string; from: string; to: string }): Promise<void>
  gitConflictRead(args: { repoPath: string; path: string }): Promise<ConflictFileDto>
  gitSearch(args: {
    repoPath: string
    scope: SearchScope
    query: string
    limit?: number
  }): Promise<SearchCommitHitDto[] | string[] | SearchContentHitDto[]>
  gitConflictResolve(args: { repoPath: string; path: string; content: string }): Promise<void>
  gitConflictAccept(args: {
    repoPath: string
    path: string
    side: 'ours' | 'theirs'
  }): Promise<void>
  gitUndoSnapshot(args: { repoPath: string; worktree?: boolean }): Promise<UndoSnapshotDto>
  gitUndoRecord(args: {
    repoPath: string
    description: UndoDescriptionDto
    before: UndoSnapshotDto
    after: UndoSnapshotDto
  }): Promise<UndoStackStateDto>
  gitUndoList(repoPath: string): Promise<UndoStackStateDto>
  gitUndoApply(args: {
    repoPath: string
    direction: 'undo' | 'redo'
    force?: boolean
  }): Promise<UndoApplyResultDto>
  activityList(limit?: number): Promise<ActivityEntryDto[]>
  hooksList(repoPath: string): Promise<HookDto[]>
  hookRead(repoPath: string, name: string): Promise<string>
  hookSetEnabled(args: { repoPath: string; name: string; enabled: boolean }): Promise<HookDto[]>
  lfsStatus(repoPath: string): Promise<LfsStatusDto>
  lfsSetPolicy(args: {
    repoPath: string
    fetchInclude?: string
    fetchExclude?: string
  }): Promise<LfsStatusDto>
  gitflowStatus(repoPath: string): Promise<GitflowStatusDto>
  gitflowInit(repoPath: string): Promise<GitflowStatusDto>
  gitflowStart(args: {
    repoPath: string
    kind: 'feature' | 'release' | 'hotfix'
    name: string
  }): Promise<GitflowStatusDto>
  gitflowFinish(args: {
    repoPath: string
    kind: 'feature' | 'release' | 'hotfix'
  }): Promise<GitflowStatusDto>
  signingStatus(repoPath: string): Promise<SigningStatusDto>
  signingSet(args: {
    repoPath: string
    signCommits?: boolean
    format?: 'openpgp' | 'ssh' | 'x509'
    signingKey?: string
  }): Promise<SigningStatusDto>
  toolsOpen(args: {
    repoPath: string
    kind: 'editor' | 'diffTool' | 'mergeTool' | 'terminal'
    path?: string
  }): Promise<void>
  repoSettingsGet(repoPath: string): Promise<RepoSettingsDto>
  repoSettingsSet(args: {
    repoPath: string
    encoding?: string
    defaultBranch?: string
  }): Promise<RepoSettingsDto>
  repoCleanOrig(repoPath: string): Promise<string[]>
  worktreeList(repoPath: string): Promise<WorktreeInfoDto[]>
  worktreeAdd(args: {
    repoPath: string
    path: string
    branch?: string
    startPoint?: string
  }): Promise<void>
  worktreeRemove(args: { repoPath: string; path: string; force?: boolean }): Promise<void>

  watchStart(repoPath: string): Promise<void>
  watchStop(repoPath: string): Promise<void>

  onRepoChanged(cb: (repoPath: string) => void): Unsub
  onGitProgress(cb: (payload: { opId: string; event: ProgressEventDto }) => void): Unsub
  onActivity(cb: (entry: ActivityEntryDto) => void): Unsub
}

const api: GitGuiApi = {
  appInfo: () => ipcRenderer.invoke(IPC.appInfo),
  pickDirectory: (title) => ipcRenderer.invoke(IPC.pickDirectory, { title }),

  settingsGet: () => ipcRenderer.invoke(IPC.settingsGet),
  settingsSet: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  sessionGet: () => ipcRenderer.invoke(IPC.sessionGet),
  sessionSet: (patch) => ipcRenderer.invoke(IPC.sessionSet, patch),

  repoValidate: (path) => ipcRenderer.invoke(IPC.repoValidate, { path }),
  getPathForFile: (file) => webUtils.getPathForFile(file),

  gitStatus: (repoPath) => ipcRenderer.invoke(IPC.gitStatus, { repoPath }),
  gitGraph: (args) => ipcRenderer.invoke(IPC.gitGraph, args),
  gitRefs: (repoPath) => ipcRenderer.invoke(IPC.gitRefs, { repoPath }),
  gitCheckout: (args) => ipcRenderer.invoke(IPC.gitCheckout, args),
  gitStage: (args) => ipcRenderer.invoke(IPC.gitStage, args),
  gitUnstage: (args) => ipcRenderer.invoke(IPC.gitUnstage, args),
  gitDiscard: (args) => ipcRenderer.invoke(IPC.gitDiscard, args),
  gitClean: (args) => ipcRenderer.invoke(IPC.gitClean, args),
  gitIgnore: (args) => ipcRenderer.invoke(IPC.gitIgnore, args),
  gitCommit: (args) => ipcRenderer.invoke(IPC.gitCommit, args),
  gitDiffText: (args) => ipcRenderer.invoke(IPC.gitDiffText, args),
  gitCommitDiff: (args) => ipcRenderer.invoke(IPC.gitCommitDiff, args),
  gitApplyHunk: (args) => ipcRenderer.invoke(IPC.gitApplyHunk, args),
  gitBlob: (args) => ipcRenderer.invoke(IPC.gitBlob, args),
  gitWorktreeFile: (args) => ipcRenderer.invoke(IPC.fileWorktree, args),

  gitFetch: (args) => ipcRenderer.invoke(IPC.gitFetch, args),
  gitPull: (args) => ipcRenderer.invoke(IPC.gitPull, args),
  gitPush: (args) => ipcRenderer.invoke(IPC.gitPush, args),
  gitCancel: (opId) => ipcRenderer.invoke(IPC.gitCancel, { opId }),
  gitClone: (args) => ipcRenderer.invoke(IPC.gitClone, args),
  gitInit: (args) => ipcRenderer.invoke(IPC.gitInit, args),

  gitOpState: (repoPath) => ipcRenderer.invoke(IPC.gitOpState, { repoPath }),
  gitMerge: (args) => ipcRenderer.invoke(IPC.gitMerge, args),
  gitOpContinue: (repoPath) => ipcRenderer.invoke(IPC.gitOpContinue, { repoPath }),
  gitOpAbort: (repoPath) => ipcRenderer.invoke(IPC.gitOpAbort, { repoPath }),
  gitOpSkip: (repoPath) => ipcRenderer.invoke(IPC.gitOpSkip, { repoPath }),
  gitRebase: (args) => ipcRenderer.invoke(IPC.gitRebase, args),
  gitRebaseInteractive: (args) => ipcRenderer.invoke(IPC.gitRebaseInteractive, args),
  gitRebaseRange: (args) => ipcRenderer.invoke(IPC.gitRebaseRange, args),
  gitCherryPick: (args) => ipcRenderer.invoke(IPC.gitCherryPick, args),
  gitRevert: (args) => ipcRenderer.invoke(IPC.gitRevert, args),
  gitReset: (args) => ipcRenderer.invoke(IPC.gitReset, args),
  gitStashPush: (args) => ipcRenderer.invoke(IPC.gitStashPush, args),
  gitStashApply: (args) => ipcRenderer.invoke(IPC.gitStashApply, args),
  gitStashDrop: (args) => ipcRenderer.invoke(IPC.gitStashDrop, args),
  gitTagCreate: (args) => ipcRenderer.invoke(IPC.gitTagCreate, args),
  gitTagDelete: (args) => ipcRenderer.invoke(IPC.gitTagDelete, args),
  gitBranchDelete: (args) => ipcRenderer.invoke(IPC.gitBranchDelete, args),
  gitBranchRename: (args) => ipcRenderer.invoke(IPC.gitBranchRename, args),
  gitConflictRead: (args) => ipcRenderer.invoke(IPC.gitConflictRead, args),
  gitSearch: (args) => ipcRenderer.invoke(IPC.gitSearch, args),
  gitConflictResolve: (args) => ipcRenderer.invoke(IPC.gitConflictResolve, args),
  gitConflictAccept: (args) => ipcRenderer.invoke(IPC.gitConflictAccept, args),
  gitUndoSnapshot: (args) => ipcRenderer.invoke(IPC.gitUndoSnapshot, args),
  gitUndoRecord: (args) => ipcRenderer.invoke(IPC.gitUndoRecord, args),
  gitUndoList: (repoPath) => ipcRenderer.invoke(IPC.gitUndoList, { repoPath }),
  gitUndoApply: (args) => ipcRenderer.invoke(IPC.gitUndoApply, args),
  activityList: (limit) => ipcRenderer.invoke(IPC.activityList, limit ? { limit } : {}),
  hooksList: (repoPath) => ipcRenderer.invoke(IPC.hooksList, { repoPath }),
  hookRead: (repoPath, name) => ipcRenderer.invoke(IPC.hookRead, { repoPath, name }),
  hookSetEnabled: (args) => ipcRenderer.invoke(IPC.hookSetEnabled, args),
  lfsStatus: (repoPath) => ipcRenderer.invoke(IPC.lfsStatus, { repoPath }),
  lfsSetPolicy: (args) => ipcRenderer.invoke(IPC.lfsSetPolicy, args),
  gitflowStatus: (repoPath) => ipcRenderer.invoke(IPC.gitflowStatus, { repoPath }),
  gitflowInit: (repoPath) => ipcRenderer.invoke(IPC.gitflowInit, { repoPath }),
  gitflowStart: (args) => ipcRenderer.invoke(IPC.gitflowStart, args),
  gitflowFinish: (args) => ipcRenderer.invoke(IPC.gitflowFinish, args),
  signingStatus: (repoPath) => ipcRenderer.invoke(IPC.signingStatus, { repoPath }),
  signingSet: (args) => ipcRenderer.invoke(IPC.signingSet, args),
  toolsOpen: (args) => ipcRenderer.invoke(IPC.toolsOpen, args),
  repoSettingsGet: (repoPath) => ipcRenderer.invoke(IPC.repoSettingsGet, { repoPath }),
  repoSettingsSet: (args) => ipcRenderer.invoke(IPC.repoSettingsSet, args),
  repoCleanOrig: (repoPath) => ipcRenderer.invoke(IPC.repoCleanOrig, { repoPath }),
  worktreeList: (repoPath) => ipcRenderer.invoke(IPC.worktreeList, { repoPath }),
  worktreeAdd: (args) => ipcRenderer.invoke(IPC.worktreeAdd, args),
  worktreeRemove: (args) => ipcRenderer.invoke(IPC.worktreeRemove, args),

  watchStart: (repoPath) => ipcRenderer.invoke(IPC.watchStart, { repoPath }),
  watchStop: (repoPath) => ipcRenderer.invoke(IPC.watchStop, { repoPath }),

  onRepoChanged: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { repoPath: string }): void =>
      cb(payload.repoPath)
    ipcRenderer.on(IPC_EVENTS.repoChanged, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.repoChanged, listener)
  },
  onGitProgress: (cb) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      payload: { opId: string; event: ProgressEventDto }
    ): void => cb(payload)
    ipcRenderer.on(IPC_EVENTS.gitProgress, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.gitProgress, listener)
  },
  onActivity: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, entry: ActivityEntryDto): void => cb(entry)
    ipcRenderer.on(IPC_EVENTS.activityNew, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.activityNew, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type { Language }
