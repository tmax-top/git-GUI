// Pure channel constants — safe to import from the sandboxed preload
// (no zod, no node builtins, no external runtime deps).

export const IPC = {
  appInfo: 'app:info',
  pickDirectory: 'dialog:pickDirectory',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  sessionGet: 'session:get',
  sessionSet: 'session:set',
  repoValidate: 'repo:validate',
  gitStatus: 'git:status',
  gitGraph: 'git:graph',
  gitRefs: 'git:refs',
  gitCheckout: 'git:checkout',
  gitStage: 'git:stage',
  gitUnstage: 'git:unstage',
  gitDiscard: 'git:discard',
  gitClean: 'git:clean',
  gitIgnore: 'git:ignore',
  gitCommit: 'git:commit',
  gitDiffText: 'git:diffText',
  gitCommitDiff: 'git:commitDiff',
  gitApplyHunk: 'git:applyHunk',
  gitBlob: 'git:blob',
  fileWorktree: 'file:worktree',
  gitFetch: 'git:fetch',
  gitPull: 'git:pull',
  gitPush: 'git:push',
  gitCancel: 'git:cancel',
  gitClone: 'git:clone',
  gitInit: 'git:init',
  watchStart: 'watch:start',
  watchStop: 'watch:stop'
} as const

export const IPC_EVENTS = {
  repoChanged: 'repo:changed',
  gitProgress: 'git:progress'
} as const
