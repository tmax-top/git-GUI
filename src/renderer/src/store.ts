import { create } from 'zustand'
import { buildHunkPatch, parseUnifiedDiff, type DiffFile } from '@shared/diff'
import type {
  AppSettingsDto,
  CommitDto,
  ConflictsDto,
  GitStatusDto,
  OpStateDto,
  ProgressEventDto,
  RebaseOpDto,
  RefsDto,
  StatusFileDto
} from '@shared/ipc'
import { isUntracked, stagedFiles, untrackedFiles } from '@shared/status'
import { setLocale, t, type Locale } from './i18n'
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

interface AppState {
  booted: boolean
  view: 'start' | 'repo'
  repoPath: string | null
  status: GitStatusDto | null
  refs: RefsDto | null
  commits: CommitDto[]
  hasMore: boolean
  graphLoading: boolean
  selection: Selection
  diff: string
  diffFiles: DiffFile[]
  diffLoading: boolean
  sync: SyncState | null
  error: string | null
  confirm: ConfirmState | null
  pushConflict: boolean
  settings: AppSettingsDto
  opState: OpStateDto | null
  menu: MenuState | null
  prompt: PromptState | null
  rebaseDialog: RebaseDialogState | null

  boot(): Promise<void>
  openRepo(path: string): Promise<boolean>
  closeRepo(): Promise<void>
  refreshAll(): Promise<void>
  refreshStatus(): Promise<void>
  refreshOpState(): Promise<void>
  loadGraph(reset: boolean): Promise<void>
  loadMore(): Promise<void>

  selectWip(): void
  selectCommit(oid: string): void
  selectFile(path: string, cached: boolean, untracked: boolean): void

