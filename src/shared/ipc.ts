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
}

export interface SessionStateDto {
  openRepos: string[]
  activeRepo: string | null
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
  graphOidWidth: z.number().int().min(40).max(160).optional()
})

export const sessionPatchSchema = z.object({
  openRepos: z.array(repoPathSchema).max(50).optional(),
  activeRepo: repoPathSchema.nullable().optional()
})

export const pickDirectorySchema = z.object({ title: z.string().max(255).optional() })

// IPC channel names live in ./channels (sandboxed-preload safe) and are
// re-exported here for convenience.
