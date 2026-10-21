import { z } from 'zod'

export { IPC, IPC_EVENTS } from './channels'

export const repoPathSchema = z.string().min(1).max(4096)
const pathsSchema = z.array(z.string().min(1).max(4096)).min(1).max(10_000)
const opIdSchema = z.string().min(1).max(128)

// ---------------------------------------------------------------------------
// Common DTOs
// ---------------------------------------------------------------------------

export const gitStatusRequestSchema = z.object({ repoPath: repoPathSchema })
export type GitStatusRequest = z.infer<typeof gitStatusRequestSchema>

export interface StatusFileDto {
  path: string
  origPath?: string
  indexStatus: string
  worktreeStatus: string
  unmerged?: boolean
  untracked?: boolean
  ignored?: boolean
}

export interface GitStatusDto {
  oid?: string
  head?: string
  upstream?: string
  ahead: number
  behind: number
  detached: boolean
  files: StatusFileDto[]
}

export interface AppInfoDto {
  name: string
  version: string
  electron: string
  node: string
  platform: string
}

export interface CommitDto {
  oid: string
  shortOid: string
  authorName: string
  authorEmail: string
  authorTime: number
  committerName: string
  committerEmail: string
  committerTime: number
  parents: string[]
  subject: string
  body: string
}

export interface RefInfoDto {
  name: string
  fullName: string
  oid: string
  upstream?: string
  isRemote: boolean
  subject?: string
}

export interface StashInfoDto {
  oid: string
  ref: string
  subject: string
  time: number
}

export interface SubmoduleInfoDto {
  path: string
  oid: string
  status: string
}

export interface RefsDto {
  branches: RefInfoDto[]
  tags: RefInfoDto[]
  stashes: StashInfoDto[]
  submodules: SubmoduleInfoDto[]
  current?: string
}

export interface FavoriteRepoDto {
  name: string
  path: string
}

export interface AppSettingsDto {
  favorites: FavoriteRepoDto[]
  recent: string[]
  graphInitialLimit: number
  defaultBranch: string
  language: 'system' | 'zh' | 'en'
  /** Left sidebar width in px. */
  leftPanelWidth: number
  /** Right commit panel width in px. */
  rightPanelWidth: number
  /** Graph area share of the middle column, 15–85 (%). */
  graphSplitPct: number
  /** Author column width in the commit graph, px. */
  graphAuthorWidth: number
  /** Date column width in the commit graph, px. */
  graphDateWidth: number
  /** OID column width in the commit graph, px. */
  graphOidWidth: number
  /** Background auto-fetch period in minutes; 0 = disabled. 0–60. */
  autoFetchInterval: number
  /** Auto-fetch passes `--prune` to drop stale remote-tracking refs. */
  autoPrune: boolean
  /** Desktop notifications for push completion / conflicts / fetch failures. */
  notifications: boolean
  /** User-configured external tool command lines; empty = feature off. */
  externalTools: ExternalToolCommandDto
  /** Font family for the embedded terminal; empty = xterm default. */
  terminalFontFamily: string
  /** Font size (px) for the embedded terminal, 8–32. */
  terminalFontSize: number
  /** Terminal panel height in px, 120–600. */
  terminalHeight: number
  /** Connected GitProvider accounts. */
  providerAccounts: import('./providers').ProviderAccountDto[]
}

/** Command lines for opening files/repos in external tools. */
export interface ExternalToolCommandDto {
  /** Editor command; {repo}/{path} placeholders expand at launch. */
  editor: string
  diffTool: string
  mergeTool: string
  terminal: string
}

export type ExternalToolKind = 'editor' | 'diffTool' | 'mergeTool' | 'terminal'

export interface SessionStateDto {
  openRepos: string[]
  activeRepo: string | null
}

/** One entry in the cross-session activity log (auto-fetch, sync ops, …). */
export interface ActivityEntryDto {
  id: string
  /** Epoch ms. */
  ts: number
  kind: 'auto-fetch' | 'fetch' | 'pull' | 'push'
  repoPath: string
  ok: boolean
  message?: string
}