  stage(paths: string[]): Promise<void>
  unstage(paths: string[]): Promise<void>
  discard(path: string): Promise<void>
  clean(path: string): Promise<void>
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

function errText(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function isRejectedError(e: unknown): boolean {
  const msg = errText(e)
  return /non-fast-forward|fetch first|\[rejected\]|cannot lock ref/i.test(msg)
}

function opId(): string {
  return globalThis.crypto.randomUUID()
}

let eventSubscribed = false

export const useApp = create<AppState>((set, get) => {
  async function runMutate(fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (e) {
      set({ error: errText(e) })
    }
  }

  async function loadDiffFor(sel: Selection, repoPath: string): Promise<void> {
    set({ diffLoading: true, diff: '', diffFiles: [] })
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
  async function runHistoryOp(fn: () => Promise<ConflictsDto | void>): Promise<void> {
    const repoPath = get().repoPath
    if (!repoPath) return
    try {
      await fn()
    } catch (e) {
      set({ error: errText(e) })
    }
    await get().refreshAll()
  }

  return {
    booted: false,
    view: 'start',
    repoPath: null,
    status: null,
    refs: null,
    commits: [],
    hasMore: false,
    graphLoading: false,
    selection: { kind: 'wip' },
    diff: '',
    diffFiles: [],
    diffLoading: false,
    sync: null,
    error: null,
    confirm: null,
    pushConflict: false,
    opState: null,
    menu: null,
    prompt: null,
    rebaseDialog: null,
    settings: {
      favorites: [],
      recent: [],
      graphInitialLimit: 500,
      defaultBranch: 'main',
      language: 'system',
      leftPanelWidth: 224,
      rightPanelWidth: 320,
      graphSplitPct: 55,
      graphAuthorWidth: 112,
      graphDateWidth: 48,
      graphOidWidth: 40
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

      // Session restore: reopen last active repo.
      const target = session.activeRepo ?? session.openRepos[0]
      if (target) {
        const ok = await get().openRepo(target)
        if (ok) return
        // Fall back to the next open repo if the active one vanished.
        for (const p of session.openRepos) {
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

        set({
          repoPath: path,
          view: 'repo',
          status: null,
          refs: null,
          commits: [],
          hasMore: false,
          selection: { kind: 'wip' },
          diff: '',
          diffFiles: [],
          error: null,
          opState: null,
          menu: null,
          prompt: null,
          rebaseDialog: null
        })
        await window.api.watchStart(path)
        void window.api.sessionSet({ openRepos: [path], activeRepo: path })
        const recents = [path, ...get().settings.recent.filter((p) => p !== path)].slice(0, 20)
        void get().updateSettings({ recent: recents })
        await get().refreshAll()
        return true
      } catch (e) {
        set({ error: errText(e) })
        return false
      }
    },

    async closeRepo(): Promise<void> {
      const path = get().repoPath
      if (path) await window.api.watchStop(path)
      set({
        view: 'start',
        repoPath: null,
        status: null,
        refs: null,
        commits: [],
        selection: { kind: 'wip' },
        diff: '',
        diffFiles: [],
        sync: null,
        opState: null,
        menu: null,
        prompt: null,
        rebaseDialog: null
      })
      void window.api.sessionSet({ activeRepo: null })
    },

    async refreshAll(): Promise<void> {
      await Promise.all([
        get().refreshStatus(),
        get().loadGraph(true),
        get().refreshOpState()
      ])
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
      set({ selection: { kind: 'wip' }, diff: '', diffFiles: [] })
      if (repoPath) void get().refreshStatus()
    },

    selectCommit(oid: string): void {
      set({ selection: { kind: 'commit', oid } })
      const repoPath = get().repoPath
      if (repoPath) void loadDiffFor({ kind: 'commit', oid }, repoPath)
    },

    selectFile(path, cached, untracked): void {
      set({ selection: { kind: 'file', path, cached, untracked } })
      const repoPath = get().repoPath
      if (repoPath) void loadDiffFor({ kind: 'file', path, cached, untracked }, repoPath)
    },

    async stage(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitStage({ repoPath, paths })
        await get().refreshStatus()
        const sel = get().selection
        if (sel.kind === 'file') {
          const still = get().status?.files.find((f) => f.path === sel.path)
          if (!still) get().selectWip()
        }
      })
    },

    async unstage(paths: string[]): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitUnstage({ repoPath, paths })
        await get().refreshStatus()
        const sel = get().selection
        if (sel.kind === 'file') {
          const still = get().status?.files.find((f) => f.path === sel.path)
          if (!still) get().selectWip()
        }
      })
    },

    async discard(path: string): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitDiscard({ repoPath, paths: [path] })
        await get().refreshStatus()
      })
    },

    async clean(path: string): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runMutate(async () => {
        await window.api.gitClean({ repoPath, paths: [path] })
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
      await runMutate(async () => {
        const sel = get().selection
        if (sel.kind !== 'file') return
        const patch = buildHunkPatch(file, hunkIndex)
        if (!patch) return
        await window.api.gitApplyHunk({ repoPath, patch, reverse: sel.cached || undefined })
        await get().refreshStatus()
        void loadDiffFor(sel, repoPath)
      })
    },

    async unstageHunk(file: DiffFile, hunkIndex: number): Promise<void> {
      // convenience alias — reverse applies to staged diffs
      return get().stageHunk(file, hunkIndex)
    },

    async doCommit(message, amend): Promise<boolean> {
      const repoPath = get().repoPath
      if (!repoPath) return false
      try {
        await window.api.gitCommit({ repoPath, message, amend })
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
      await runMutate(async () => {
        await window.api.gitCheckout({ repoPath, target })
        await get().refreshAll()
        get().selectWip()
      })
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
      if (!repoPath) return
      const id = opId()
      set({ sync: { opId: id, kind: 'pull' }, error: null })
      try {
        await window.api.gitPull({ repoPath, opId: id, rebase })
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
      await runHistoryOp(() => window.api.gitMerge({ repoPath, branch, ...opts }))
    },

    async rebase(upstream, opts): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitRebase({ repoPath, upstream, ...opts }))
    },

    async rebaseInteractive(upstream, ops): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      try {
        await window.api.gitRebaseInteractive({ repoPath, upstream, ops })
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

    async cherryPick(oids, mainline): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitCherryPick({ repoPath, oids, mainline }))
    },

    async revert(oids, mainline): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitRevert({ repoPath, oids, mainline }))
    },

    async reset(mode, target): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitReset({ repoPath, mode, target }))
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
      await runHistoryOp(() => window.api.gitStashPush({ repoPath, ...opts }))
    },

    async stashApply(ref, pop): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitStashApply({ repoPath, ref, pop }))
    },

    async stashDrop(ref): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitStashDrop({ repoPath, ref }))
    },

    async tagCreate(name, message, oid): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitTagCreate({ repoPath, name, message, oid }))
    },

    async tagDelete(names): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitTagDelete({ repoPath, names }))
    },

    async branchDelete(name, force): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitBranchDelete({ repoPath, name, force }))
    },

    async branchRename(from, to): Promise<void> {
      const repoPath = get().repoPath
      if (!repoPath) return
      await runHistoryOp(() => window.api.gitBranchRename({ repoPath, from, to }))
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
      set({ error: null })
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
  const changes = (status?.files ?? []).filter(
    (f) => !isUntracked(f) && (f.unmerged || f.worktreeStatus !== '.')
  )
  return { staged, changes, untracked }
}

export function currentCommit(commits: CommitDto[], oid: string): CommitDto | undefined {
  return commits.find((c) => c.oid === oid)
}
