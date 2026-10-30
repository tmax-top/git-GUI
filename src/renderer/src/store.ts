import { create } from 'zustand'
import { buildHunkPatch, parseUnifiedDiff, type DiffFile } from '@shared/diff'
import type {
  AppSettingsDto,
  CommitDto,
  ConflictFileDto,
  ConflictsDto,
  GitStatusDto,
  OpStateDto,
  ProgressEventDto,
  RebaseOpDto,
  RefsDto,
  StatusFileDto,
  UndoApplyResultDto,
  UndoSnapshotDto,
  UndoStackStateDto,
  CreatePrInputDto,
  PrMergeMethod,
  ProviderAccountDto,
  ProviderKind,
  PullRequestDetailDto,
  PullRequestDto,
  RepoRef,
  PrState,
  WorkspaceDto,
  ProfileDto
} from '@shared/ipc'
import { isUnstaged, stagedFiles, untrackedFiles } from '@shared/status'
import { setLocale, t, tf, type Locale, type MessageKey } from './i18n'
import { applyTheme } from './theme'
import type { ContextMenuEntry } from './components/ContextMenu'

export type Selection =
  | { kind: 'wip' }
  | { kind: 'commit'; oid: string }
  | { kind: 'file'; path: string; cached: boolean; untracked: boolean }

export interface SyncState {
  opId: string
  kind: 'fetch' | 'pull' | 'push' | 'clone'
  progress?: ProgressEventDto
}

export interface ConfirmState {
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
}

export interface PushConflictState {
  kind: 'push-rejected'
}

export interface MenuState {
  x: number
  y: number
  items: ContextMenuEntry[]
}

export interface PromptState {
  title: string
  label?: string
  defaultValue?: string
  confirmLabel?: string
  danger?: boolean
  onSubmit: (value: string) => void | Promise<void>
}

/** Base commit for the interactive-rebase plan panel (replays `base..HEAD`). */
export interface RebaseDialogState {
  base: string
  baseShort: string
  baseSubject: string
}

/** Undo-bookkeeping options for one mutating action. */
interface UndoOp {
  desc: MessageKey
  params?: Record<string, string | number>
  /** Capture/restore worktree content too (checkout/merge/rebase/reset --hard/stash/pull). */
  worktree?: boolean
}

interface AppState {
  booted: boolean
  view: 'start' | 'repo'
  repoPath: string | null
  /** All repositories opened as tabs (last one opened is not necessarily active). */
  openRepos: string[]
  status: GitStatusDto | null
  refs: RefsDto | null
  commits: CommitDto[]
  hasMore: boolean
  graphLoading: boolean
  selection: Selection
  diff: string
  diffFiles: DiffFile[]
  /** File whose diff is shown for the selected commit (null = first file). */
  commitDiffFile: string | null
  diffLoading: boolean
  /** Conflicted file staged content for the three-way editor (null when none). */
  conflict: ConflictFileDto | null
  conflictLoading: boolean
  sync: SyncState | null
  error: string | null
  errorDetailOpen: boolean
  openErrorDetail(): void
  closeErrorDetail(): void
  confirm: ConfirmState | null
  pushConflict: boolean
  settings: AppSettingsDto
  opState: OpStateDto | null
  menu: MenuState | null
  prompt: PromptState | null
  rebaseDialog: RebaseDialogState | null
  /** Global search dialog visibility (commit / file path / content scopes). */
  searchOpen: boolean
  /** Settings dialog visibility (auto-fetch / prune / activity log). */
  settingsOpen: boolean
  settingsInitialTab?: string
  /** Embedded terminal panel visibility. */
  terminalOpen: boolean
  /** GitProvider / RepoRef detected for current repo. */
  activeRepoRef: RepoRef | null
  /** PR side/drawer panel visibility. */
  prPanelOpen: boolean
  /** Create PR modal visibility. */
  createPrOpen: boolean
  /** List of PRs for current repo. */
  prs: PullRequestDto[]
  prLoading: boolean
  /** Active PR selected. */
  activePrId: string | number | null
  activePrDetail: PullRequestDetailDto | null
  activePrLoading: boolean
  prFilter: PrState | 'all'
  /** Open PRs for the left sidebar — always state=open, ignores `prFilter`. */
  sidebarPrs: PullRequestDto[]
  /** Workspaces manager modal visibility. */
  workspaceModalOpen: boolean
  /** Command palette modal visibility. */
  paletteOpen: boolean
  /** Shortcuts cheatsheet modal visibility. */
  shortcutsOpen: boolean
  /** Apply patch modal visibility. */
  patchModalOpen: boolean
  /** Undo/redo stack state for the open repo (owned by the main process). */
  undoInfo: UndoStackStateDto

  boot(): Promise<void>
  openRepo(path: string): Promise<boolean>
  /** Activate an already-open repo tab. No-op when it is the active repo. */
  switchRepo(path: string): Promise<boolean>
  /** Close a tab by path (defaults to the active repo); activates another tab if the active one closes. */
  closeRepo(path?: string): Promise<void>
  refreshAll(): Promise<void>
  /** Refresh locally, then fetch in the background so remote branches catch up. */
  refreshWithRemote(): Promise<void>
  refreshStatus(): Promise<void>
  refreshOpState(): Promise<void>
  loadGraph(reset: boolean): Promise<void>
  loadMore(): Promise<void>

  selectWip(): void
  selectCommit(oid: string): void
  /** Pick which file of the selected commit is rendered in the diff pane. */
  selectCommitDiffFile(path: string | null): void
  selectFile(path: string, cached: boolean, untracked: boolean): void
  /** Write the edited resolution over the conflicted worktree file + stage it. */
  resolveConflict(content: string): Promise<void>
  /** Accept one side wholesale (binary conflicts, or "take ours/theirs"). */
  acceptConflict(side: 'ours' | 'theirs'): Promise<void>