export interface GraphPageDto {
  commits: CommitDto[]
  hasMore: boolean
}

export interface BlobDto {
  base64: string
  isImage: boolean
  size: number
}

/** Three index stages of a conflicted file + worktree content for the editor. */
export interface ConflictFileDto {
  path: string
  /** Stage 1 — common ancestor. Null for add/add or delete/modify conflicts. */
  base: string | null
  /** Stage 2 — ours (current branch / HEAD). Null when our side deleted. */
  ours: string | null
  /** Stage 3 — theirs (incoming). Null when their side deleted. */
  theirs: string | null
  /** Worktree content (contains conflict markers) — what the user edits. */
  worktree: string
  binary: boolean
}

export const conflictFileRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096)
})

export const searchRequestSchema = z.object({
  repoPath: repoPathSchema,
  scope: z.enum(['commits', 'files', 'content']),
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(1000).optional()
})

export const conflictResolveRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096),
  content: z.string().max(10_000_000)
})

export const conflictSideRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096),
  side: z.enum(['ours', 'theirs'])
})

export interface RepoValidateDto {
  path: string
  isRepo: boolean
  /** true when the directory does not exist at all */
  missing?: boolean
}

export interface ProgressEventDto {
  stage: string
  percent?: number
  current?: number
  total?: number
  raw: string
}

export type Language = AppSettingsDto['language']

/** In-progress merge/rebase/cherry-pick/revert detection result. */
export interface OpStateDto {
  kind: 'merge' | 'rebase' | 'cherry-pick' | 'revert' | null
  conflicts: string[]
  rebaseCurrent?: number
  rebaseTotal?: number
}

/** Result of a history mutation that may stop on conflicts. */
export interface ConflictsDto {
  conflicts: string[]
}

export interface RebaseOpDto {
  oid: string
  action: 'pick' | 'reword' | 'squash' | 'fixup' | 'drop'
  message?: string
}

/** One commit in the `base..HEAD` range that an interactive rebase would replay. */
export interface RebaseRangeCommitDto {
  oid: string
  shortOid: string
  subject: string
}

export interface SearchCommitHitDto {
  oid: string
  shortOid: string
  subject: string
  authorName: string
  authorTime: number
}

export interface SearchContentHitDto {
  path: string
  line: number
  text: string
}

export type SearchScope = 'commits' | 'files' | 'content'

export interface WorktreeInfoDto {
  path: string
  head?: string
  branch?: string
  bare?: boolean
  detached?: boolean
  locked?: boolean
  prunable?: boolean
}

/** One entry in the hooks manager (standard or user-authored). */
export interface HookDto {
  name: string
  /** Hook file exists in .git/hooks. */
  exists: boolean
  /** Exists and is executable — git only runs executable hooks. */
  enabled: boolean
  /** git ships a `.sample` for this hook. */
  sampleExists: boolean
  /** Not one of the standard git hook names. */
  custom: boolean
}

/** Git LFS state for one repo. */
export interface LfsStatusDto {
  /** `git lfs` is available on PATH. */
  installed: boolean
  /** The repo tracks at least one LFS object. */
  isLfsRepo: boolean
  /** Files reported by `git lfs ls-files` (0 when not installed). */
  trackedFiles: number
  /** `lfs.fetchinclude` glob filter. */
  fetchInclude: string
  /** `lfs.fetchexclude` glob filter. */
  fetchExclude: string
}

/** Gitflow state: main/develop lines and the current branch's flow role. */
export interface GitflowStatusDto {
  mainBranch: string
  developBranch: string
  developExists: boolean
  currentBranch?: string
  currentKind?: 'feature' | 'release' | 'hotfix'
}

