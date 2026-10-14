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
  language: z.enum(['system', 'zh', 'en']).optional()
})

export const sessionPatchSchema = z.object({
  openRepos: z.array(repoPathSchema).max(50).optional(),
  activeRepo: repoPathSchema.nullable().optional()
})

export const pickDirectorySchema = z.object({ title: z.string().max(255).optional() })

// IPC channel names live in ./channels (sandboxed-preload safe) and are
// re-exported here for convenience.