  stage(paths: string[]): Promise<void>
  unstage(paths: string[]): Promise<void>
  discard(paths: string[]): Promise<void>
  clean(paths: string[]): Promise<void>
  ignore(path: string): Promise<void>
  stageHunk(file: DiffFile, hunkIndex: number): Promise<void>
  unstageHunk(file: DiffFile, hunkIndex: number): Promise<void>
  doCommit(message: string, amend: boolean): Promise<boolean>
  checkout(target: string): Promise<void>

  fetch(): Promise<void>
  pull(rebase?: boolean): Promise<void>
  push(forceWithLease?: boolean): Promise<void>
  cancelSync(): Promise<void>

  merge(branch: string, opts?: { noFF?: boolean; ffOnly?: boolean; message?: string }): Promise<void>
  rebase(upstream: string, opts?: { autostash?: boolean }): Promise<void>
  rebaseInteractive(upstream: string, ops: RebaseOpDto[]): Promise<void>
  openRebaseDialog(state: RebaseDialogState): void
  closeRebaseDialog(): void
  openSearch(): void
  closeSearch(): void
  openSettings(tab?: string): void
  closeSettings(): void
  toggleTerminal(): void
  togglePrPanel(): void
  openCreatePr(): void
  closeCreatePr(): void
  setPrFilter(filter: PrState | 'all'): void
  loadPrs(): Promise<void>
  /** Refresh the sidebar's open-PR list (never filtered by the PR panel). */
  loadSidebarPrs(): Promise<void>
  selectPr(id: string | number | null): Promise<void>
  createPr(input: CreatePrInputDto): Promise<void>
  commentPr(body: string): Promise<void>
  mergePr(method: PrMergeMethod): Promise<void>
  checkoutPr(branch: string): Promise<void>
  connectProviderPat(provider: ProviderKind, token: string, org?: string): Promise<ProviderAccountDto>
  disconnectProvider(provider: ProviderKind): Promise<void>

  openWorkspaceModal(): void
  closeWorkspaceModal(): void
  createWorkspace(name: string, description?: string, repoPaths?: string[]): Promise<WorkspaceDto>
  updateWorkspace(id: string, patch: Partial<Omit<WorkspaceDto, 'id' | 'createdAt'>>): Promise<void>
  deleteWorkspace(id: string): Promise<void>
  setActiveWorkspace(id: string | null): Promise<void>
  addRepoToWorkspace(workspaceId: string, repoPath: string): Promise<void>
  removeRepoFromWorkspace(workspaceId: string, repoPath: string): Promise<void>

  createProfile(name: string, authorName: string, authorEmail: string, signingKey?: string): Promise<ProfileDto>
  updateProfile(id: string, patch: Partial<Omit<ProfileDto, 'id'>>): Promise<void>
  deleteProfile(id: string): Promise<void>
  setActiveProfile(id: string | null): Promise<void>

  openCommandPalette(): void
  closeCommandPalette(): void
  toggleCommandPalette(): void
  openShortcutsModal(): void
  closeShortcutsModal(): void

  openPatchModal(): void
  closePatchModal(): void
  exportPatch(oid?: string): Promise<string>
  applyPatch(opts: { patchPath?: string; patchContent?: string }): Promise<{ mode: 'am' | 'apply'; message: string }>

  refreshUndo(): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  cherryPick(oids: string[], mainline?: number): Promise<void>
  revert(oids: string[], mainline?: number): Promise<void>
  reset(mode: 'soft' | 'mixed' | 'hard', target: string): Promise<void>
  opContinue(): Promise<void>
  opAbort(): Promise<void>
  opSkip(): Promise<void>
  stashPush(opts?: { message?: string; untracked?: boolean; staged?: boolean }): Promise<void>
  stashApply(ref?: string, pop?: boolean): Promise<void>
  stashDrop(ref?: string): Promise<void>
  tagCreate(name: string, message?: string, oid?: string): Promise<void>
  tagDelete(names: string[]): Promise<void>
  branchDelete(name: string, force?: boolean): Promise<void>
  branchRename(from: string, to: string): Promise<void>

  setConfirm(state: ConfirmState | null): void
  openMenu(state: MenuState): void
  closeMenu(): void
  setPrompt(state: PromptState | null): void
  dismissError(): void
  setPushConflict(v: boolean): void
  updateSettings(patch: Partial<AppSettingsDto>): Promise<void>
}

export function errText(e: unknown): string {
  let msg = e instanceof Error ? e.message : String(e)
  msg = msg.replace(/^Error invoking remote method '[^']+':\s*/, '')
  msg = msg.replace(/^Error:\s*/, '')
  msg = msg
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('** WARNING: connection is not using a post-quantum key exchange algorithm')) return false
      if (trimmed.startsWith('** This session may be vulnerable to "store now, decrypt later" attacks')) return false
      if (trimmed.startsWith('** The server may need to be upgraded. See https://openssh.com/pq.html')) return false
      return true
    })
    .join('\n')
  return msg.trim()
}

function isRejectedError(e: unknown): boolean {
  const msg = errText(e)
  return /non-fast-forward|fetch first|\[rejected\]|cannot lock ref/i.test(msg)
}

function opId(): string {
  return globalThis.crypto.randomUUID()
}

/** Human-readable risk explanation for a refused undo/redo. */
function undoRiskBody(res: UndoApplyResultDto): string {
  const parts: string[] = []
  if (res.currentChanged) parts.push(t('undo.riskChanged'))
  if (res.forcePushRisk?.length) {
    parts.push(tf('undo.riskForcePush', { branches: res.forcePushRisk.join(', ') }))
  }
  return parts.join('\n') || t('undo.riskGeneric')
}