/** Commit-signing state for one repo (repo-level git config only). */
export interface SigningStatusDto {
  signCommits: boolean
  /** git gpg.format; empty = git default (openpgp). */
  format: 'openpgp' | 'ssh' | 'x509' | ''
  signingKey: string
  gpgInstalled: boolean
  sshAvailable: boolean
  sshPublicKeys: { path: string; comment: string }[]
}

/** i18n key (+ interpolation params) describing one undoable operation. */
export interface UndoDescriptionDto {
  key: string
  params?: Record<string, string | number>
}

/**
 * Point-in-time repo snapshot for the undo stack: HEAD + refs + index tree
 * plus a full worktree tree (tracked+untracked, gitignore-respecting) when
 * the worktree was dirty at capture time. `fingerprint` detects later drift.
 */
export interface UndoSnapshotDto {
  head: string | null
  headRef: string | null
  headTree: string | null
  refs: Record<string, string>
  indexTree: string | null
  worktreeTree: string | null
  fingerprint: string
}

export interface UndoStackStateDto {
  canUndo: boolean
  canRedo: boolean
  undoLabel?: UndoDescriptionDto
  redoLabel?: UndoDescriptionDto
}

export interface UndoApplyResultDto {
  applied: boolean
  /** No entry on the requested side of the stack. */
  empty?: boolean
  /** Refs/worktree drifted since the recorded operation. */
  currentChanged?: boolean
  /** Branches whose upstream advanced — pushing after undo may need force. */
  forcePushRisk?: string[]
  description?: UndoDescriptionDto
}

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const graphRequestSchema = z.object({
  repoPath: repoPathSchema,
  limit: z.number().int().min(1).max(100_000),
  skip: z.number().int().min(0).max(10_000_000)
})

export const refsRequestSchema = z.object({ repoPath: repoPathSchema })

export const checkoutRequestSchema = z.object({
  repoPath: repoPathSchema,
  target: z.string().min(1).max(1024)
})

export const pathsRequestSchema = z.object({ repoPath: repoPathSchema, paths: pathsSchema })

export const ignoreRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096)
})

export const commitRequestSchema = z.object({
  repoPath: repoPathSchema,
  message: z.string().min(1).max(100_000),
  amend: z.boolean().optional(),
  signoff: z.boolean().optional()
})

export const diffRequestSchema = z.object({
  repoPath: repoPathSchema,
  cached: z.boolean().optional(),
  /** untracked file: diff against /dev/null via `git diff --no-index` */
  untracked: z.boolean().optional(),
  paths: z.array(z.string().max(4096)).max(10_000).optional(),
  context: z.number().int().min(0).max(100_000).optional()
})

export const commitDiffRequestSchema = z.object({
  repoPath: repoPathSchema,
  oid: z.string().min(7).max(40)
})

export const applyHunkRequestSchema = z.object({
  repoPath: repoPathSchema,
  patch: z.string().min(1).max(4_000_000),
  reverse: z.boolean().optional()
})

export const blobRequestSchema = z.object({
  repoPath: repoPathSchema,
  spec: z.string().min(1).max(4096)
})

export const worktreeFileSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096)
})

export const syncRequestSchema = z.object({
  repoPath: repoPathSchema,
  opId: opIdSchema,
  rebase: z.boolean().optional(),
  forceWithLease: z.boolean().optional(),
  /** branch name to pass to `git push --set-upstream origin <name>` */
  setUpstream: z.string().min(1).max(255).optional()
})

export const cancelRequestSchema = z.object({ opId: opIdSchema })

export const cloneRequestSchema = z.object({
  url: z.string().min(1).max(4096),
  targetDir: z.string().min(1).max(4096),
  depth: z.number().int().min(1).max(100_000).optional(),
  opId: opIdSchema
})

export const initRequestSchema = z.object({
  dir: z.string().min(1).max(4096),
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[^/\\]+$/, 'invalid directory name'),
  defaultBranch: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[^\s~^:?*[\\]+$/, 'invalid refname')
})

