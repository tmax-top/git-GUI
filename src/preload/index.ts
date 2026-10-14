import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppInfoDto,
  AppSettingsDto,
  BlobDto,
  GitStatusDto,
  GraphPageDto,
  Language,
  ProgressEventDto,
  RefsDto,
  RepoValidateDto,
  SessionStateDto
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

  watchStart(repoPath: string): Promise<void>
  watchStop(repoPath: string): Promise<void>

  onRepoChanged(cb: (repoPath: string) => void): Unsub
  onGitProgress(cb: (payload: { opId: string; event: ProgressEventDto }) => void): Unsub
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
  }
}

contextBridge.exposeInMainWorld('api', api)

export type { Language }
