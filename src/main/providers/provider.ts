import type {
  CreatePrInputDto,
  PrMergeMethod,
  ProviderAccountDto,
  ProviderKind,
  PullRequestDetailDto,
  PullRequestDto,
  RepoRef,
  PrState
} from '../../shared/providers'

export interface GitProvider {
  readonly id: ProviderKind
  authenticatePat(token: string, options?: { org?: string }): Promise<ProviderAccountDto>
  listPullRequests(ref: RepoRef, token: string, state?: PrState | 'all'): Promise<PullRequestDto[]>
  getPullRequest(ref: RepoRef, token: string, id: number | string): Promise<PullRequestDetailDto>
  createPullRequest(ref: RepoRef, token: string, input: CreatePrInputDto): Promise<PullRequestDto>
  commentOnPullRequest(ref: RepoRef, token: string, id: number | string, body: string): Promise<void>
  mergePullRequest(ref: RepoRef, token: string, id: number | string, method: PrMergeMethod): Promise<void>
}