export const openRepoRequestSchema = z.object({ path: repoPathSchema })

// --- P3 advanced operations -----------------------------------------------
const oidSchema = z.string().regex(/^[0-9a-f]{7,40}$/, 'invalid oid')
const refSchema = z.string().min(1).max(4096)

export const mergeRequestSchema = z.object({
  repoPath: repoPathSchema,
  branch: refSchema,
  noFF: z.boolean().optional(),
  ffOnly: z.boolean().optional(),
  message: z.string().max(65_536).optional()
})

export const opRepoSchema = z.object({ repoPath: repoPathSchema })

export const rebaseRequestSchema = z.object({
  repoPath: repoPathSchema,
  upstream: refSchema,
  autostash: z.boolean().optional()
})

export const rebaseRangeRequestSchema = z.object({
  repoPath: repoPathSchema,
  base: refSchema
})

export const rebaseInteractiveRequestSchema = z.object({
  repoPath: repoPathSchema,
  upstream: refSchema,
  autostash: z.boolean().optional(),
  ops: z
    .array(
      z.object({
        oid: oidSchema,
        action: z.enum(['pick', 'reword', 'squash', 'fixup', 'drop']),
        message: z.string().max(65_536).optional()
      })
    )
    .min(1)
    .max(1000)
})

export const cherryPickRequestSchema = z.object({
  repoPath: repoPathSchema,
  oids: z.array(oidSchema).min(1).max(1000),
  mainline: z.number().int().min(1).max(10).optional()
})

export const resetRequestSchema = z.object({
  repoPath: repoPathSchema,
  mode: z.enum(['soft', 'mixed', 'hard']),
  target: refSchema
})

export const stashPushRequestSchema = z.object({
  repoPath: repoPathSchema,
  message: z.string().max(65_536).optional(),
  untracked: z.boolean().optional(),
  staged: z.boolean().optional()
})

export const stashApplyRequestSchema = z.object({
  repoPath: repoPathSchema,
  ref: refSchema.optional(),
  pop: z.boolean().optional()
})

export const stashDropRequestSchema = z.object({
  repoPath: repoPathSchema,
  ref: refSchema.optional()
})

export const tagCreateRequestSchema = z.object({
  repoPath: repoPathSchema,
  name: z.string().min(1).max(255),
  message: z.string().max(65_536).optional(),
  oid: oidSchema.optional()
})

export const tagDeleteRequestSchema = z.object({
  repoPath: repoPathSchema,
  names: z.array(z.string().min(1).max(255)).min(1).max(100)
})

export const branchDeleteRequestSchema = z.object({
  repoPath: repoPathSchema,
  name: z.string().min(1).max(4096),
  force: z.boolean().optional()
})

export const branchRenameRequestSchema = z.object({
  repoPath: repoPathSchema,
  from: z.string().min(1).max(4096),
  to: z.string().min(1).max(4096)
})

export const worktreeAddRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096),
  branch: z.string().min(1).max(4096).optional(),
  startPoint: z.string().min(1).max(4096).optional()
})

export const worktreeRemoveRequestSchema = z.object({
  repoPath: repoPathSchema,
  path: z.string().min(1).max(4096),
  force: z.boolean().optional()
})

const hookNameSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/)

export const hooksListRequestSchema = opRepoSchema

export const hookReadRequestSchema = opRepoSchema.extend({ name: hookNameSchema })

export const hookSetEnabledRequestSchema = opRepoSchema.extend({
  name: hookNameSchema,
  enabled: z.boolean()
})

export const lfsStatusRequestSchema = opRepoSchema

export const lfsSetPolicyRequestSchema = opRepoSchema.extend({
  fetchInclude: z.string().max(1024).optional(),
  fetchExclude: z.string().max(1024).optional()
})

export const gitflowKindSchema = z.enum(['feature', 'release', 'hotfix'])

export const gitflowStartRequestSchema = opRepoSchema.extend({
  kind: gitflowKindSchema,
  name: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, 'invalid branch name')
})