let eventSubscribed = false

export const useApp = create<AppState>((set, get) => {
  /** Snapshot the repo for the undo stack. Best-effort: null on failure. */
  async function captureUndo(worktree: boolean): Promise<UndoSnapshotDto | null> {
    const repoPath = get().repoPath
    if (!repoPath) return null
    try {
      return await window.api.gitUndoSnapshot({ repoPath, worktree })
    } catch {
      return null
    }
  }

  /** Record a finished op onto the stack and publish the new stack state. */
  async function recordUndo(
    undo: UndoOp,
    before: UndoSnapshotDto | null,
    worktree: boolean
  ): Promise<void> {
    const repoPath = get().repoPath
    if (!repoPath || !before) return
    try {
      const after = await window.api.gitUndoSnapshot({ repoPath, worktree })
      const state = await window.api.gitUndoRecord({
        repoPath,
        description: { key: undo.desc, params: undo.params },
        before,
        after
      })
      set({ undoInfo: state })
    } catch {
      /* undo bookkeeping must never break the op itself */
    }
  }

  async function runMutate(fn: () => Promise<void>, undo?: UndoOp): Promise<void> {
    const worktree = undo?.worktree ?? false
    const before = undo ? await captureUndo(worktree) : null
    try {
      await fn()
    } catch (e) {
      set({ error: errText(e) })
      return
    }
    if (undo) await recordUndo(undo, before, worktree)
  }

  async function loadDiffFor(sel: Selection, repoPath: string): Promise<void> {
    set({ diffLoading: true, diff: '', diffFiles: [], conflict: null, conflictLoading: false })
    try {
      let text = ''
      if (sel.kind === 'commit') {
        text = await window.api.gitCommitDiff({ repoPath, oid: sel.oid })
      } else if (sel.kind === 'file') {
        text = await window.api.gitDiffText({
          repoPath,
          paths: [sel.path],
          cached: sel.cached || undefined,
          untracked: sel.untracked || undefined
        })
        // A conflicted file gets the three-way editor alongside its diff.
        const isUnmerged = get().status?.files.find((f) => f.path === sel.path)?.unmerged === true
        if (isUnmerged) {
          set({ conflictLoading: true })
          try {
            const conflict = await window.api.gitConflictRead({ repoPath, path: sel.path })
            set({ conflict, conflictLoading: false })
          } catch (ce) {
            set({ conflict: null, conflictLoading: false })
            set({ error: errText(ce) })
          }
        }
      }
      set({ diff: text, diffFiles: parseUnifiedDiff(text), diffLoading: false })
    } catch (e) {
      set({ error: errText(e), diffLoading: false })
    }
  }

  async function refreshQuiet(): Promise<void> {
    const repoPath = get().repoPath
    if (!repoPath) return
    try {
      const [status, refs, opState] = await Promise.all([
        window.api.gitStatus(repoPath),
        window.api.gitRefs(repoPath),
        window.api.gitOpState(repoPath)
      ])
      const prevRefs = get().refs
      const refsKey = (r: RefsDto | null): string =>
        r ? r.branches.map((b) => `${b.name}=${b.oid}`).join(',') : ''
      const refsChanged = refsKey(prevRefs) !== refsKey(refs)
      const headChanged = get().status?.oid !== status.oid
      set({ status, refs, opState })
      if (headChanged || refsChanged) {
        await get().loadGraph(true)
      }
      const sel = get().selection
      if (sel.kind !== 'wip') {
        void loadDiffFor(sel, repoPath)
      }
    } catch (e) {
      set({ error: errText(e) })
    }
  }

  /** Run a history mutation that may stop on conflicts, then resync everything. */
  async function runHistoryOp(
    fn: () => Promise<ConflictsDto | void>,
    undo?: UndoOp
  ): Promise<void> {
    const repoPath = get().repoPath
    if (!repoPath) return
    const worktree = undo?.worktree ?? false
    const before = undo ? await captureUndo(worktree) : null
    let conflicted = false
    try {
      const res = await fn()
      conflicted = !!(res && 'conflicts' in res && res.conflicts.length > 0)
    } catch (e) {
      set({ error: errText(e) })
    }
    // A conflicted op is mid-flight (opAbort recovers) — don't stack it.
    if (undo && !conflicted) await recordUndo(undo, before, worktree)
    await get().refreshAll()
  }

  return {
    booted: false,
    view: 'start',
    repoPath: null,
    openRepos: [],
    status: null,
    refs: null,
    commits: [],
    hasMore: false,
    graphLoading: false,
    selection: { kind: 'wip' },
    diff: '',
    diffFiles: [],
    commitDiffFile: null,
    diffLoading: false,
    conflict: null,
    conflictLoading: false,
    sync: null,
    error: null,
    errorDetailOpen: false,
    confirm: null,
    pushConflict: false,
    opState: null,
    menu: null,
    prompt: null,
    rebaseDialog: null,
    searchOpen: false,
    settingsOpen: false,
    terminalOpen: false,
    activeRepoRef: null,
    prPanelOpen: false,
    createPrOpen: false,
    prs: [],
    prLoading: false,
    activePrId: null,
    activePrDetail: null,
    activePrLoading: false,
    prFilter: 'open',
    sidebarPrs: [],
    workspaceModalOpen: false,
    paletteOpen: false,
    shortcutsOpen: false,
    patchModalOpen: false,
    undoInfo: { canUndo: false, canRedo: false },
    settings: {
      favorites: [],
      recent: [],
      graphInitialLimit: 500,
      defaultBranch: 'main',
      language: 'system',
      theme: 'system',
      leftPanelWidth: 224,
      rightPanelWidth: 320,
      graphSplitPct: 55,
      graphAuthorWidth: 112,
      graphDateWidth: 48,
      graphOidWidth: 40,
      autoFetchInterval: 0,
      autoPrune: true,
      notifications: true,
      externalTools: { editor: '', diffTool: '', mergeTool: '', terminal: '' },
      terminalFontFamily: '',
      terminalFontSize: 13,
      terminalHeight: 240,
      providerAccounts: [],
      workspaces: [],
      activeWorkspaceId: null,
      profiles: [],
      activeProfileId: null
    },

    async boot(): Promise<void> {
      if (get().booted) return
      const [settings, session] = await Promise.all([
        window.api.settingsGet(),
        window.api.sessionGet()
      ])
      const lang: Locale =
        settings.language === 'system'
          ? navigator.language.startsWith('zh')
            ? 'zh'
            : 'en'
          : settings.language
      setLocale(lang)
      applyTheme(settings.theme ?? 'system')
      if (typeof window !== 'undefined' && window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (get().settings.theme === 'system') applyTheme('system')
        })
      }
      set({ settings })

      if (!eventSubscribed) {
        eventSubscribed = true
        window.api.onRepoChanged((path) => {
          if (path === get().repoPath) void refreshQuiet()
        })
        window.api.onGitProgress(({ opId: id, event }) => {
          const sync = get().sync
          if (sync && sync.opId === id) set({ sync: { ...sync, progress: event } })
        })
      }

      set({ booted: true })

      // Session restore: keep every repo that still validates as a tab,
      // then reopen the last active one.
      const stored = session.openRepos ?? []
      const validated = await Promise.all(
        stored.map(async (p) =>
          ((await window.api.repoValidate(p).catch(() => null))?.isRepo ?? false) ? p : null
        )
      )
      const openRepos = validated.filter((p): p is string => p !== null)
      set({ openRepos })
      const target =
        (session.activeRepo && openRepos.includes(session.activeRepo) && session.activeRepo) ||
        openRepos[0]
      if (target) {
        const ok = await get().openRepo(target)
        if (ok) return
        // Fall back to the next open repo if the active one vanished.
        for (const p of openRepos) {
          if (p !== target && (await get().openRepo(p))) break
        }
      }
    },

    async openRepo(path: string): Promise<boolean> {
      try {
        const info = await window.api.repoValidate(path)
        if (!info.isRepo) {
          set({ error: info.missing ? 'Path does not exist' : t('start.notRepo') })
          return false
        }
        const prev = get().repoPath
        if (prev && prev !== path) await window.api.watchStop(prev)

        const openRepos = get().openRepos.includes(path)
          ? get().openRepos
          : [...get().openRepos, path]

        set({
          repoPath: path,
          openRepos,
          view: 'repo',
          status: null,
          refs: null,
          commits: [],
          hasMore: false,
          selection: { kind: 'wip' },
          diff: '',
          diffFiles: [],
          conflict: null,
          conflictLoading: false,
          error: null,
          opState: null,
          menu: null,
          prompt: null,
          rebaseDialog: null,
          searchOpen: false,
          settingsOpen: false,
          undoInfo: { canUndo: false, canRedo: false }
        })
        await window.api.watchStart(path)
        void window.api.sessionSet({ openRepos, activeRepo: path })
        const recents = [path, ...get().settings.recent.filter((p) => p !== path)].slice(0, 20)
        void get().updateSettings({ recent: recents })
        const ref = await window.api.providerDetectRepoRef({ repoPath: path }).catch(() => null)
        set({ activeRepoRef: ref, prs: [], sidebarPrs: [], activePrId: null, activePrDetail: null })
        if (ref) {
          void get().loadPrs()
          void get().loadSidebarPrs()
        }
        await get().refreshAll()
        await get().refreshUndo()
        return true
      } catch (e) {
        set({ error: errText(e) })
        return false
      }
    },

    async switchRepo(path: string): Promise<boolean> {
      if (!get().openRepos.includes(path)) return false
      if (get().repoPath === path) return true
      return await get().openRepo(path)
    },

    async closeRepo(path?: string): Promise<void> {
      const target = path ?? get().repoPath
      if (!target) return
      const remaining = get().openRepos.filter((p) => p !== target)
      const wasActive = target === get().repoPath

      if (wasActive) {
        // Activate a neighbour tab (prefer the one that took its place).
        const next = remaining.length > 0 ? remaining[0] : null
        set({ openRepos: remaining })
        if (next) {
          await get().openRepo(next)
          return
        }
        await window.api.watchStop(target)
        set({
          view: 'start',
          repoPath: null,
          openRepos: [],
          status: null,
          refs: null,
          commits: [],
          selection: { kind: 'wip' },
          diff: '',
          diffFiles: [],
          conflict: null,
          conflictLoading: false,
          sync: null,
          opState: null,
          menu: null,
          prompt: null,
          rebaseDialog: null,
          searchOpen: false,
          settingsOpen: false,
          activeRepoRef: null,
          prPanelOpen: false,
          createPrOpen: false,
          prs: [],
          sidebarPrs: [],
          activePrId: null,
          activePrDetail: null,
          undoInfo: { canUndo: false, canRedo: false }
        })
        void window.api.sessionSet({ openRepos: [], activeRepo: null })
        return
      }

      // Background tab: just drop it from the list.
      set({ openRepos: remaining })
      void window.api.sessionSet({ openRepos: remaining, activeRepo: get().repoPath })
    },

    async refreshAll(): Promise<void> {
      const repoPath = get().repoPath
      if (repoPath) {
        const ref = await window.api.providerDetectRepoRef({ repoPath }).catch(() => null)
        set({ activeRepoRef: ref })
        if (ref && get().prPanelOpen) void get().loadPrs()
      }
      await Promise.all([
        get().refreshStatus(),
        get().loadGraph(true),
        get().refreshOpState()
      ])
    },

    /**
     * Toolbar refresh: re-read the repo immediately (cheap, offline), then
     * fetch in the background so branches created or moved on the remote also
     * show up. Fetch failures are ignored — being offline is not an error here.
     */
    async refreshWithRemote(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await get().refreshAll()
      if (get().sync) return
      try {
        await window.api.gitFetch({ repoPath, opId: opId() })
        await get().refreshAll()
      } catch {
        // No remote, offline, or auth failure: the local refresh already ran.
      }
    },

    async refreshOpState(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        set({ opState: await window.api.gitOpState(repoPath) })
      } catch {
        /* op-state detection is best-effort */
      }
    },

    async refreshStatus(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        const [status, refs] = await Promise.all([
          window.api.gitStatus(repoPath),
          window.api.gitRefs(repoPath)
        ])
        set({ status, refs })
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async loadGraph(reset: boolean): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath || get().graphLoading) return
      const skip = reset ? 0 : get().commits.length
      const limit = get().settings.graphInitialLimit
      set({ graphLoading: true })
      try {
        const page = await window.api.gitGraph({ repoPath, limit, skip })
        set({
          commits: reset ? page.commits : [...get().commits, ...page.commits],
          hasMore: page.hasMore,
          graphLoading: false
        })
      } catch (e) {
        set({ error: errText(e), graphLoading: false })
      }
    },

    async loadMore(): Promise<void> {
      if (get().graphLoading || !get().hasMore) return
      await get().loadGraph(false)
    },

    selectWip(): void {
      const repoPath = get().repoPath
      set({ selection: { kind: 'wip' }, diff: '', diffFiles: [], commitDiffFile: null, conflict: null, conflictLoading: false })
      if (repoPath) void get().refreshStatus()
    },

    selectCommit(oid: string): void {
      set({ selection: { kind: 'commit', oid }, commitDiffFile: null })
      const repoPath = get().repoPath
      if (repoPath) void loadDiffFor({ kind: 'commit', oid }, repoPath)
    },

    selectCommitDiffFile(path: string | null): void {
      set({ commitDiffFile: path })
    },

    selectFile(path, cached, untracked): void {
      set({ selection: { kind: 'file', path, cached, untracked } })
      const repoPath = get().repoPath
      if (repoPath) void loadDiffFor({ kind: 'file', path, cached, untracked }, repoPath)
    },

    async stage(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(
        async () => {
          await window.api.gitStage({ repoPath, paths })
          await get().refreshStatus()
          const sel = get().selection
          if (sel.kind === 'file') {
            const still = get().status?.files.find((f) => f.path === sel.path)
            if (!still) get().selectWip()
          }
        },
        { desc: 'undo.desc.stage' }
      )
    },

    async unstage(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(
        async () => {
          await window.api.gitUnstage({ repoPath, paths })
          await get().refreshStatus()
          const sel = get().selection
          if (sel.kind === 'file') {
            const still = get().status?.files.find((f) => f.path === sel.path)
            if (!still) get().selectWip()
          }
        },
        { desc: 'undo.desc.unstage' }
      )
    },

    async discard(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitDiscard({ repoPath, paths })
        await get().refreshStatus()
      })
    },

    async clean(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitClean({ repoPath, paths })
        await get().refreshStatus()
      })
    },

    async ignore(path: string): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitIgnore({ repoPath, path })
        await get().refreshStatus()
      })
    },

    async stageHunk(file: DiffFile, hunkIndex: number): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(
        async () => {
          const sel = get().selection
          if (sel.kind !== 'file') return
          const patch = buildHunkPatch(file, hunkIndex)
          if (!patch) return
          await window.api.gitApplyHunk({ repoPath, patch, reverse: sel.cached || undefined })
          await get().refreshStatus()
          void loadDiffFor(sel, repoPath)
        },
        { desc: 'undo.desc.hunk' }
      )
    },

    async resolveConflict(content): Promise<void> {
      const repoPath = get().repoPath
      const conflict = get().conflict
      if (!repoPath || !conflict) return
      await runMutate(async () => {
        await window.api.gitConflictResolve({ repoPath, path: conflict.path, content })
        set({ conflict: null })
        await get().refreshStatus()
        void loadDiffFor({ kind: 'file', path: conflict.path, cached: true, untracked: false }, repoPath)
      })
    },

    async acceptConflict(side): Promise<void> {
      const repoPath = get().repoPath
      const conflict = get().conflict
      if (!repoPath || !conflict) return
      await runMutate(async () => {
        await window.api.gitConflictAccept({ repoPath, path: conflict.path, side })
        set({ conflict: null })
        await get().refreshStatus()
        void loadDiffFor({ kind: 'file', path: conflict.path, cached: true, untracked: false }, repoPath)
      })
    },

    async unstageHunk(file: DiffFile, hunkIndex: number): Promise<void> {
      // convenience alias — reverse applies to staged diffs
      return get().stageHunk(file, hunkIndex)
    },

    async doCommit(message, amend): Promise<boolean> {
      const repoPath = get().repoPath
      if (!repoPath) return false
      const before = await captureUndo(false)
      try {
        await window.api.gitCommit({ repoPath, message, amend })
        await recordUndo({ desc: amend ? 'undo.desc.amend' : 'undo.desc.commit' }, before, false)
        await get().refreshAll()
        get().selectWip()
        return true
      } catch (e) {
        set({ error: errText(e) })
        return false
      }
    },

    async checkout(target): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(
        async () => {
          await window.api.gitCheckout({ repoPath, target })
          await get().refreshAll()
          get().selectWip()
        },
        { desc: 'undo.desc.checkout', params: { target }, worktree: true }
      )
    },

    async fetch(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      const id = opId()
      set({ sync: { opId: id, kind: 'fetch' }, error: null })
      try {
        await window.api.gitFetch({ repoPath, opId: id })
        await get().refreshAll()
      } catch (e) {
        const msg = errText(e)
        if (msg !== 'operation cancelled') set({ error: msg })
      } finally {
        set({ sync: null })
      }
    },

    async pull(rebase = false): Promise<void> {
      const repoPath = get().repoPath
      const status = get().status
      if (!repoPath) return
      if (status && !status.upstream && !status.detached) {
        set({
          error: tf('toolbar.noUpstreamError', { branch: status.head ?? '' }),
          errorDetailOpen: false
        })
        return
      }
      const id = opId()
      const before = await captureUndo(true)
      set({ sync: { opId: id, kind: 'pull' }, error: null })
      try {
        await window.api.gitPull({ repoPath, opId: id, rebase })
        await recordUndo({ desc: 'undo.desc.pull' }, before, true)
        await get().refreshAll()
      } catch (e) {
        const msg = errText(e)
        if (msg !== 'operation cancelled') set({ error: msg })
      } finally {
        set({ sync: null })
      }
    },

    async push(forceWithLease = false): Promise<void> {
      const repoPath = get().repoPath
      const status = get().status
      if (!repoPath || !status) return
      const id = opId()
      const branch = status.head
      set({ sync: { opId: id, kind: 'push' }, error: null, pushConflict: false })
      try {
        await window.api.gitPush({
          repoPath,
          opId: id,
          forceWithLease: forceWithLease || undefined,
          setUpstream: !status.upstream && branch && !status.detached ? branch : undefined
        })
        await get().refreshAll()
      } catch (e) {
        const msg = errText(e)
        if (msg === 'operation cancelled') {
          // silent
        } else if (isRejectedError(e) && !forceWithLease) {
          set({ pushConflict: true })
        } else {
          set({ error: msg })
        }
      } finally {
        set({ sync: null })
      }
    },

    async cancelSync(): Promise<void> {
      const sync = get().sync
      if (sync) await window.api.gitCancel(sync.opId)
    },

    async merge(branch, opts): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitMerge({ repoPath, branch, ...opts }),
        { desc: 'undo.desc.merge', params: { branch }, worktree: true }
      )
    },

    async rebase(upstream, opts): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitRebase({ repoPath, upstream, ...opts }),
        { desc: 'undo.desc.rebase', params: { upstream }, worktree: true }
      )
    },

    async rebaseInteractive(upstream, ops): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      const before = await captureUndo(true)
      try {
        const res = await window.api.gitRebaseInteractive({ repoPath, upstream, ops })
        if (res.conflicts.length === 0) {
          await recordUndo({ desc: 'undo.desc.rebaseInteractive' }, before, true)
        }
      } catch (e) {
        set({ error: errText(e) })
        await get().refreshAll()
        throw e
      }
      await get().refreshAll()
    },

    openRebaseDialog(state): void {
      set({ rebaseDialog: state })
    },

    closeRebaseDialog(): void {
      set({ rebaseDialog: null })
    },

    openSearch(): void {
      set({ searchOpen: true })
    },

    closeSearch(): void {
      set({ searchOpen: false })
    },

    openSettings(tab?: string): void {
      set({ settingsOpen: true, settingsInitialTab: tab })
    },

    closeSettings(): void {
      set({ settingsOpen: false, settingsInitialTab: undefined })
    },

    toggleTerminal(): void {
      set({ terminalOpen: !get().terminalOpen })
    },

    togglePrPanel(): void {
      const next = !get().prPanelOpen
      set({ prPanelOpen: next })
      if (next && get().prs.length === 0 && get().activeRepoRef) {
        void get().loadPrs()
      }
    },

    openCreatePr(): void {
      set({ createPrOpen: true })
    },

    closeCreatePr(): void {
      set({ createPrOpen: false })
    },

    setPrFilter(filter: PrState | 'all'): void {
      set({ prFilter: filter })
      void get().loadPrs()
    },

    async loadPrs(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      set({ prLoading: true })
      try {
        const prs = await window.api.prList({ repoPath, state: get().prFilter })
        set({ prs, prLoading: false })
      } catch (e) {
        set({ prLoading: false })
        if (get().prPanelOpen) set({ error: errText(e) })
      }
    },

    /**
     * Sidebar list: open PRs only. Kept separate from `prs` so switching the
     * PR panel's state filter never changes what the sidebar shows.
     */
    async loadSidebarPrs(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        const sidebarPrs = await window.api.prList({ repoPath, state: 'open' })
        set({ sidebarPrs })
      } catch {
        // Sidebar is passive: swallow provider/auth errors, the PR panel
        // surfaces them when the user opens it.
      }
    },

    async selectPr(id: string | number | null): Promise<void> {
      set({ activePrId: id, activePrDetail: null })
      const repoPath = get().repoPath
      if (!repoPath || id == null) return
      set({ activePrLoading: true })
      try {
        const detail = await window.api.prGet({ repoPath, id })
        set({ activePrDetail: detail, activePrLoading: false })
      } catch (e) {
        set({ activePrLoading: false, error: errText(e) })
      }
    },

    async createPr(input: CreatePrInputDto): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        const created = await window.api.prCreate({ repoPath, ...input })
        set({ createPrOpen: false })
        await get().loadPrs()
        void get().loadSidebarPrs()
        await get().selectPr(created.id)
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async commentPr(body: string): Promise<void> {
      const repoPath = get().repoPath
      const prId = get().activePrId
      if (!repoPath || prId == null) return
      try {
        await window.api.prComment({ repoPath, id: prId, body })
        await get().selectPr(prId)
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async mergePr(method: PrMergeMethod): Promise<void> {
      const repoPath = get().repoPath
      const prId = get().activePrId
      if (!repoPath || prId == null) return
      try {
        await window.api.prMerge({ repoPath, id: prId, method })
        await get().loadPrs()
        void get().loadSidebarPrs()
        await get().selectPr(prId)
        await get().refreshAll()
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async checkoutPr(branch: string): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        await window.api.prCheckout({ repoPath, branch })
        await get().refreshAll()
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async connectProviderPat(
      provider: ProviderKind,
      token: string,
      org?: string
    ): Promise<ProviderAccountDto> {
      const account = await window.api.providerConnectPat({ provider, token, org })
      const settings = await window.api.settingsGet()
      set({ settings })
      if (get().activeRepoRef?.provider === provider) {
        void get().loadPrs()
        void get().loadSidebarPrs()
      }
      return account
    },

    async disconnectProvider(provider: ProviderKind): Promise<void> {
      await window.api.providerDisconnect({ provider })
      const settings = await window.api.settingsGet()
      set({ settings })
    },

    openWorkspaceModal(): void {
      set({ workspaceModalOpen: true })
    },

    closeWorkspaceModal(): void {
      set({ workspaceModalOpen: false })
    },

    async createWorkspace(
      name: string,
      description?: string,
      repoPaths: string[] = []
    ): Promise<WorkspaceDto> {
      const now = new Date().toISOString()
      const ws: WorkspaceDto = {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        name: name.trim(),
        description: description?.trim() || undefined,
        repoPaths,
        createdAt: now,
        updatedAt: now
      }
      const existing = get().settings.workspaces ?? []
      await get().updateSettings({
        workspaces: [...existing, ws],
        activeWorkspaceId: get().settings.activeWorkspaceId ?? ws.id
      })
      return ws
    },

    async updateWorkspace(
      id: string,
      patch: Partial<Omit<WorkspaceDto, 'id' | 'createdAt'>>
    ): Promise<void> {
      const existing = get().settings.workspaces ?? []
      const now = new Date().toISOString()
      const updated = existing.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now } : w))
      await get().updateSettings({ workspaces: updated })
    },

    async deleteWorkspace(id: string): Promise<void> {
      const existing = get().settings.workspaces ?? []
      const filtered = existing.filter((w) => w.id !== id)
      const nextActive =
        get().settings.activeWorkspaceId === id ? null : get().settings.activeWorkspaceId
      await get().updateSettings({ workspaces: filtered, activeWorkspaceId: nextActive })
    },

    async setActiveWorkspace(id: string | null): Promise<void> {
      await get().updateSettings({ activeWorkspaceId: id })
    },

    async addRepoToWorkspace(workspaceId: string, repoPath: string): Promise<void> {
      const existing = get().settings.workspaces ?? []
      const now = new Date().toISOString()
      const updated = existing.map((w) => {
        if (w.id !== workspaceId) return w
        if (w.repoPaths.includes(repoPath)) return w
        return { ...w, repoPaths: [...w.repoPaths, repoPath], updatedAt: now }
      })
      await get().updateSettings({ workspaces: updated })
    },

    async removeRepoFromWorkspace(workspaceId: string, repoPath: string): Promise<void> {
      const existing = get().settings.workspaces ?? []
      const now = new Date().toISOString()
      const updated = existing.map((w) => {
        if (w.id !== workspaceId) return w
        return { ...w, repoPaths: w.repoPaths.filter((p) => p !== repoPath), updatedAt: now }
      })
      await get().updateSettings({ workspaces: updated })
    },

    async createProfile(
      name: string,
      authorName: string,
      authorEmail: string,
      signingKey?: string
    ): Promise<ProfileDto> {
      const p: ProfileDto = {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        name: name.trim(),
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        signingKey: signingKey?.trim() || undefined
      }
      const existing = get().settings.profiles ?? []
      await get().updateSettings({
        profiles: [...existing, p],
        activeProfileId: get().settings.activeProfileId ?? p.id
      })
      return p
    },

    async updateProfile(
      id: string,
      patch: Partial<Omit<ProfileDto, 'id'>>
    ): Promise<void> {
      const existing = get().settings.profiles ?? []
      const updated = existing.map((p) => (p.id === id ? { ...p, ...patch } : p))
      await get().updateSettings({ profiles: updated })
    },

    async deleteProfile(id: string): Promise<void> {
      const existing = get().settings.profiles ?? []
      const filtered = existing.filter((p) => p.id !== id)
      const nextActive =
        get().settings.activeProfileId === id ? null : get().settings.activeProfileId
      await get().updateSettings({ profiles: filtered, activeProfileId: nextActive })
    },

    async setActiveProfile(id: string | null): Promise<void> {
      await get().updateSettings({ activeProfileId: id })
    },

    openCommandPalette(): void {
      set({ paletteOpen: true })
    },

    closeCommandPalette(): void {
      set({ paletteOpen: false })
    },

    toggleCommandPalette(): void {
      set({ paletteOpen: !get().paletteOpen })
    },

    openShortcutsModal(): void {
      set({ shortcutsOpen: true })
    },

    closeShortcutsModal(): void {
      set({ shortcutsOpen: false })
    },

    openPatchModal(): void {
      set({ patchModalOpen: true })
    },

    closePatchModal(): void {
      set({ patchModalOpen: false })
    },

    async exportPatch(oid?: string): Promise<string> {
      const repoPath = get().repoPath
      if (!repoPath) return ''
      try {
        const defaultName = oid ? `commit-${oid.slice(0, 7)}.patch` : 'working-changes.patch'
        const savePath = await window.api.pickSavePath({
          title: t('patch.export'),
          defaultPath: defaultName,
          filters: [{ name: 'Patch files', extensions: ['patch', 'diff'] }]
        })
        const res = await window.api.patchExport({
          repoPath,
          oid,
          targetPath: savePath || undefined
        })
        return res.patch
      } catch (e) {
        set({ error: errText(e) })
        return ''
      }
    },

    async applyPatch(opts: {
      patchPath?: string
      patchContent?: string
    }): Promise<{ mode: 'am' | 'apply'; message: string }> {
      const repoPath = get().repoPath
      if (!repoPath) throw new Error('No open repository')
      try {
        const res = await window.api.patchApply({ repoPath, ...opts })
        await get().refreshAll()
        set({ patchModalOpen: false })
        return res
      } catch (e) {
        set({ error: errText(e) })
        throw e
      }
    },

    async refreshUndo(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        set({ undoInfo: await window.api.gitUndoList(repoPath) })
      } catch {
        set({ undoInfo: { canUndo: false, canRedo: false } })
      }
    },

    async undo(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        const res = await window.api.gitUndoApply({ repoPath, direction: 'undo' })
        if (res.applied) {
          set({ undoInfo: await window.api.gitUndoList(repoPath) })
          await get().refreshAll()
          return
        }
        if (res.empty) return
        const body = undoRiskBody(res)
        set({
          confirm: {
            title: t('undo.riskTitle'),
            body,
            confirmLabel: t('undo.forceConfirm'),
            onConfirm: async () => {
              const forced = await window.api.gitUndoApply({ repoPath, direction: 'undo', force: true })
              if (forced.applied) {
                set({ undoInfo: await window.api.gitUndoList(repoPath) })
                await get().refreshAll()
              }
            }
          }
        })
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async redo(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        const res = await window.api.gitUndoApply({ repoPath, direction: 'redo' })
        if (res.applied) {
          set({ undoInfo: await window.api.gitUndoList(repoPath) })
          await get().refreshAll()
          return
        }
        if (res.empty) return
        const body = undoRiskBody(res)
        set({
          confirm: {
            title: t('undo.riskTitle'),
            body,
            confirmLabel: t('undo.forceConfirm'),
            onConfirm: async () => {
              const forced = await window.api.gitUndoApply({ repoPath, direction: 'redo', force: true })
              if (forced.applied) {
                set({ undoInfo: await window.api.gitUndoList(repoPath) })
                await get().refreshAll()
              }
            }
          }
        })
      } catch (e) {
        set({ error: errText(e) })
      }
    },

    async cherryPick(oids, mainline): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitCherryPick({ repoPath, oids, mainline }),
        { desc: 'undo.desc.cherryPick', params: { n: oids.length }, worktree: true }
      )
    },

    async revert(oids, mainline): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitRevert({ repoPath, oids, mainline }),
        { desc: 'undo.desc.revert', params: { n: oids.length }, worktree: true }
      )
    },

    async reset(mode, target): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitReset({ repoPath, mode, target }),
        { desc: 'undo.desc.reset', params: { mode }, worktree: mode === 'hard' }
      )
    },

    async opContinue(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitOpContinue(repoPath))
    },

    async opAbort(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitOpAbort(repoPath))
    },

    async opSkip(): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitOpSkip(repoPath))
    },

    async stashPush(opts): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitStashPush({ repoPath, ...opts }),
        { desc: 'undo.desc.stashPush', worktree: true }
      )
    },

    async stashApply(ref, pop): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitStashApply({ repoPath, ref, pop }),
        { desc: pop ? 'undo.desc.stashPop' : 'undo.desc.stashApply', worktree: true }
      )
    },

    async stashDrop(ref): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitStashDrop({ repoPath, ref }),
        { desc: 'undo.desc.stashDrop' }
      )
    },

    async tagCreate(name, message, oid): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitTagCreate({ repoPath, name, message, oid }),
        { desc: 'undo.desc.tagCreate', params: { name } }
      )
    },

    async tagDelete(names): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitTagDelete({ repoPath, names }),
        { desc: 'undo.desc.tagDelete', params: { n: names.length } }
      )
    },

    async branchDelete(name, force): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitBranchDelete({ repoPath, name, force }),
        { desc: 'undo.desc.branchDelete', params: { name } }
      )
    },

    async branchRename(from, to): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(
        () => window.api.gitBranchRename({ repoPath, from, to }),
        { desc: 'undo.desc.branchRename', params: { from, to } }
      )
    },

    setConfirm(state): void {
      set({ confirm: state })
    },

    openMenu(state): void {
      set({ menu: state })
    },

    closeMenu(): void {
      set({ menu: null })
    },

    setPrompt(state): void {
      set({ prompt: state })
    },

    dismissError(): void {
      set({ error: null, errorDetailOpen: false })
    },

    openErrorDetail(): void {
      if (get().error) set({ errorDetailOpen: true })
    },

    closeErrorDetail(): void {
      set({ errorDetailOpen: false })
    },

    setPushConflict(v): void {
      set({ pushConflict: v })
    },

    async updateSettings(patch): Promise<void> {
      try {
        const settings = await window.api.settingsSet(patch)
        set({ settings })
        if (patch.language) {
          setLocale(patch.language === 'system' ? (navigator.language.startsWith('zh') ? 'zh' : 'en') : patch.language)
        }
        if (patch.theme) {
          applyTheme(patch.theme)
        }
      } catch (e) {
        set({ error: errText(e) })
      }
    }
  }
})

// --- helpers used by UI components -------------------------------- ---------

export function fileGroups(status: GitStatusDto | null): {
  staged: StatusFileDto[]
  changes: StatusFileDto[]
  untracked: StatusFileDto[]
} {
  const staged = stagedFiles(status)
  const untracked = untrackedFiles(status)
  const changes = (status?.files ?? []).filter(isUnstaged)
  return { staged, changes, untracked }
}

export function currentCommit(commits: CommitDto[], oid: string): CommitDto | undefined {
  return commits.find((c) => c.oid === oid)
}