export const gitflowFinishRequestSchema = opRepoSchema.extend({ kind: gitflowKindSchema })

export const signingSetRequestSchema = opRepoSchema.extend({
  signCommits: z.boolean().optional(),
  format: z.enum(['openpgp', 'ssh', 'x509']).optional(),
  /** Empty string unsets user.signingkey. */
  signingKey: z.string().max(4096).optional()
})

export const toolsOpenRequestSchema = opRepoSchema.extend({
  kind: z.enum(['editor', 'diffTool', 'mergeTool', 'terminal']),
  /** Optional file/dir the tool should open. */
  path: z.string().max(4096).optional()
})

/** Per-repo settings: worktree encoding, default branch, *.orig leftovers. */
export interface RepoSettingsDto {
  encoding: string
  defaultBranch: string
  origFiles: string[]
}

export const repoSettingsSetRequestSchema = opRepoSchema.extend({
  encoding: z.string().min(1).max(32).optional(),
  defaultBranch: z.string().min(1).max(255).optional()
})

/** One submodule: status + keep-up-to-date policy. */
export interface SubmoduleDetailDto {
  path: string
  oid: string
  /** '+' new commits, '-' not initialized, 'U' conflicts, ' ' up to date */
  status: string
  /** submodule.<path>.update; null = git default. */
  update: 'checkout' | 'merge' | 'rebase' | 'none' | null
}

export const submodulePathRequestSchema = opRepoSchema.extend({
  path: z.string().min(1).max(4096).optional(),
  recursive: z.boolean().optional()
})

export const submoduleSetUpdateRequestSchema = opRepoSchema.extend({
  path: z.string().min(1).max(4096),
  strategy: z.enum(['checkout', 'merge', 'rebase', 'none']).nullable()
})

export const submoduleSetRecurseRequestSchema = opRepoSchema.extend({
  value: z.boolean()
})

const undoDescriptionSchema = z.object({
  key: z.string().min(1).max(128),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional()
})

const undoSnapshotSchema = z.object({
  head: z.string().nullable(),
  headRef: z.string().nullable(),
  headTree: z.string().nullable(),
  refs: z.record(z.string(), z.string()),
  indexTree: z.string().nullable(),
  worktreeTree: z.string().nullable(),
  fingerprint: z.string()
})

/** Capture a snapshot of the current repo state (undo primitive). */
export const undoSnapshotRequestSchema = z.object({
  repoPath: repoPathSchema,
  /** Capture worktree content too (false for index-only ops like stage/commit). */
  worktree: z.boolean().optional()
})

/** Record a completed mutation onto the undo stack (before/after snapshots). */
export const undoRecordRequestSchema = z.object({
  repoPath: repoPathSchema,
  description: undoDescriptionSchema,
  before: undoSnapshotSchema,
  after: undoSnapshotSchema
})

export const undoApplyRequestSchema = z.object({
  repoPath: repoPathSchema,
  direction: z.enum(['undo', 'redo']),
  /** Proceed despite drift / force-push risk warnings. */
  force: z.boolean().optional()
})


export const watchRequestSchema = z.object({ repoPath: repoPathSchema })

export const settingsPatchSchema = z.object({
  favorites: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        path: repoPathSchema
      })
    )
    .optional(),
  recent: z.array(repoPathSchema).max(200).optional(),
  graphInitialLimit: z.number().int().min(50).max(20_000).optional(),
  defaultBranch: z.string().min(1).max(255).optional(),
  language: z.enum(['system', 'zh', 'en']).optional(),
  leftPanelWidth: z.number().int().min(160).max(600).optional(),
  rightPanelWidth: z.number().int().min(220).max(700).optional(),
  graphSplitPct: z.number().min(15).max(85).optional(),
  graphAuthorWidth: z.number().int().min(60).max(400).optional(),
  graphDateWidth: z.number().int().min(40).max(200).optional(),
  graphOidWidth: z.number().int().min(40).max(160).optional(),
  autoFetchInterval: z.number().int().min(0).max(60).optional(),
  autoPrune: z.boolean().optional(),
  notifications: z.boolean().optional(),
  externalTools: z
    .object({
      editor: z.string().max(1024),
      diffTool: z.string().max(1024),
      mergeTool: z.string().max(1024),
      terminal: z.string().max(1024)
    })
    .optional(),
  terminalFontFamily: z.string().max(255).optional(),
  terminalFontSize: z.number().int().min(8).max(32).optional(),
  terminalHeight: z.number().int().min(120).max(600).optional(),
  providerAccounts: z
    .array(
      z.object({
        provider: z.enum(['github', 'azuredevops']),
        username: z.string().max(255),
        displayName: z.string().max(255).optional(),
        avatarUrl: z.string().url().max(1024).optional(),
        authType: z.enum(['pat', 'device-flow']),
        createdAt: z.string().max(64)
      })
    )
    .optional()
})

/** Read back recent activity-log entries (newest first). */
export const activityListRequestSchema = z.object({ limit: z.number().int().min(1).max(500).optional() })

export const sessionPatchSchema = z.object({
  openRepos: z.array(repoPathSchema).max(50).optional(),
  activeRepo: repoPathSchema.nullable().optional()
})

export const pickDirectorySchema = z.object({ title: z.string().max(255).optional() })

// --- embedded terminal -------------------------------------------------------

const ptyIdSchema = z.string().min(1).max(64)

export const terminalCreateRequestSchema = z.object({
  cwd: repoPathSchema.optional(),
  cols: z.number().int().min(10).max(1000),
  rows: z.number().int().min(4).max(500)
})

export const terminalWriteRequestSchema = z.object({
  id: ptyIdSchema,
  data: z.string().max(1_000_000)
})

export const terminalResizeRequestSchema = z.object({
  id: ptyIdSchema,
  cols: z.number().int().min(10).max(1000),
  rows: z.number().int().min(4).max(500)
})

export const terminalKillRequestSchema = z.object({ id: ptyIdSchema })

export interface TerminalCreateDto {
  id: string
}

export interface TerminalExitDto {
  id: string
  exitCode: number
}

// --- git providers & pull requests -------------------------------------------

export * from './providers'

export const providerConnectPatSchema = z.object({
  provider: z.enum(['github', 'azuredevops']),
  token: z.string().min(1).max(1024),
  org: z.string().max(256).optional()
})

export const providerDisconnectSchema = z.object({
  provider: z.enum(['github', 'azuredevops'])
})

export const providerDetectRepoRefSchema = z.object({
  repoPath: repoPathSchema
})

export const prListSchema = z.object({
  repoPath: repoPathSchema,
  state: z.enum(['open', 'closed', 'merged', 'all']).optional()
})

export const prGetSchema = z.object({
  repoPath: repoPathSchema,
  id: z.union([z.number(), z.string().min(1)])
})

export const prCreateSchema = z.object({
  repoPath: repoPathSchema,
  title: z.string().min(1).max(512),
  description: z.string().max(65536).default(''),
  sourceBranch: z.string().min(1).max(255),
  targetBranch: z.string().min(1).max(255),
  draft: z.boolean().optional()
})

export const prCommentSchema = z.object({
  repoPath: repoPathSchema,
  id: z.union([z.number(), z.string().min(1)]),
  body: z.string().min(1).max(65536)
})

export const prMergeSchema = z.object({
  repoPath: repoPathSchema,
  id: z.union([z.number(), z.string().min(1)]),
  method: z.enum(['merge', 'squash', 'rebase']).default('merge')
})

export const prCheckoutSchema = z.object({
  repoPath: repoPathSchema,
  branch: z.string().min(1).max(255)
})

// IPC channel names live in ./channels (sandboxed-preload safe) and are
// re-exported here for convenience.
