"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const promises = require("node:fs/promises");
const node_path = require("node:path");
const zod = require("zod");
const node_child_process = require("node:child_process");
const node_os = require("node:os");
const node_crypto = require("node:crypto");
const node_fs = require("node:fs");
const nodePty = require("node-pty");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const electron__namespace = /* @__PURE__ */ _interopNamespaceDefault(electron);
const IPC = {
  appInfo: "app:info",
  pickDirectory: "dialog:pickDirectory",
  settingsGet: "settings:get",
  settingsSet: "settings:set",
  sessionGet: "session:get",
  sessionSet: "session:set",
  repoValidate: "repo:validate",
  gitStatus: "git:status",
  gitGraph: "git:graph",
  gitCommitRange: "git:commitRange",
  gitRefs: "git:refs",
  gitCheckout: "git:checkout",
  gitStage: "git:stage",
  gitUnstage: "git:unstage",
  gitDiscard: "git:discard",
  gitClean: "git:clean",
  gitIgnore: "git:ignore",
  gitCommit: "git:commit",
  gitDiffText: "git:diffText",
  gitCommitDiff: "git:commitDiff",
  gitApplyHunk: "git:applyHunk",
  gitBlob: "git:blob",
  fileWorktree: "file:worktree",
  gitFetch: "git:fetch",
  gitPull: "git:pull",
  gitPush: "git:push",
  gitCancel: "git:cancel",
  gitClone: "git:clone",
  gitInit: "git:init",
  watchStart: "watch:start",
  watchStop: "watch:stop",
  gitMerge: "git:merge",
  gitOpState: "git:opState",
  gitOpContinue: "git:opContinue",
  gitOpAbort: "git:opAbort",
  gitOpSkip: "git:opSkip",
  gitRebase: "git:rebase",
  gitRebaseInteractive: "git:rebaseInteractive",
  gitRebaseRange: "git:rebaseRange",
  gitCherryPick: "git:cherryPick",
  gitRevert: "git:revert",
  gitReset: "git:reset",
  gitStashPush: "git:stashPush",
  gitStashApply: "git:stashApply",
  gitStashDrop: "git:stashDrop",
  gitTagCreate: "git:tagCreate",
  gitTagDelete: "git:tagDelete",
  gitBranchDelete: "git:branchDelete",
  gitBranchRename: "git:branchRename",
  gitConflictRead: "git:conflictRead",
  gitConflictResolve: "git:conflictResolve",
  gitConflictAccept: "git:conflictAccept",
  gitSearch: "git:search",
  gitUndoSnapshot: "git:undoSnapshot",
  gitUndoRecord: "git:undoRecord",
  gitUndoList: "git:undoList",
  gitUndoApply: "git:undoApply",
  activityList: "activity:list",
  hooksList: "hooks:list",
  hookRead: "hooks:read",
  hookSetEnabled: "hooks:setEnabled",
  lfsStatus: "lfs:status",
  lfsSetPolicy: "lfs:setPolicy",
  gitflowStatus: "gitflow:status",
  gitflowInit: "gitflow:init",
  gitflowStart: "gitflow:start",
  gitflowFinish: "gitflow:finish",
  signingStatus: "signing:status",
  signingSet: "signing:set",
  toolsOpen: "tools:open",
  repoSettingsGet: "repoSettings:get",
  repoSettingsSet: "repoSettings:set",
  repoCleanOrig: "repoSettings:cleanOrig",
  submoduleDetails: "submodule:details",
  submoduleInit: "submodule:init",
  submoduleUpdate: "submodule:update",
  submoduleSetUpdate: "submodule:setUpdate",
  submoduleGetRecurse: "submodule:getRecurse",
  submoduleSetRecurse: "submodule:setRecurse",
  worktreeList: "worktree:list",
  worktreeAdd: "worktree:add",
  worktreeRemove: "worktree:remove",
  terminalCreate: "terminal:create",
  terminalWrite: "terminal:write",
  terminalResize: "terminal:resize",
  terminalKill: "terminal:kill",
  providerListAccounts: "provider:listAccounts",
  providerListRepos: "provider:listRepos",
  providerConnectPat: "provider:connectPat",
  providerDisconnect: "provider:disconnect",
  providerDetectRepoRef: "provider:detectRepoRef",
  prList: "pr:list",
  prGet: "pr:get",
  prCreate: "pr:create",
  prComment: "pr:comment",
  prMerge: "pr:merge",
  prCheckout: "pr:checkout",
  pickFile: "dialog:pickFile",
  pickSavePath: "dialog:pickSavePath",
  patchExport: "patch:export",
  patchApply: "patch:apply",
  aiGenerateCommitMsg: "ai:generateCommitMsg",
  aiTestConnection: "ai:testConnection"
};
const IPC_EVENTS = {
  repoChanged: "repo:changed",
  gitProgress: "git:progress",
  activityNew: "activity:new",
  terminalData: "terminal:data",
  terminalExit: "terminal:exit"
};
function parseRepoRef(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const ghHttp = /^(?:https?|ssh):\/\/(?:[^@]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed);
  if (ghHttp) {
    const owner = ghHttp[1];
    const repo = ghHttp[2].replace(/\.git$/i, "");
    return {
      provider: "github",
      owner,
      repo,
      canonical: `github.com/${owner}/${repo}`,
      originalUrl: trimmed
    };
  }
  const ghScp = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed);
  if (ghScp) {
    const owner = ghScp[1];
    const repo = ghScp[2].replace(/\.git$/i, "");
    return {
      provider: "github",
      owner,
      repo,
      canonical: `github.com/${owner}/${repo}`,
      originalUrl: trimmed
    };
  }
  const adoHttp = /^(?:https?|ssh):\/\/(?:[^@]+@)?dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(?:\.git)?\/?$/i.exec(
    trimmed
  );
  if (adoHttp) {
    const org = adoHttp[1];
    const project = adoHttp[2];
    const repo = adoHttp[3].replace(/\.git$/i, "");
    return {
      provider: "azuredevops",
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    };
  }
  const vsHttp = /^(?:https?|ssh):\/\/(?:[^@]+@)?([^.]+)\.visualstudio\.com\/(?:DefaultCollection\/)?([^/]+)\/_git\/([^/]+?)(?:\.git)?\/?$/i.exec(
    trimmed
  );
  if (vsHttp) {
    const org = vsHttp[1];
    const project = vsHttp[2];
    const repo = vsHttp[3].replace(/\.git$/i, "");
    return {
      provider: "azuredevops",
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    };
  }
  const adoSsh = /^(?:ssh:\/\/)?git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(trimmed);
  if (adoSsh) {
    const org = adoSsh[1];
    const project = adoSsh[2];
    const repo = adoSsh[3].replace(/\.git$/i, "");
    return {
      provider: "azuredevops",
      org,
      project,
      repo,
      canonical: `dev.azure.com/${org}/${project}/_git/${repo}`,
      originalUrl: trimmed
    };
  }
  return null;
}
const repoPathSchema = zod.z.string().min(1).max(4096);
const pathsSchema = zod.z.array(zod.z.string().min(1).max(4096)).min(1).max(1e4);
const opIdSchema = zod.z.string().min(1).max(128);
const gitStatusRequestSchema = zod.z.object({ repoPath: repoPathSchema });
const conflictFileRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096)
});
const searchRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  scope: zod.z.enum(["commits", "files", "content"]),
  query: zod.z.string().min(1).max(1e3),
  limit: zod.z.number().int().min(1).max(1e3).optional()
});
const conflictResolveRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096),
  content: zod.z.string().max(1e7)
});
const conflictSideRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096),
  side: zod.z.enum(["ours", "theirs"])
});
const graphRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  limit: zod.z.number().int().min(1).max(1e5),
  skip: zod.z.number().int().min(0).max(1e7)
});
const refsRequestSchema = zod.z.object({ repoPath: repoPathSchema });
const branchRefSchema = zod.z.string().min(1).max(255).refine((v) => !v.startsWith("-") && !v.includes("..") && !/[\s~^:?*[\\]/.test(v), {
  message: "Invalid branch name"
});
const commitRangeRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  base: branchRefSchema,
  head: branchRefSchema
});
const checkoutRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  target: zod.z.string().min(1).max(1024)
});
const pathsRequestSchema = zod.z.object({ repoPath: repoPathSchema, paths: pathsSchema });
const ignoreRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096)
});
const commitRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  message: zod.z.string().min(1).max(1e5),
  amend: zod.z.boolean().optional(),
  signoff: zod.z.boolean().optional()
});
const diffRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  cached: zod.z.boolean().optional(),
  /** untracked file: diff against /dev/null via `git diff --no-index` */
  untracked: zod.z.boolean().optional(),
  paths: zod.z.array(zod.z.string().max(4096)).max(1e4).optional(),
  context: zod.z.number().int().min(0).max(1e5).optional()
});
const commitDiffRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  oid: zod.z.string().min(7).max(40)
});
const applyHunkRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  patch: zod.z.string().min(1).max(4e6),
  reverse: zod.z.boolean().optional()
});
const blobRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  spec: zod.z.string().min(1).max(4096)
});
const worktreeFileSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096)
});
const syncRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  opId: opIdSchema,
  rebase: zod.z.boolean().optional(),
  forceWithLease: zod.z.boolean().optional(),
  /** branch name to pass to `git push --set-upstream origin <name>` */
  setUpstream: zod.z.string().min(1).max(255).optional()
});
const cancelRequestSchema = zod.z.object({ opId: opIdSchema });
const cloneRequestSchema = zod.z.object({
  url: zod.z.string().min(1).max(4096),
  targetDir: zod.z.string().min(1).max(4096),
  depth: zod.z.number().int().min(1).max(1e5).optional(),
  opId: opIdSchema
});
const initRequestSchema = zod.z.object({
  dir: zod.z.string().min(1).max(4096),
  name: zod.z.string().min(1).max(255).regex(/^[^/\\]+$/, "invalid directory name"),
  defaultBranch: zod.z.string().min(1).max(255).regex(/^[^\s~^:?*[\\]+$/, "invalid refname")
});
const openRepoRequestSchema = zod.z.object({ path: repoPathSchema });
const oidSchema = zod.z.string().regex(/^[0-9a-f]{7,40}$/, "invalid oid");
const refSchema = zod.z.string().min(1).max(4096);
const mergeRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  branch: refSchema,
  noFF: zod.z.boolean().optional(),
  ffOnly: zod.z.boolean().optional(),
  message: zod.z.string().max(65536).optional()
});
const opRepoSchema = zod.z.object({ repoPath: repoPathSchema });
const rebaseRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  upstream: refSchema,
  autostash: zod.z.boolean().optional()
});
const rebaseRangeRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  base: refSchema
});
const rebaseInteractiveRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  upstream: refSchema,
  autostash: zod.z.boolean().optional(),
  ops: zod.z.array(
    zod.z.object({
      oid: oidSchema,
      action: zod.z.enum(["pick", "reword", "squash", "fixup", "drop"]),
      message: zod.z.string().max(65536).optional()
    })
  ).min(1).max(1e3)
});
const cherryPickRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  oids: zod.z.array(oidSchema).min(1).max(1e3),
  mainline: zod.z.number().int().min(1).max(10).optional()
});
const resetRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  mode: zod.z.enum(["soft", "mixed", "hard"]),
  target: refSchema
});
const stashPushRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  message: zod.z.string().max(65536).optional(),
  untracked: zod.z.boolean().optional(),
  staged: zod.z.boolean().optional()
});
const stashApplyRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  ref: refSchema.optional(),
  pop: zod.z.boolean().optional()
});
const stashDropRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  ref: refSchema.optional()
});
const tagCreateRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  name: zod.z.string().min(1).max(255),
  message: zod.z.string().max(65536).optional(),
  oid: oidSchema.optional()
});
const tagDeleteRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  names: zod.z.array(zod.z.string().min(1).max(255)).min(1).max(100)
});
const branchDeleteRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  name: zod.z.string().min(1).max(4096),
  force: zod.z.boolean().optional()
});
const branchRenameRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  from: zod.z.string().min(1).max(4096),
  to: zod.z.string().min(1).max(4096)
});
const worktreeAddRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096),
  branch: zod.z.string().min(1).max(4096).optional(),
  startPoint: zod.z.string().min(1).max(4096).optional()
});
const worktreeRemoveRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  path: zod.z.string().min(1).max(4096),
  force: zod.z.boolean().optional()
});
const hookNameSchema = zod.z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
const hooksListRequestSchema = opRepoSchema;
const hookReadRequestSchema = opRepoSchema.extend({ name: hookNameSchema });
const hookSetEnabledRequestSchema = opRepoSchema.extend({
  name: hookNameSchema,
  enabled: zod.z.boolean()
});
const lfsStatusRequestSchema = opRepoSchema;
const lfsSetPolicyRequestSchema = opRepoSchema.extend({
  fetchInclude: zod.z.string().max(1024).optional(),
  fetchExclude: zod.z.string().max(1024).optional()
});
const gitflowKindSchema = zod.z.enum(["feature", "release", "hotfix"]);
const gitflowStartRequestSchema = opRepoSchema.extend({
  kind: gitflowKindSchema,
  name: zod.z.string().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "invalid branch name")
});
const gitflowFinishRequestSchema = opRepoSchema.extend({ kind: gitflowKindSchema });
const signingSetRequestSchema = opRepoSchema.extend({
  signCommits: zod.z.boolean().optional(),
  format: zod.z.enum(["openpgp", "ssh", "x509"]).optional(),
  /** Empty string unsets user.signingkey. */
  signingKey: zod.z.string().max(4096).optional()
});
const toolsOpenRequestSchema = opRepoSchema.extend({
  kind: zod.z.enum(["editor", "diffTool", "mergeTool", "terminal"]),
  /** Optional file/dir the tool should open. */
  path: zod.z.string().max(4096).optional()
});
const repoSettingsSetRequestSchema = opRepoSchema.extend({
  encoding: zod.z.string().min(1).max(32).optional(),
  defaultBranch: zod.z.string().min(1).max(255).optional()
});
const submodulePathRequestSchema = opRepoSchema.extend({
  path: zod.z.string().min(1).max(4096).optional(),
  recursive: zod.z.boolean().optional()
});
const submoduleSetUpdateRequestSchema = opRepoSchema.extend({
  path: zod.z.string().min(1).max(4096),
  strategy: zod.z.enum(["checkout", "merge", "rebase", "none"]).nullable()
});
const submoduleSetRecurseRequestSchema = opRepoSchema.extend({
  value: zod.z.boolean()
});
const undoDescriptionSchema = zod.z.object({
  key: zod.z.string().min(1).max(128),
  params: zod.z.record(zod.z.string(), zod.z.union([zod.z.string(), zod.z.number()])).optional()
});
const undoSnapshotSchema = zod.z.object({
  head: zod.z.string().nullable(),
  headRef: zod.z.string().nullable(),
  headTree: zod.z.string().nullable(),
  refs: zod.z.record(zod.z.string(), zod.z.string()),
  indexTree: zod.z.string().nullable(),
  worktreeTree: zod.z.string().nullable(),
  fingerprint: zod.z.string()
});
const undoSnapshotRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  /** Capture worktree content too (false for index-only ops like stage/commit). */
  worktree: zod.z.boolean().optional()
});
const undoRecordRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  description: undoDescriptionSchema,
  before: undoSnapshotSchema,
  after: undoSnapshotSchema
});
const undoApplyRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  direction: zod.z.enum(["undo", "redo"]),
  /** Proceed despite drift / force-push risk warnings. */
  force: zod.z.boolean().optional()
});
const watchRequestSchema = zod.z.object({ repoPath: repoPathSchema });
const profileDtoSchema = zod.z.object({
  id: zod.z.string().min(1).max(64),
  name: zod.z.string().min(1).max(255),
  authorName: zod.z.string().min(1).max(255),
  authorEmail: zod.z.string().min(1).max(255),
  signingKey: zod.z.string().max(255).optional()
});
const workspaceDtoSchema = zod.z.object({
  id: zod.z.string().min(1).max(64),
  name: zod.z.string().min(1).max(255),
  description: zod.z.string().max(1024).optional(),
  repoPaths: zod.z.array(repoPathSchema).max(200),
  createdAt: zod.z.string().max(64),
  updatedAt: zod.z.string().max(64)
});
const settingsPatchSchema = zod.z.object({
  favorites: zod.z.array(
    zod.z.object({
      name: zod.z.string().min(1).max(255),
      path: repoPathSchema
    })
  ).optional(),
  recent: zod.z.array(repoPathSchema).max(200).optional(),
  graphInitialLimit: zod.z.number().int().min(50).max(2e4).optional(),
  defaultBranch: zod.z.string().min(1).max(255).optional(),
  language: zod.z.enum(["system", "zh", "en"]).optional(),
  theme: zod.z.enum(["system", "dark", "light"]).optional(),
  leftPanelWidth: zod.z.number().int().min(160).max(600).optional(),
  rightPanelWidth: zod.z.number().int().min(220).max(700).optional(),
  graphSplitPct: zod.z.number().min(15).max(85).optional(),
  graphAuthorWidth: zod.z.number().int().min(60).max(400).optional(),
  graphDateWidth: zod.z.number().int().min(40).max(200).optional(),
  graphOidWidth: zod.z.number().int().min(40).max(160).optional(),
  autoFetchInterval: zod.z.number().int().min(0).max(60).optional(),
  autoPrune: zod.z.boolean().optional(),
  notifications: zod.z.boolean().optional(),
  externalTools: zod.z.object({
    editor: zod.z.string().max(1024),
    diffTool: zod.z.string().max(1024),
    mergeTool: zod.z.string().max(1024),
    terminal: zod.z.string().max(1024)
  }).optional(),
  terminalFontFamily: zod.z.string().max(255).optional(),
  terminalFontSize: zod.z.number().int().min(8).max(32).optional(),
  terminalHeight: zod.z.number().int().min(120).max(600).optional(),
  commitBoxHeight: zod.z.number().int().min(140).max(560).optional(),
  providerAccounts: zod.z.array(
    zod.z.object({
      provider: zod.z.enum(["github", "azuredevops"]),
      username: zod.z.string().max(255),
      displayName: zod.z.string().max(255).optional(),
      avatarUrl: zod.z.string().url().max(1024).optional(),
      authType: zod.z.enum(["pat", "device-flow"]),
      createdAt: zod.z.string().max(64)
    })
  ).optional(),
  workspaces: zod.z.array(workspaceDtoSchema).optional(),
  activeWorkspaceId: zod.z.string().max(64).nullable().optional(),
  profiles: zod.z.array(profileDtoSchema).optional(),
  activeProfileId: zod.z.string().max(64).nullable().optional(),
  aiApiUrl: zod.z.string().max(1024).optional(),
  aiApiKey: zod.z.string().max(1024).optional(),
  aiModel: zod.z.string().max(255).optional(),
  aiPrompt: zod.z.string().max(4096).optional()
});
const activityListRequestSchema = zod.z.object({ limit: zod.z.number().int().min(1).max(500).optional() });
const sessionPatchSchema = zod.z.object({
  openRepos: zod.z.array(repoPathSchema).max(50).optional(),
  activeRepo: repoPathSchema.nullable().optional()
});
const pickDirectorySchema = zod.z.object({ title: zod.z.string().max(255).optional() });
const ptyIdSchema = zod.z.string().min(1).max(64);
const terminalCreateRequestSchema = zod.z.object({
  cwd: repoPathSchema.optional(),
  cols: zod.z.number().int().min(10).max(1e3),
  rows: zod.z.number().int().min(4).max(500)
});
const terminalWriteRequestSchema = zod.z.object({
  id: ptyIdSchema,
  data: zod.z.string().max(1e6)
});
const terminalResizeRequestSchema = zod.z.object({
  id: ptyIdSchema,
  cols: zod.z.number().int().min(10).max(1e3),
  rows: zod.z.number().int().min(4).max(500)
});
const terminalKillRequestSchema = zod.z.object({ id: ptyIdSchema });
const providerListReposSchema = zod.z.object({
  provider: zod.z.enum(["github", "azuredevops"]),
  org: zod.z.string().max(256).optional()
});
const providerConnectPatSchema = zod.z.object({
  provider: zod.z.enum(["github", "azuredevops"]),
  token: zod.z.string().min(1).max(1024),
  org: zod.z.string().max(256).optional()
});
const providerDisconnectSchema = zod.z.object({
  provider: zod.z.enum(["github", "azuredevops"])
});
const providerDetectRepoRefSchema = zod.z.object({
  repoPath: repoPathSchema
});
const prListSchema = zod.z.object({
  repoPath: repoPathSchema,
  state: zod.z.enum(["open", "closed", "merged", "all"]).optional()
});
const prGetSchema = zod.z.object({
  repoPath: repoPathSchema,
  id: zod.z.union([zod.z.number(), zod.z.string().min(1)])
});
const prCreateSchema = zod.z.object({
  repoPath: repoPathSchema,
  title: zod.z.string().min(1).max(512),
  description: zod.z.string().max(65536).default(""),
  sourceBranch: zod.z.string().min(1).max(255),
  targetBranch: zod.z.string().min(1).max(255),
  draft: zod.z.boolean().optional()
});
const prCommentSchema = zod.z.object({
  repoPath: repoPathSchema,
  id: zod.z.union([zod.z.number(), zod.z.string().min(1)]),
  body: zod.z.string().min(1).max(65536)
});
const prMergeSchema = zod.z.object({
  repoPath: repoPathSchema,
  id: zod.z.union([zod.z.number(), zod.z.string().min(1)]),
  method: zod.z.enum(["merge", "squash", "rebase"]).default("merge")
});
const prCheckoutSchema = zod.z.object({
  repoPath: repoPathSchema,
  branch: zod.z.string().min(1).max(255)
});
const pickFileSchema = zod.z.object({
  title: zod.z.string().max(255).optional(),
  filters: zod.z.array(zod.z.object({ name: zod.z.string(), extensions: zod.z.array(zod.z.string()) })).optional()
});
const pickSavePathSchema = zod.z.object({
  title: zod.z.string().max(255).optional(),
  defaultPath: zod.z.string().max(1024).optional(),
  filters: zod.z.array(zod.z.object({ name: zod.z.string(), extensions: zod.z.array(zod.z.string()) })).optional()
});
const patchExportRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  oid: oidSchema.optional(),
  targetPath: zod.z.string().max(1024).optional()
});
const patchApplyRequestSchema = zod.z.object({
  repoPath: repoPathSchema,
  patchPath: zod.z.string().max(1024).optional(),
  patchContent: zod.z.string().max(1e7).optional()
});
const aiGenerateCommitMsgSchema = zod.z.object({
  repoPath: repoPathSchema,
  draft: zod.z.string().max(4096).optional()
});
const aiTestConnectionSchema = zod.z.object({
  apiUrl: zod.z.string().max(1024).optional(),
  apiKey: zod.z.string().max(1024).optional(),
  model: zod.z.string().max(255).optional()
});
function cleanGitStderr(stderr) {
  if (!stderr) return "";
  return stderr.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("** WARNING: connection is not using a post-quantum key exchange algorithm")) return false;
    if (trimmed.startsWith('** This session may be vulnerable to "store now, decrypt later" attacks')) return false;
    if (trimmed.startsWith("** The server may need to be upgraded. See https://openssh.com/pq.html")) return false;
    return true;
  }).join("\n").trim();
}
class GitExecError extends Error {
  constructor(result, args) {
    const cleaned = cleanGitStderr(result.stderr);
    super(`git ${args.join(" ")} exited with code ${result.code}: ${cleaned || result.stdout.trim()}`);
    this.result = result;
    this.args = args;
    this.name = "GitExecError";
  }
  result;
  args;
}
function gitBin() {
  return process.env.GIT_GUI_GIT_PATH || "git";
}
let activeProfileConfig = null;
function setActiveProfileConfig(cfg) {
  activeProfileConfig = cfg;
}
function execGit(opts) {
  return new Promise((resolve, reject) => {
    const profileArgs = [];
    if (activeProfileConfig) {
      if (activeProfileConfig.name) profileArgs.push("-c", `user.name=${activeProfileConfig.name}`);
      if (activeProfileConfig.email) profileArgs.push("-c", `user.email=${activeProfileConfig.email}`);
      if (activeProfileConfig.signingKey) profileArgs.push("-c", `user.signingkey=${activeProfileConfig.signingKey}`);
    }
    const child = node_child_process.spawn(gitBin(), ["-c", "core.quotepath=false", ...profileArgs, ...opts.args], {
      cwd: opts.cwd,
      windowsHide: true,
      env: {
        ...process.env,
        ...opts.env,
        LC_ALL: "C",
        LANG: "C",
        LANGUAGE: "C",
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_PAGER: "cat",
        PAGER: "cat"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const stdoutChunks = [];
    let settled = false;
    const kill = () => {
      if (!child.killed) child.kill("SIGTERM");
    };
    const timer = opts.timeoutMs != null ? setTimeout(() => {
      kill();
    }, opts.timeoutMs) : void 0;
    const onAbort = () => kill();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    };
    if (opts.binary) {
      child.stdout.on("data", (d) => {
        stdoutChunks.push(d);
      });
    } else {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (d) => {
        stdout += d;
      });
    }
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (d) => {
      stderr += d;
      opts.onStderr?.(d);
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        stdout,
        stdoutBuf: opts.binary ? Buffer.concat(stdoutChunks) : void 0,
        stderr,
        code: code ?? -1
      });
    });
    if (opts.stdin != null) {
      child.stdin.end(opts.stdin);
    } else {
      child.stdin.end();
    }
  });
}
async function execGitOrThrow(opts) {
  const result = await execGit(opts);
  if (result.code !== 0) {
    throw new GitExecError(result, opts.args);
  }
  return result;
}
const PROGRESS_RE = /^([^:]+):\s+(?:(\d+)%\s+\((\d+)\/(\d+)\))?(.*)$/;
function parseProgressChunk(chunk) {
  const events = [];
  for (const rawLine of chunk.split(/\r?\n/)) {
    const line = rawLine.replace(/^remote:\s*/, "").trim();
    if (!line) continue;
    const m = PROGRESS_RE.exec(line);
    if (!m) continue;
    const stage = m[1].trim();
    if (!stage || !/\b(objects|deltas|Compressing|Receiving|Resolving|Counting|Writing|Enumerating)\b/i.test(stage)) {
      continue;
    }
    events.push({
      stage,
      percent: m[2] ? Number(m[2]) : void 0,
      current: m[3] ? Number(m[3]) : void 0,
      total: m[4] ? Number(m[4]) : void 0,
      raw: line
    });
  }
  return events;
}
class SerialQueue {
  chains = /* @__PURE__ */ new Map();
  run(key, fn) {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(
      () => fn(),
      () => fn()
    );
    this.chains.set(
      key,
      next.catch(() => void 0)
    );
    return next;
  }
}
const repoQueue = new SerialQueue();
function parsePorcelainV2(output) {
  const status = {
    ahead: 0,
    behind: 0,
    detached: false,
    files: []
  };
  for (const line of output.split("\n")) {
    if (!line) continue;
    if (line.startsWith("# branch.oid ")) {
      status.oid = line.slice("# branch.oid ".length).trim();
    } else if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim();
      if (head === "(detached)") {
        status.detached = true;
        status.head = status.oid;
      } else {
        status.head = head;
      }
    } else if (line.startsWith("# branch.upstream ")) {
      status.upstream = line.slice("# branch.upstream ".length).trim();
    } else if (line.startsWith("# branch.ab ")) {
      const m = /\+(\d+)\s+-(\d+)/.exec(line);
      if (m) {
        status.ahead = Number(m[1]);
        status.behind = Number(m[2]);
      }
    } else if (line.startsWith("? ")) {
      status.files.push({
        path: unquotePath(line.slice(2)),
        indexStatus: ".",
        worktreeStatus: ".",
        untracked: true
      });
    } else if (line.startsWith("! ")) {
      status.files.push({
        path: unquotePath(line.slice(2)),
        indexStatus: ".",
        worktreeStatus: ".",
        ignored: true
      });
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const isRename = line.startsWith("2 ");
      const parts = line.split(" ");
      const xy = parts[1];
      if (isRename) {
        const pathField = parts.slice(9).join(" ");
        const [path2, origPath] = pathField.split("	");
        status.files.push({
          path: unquotePath(path2),
          origPath: unquotePath(origPath ?? ""),
          indexStatus: xy[0],
          worktreeStatus: xy[1]
        });
      } else {
        const path2 = parts.slice(8).join(" ");
        status.files.push({
          path: unquotePath(path2),
          indexStatus: xy[0],
          worktreeStatus: xy[1]
        });
      }
    } else if (line.startsWith("u ")) {
      const parts = line.split(" ");
      const xy = parts[1];
      const path2 = parts.slice(10).join(" ");
      status.files.push({
        path: unquotePath(path2),
        indexStatus: xy[0],
        worktreeStatus: xy[1],
        unmerged: true
      });
    }
  }
  return status;
}
function unquotePath(p) {
  if (p.startsWith('"') && p.endsWith('"')) {
    return p.slice(1, -1).replace(/\\([nrt\\"])/g, (_m, c) => {
      if (c === "n") return "\n";
      if (c === "r") return "\r";
      if (c === "t") return "	";
      return c;
    }).replace(/\\([0-7]{3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
  }
  return p;
}
async function getStatus(repoPath, signal) {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ["status", "--porcelain=v2", "--branch", "--untracked-files=all"],
    signal
  });
  return parsePorcelainV2(stdout);
}
const RECORD_SEP = "";
const LOG_FORMAT = [
  "%H",
  "%h",
  "%an",
  "%ae",
  "%at",
  "%cn",
  "%ce",
  "%ct",
  "%P",
  "%s",
  "%b"
].join("%x00");
function parseLogOutput(output) {
  const commits = [];
  for (const record of output.split(RECORD_SEP)) {
    const rec = record.replace(/^\n+|\n+$/g, "");
    if (!rec) continue;
    const f = rec.split("\0");
    if (f.length < 11) continue;
    commits.push({
      oid: f[0],
      // Fixed 8 chars: `%h` honours core.abbrev (7 by default), which is too
      // short to eyeball-match against other tools.
      shortOid: f[0].slice(0, 8),
      authorName: f[2],
      authorEmail: f[3],
      authorTime: Number(f[4]),
      committerName: f[5],
      committerEmail: f[6],
      committerTime: Number(f[7]),
      parents: f[8] ? f[8].split(" ") : [],
      subject: f[9],
      body: f[10]
    });
  }
  return commits;
}
const HIDDEN_REF_GLOBS = ["refs/agents/*"];
async function getLog(repoPath, opts = {}) {
  const args = ["log", `--format=${RECORD_SEP}${LOG_FORMAT}${RECORD_SEP}`];
  if (opts.all !== false) {
    for (const glob of HIDDEN_REF_GLOBS) args.push(`--exclude=${glob}`);
    args.push("--all");
  }
  if (opts.topo) args.push("--topo-order");
  if (opts.limit != null) args.push(`-n`, String(opts.limit));
  if (opts.skip != null) args.push(`--skip=${opts.skip}`);
  if (opts.grep) args.push(`--grep=${opts.grep}`, "--fixed-strings");
  if (opts.ignoreCase) args.push("--regexp-ignore-case");
  if (opts.paths && opts.paths.length > 0) {
    args.push("--", ...opts.paths);
  }
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal });
  return parseLogOutput(stdout);
}
async function getCommitsBetween(repoPath, base, head, signal) {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: [
      "log",
      "--reverse",
      `--format=${RECORD_SEP}${LOG_FORMAT}${RECORD_SEP}`,
      `${base}..${head}`
    ],
    signal
  });
  return parseLogOutput(stdout);
}
function decode(buf, encoding) {
  const label = (encoding || "utf-8").toLowerCase();
  if (label === "utf-8" || label === "utf8") return buf.toString("utf8");
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}
async function getDiffText(repoPath, opts = {}) {
  const args = ["diff"];
  if (opts.cached) args.push("--cached");
  if (opts.contextLines != null) args.push(`-U${opts.contextLines}`);
  if (opts.paths && opts.paths.length > 0) {
    args.push("--", ...opts.paths);
  }
  const result = await execGitOrThrow({ cwd: repoPath, args, signal: opts.signal, binary: true });
  return decode(result.stdoutBuf ?? Buffer.alloc(0), opts.encoding);
}
async function getUntrackedDiff(repoPath, path2, signal, encoding) {
  const result = await execGit({
    cwd: repoPath,
    args: ["diff", "--no-index", "--", "/dev/null", path2],
    signal,
    binary: true
  });
  if (result.code !== 0 && result.code !== 1) {
    throw new Error(`git diff --no-index failed (${result.code}): ${result.stderr.trim()}`);
  }
  return decode(result.stdoutBuf ?? Buffer.alloc(0), encoding);
}
async function getCommitDiffText(repoPath, oid, opts = {}) {
  const rev = await execGit({
    cwd: repoPath,
    args: ["rev-list", "--parents", "-n", "1", oid],
    signal: opts.signal
  });
  const parents = rev.code === 0 ? rev.stdout.trim().split(/\s+/).slice(1) : [];
  const args = parents.length >= 2 ? ["diff", parents[0], oid] : ["show", "--format=", oid];
  if (opts.paths && opts.paths.length > 0) {
    args.push("--", ...opts.paths);
  }
  const result = await execGitOrThrow({
    cwd: repoPath,
    args,
    signal: opts.signal,
    binary: true
  });
  return decode(result.stdoutBuf ?? Buffer.alloc(0), opts.encoding);
}
const REF_FORMAT = "%(refname:short)	%(refname)	%(objectname)	%(upstream:short)	%(upstream:track)	%(subject)";
function parseTrack(track) {
  if (!track) return {};
  if (track.includes("gone")) return { gone: true };
  const ahead = /ahead (\d+)/.exec(track);
  const behind = /behind (\d+)/.exec(track);
  return {
    ahead: ahead ? Number(ahead[1]) : void 0,
    behind: behind ? Number(behind[1]) : void 0
  };
}
function parseRefs(stdout, isRemote) {
  const refs = [];
  for (const record of stdout.split("\n")) {
    if (!record.trim()) continue;
    const f = record.split("	");
    if (f.length < 3) continue;
    refs.push({
      name: f[0],
      fullName: f[1],
      oid: f[2],
      upstream: f[3] || void 0,
      ...parseTrack(f[4] ?? ""),
      isRemote,
      // subject may itself contain tabs — keep the remainder intact
      subject: f.length > 5 ? f.slice(5).join("	") || void 0 : void 0
    });
  }
  return refs;
}
async function listBranches(repoPath, signal) {
  const [local, remote] = await Promise.all([
    execGitOrThrow({
      cwd: repoPath,
      args: ["for-each-ref", `--format=${REF_FORMAT}`, "refs/heads"],
      signal
    }),
    execGitOrThrow({
      cwd: repoPath,
      args: ["for-each-ref", `--format=${REF_FORMAT}`, "refs/remotes"],
      signal
    })
  ]);
  const remotes = parseRefs(remote.stdout, true).filter((r) => !r.fullName.endsWith("/HEAD"));
  return [...parseRefs(local.stdout, false), ...remotes];
}
async function listTags(repoPath, signal) {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ["for-each-ref", `--format=${REF_FORMAT}`, "refs/tags"],
    signal
  });
  return parseRefs(stdout, false);
}
async function initRepo(repoPath, defaultBranch = "main") {
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["init", "-b", defaultBranch] })
  );
}
async function cloneRepo(url, targetDir, opts = {}, parentDir = targetDir) {
  const args = ["clone"];
  if (opts.depth != null) args.push("--depth", String(opts.depth));
  args.push("--", url, targetDir);
  const result = await execGit({
    cwd: parentDir,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress ? (chunk) => {
      for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e);
    } : void 0
  });
  if (result.code !== 0) {
    throw new Error(`git clone failed (${result.code}): ${result.stderr.trim() || result.stdout.trim()}`);
  }
}
async function addPaths(repoPath, paths) {
  await repoQueue.run(repoPath, () => execGitOrThrow({ cwd: repoPath, args: ["add", "--", ...paths] }));
}
async function unstagePaths(repoPath, paths) {
  await repoQueue.run(repoPath, async () => {
    const head = await execGit({ cwd: repoPath, args: ["rev-parse", "--verify", "HEAD"] });
    if (head.code === 0) {
      await execGitOrThrow({ cwd: repoPath, args: ["restore", "--staged", "--", ...paths] });
    } else {
      await execGitOrThrow({ cwd: repoPath, args: ["rm", "--cached", "--force", "--", ...paths] });
    }
  });
}
async function discardPaths(repoPath, paths) {
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["restore", "--worktree", "--", ...paths] })
  );
}
async function cleanPaths(repoPath, paths) {
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["clean", "-f", "--", ...paths] })
  );
}
async function commit(repoPath, opts) {
  return repoQueue.run(repoPath, async () => {
    const args = ["commit", "-m", opts.message];
    if (opts.amend) args.push("--amend");
    if (opts.signoff) args.push("--signoff");
    const { stdout } = await execGitOrThrow({ cwd: repoPath, args });
    const m = /\[[^\]]*\s([0-9a-f]{7,40})\]/.exec(stdout);
    return m ? m[1] : "";
  });
}
async function checkout(repoPath, target) {
  await repoQueue.run(repoPath, () => execGitOrThrow({ cwd: repoPath, args: ["checkout", target] }));
}
async function fetch$1(repoPath, opts = {}) {
  const args = ["fetch", "--progress", "--all"];
  if (opts.prune !== false) args.push("--prune");
  const result = await execGit({
    cwd: repoPath,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress ? (chunk) => {
      for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e);
    } : void 0
  });
  if (result.code !== 0) {
    const cleaned = cleanGitStderr(result.stderr);
    throw new Error(`git fetch failed (${result.code}): ${cleaned}`);
  }
}
async function pull(repoPath, opts = {}) {
  const args = ["pull", "--progress"];
  if (opts.rebase) args.push("--rebase");
  if (opts.ffOnly) args.push("--ff-only");
  const result = await execGit({
    cwd: repoPath,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress ? (chunk) => {
      for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e);
    } : void 0
  });
  if (result.code !== 0) {
    const cleaned = cleanGitStderr(result.stderr);
    if (cleaned.includes("There is no tracking information for the current branch")) {
      throw new Error(
        `git pull failed: There is no tracking information for the current branch. Please set an upstream branch or push first.`
      );
    }
    throw new Error(`git pull failed (${result.code}): ${cleaned}`);
  }
}
async function push(repoPath, opts = {}) {
  const args = ["push", "--progress"];
  if (opts.forceWithLease) args.push("--force-with-lease");
  if (opts.setUpstream) args.push("--set-upstream", "origin", opts.setUpstream);
  const result = await execGit({
    cwd: repoPath,
    args,
    signal: opts.signal,
    onStderr: opts.onProgress ? (chunk) => {
      for (const e of parseProgressChunk(chunk)) opts.onProgress?.(e);
    } : void 0
  });
  if (result.code !== 0) {
    const cleaned = cleanGitStderr(result.stderr);
    throw new Error(`git push failed (${result.code}): ${cleaned}`);
  }
}
async function isRepo(repoPath) {
  const result = await execGit({ cwd: repoPath, args: ["rev-parse", "--is-inside-work-tree"] });
  return result.code === 0 && result.stdout.trim() === "true";
}
const STASH_FORMAT = "%H%x00%gd%x00%s%x00%ct";
async function listStashes(repoPath) {
  const result = await execGit({ cwd: repoPath, args: ["stash", "list", `--format=${STASH_FORMAT}`] });
  if (result.code !== 0) return [];
  const stashes = [];
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const f = line.split("\0");
    if (f.length < 4) continue;
    stashes.push({ oid: f[0], ref: f[1], subject: f[2], time: Number(f[3]) });
  }
  return stashes;
}
async function listSubmodules(repoPath) {
  const result = await execGit({ cwd: repoPath, args: ["submodule", "status"] });
  if (result.code !== 0) return [];
  const subs = [];
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const m = /^([+\-U ])([0-9a-f]{7,40})\s+(.+?)\s*(?:\(.*)?$/.exec(line);
    if (m) subs.push({ status: m[1], oid: m[2], path: m[3] });
  }
  return subs;
}
async function gitDir(repoPath) {
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args: ["rev-parse", "--git-dir"] });
  const dir = stdout.trim();
  return node_path.isAbsolute(dir) ? dir : node_path.join(repoPath, dir);
}
async function exists$1(path2) {
  try {
    await promises.readdir(path2);
    return true;
  } catch {
    try {
      const { readFile: rf } = await import("node:fs/promises");
      await rf(path2);
      return true;
    } catch {
      return false;
    }
  }
}
async function conflictPaths(repoPath) {
  const status = await getStatus(repoPath);
  return status.files.filter((f) => f.unmerged === true).map((f) => f.path);
}
async function detectKind(gitDir2) {
  if (await exists$1(node_path.join(gitDir2, "rebase-merge"))) return "rebase";
  if (await exists$1(node_path.join(gitDir2, "rebase-apply"))) return "rebase";
  if (await exists$1(node_path.join(gitDir2, "MERGE_HEAD"))) return "merge";
  if (await exists$1(node_path.join(gitDir2, "CHERRY_PICK_HEAD"))) return "cherry-pick";
  if (await exists$1(node_path.join(gitDir2, "REVERT_HEAD"))) return "revert";
  return null;
}
async function getOpState(repoPath) {
  const dir = await gitDir(repoPath);
  const kind = await detectKind(dir);
  const state = { kind, conflicts: await conflictPaths(repoPath) };
  if (kind === "rebase") {
    try {
      const mergeDir = node_path.join(dir, "rebase-merge");
      const current = Number(await promises.readFile(node_path.join(mergeDir, "msgnum"), "utf8"));
      const total = Number(await promises.readFile(node_path.join(mergeDir, "end"), "utf8"));
      if (Number.isFinite(current) && Number.isFinite(total)) {
        state.rebaseCurrent = current;
        state.rebaseTotal = total;
      }
    } catch {
      try {
        const applyDir = node_path.join(dir, "rebase-apply");
        const current = Number(await promises.readFile(node_path.join(applyDir, "next"), "utf8"));
        const total = Number(await promises.readFile(node_path.join(applyDir, "last"), "utf8"));
        if (Number.isFinite(current) && Number.isFinite(total)) {
          state.rebaseCurrent = current;
          state.rebaseTotal = total;
        }
      } catch {
      }
    }
  }
  return state;
}
function assertBranchName(name) {
  if (!name || name.startsWith("-") || name.includes("..")) {
    throw new Error(`invalid ref: ${name}`);
  }
}
async function runMaybeConflicted(repoPath, args, conflicted, env) {
  const result = await execGit({ cwd: repoPath, args, env });
  if (result.code === 0) return { conflicts: [] };
  const conflicts = await conflicted();
  if (conflicts.length > 0) return { conflicts };
  throw new GitExecError(result, args);
}
async function merge(repoPath, branch, opts = {}) {
  assertBranchName(branch);
  return repoQueue.run(repoPath, () => {
    const args = ["merge", "--no-edit"];
    if (opts.ffOnly) args.push("--ff-only");
    if (opts.noFF) args.push("--no-ff");
    if (opts.message) args.push("-m", opts.message);
    args.push(branch);
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath));
  });
}
async function cherryPick(repoPath, oids, opts = {}) {
  if (oids.length === 0) throw new Error("cherry-pick requires at least one commit");
  return repoQueue.run(repoPath, () => {
    const args = ["cherry-pick"];
    if (opts.mainline != null) args.push("-m", String(opts.mainline));
    args.push(...oids);
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath));
  });
}
async function revertCommits(repoPath, oids, opts = {}) {
  if (oids.length === 0) throw new Error("revert requires at least one commit");
  return repoQueue.run(repoPath, () => {
    const args = ["revert", "--no-edit"];
    if (opts.mainline != null) args.push("-m", String(opts.mainline));
    args.push(...oids);
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath));
  });
}
async function reset(repoPath, mode, target) {
  assertBranchName(target);
  if (mode !== "soft" && mode !== "mixed" && mode !== "hard") {
    throw new Error(`invalid reset mode: ${mode}`);
  }
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["reset", `--${mode}`, target] })
  );
}
async function abortOp(repoPath) {
  await repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath);
    if (!state.kind) throw new Error("no operation in progress");
    await execGitOrThrow({ cwd: repoPath, args: [state.kind, "--abort"] });
  });
}
async function continueOp(repoPath) {
  return repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath);
    if (!state.kind) throw new Error("no operation in progress");
    return runMaybeConflicted(repoPath, [state.kind, "--continue"], () => conflictPaths(repoPath), {
      GIT_EDITOR: "true"
    });
  });
}
async function skipOp(repoPath) {
  return repoQueue.run(repoPath, async () => {
    const state = await getOpState(repoPath);
    if (state.kind !== "rebase" && state.kind !== "cherry-pick") {
      throw new Error("skip is only available during rebase or cherry-pick");
    }
    return runMaybeConflicted(repoPath, [state.kind, "--skip"], () => conflictPaths(repoPath));
  });
}
async function rebase(repoPath, upstream, opts = {}) {
  assertBranchName(upstream);
  return repoQueue.run(repoPath, () => {
    const args = ["rebase"];
    if (opts.autostash) args.push("--autostash");
    args.push(upstream);
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath));
  });
}
async function rebaseRange(repoPath, base) {
  assertBranchName(base);
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ["log", "--reverse", "--format=%H%x00%s", `${base}..HEAD`]
  });
  return stdout.split("\n").filter((line) => line.includes("\0")).map((line) => {
    const nul = line.indexOf("\0");
    const oid = line.slice(0, nul);
    const subject = line.slice(nul + 1);
    return { oid, shortOid: oid.slice(0, 8), subject };
  });
}
const REBASE_ACTIONS = /* @__PURE__ */ new Set(["pick", "reword", "squash", "fixup", "drop"]);
async function rebaseInteractive(repoPath, upstream, ops, opts = {}) {
  assertBranchName(upstream);
  if (ops.length === 0) throw new Error("rebase plan is empty");
  for (const op of ops) {
    if (!/^[0-9a-f]{7,40}$/.test(op.oid)) throw new Error(`invalid oid in rebase plan: ${op.oid}`);
    if (!REBASE_ACTIONS.has(op.action)) throw new Error(`invalid rebase action: ${op.action}`);
  }
  const todo = ops.map((op) => `${op.action} ${op.oid}${op.message && op.action === "reword" ? ` ${op.message.replace(/\n+/g, " ")}` : ""}`).join("\n") + "\n";
  const seqScript = node_path.join(node_os.tmpdir(), `gitgui-seq-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`);
  await promises.writeFile(
    seqScript,
    `#!/bin/sh
cat > "$1" <<'GITGUI_TODO'
${todo}GITGUI_TODO
`,
    "utf8"
  );
  await promises.chmod(seqScript, 493);
  const rewordMsgs = ops.filter((o) => o.action === "reword" && o.message).map((o) => o.message);
  const env = { GIT_SEQUENCE_EDITOR: seqScript };
  let editorScript = null;
  let queueFile = null;
  if (rewordMsgs.length > 0) {
    queueFile = node_path.join(node_os.tmpdir(), `gitgui-msgs-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    await promises.writeFile(queueFile, rewordMsgs.join("\n") + "\n", "utf8");
    editorScript = node_path.join(node_os.tmpdir(), `gitgui-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`);
    await promises.writeFile(
      editorScript,
      `#!/bin/sh
msg=$(head -n 1 "${queueFile}")
if [ -n "$msg" ]; then
  printf '%s\\n' "$msg" > "$1"
  tail -n +2 "${queueFile}" > "${queueFile}.tmp" && mv "${queueFile}.tmp" "${queueFile}"
fi
`,
      "utf8"
    );
    await promises.chmod(editorScript, 493);
    env.GIT_EDITOR = editorScript;
  }
  try {
    return await repoQueue.run(repoPath, () => {
      const args = ["rebase", "-i"];
      if (opts.autostash) args.push("--autostash");
      args.push(upstream);
      return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath), env);
    });
  } finally {
    await promises.rm(seqScript, { force: true });
    if (editorScript) await promises.rm(editorScript, { force: true });
    if (queueFile) await promises.rm(queueFile, { force: true });
  }
}
async function stashPush(repoPath, opts = {}) {
  await repoQueue.run(repoPath, () => {
    const args = ["stash", "push"];
    if (opts.untracked) args.push("-u");
    if (opts.staged) args.push("--staged");
    if (opts.message) args.push("-m", opts.message);
    return execGitOrThrow({ cwd: repoPath, args });
  });
}
async function stashApply(repoPath, ref, opts = {}) {
  if (ref) assertBranchName(ref);
  return repoQueue.run(repoPath, () => {
    const args = ["stash", opts.pop ? "pop" : "apply"];
    if (ref) args.push(ref);
    return runMaybeConflicted(repoPath, args, () => conflictPaths(repoPath));
  });
}
async function stashDrop(repoPath, ref) {
  if (ref) assertBranchName(ref);
  await repoQueue.run(repoPath, () => {
    const args = ["stash", "drop"];
    if (ref) args.push(ref);
    return execGitOrThrow({ cwd: repoPath, args });
  });
}
async function tagCreate(repoPath, name, opts = {}) {
  assertBranchName(name);
  if (opts.oid) assertBranchName(opts.oid);
  await repoQueue.run(repoPath, () => {
    const args = opts.message ? ["tag", "-a", name, "-m", opts.message] : ["tag", name];
    if (opts.oid) args.push(opts.oid);
    return execGitOrThrow({ cwd: repoPath, args });
  });
}
async function tagDelete(repoPath, names) {
  if (names.length === 0) throw new Error("no tags to delete");
  for (const n of names) assertBranchName(n);
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["tag", "-d", ...names] })
  );
}
async function deleteBranch(repoPath, name, force = false) {
  assertBranchName(name);
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["branch", force ? "-D" : "-d", name] })
  );
}
async function renameBranch(repoPath, from, to) {
  assertBranchName(from);
  assertBranchName(to);
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["branch", "-m", from, to] })
  );
}
async function listWorktrees(repoPath) {
  const { stdout } = await execGitOrThrow({ cwd: repoPath, args: ["worktree", "list", "--porcelain"] });
  const out = [];
  let cur = null;
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      cur = { path: line.slice(9) };
      out.push(cur);
    } else if (!cur) {
      continue;
    } else if (line.startsWith("HEAD ")) {
      cur.head = line.slice(5);
    } else if (line.startsWith("branch ")) {
      cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
    } else if (line === "bare") {
      cur.bare = true;
    } else if (line === "detached") {
      cur.detached = true;
    } else if (line.startsWith("locked")) {
      cur.locked = true;
    } else if (line.startsWith("prunable")) {
      cur.prunable = true;
    }
  }
  return out;
}
async function addWorktree(repoPath, path2, opts = {}) {
  await repoQueue.run(repoPath, () => {
    const args = ["worktree", "add"];
    if (opts.branch) {
      assertBranchName(opts.branch);
      args.push("-b", opts.branch, path2);
      if (opts.startPoint) args.push(opts.startPoint);
    } else {
      args.push(path2);
      if (opts.startPoint) {
        assertBranchName(opts.startPoint);
        args.push(opts.startPoint);
      }
    }
    return execGitOrThrow({ cwd: repoPath, args });
  });
}
async function removeWorktree(repoPath, path2, force = false) {
  await repoQueue.run(repoPath, () => {
    const args = ["worktree", "remove", path2];
    if (force) args.push("--force");
    return execGitOrThrow({ cwd: repoPath, args });
  });
}
async function readStage(repoPath, stage, path2) {
  try {
    const { stdoutBuf } = await execGitOrThrow({
      cwd: repoPath,
      args: ["show", `:${stage}:${path2}`],
      binary: true
    });
    const buf = stdoutBuf ?? Buffer.alloc(0);
    if (buf.includes(0)) return { text: null, exists: true, binary: true };
    return { text: buf.toString("utf8"), exists: true, binary: false };
  } catch (e) {
    if (e instanceof GitExecError) return { text: null, exists: false, binary: false };
    throw e;
  }
}
async function getConflictFile(repoPath, path2) {
  const status = await getStatus(repoPath);
  const file2 = status.files.find((f) => f.path === path2);
  if (!file2 || file2.unmerged !== true) {
    throw new Error(`not a conflicted file: ${path2}`);
  }
  const [b, o, t] = await Promise.all([
    readStage(repoPath, 1, path2),
    readStage(repoPath, 2, path2),
    readStage(repoPath, 3, path2)
  ]);
  let binary = b.binary || o.binary || t.binary;
  let worktree;
  try {
    const abs = node_path.isAbsolute(path2) ? path2 : node_path.join(repoPath, path2);
    const raw = await promises.readFile(abs);
    if (raw.includes(0)) {
      binary = true;
      worktree = "";
    } else {
      worktree = raw.toString("utf8");
    }
  } catch {
    worktree = "";
  }
  return {
    path: path2,
    base: b.exists ? b.text : null,
    ours: o.exists ? o.text : null,
    theirs: t.exists ? t.text : null,
    worktree,
    binary
  };
}
async function resolveConflict(repoPath, path2, content) {
  await repoQueue.run(repoPath, async () => {
    const abs = node_path.isAbsolute(path2) ? path2 : node_path.join(repoPath, path2);
    await promises.writeFile(abs, content, "utf8");
    await execGitOrThrow({ cwd: repoPath, args: ["add", "--", path2] });
  });
}
async function acceptConflictSide(repoPath, path2, side) {
  await repoQueue.run(repoPath, async () => {
    await execGitOrThrow({ cwd: repoPath, args: ["checkout", `--${side}`, "--", path2] });
    await execGitOrThrow({ cwd: repoPath, args: ["add", "--", path2] });
  });
}
async function applyPatchToIndex(repoPath, patch, reverse = false) {
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({
      cwd: repoPath,
      args: ["apply", "--cached", "--whitespace=nowarn", ...reverse ? ["--reverse"] : [], "-"],
      stdin: patch
    })
  );
}
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i;
async function getFileBlob(repoPath, spec) {
  const { stdoutBuf } = await execGitOrThrow({
    cwd: repoPath,
    args: ["cat-file", "blob", spec],
    binary: true
  });
  const buf = stdoutBuf ?? Buffer.alloc(0);
  const path2 = spec.includes(":") ? spec.slice(spec.indexOf(":") + 1) : spec;
  return {
    base64: buf.toString("base64"),
    isImage: IMAGE_EXT.test(path2),
    size: buf.length
  };
}
function isImagePath(path2) {
  return IMAGE_EXT.test(path2);
}
async function addToGitignore(repoPath, path2) {
  const file2 = node_path.join(repoPath, ".gitignore");
  let content = "";
  try {
    content = await promises.readFile(file2, "utf8");
  } catch {
  }
  const lines = content.split("\n");
  if (lines.some((l) => l.trim() === path2 || l.trim() === `${path2}/`)) return;
  let next = content;
  if (next.length > 0 && !next.endsWith("\n")) next += "\n";
  next += `${path2}
`;
  await promises.writeFile(file2, next, "utf8");
}
const DEFAULT_LIMITS = { commits: 100, files: 200, content: 100 };
async function searchCommits(repoPath, query, limit = DEFAULT_LIMITS.commits) {
  const commits = await getLog(repoPath, {
    grep: query,
    ignoreCase: true,
    limit
  });
  return commits.map((c) => ({
    oid: c.oid,
    shortOid: c.shortOid,
    subject: c.subject,
    authorName: c.authorName,
    authorTime: c.authorTime
  }));
}
async function searchFiles(repoPath, query, limit = DEFAULT_LIMITS.files) {
  const { stdout } = await execGitOrThrow({
    cwd: repoPath,
    args: ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]
  });
  const needle = query.toLowerCase();
  const hits = [];
  for (const raw of stdout.split("\0")) {
    if (!raw) continue;
    if (raw.toLowerCase().includes(needle)) {
      hits.push(raw);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
async function searchContent(repoPath, query, limit = DEFAULT_LIMITS.content) {
  const { code, stdout, stderr } = await execGit({
    cwd: repoPath,
    args: ["grep", "-z", "-n", "-I", "-F", "-e", query, "--untracked"],
    timeoutMs: 15e3
  });
  if (code === 1) return [];
  if (code !== 0) {
    throw new GitExecError({ code, stdout, stderr }, ["grep"]);
  }
  const hits = [];
  for (const record of stdout.split("\n")) {
    if (!record) continue;
    const sep = record.indexOf("\0");
    if (sep < 0) continue;
    const path2 = record.slice(0, sep);
    const rest = record.slice(sep + 1);
    const sep2 = rest.indexOf("\0");
    if (sep2 < 0) continue;
    const line = Number(rest.slice(0, sep2));
    const text = rest.slice(sep2 + 1);
    if (!Number.isFinite(line)) continue;
    hits.push({ path: path2, line, text });
    if (hits.length >= limit) break;
  }
  return hits;
}
const UNDO_LIMIT = 50;
const TMP_BRANCH = "refs/heads/__gitgui_undo_tmp";
const stacks = /* @__PURE__ */ new Map();
function stacksFor(repoPath) {
  let s = stacks.get(repoPath);
  if (!s) {
    s = { undo: [], redo: [] };
    stacks.set(repoPath, s);
  }
  return s;
}
function undoList(repoPath) {
  const s = stacksFor(repoPath);
  const top = s.undo[s.undo.length - 1];
  const topRedo = s.redo[s.redo.length - 1];
  return {
    canUndo: s.undo.length > 0,
    canRedo: s.redo.length > 0,
    undoLabel: top?.description,
    redoLabel: topRedo?.description
  };
}
async function captureUndoSnapshot(repoPath, opts = {}) {
  const captureWorktree = opts.worktree ?? true;
  const headRes = await execGit({ cwd: repoPath, args: ["rev-parse", "--verify", "HEAD"] });
  const head = headRes.code === 0 ? headRes.stdout.trim() : null;
  const headRefRes = await execGit({ cwd: repoPath, args: ["symbolic-ref", "-q", "HEAD"] });
  const headRef = headRefRes.code === 0 ? headRefRes.stdout.trim() : null;
  let headTree = null;
  if (head) {
    const treeRes = await execGit({ cwd: repoPath, args: ["rev-parse", `${head}^{tree}`] });
    headTree = treeRes.code === 0 ? treeRes.stdout.trim() : null;
  }
  const refsRes = await execGitOrThrow({
    cwd: repoPath,
    // Literal tab separator — git's for-each-ref --format does not expand
    // %x09 (unlike pretty-format), so a raw tab is used instead.
    args: ["for-each-ref", "--format=%(refname)	%(objectname)", "refs/heads", "refs/tags", "refs/stash"]
  });
  const refs = {};
  for (const line of refsRes.stdout.split("\n")) {
    if (!line) continue;
    const i = line.indexOf("	");
    if (i > 0) refs[line.slice(0, i)] = line.slice(i + 1);
  }
  const indexRes = await execGit({ cwd: repoPath, args: ["write-tree"] });
  const indexTree = indexRes.code === 0 ? indexRes.stdout.trim() : null;
  let worktreeTree = null;
  if (captureWorktree) {
    const statusRes = await execGit({ cwd: repoPath, args: ["status", "--porcelain"] });
    const dirty = statusRes.code === 0 && statusRes.stdout.trim().length > 0;
    if (!dirty) {
      worktreeTree = indexTree ?? headTree;
    } else {
      const tmpIndex = node_path.join(node_os.tmpdir(), `gitgui-undo-${process.pid}-${node_crypto.randomUUID()}`);
      try {
        await execGitOrThrow({ cwd: repoPath, args: ["add", "-A"], env: { GIT_INDEX_FILE: tmpIndex } });
        const wt = await execGitOrThrow({ cwd: repoPath, args: ["write-tree"], env: { GIT_INDEX_FILE: tmpIndex } });
        worktreeTree = wt.stdout.trim();
      } catch {
        worktreeTree = null;
      } finally {
        await promises.rm(tmpIndex, { force: true }).catch(() => void 0);
      }
    }
  }
  const fingerprint = node_crypto.createHash("sha256").update(JSON.stringify([head, headRef, Object.entries(refs).sort(), indexTree, worktreeTree])).digest("hex");
  return { head, headRef, headTree, refs, indexTree, worktreeTree, fingerprint };
}
async function restoreUndoSnapshot(repoPath, snap) {
  return repoQueue.run(repoPath, async () => {
    const curRes = await execGitOrThrow({
      cwd: repoPath,
      args: ["for-each-ref", "--format=%(refname)", "refs/heads", "refs/tags", "refs/stash"]
    });
    const currentRefs = curRes.stdout.split("\n").filter(Boolean);
    if (snap.head === null) {
      await execGitOrThrow({ cwd: repoPath, args: ["symbolic-ref", "HEAD", TMP_BRANCH] });
    } else {
      await execGitOrThrow({ cwd: repoPath, args: ["update-ref", "--no-deref", "HEAD", snap.head] });
    }
    for (const ref of currentRefs) {
      if (!(ref in snap.refs)) await execGitOrThrow({ cwd: repoPath, args: ["update-ref", "-d", ref] });
    }
    for (const [ref, oid] of Object.entries(snap.refs)) {
      await execGitOrThrow({ cwd: repoPath, args: ["update-ref", ref, oid] });
    }
    if (snap.headRef) {
      await execGitOrThrow({ cwd: repoPath, args: ["symbolic-ref", "HEAD", snap.headRef] });
    }
    if (snap.worktreeTree) {
      await execGitOrThrow({ cwd: repoPath, args: ["read-tree", "--reset", "-u", snap.worktreeTree] });
    }
    if (snap.indexTree) {
      await execGitOrThrow({ cwd: repoPath, args: ["read-tree", snap.indexTree] });
    }
  });
}
async function detectForcePushRisk(repoPath, target) {
  const risks = [];
  for (const [ref, oid] of Object.entries(target.refs)) {
    if (!ref.startsWith("refs/heads/")) continue;
    const branch = ref.slice("refs/heads/".length);
    const up = await execGit({ cwd: repoPath, args: ["rev-parse", "--verify", "--quiet", `${branch}@{upstream}`] });
    if (up.code !== 0) continue;
    const upOid = up.stdout.trim();
    if (!upOid || upOid === oid) continue;
    const anc = await execGit({ cwd: repoPath, args: ["merge-base", "--is-ancestor", upOid, oid] });
    if (anc.code !== 0) risks.push(branch);
  }
  return risks;
}
function recordUndoEntry(repoPath, description, before, after) {
  const s = stacksFor(repoPath);
  if (before.fingerprint !== after.fingerprint) {
    s.undo.push({ id: node_crypto.randomUUID(), description, before, after });
    if (s.undo.length > UNDO_LIMIT) s.undo.splice(0, s.undo.length - UNDO_LIMIT);
    s.redo.length = 0;
  }
  return undoList(repoPath);
}
async function applyUndo(repoPath, direction, force = false) {
  const s = stacksFor(repoPath);
  const from = direction === "undo" ? s.undo : s.redo;
  const to = direction === "undo" ? s.redo : s.undo;
  const entry = from[from.length - 1];
  if (!entry) return { applied: false, empty: true };
  const target = direction === "undo" ? entry.before : entry.after;
  const expected = direction === "undo" ? entry.after : entry.before;
  const current = await captureUndoSnapshot(repoPath, { worktree: expected.worktreeTree !== null });
  const currentChanged = current.fingerprint !== expected.fingerprint;
  const forcePushRisk = await detectForcePushRisk(repoPath, target);
  if ((currentChanged || forcePushRisk.length > 0) && !force) {
    return { applied: false, currentChanged, forcePushRisk, description: entry.description };
  }
  await restoreUndoSnapshot(repoPath, target);
  from.pop();
  to.push(entry);
  return { applied: true, forcePushRisk, description: entry.description };
}
const DEFAULT_SETTINGS = {
  favorites: [],
  recent: [],
  graphInitialLimit: 500,
  defaultBranch: "main",
  language: "system",
  theme: "system",
  leftPanelWidth: 224,
  rightPanelWidth: 320,
  graphSplitPct: 55,
  graphAuthorWidth: 112,
  graphDateWidth: 96,
  graphOidWidth: 64,
  autoFetchInterval: 0,
  autoPrune: true,
  notifications: true,
  externalTools: { editor: "", diffTool: "", mergeTool: "", terminal: "" },
  terminalFontFamily: "",
  terminalFontSize: 13,
  terminalHeight: 240,
  commitBoxHeight: 208,
  providerAccounts: [],
  workspaces: [],
  activeWorkspaceId: null,
  profiles: [],
  activeProfileId: null,
  aiApiUrl: "",
  aiApiKey: "",
  aiModel: "gpt-4o-mini",
  aiPrompt: ""
};
const DEFAULT_SESSION = {
  openRepos: [],
  activeRepo: null
};
function settingsDir() {
  return electron.app.getPath("userData");
}
function settingsFile() {
  return node_path.join(settingsDir(), "settings.json");
}
function sessionFile() {
  return node_path.join(settingsDir(), "session.json");
}
async function readJson(file2, fallback) {
  try {
    const raw = await promises.readFile(file2, "utf8");
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
async function writeJson(file2, value) {
  await promises.mkdir(settingsDir(), { recursive: true });
  await promises.writeFile(file2, JSON.stringify(value, null, 2), "utf8");
}
function syncProfileConfig(settings) {
  const active = (settings.profiles ?? []).find((p) => p.id === settings.activeProfileId);
  if (active) {
    setActiveProfileConfig({
      name: active.authorName,
      email: active.authorEmail,
      signingKey: active.signingKey
    });
  } else {
    setActiveProfileConfig(null);
  }
}
async function loadSettings() {
  const s = await readJson(settingsFile(), DEFAULT_SETTINGS);
  syncProfileConfig(s);
  return s;
}
function saveSettings(settings) {
  syncProfileConfig(settings);
  return writeJson(settingsFile(), settings);
}
function loadSession() {
  return readJson(sessionFile(), DEFAULT_SESSION);
}
function saveSession(session) {
  return writeJson(sessionFile(), session);
}
async function updateSettings(patch) {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}
async function updateSession(patch) {
  const current = await loadSession();
  const next = { ...current, ...patch };
  await saveSession(next);
  return next;
}
const DEBOUNCE_MS = 300;
function isRelevantGitFile(rest) {
  if (rest === "HEAD" || rest === "index" || rest === "MERGE_HEAD" || rest === "ORIG_HEAD") return true;
  if (rest === "packed-refs") return true;
  if (rest.startsWith("refs/")) return true;
  if (rest.startsWith("worktrees/")) return true;
  if (rest.startsWith("rebase-merge/") || rest.startsWith("rebase-apply/")) return true;
  return false;
}
function isRelevant(filename) {
  if (!filename) return true;
  const norm = filename.replace(/\\/g, "/");
  if (norm === ".git" || norm.startsWith(".git/")) {
    return isRelevantGitFile(norm.slice(".git/".length));
  }
  return true;
}
class RepoWatcher {
  watchers = /* @__PURE__ */ new Map();
  timers = /* @__PURE__ */ new Map();
  start(repoPath, onChange) {
    this.stop(repoPath);
    try {
      const watcher2 = node_fs.watch(
        repoPath,
        { recursive: true },
        (_event, filename) => {
          if (!isRelevant(filename)) return;
          const existing = this.timers.get(repoPath);
          if (existing) clearTimeout(existing);
          this.timers.set(
            repoPath,
            setTimeout(() => {
              this.timers.delete(repoPath);
              onChange(repoPath);
            }, DEBOUNCE_MS)
          );
        }
      );
      watcher2.on("error", () => {
        this.stop(repoPath);
      });
      this.watchers.set(repoPath, watcher2);
    } catch {
    }
  }
  stop(repoPath) {
    const watcher2 = this.watchers.get(repoPath);
    if (watcher2) {
      watcher2.close();
      this.watchers.delete(repoPath);
    }
    const timer = this.timers.get(repoPath);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(repoPath);
    }
  }
  stopAll() {
    for (const path2 of [...this.watchers.keys()]) this.stop(path2);
  }
  watched() {
    return [...this.watchers.keys()];
  }
}
const MAX_ENTRIES = 500;
let entries = [];
let file = null;
let loaded = false;
let listener = null;
function logFile(logsDir) {
  return node_path.join(logsDir, "activity.log");
}
async function initActivityLog(logsDir) {
  file = logFile(logsDir);
  try {
    await promises.mkdir(logsDir, { recursive: true });
    const raw = await promises.readFile(file, "utf8");
    const parsed = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        parsed.push(JSON.parse(line));
      } catch {
      }
    }
    entries = parsed.slice(-MAX_ENTRIES);
  } catch {
    entries = [];
  }
  loaded = true;
}
async function logActivity(input) {
  const entry = { id: node_crypto.randomUUID(), ts: Date.now(), ...input };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  if (file) {
    try {
      await promises.appendFile(file, JSON.stringify(entry) + "\n", "utf8");
    } catch {
    }
  }
  listener?.(entry);
  return entry;
}
function listActivity(limit = 100) {
  if (!loaded) return [];
  return entries.slice(-limit).reverse();
}
function setActivityListener(cb) {
  listener = cb;
}
const TICK_MS = 5e3;
const MINUTE_MS = 6e4;
class AutoFetchScheduler {
  constructor(deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
  }
  deps;
  timer = null;
  lastRun = /* @__PURE__ */ new Map();
  ticking = false;
  now;
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  /** One scheduler pass; exposed so tests can drive it without timers. */
  async tick() {
    if (this.ticking) return;
    if (this.deps.shouldSkip?.()) return;
    this.ticking = true;
    try {
      const settings = await this.deps.loadSettings();
      const interval = settings.autoFetchInterval;
      if (interval <= 0) return;
      const session = await this.deps.loadSession();
      const now = this.now();
      for (const repoPath of session.openRepos) {
        const last = this.lastRun.get(repoPath) ?? 0;
        if (now - last < interval * MINUTE_MS) continue;
        this.lastRun.set(repoPath, now);
        try {
          await this.deps.fetch(repoPath, { prune: settings.autoPrune });
          await logActivity({ kind: "auto-fetch", repoPath, ok: true });
          this.deps.onChanged(repoPath);
          this.deps.onOutcome?.(repoPath, true);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          await logActivity({
            kind: "auto-fetch",
            repoPath,
            ok: false,
            message
          });
          this.deps.onOutcome?.(repoPath, false, message);
        }
      }
    } finally {
      this.ticking = false;
    }
  }
  /** Test helper: forget per-repo fetch times. */
  resetForTests() {
    this.lastRun.clear();
  }
}
const CONFLICT_MARKERS = ["CONFLICT", "Automatic merge failed", "could not be applied", "Merge conflict"];
function looksLikeConflict(message) {
  if (!message) return false;
  return CONFLICT_MARKERS.some((m) => message.includes(m));
}
function notifyForSync(lang, kind, ok, message) {
  if (ok) {
    if (kind === "push") {
      return lang === "zh" ? { title: "推送完成", body: "分支已成功推送到远程。" } : { title: "Push complete", body: "Branch pushed to the remote successfully." };
    }
    return null;
  }
  if (looksLikeConflict(message)) {
    return lang === "zh" ? { title: "合并冲突", body: "操作因冲突中止，请在应用内解决冲突。" } : { title: "Merge conflict", body: "The operation stopped on conflicts. Resolve them in the app." };
  }
  if (kind === "fetch" || kind === "auto-fetch") {
    return lang === "zh" ? { title: "获取远端失败", body: message ?? "git fetch 失败。" } : { title: "Fetch failed", body: message ?? "git fetch failed." };
  }
  return null;
}
function showDesktopNotification(n) {
  try {
    if (!electron.Notification.isSupported()) return;
    new electron.Notification(n).show();
  } catch {
  }
}
const KNOWN_HOOKS = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
  "reference-transaction",
  "push-to-checkout",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update"
];
const HOOK_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
function hooksDirPath(repoPath) {
  return node_path.join(repoPath, ".git", "hooks");
}
async function isExecutable(path2) {
  try {
    const s = await promises.stat(path2);
    return (s.mode & 73) !== 0;
  } catch {
    return false;
  }
}
async function exists(path2) {
  try {
    await promises.stat(path2);
    return true;
  } catch {
    return false;
  }
}
async function listHooks(repoPath) {
  const dir = hooksDirPath(repoPath);
  const known = new Set(KNOWN_HOOKS);
  let files;
  try {
    files = await promises.readdir(dir);
  } catch {
    files = [];
  }
  const custom = files.filter((f) => !known.has(f) && !f.endsWith(".sample"));
  const names = [...KNOWN_HOOKS, ...custom.sort()];
  const out = [];
  for (const name of names) {
    const path2 = node_path.join(dir, name);
    const fileExists = await exists(path2);
    out.push({
      name,
      exists: fileExists,
      enabled: fileExists && await isExecutable(path2),
      sampleExists: await exists(path2 + ".sample"),
      custom: !known.has(name)
    });
  }
  return out;
}
async function readHook(repoPath, name) {
  if (!HOOK_NAME_RE.test(name)) throw new Error(`invalid hook name: ${name}`);
  const dir = hooksDirPath(repoPath);
  try {
    return await promises.readFile(node_path.join(dir, name), "utf8");
  } catch {
    return "";
  }
}
async function setHookEnabled(repoPath, name, enabled) {
  if (!HOOK_NAME_RE.test(name)) throw new Error(`invalid hook name: ${name}`);
  const dir = hooksDirPath(repoPath);
  const path2 = node_path.join(dir, name);
  if (!await exists(path2)) throw new Error(`hook not found: ${name}`);
  await promises.chmod(path2, enabled ? 493 : 420);
}
async function isLfsInstalled() {
  const result = await execGit({ cwd: process.cwd(), args: ["lfs", "version"] });
  return result.code === 0;
}
async function gitConfig$1(repoPath, key) {
  const result = await execGit({ cwd: repoPath, args: ["config", "--get", key] });
  return result.code === 0 ? result.stdout.trim() : "";
}
async function countLfsTracked(repoPath) {
  const result = await execGit({ cwd: repoPath, args: ["lfs", "ls-files", "-n"] });
  if (result.code !== 0) return 0;
  return result.stdout.split("\n").filter((l) => l.trim()).length;
}
async function hasLfsAttributes(repoPath) {
  const result = await execGit({
    cwd: repoPath,
    args: ["grep", "--cached", "-l", "-e", "filter=lfs", "--", ":(glob)**/.gitattributes", ".gitattributes"]
  });
  return result.code === 0 && result.stdout.trim().length > 0;
}
async function lfsStatus(repoPath) {
  const installed = await isLfsInstalled();
  const [isLfsRepo, trackedFiles, fetchInclude, fetchExclude] = await Promise.all([
    hasLfsAttributes(repoPath),
    installed ? countLfsTracked(repoPath) : Promise.resolve(0),
    gitConfig$1(repoPath, "lfs.fetchinclude"),
    gitConfig$1(repoPath, "lfs.fetchexclude")
  ]);
  return { installed, isLfsRepo, trackedFiles, fetchInclude, fetchExclude };
}
async function setLfsFetchPolicy(repoPath, opts) {
  for (const [key, value] of [
    ["lfs.fetchinclude", opts.fetchInclude],
    ["lfs.fetchexclude", opts.fetchExclude]
  ]) {
    if (value === void 0) continue;
    if (value.trim() === "") {
      await execGit({ cwd: repoPath, args: ["config", "--unset", key] });
    } else {
      await execGit({ cwd: repoPath, args: ["config", key, value] });
    }
  }
}
const KINDS = ["feature", "release", "hotfix"];
function parseKind(branch) {
  if (!branch) return void 0;
  const prefix = branch.split("/")[0];
  return KINDS.find((k) => k === prefix);
}
async function branchExists(repoPath, name) {
  const result = await execGit({
    cwd: repoPath,
    args: ["show-ref", "--verify", "--quiet", `refs/heads/${name}`]
  });
  return result.code === 0;
}
async function currentBranchName(repoPath) {
  const result = await execGit({
    cwd: repoPath,
    args: ["symbolic-ref", "--quiet", "--short", "HEAD"]
  });
  return result.code === 0 ? result.stdout.trim() || void 0 : void 0;
}
async function gitflowStatus(repoPath) {
  const mainBranch = await branchExists(repoPath, "main") ? "main" : "master";
  const developExists = await branchExists(repoPath, "develop");
  const currentBranch = await currentBranchName(repoPath);
  return {
    mainBranch,
    developBranch: "develop",
    developExists,
    currentBranch,
    currentKind: parseKind(currentBranch)
  };
}
async function gitflowInit(repoPath) {
  const status = await gitflowStatus(repoPath);
  if (status.developExists) return;
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({
      cwd: repoPath,
      args: ["checkout", "-b", "develop", status.mainBranch]
    })
  );
}
async function gitflowStart(repoPath, kind, name) {
  const status = await gitflowStatus(repoPath);
  const base = kind === "hotfix" ? status.mainBranch : status.developBranch;
  if (!await branchExists(repoPath, base)) {
    throw new Error(`gitflow base branch missing: ${base} (run gitflow init first)`);
  }
  const full = `${kind}/${name}`;
  if (await branchExists(repoPath, full)) throw new Error(`branch already exists: ${full}`);
  await repoQueue.run(
    repoPath,
    () => execGitOrThrow({ cwd: repoPath, args: ["checkout", "-b", full, base] })
  );
}
async function gitflowFinish(repoPath, kind) {
  const status = await gitflowStatus(repoPath);
  const branch = await currentBranchName(repoPath);
  if (!branch) throw new Error("not on a branch");
  if (parseKind(branch) !== kind) {
    throw new Error(`current branch ${branch} is not a ${kind}/* branch`);
  }
  const targets = kind === "feature" ? [status.developBranch] : [status.developBranch, status.mainBranch];
  for (const target of targets) {
    if (!await branchExists(repoPath, target)) {
      throw new Error(`target branch missing: ${target}`);
    }
  }
  await repoQueue.run(repoPath, async () => {
    for (const target of targets) {
      await execGitOrThrow({ cwd: repoPath, args: ["checkout", target] });
      await execGitOrThrow({ cwd: repoPath, args: ["merge", "--no-ff", branch] });
    }
    await execGitOrThrow({ cwd: repoPath, args: ["branch", "-d", branch] });
    await execGitOrThrow({ cwd: repoPath, args: ["checkout", targets[0]] });
  });
}
async function gitConfig(repoPath, key) {
  const result = await execGit({ cwd: repoPath, args: ["config", "--get", key] });
  return result.code === 0 ? result.stdout.trim() : "";
}
function probeBinary(bin, versionArgs) {
  return new Promise((resolve) => {
    const child = node_child_process.spawn(bin, versionArgs, { stdio: "ignore", windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}
async function listSshPublicKeys() {
  const dir = process.env.GIT_GUI_SSH_DIR || node_path.join(node_os.homedir(), ".ssh");
  try {
    const files = await promises.readdir(dir);
    const keys = [];
    for (const f of files.filter((x) => x.endsWith(".pub")).sort()) {
      const raw = await promises.readFile(node_path.join(dir, f), "utf8").catch(() => "");
      const fields = raw.trim().split(/\s+/);
      const comment = fields.length >= 3 ? fields.slice(2).join(" ") : "";
      keys.push({ path: node_path.join(dir, f), comment });
    }
    return keys;
  } catch {
    return [];
  }
}
async function signingStatus(repoPath) {
  const [signCommits, format, signingKey, gpgInstalled, sshAvailable, sshPublicKeys] = await Promise.all([
    gitConfig(repoPath, "commit.gpgsign").then((v) => v === "true"),
    gitConfig(repoPath, "gpg.format"),
    gitConfig(repoPath, "user.signingkey"),
    probeBinary("gpg", ["--version"]),
    probeBinary("ssh", ["-V"]),
    listSshPublicKeys()
  ]);
  return {
    signCommits,
    format,
    signingKey,
    gpgInstalled,
    sshAvailable,
    sshPublicKeys
  };
}
async function setSigning(repoPath, patch) {
  if (patch.signCommits !== void 0) {
    await execGit({
      cwd: repoPath,
      args: ["config", "commit.gpgsign", patch.signCommits ? "true" : "false"]
    });
  }
  if (patch.format !== void 0) {
    await execGit({ cwd: repoPath, args: ["config", "gpg.format", patch.format] });
  }
  if (patch.signingKey !== void 0) {
    const key = patch.signingKey.trim();
    if (key === "") {
      await execGit({ cwd: repoPath, args: ["config", "--unset", "user.signingkey"] });
    } else {
      await execGit({ cwd: repoPath, args: ["config", "user.signingkey", key] });
    }
  }
}
function toolForKind(tools, kind) {
  return tools[kind] ?? "";
}
function parseToolCommand(command, vars) {
  const replaced = command.replaceAll("{repo}", vars.repo).replaceAll("{path}", vars.path ?? "").trim();
  if (replaced === "") return [];
  const parts = [];
  let current = "";
  let quote = null;
  for (const ch of replaced) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " ") {
      if (current !== "") {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current !== "") parts.push(current);
  return parts;
}
function openExternalTool(command, vars) {
  const args = parseToolCommand(command, vars);
  const [bin, ...rest] = args;
  if (!bin) return Promise.reject(new Error("empty command"));
  return new Promise((resolve, reject) => {
    const child = node_child_process.spawn(bin, rest, {
      cwd: vars.path ? void 0 : vars.repo,
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.on("error", (err) => reject(err));
    child.unref();
    resolve();
  });
}
const SUPPORTED_ENCODINGS = ["utf-8", "gbk", "gb18030", "big5", "shift_jis", "euc-kr"];
async function config(repoPath, key) {
  const result = await execGit({ cwd: repoPath, args: ["config", "--get", key] });
  return result.code === 0 ? result.stdout.trim() : "";
}
async function repoEncoding(repoPath) {
  const value = await config(repoPath, "git-gui.encoding");
  return value && SUPPORTED_ENCODINGS.includes(value) ? value : "utf-8";
}
async function detectDefaultBranch(repoPath) {
  for (const key of ["git-gui.defaultBranch", "init.defaultBranch"]) {
    const value = await config(repoPath, key);
    if (value) return value;
  }
  for (const name of ["main", "master"]) {
    const r = await execGit({ cwd: repoPath, args: ["rev-parse", "--verify", "--quiet", name] });
    if (r.code === 0) return name;
  }
  const head = await execGit({
    cwd: repoPath,
    args: ["symbolic-ref", "--quiet", "--short", "HEAD"]
  });
  return head.code === 0 ? head.stdout.trim() : "main";
}
async function listOrigFiles(repoPath) {
  const [tracked, untracked] = await Promise.all([
    execGit({ cwd: repoPath, args: ["ls-files", "-z"] }),
    execGit({ cwd: repoPath, args: ["ls-files", "-o", "--exclude-standard", "-z"] })
  ]);
  const names = `${tracked.stdout}${untracked.stdout}`.split("\0").filter(Boolean);
  return [...new Set(names.filter((n) => n.endsWith(".orig")))].sort();
}
async function getRepoSettings(repoPath) {
  const [encoding, defaultBranch, origFiles] = await Promise.all([
    config(repoPath, "git-gui.encoding"),
    detectDefaultBranch(repoPath),
    listOrigFiles(repoPath)
  ]);
  return {
    encoding: encoding && SUPPORTED_ENCODINGS.includes(encoding) ? encoding : "utf-8",
    defaultBranch,
    origFiles
  };
}
async function setRepoSettings(repoPath, patch) {
  if (patch.encoding != null) {
    const enc = patch.encoding.trim().toLowerCase();
    if (!SUPPORTED_ENCODINGS.includes(enc)) {
      throw new Error(`unsupported encoding: ${patch.encoding}`);
    }
    await execGitOrThrow({ cwd: repoPath, args: ["config", "git-gui.encoding", enc] });
  }
  if (patch.defaultBranch != null) {
    const branch = patch.defaultBranch.trim();
    if (branch === "") throw new Error("default branch must not be empty");
    if (branch.includes("..") || /[\s~^:?*[\\]/.test(branch) || branch.startsWith("-")) {
      throw new Error(`invalid branch name: ${branch}`);
    }
    await execGitOrThrow({ cwd: repoPath, args: ["config", "init.defaultBranch", branch] });
    await execGitOrThrow({ cwd: repoPath, args: ["config", "git-gui.defaultBranch", branch] });
  }
  return getRepoSettings(repoPath);
}
async function cleanOrigFiles(repoPath) {
  const files = await listOrigFiles(repoPath);
  const removed = [];
  for (const rel of files) {
    const abs = node_path.join(repoPath, rel);
    if (!abs.startsWith(repoPath + node_path.sep)) continue;
    try {
      await promises.stat(abs);
    } catch {
      continue;
    }
    await promises.rm(abs, { force: true });
    removed.push(rel);
  }
  return removed;
}
async function exportPatch(repoPath, opts) {
  return repoQueue.run(repoPath, async () => {
    const args = opts.oid ? ["format-patch", "-1", opts.oid, "--stdout"] : ["diff", "HEAD"];
    const res = await execGit({ cwd: repoPath, args });
    if (res.code !== 0) {
      throw new Error(`导出补丁失败: ${res.stderr.trim() || "git command failed"}`);
    }
    const patch = res.stdout;
    if (opts.targetPath) {
      await promises.writeFile(opts.targetPath, patch, "utf8");
    }
    return { patch, targetPath: opts.targetPath };
  });
}
async function applyPatch(repoPath, opts) {
  return repoQueue.run(repoPath, async () => {
    let filePath = opts.patchPath;
    let isTemp = false;
    if (!filePath) {
      if (typeof opts.patchContent !== "string") {
        throw new Error("未指定补丁文件或补丁内容");
      }
      filePath = node_path.join(node_os.tmpdir(), `gitgui-patch-${node_crypto.randomUUID().slice(0, 8)}.patch`);
      await promises.writeFile(filePath, opts.patchContent, "utf8");
      isTemp = true;
    }
    const cleanup = async () => {
      if (isTemp && filePath) {
        await promises.unlink(filePath).catch(() => {
        });
      }
    };
    try {
      const amRes = await execGit({ cwd: repoPath, args: ["am", "--3way", filePath] });
      if (amRes.code === 0) {
        await cleanup();
        return {
          mode: "am",
          message: "补丁已成功应用并创建提交 (Applied via git am)"
        };
      }
      await execGit({ cwd: repoPath, args: ["am", "--abort"] }).catch(() => {
      });
      const applyRes = await execGit({ cwd: repoPath, args: ["apply", "--3way", filePath] });
      if (applyRes.code === 0) {
        await cleanup();
        return {
          mode: "apply",
          message: "补丁已应用到工作区文件 (Applied via git apply)"
        };
      }
      await cleanup();
      throw new Error(
        `应用补丁失败: ${applyRes.stderr.trim() || amRes.stderr.trim() || "git am & git apply failed"}`
      );
    } catch (e) {
      await cleanup();
      throw e;
    }
  });
}
const thinklessUnsupported = /* @__PURE__ */ new Set();
function resolveAiBaseUrl(raw, fallback) {
  const url = (raw?.trim() || fallback).replace(/^(POST|GET|PUT|PATCH|DELETE)\s+/i, "").trim().replace(/\/+$/, "").replace(/\/chat\/completions\/?$/i, "");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`AI 接口地址无效：「${raw?.trim() || url}」，请填写形如 https://api.openai.com/v1 的地址`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`AI 接口地址必须是 http(s) 地址：「${url}」`);
  }
  return url;
}
async function generateAiCommitMessage(input) {
  const settings = await loadSettings();
  const apiUrl = resolveAiBaseUrl(settings.aiApiUrl, "https://api.openai.com/v1");
  const apiKey = settings.aiApiKey?.trim() || "";
  const model = settings.aiModel?.trim() || "gpt-4o-mini";
  const isLocal = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
  if (!apiKey && !isLocal) {
    throw new Error("未配置 AI API Key，请在「设置 -> AI 助手」中配置 API 密钥或本地大模型服务");
  }
  let diffRes = await execGit({ cwd: input.repoPath, args: ["diff", "--cached"] });
  let diff = diffRes.stdout.trim();
  let isStaged = true;
  if (!diff) {
    diffRes = await execGit({ cwd: input.repoPath, args: ["diff"] });
    diff = diffRes.stdout.trim();
    isStaged = false;
  }
  if (!diff && !input.draft?.trim()) {
    throw new Error("没有检测到暂存区或工作区的代码变更，无法生成 commit 消息");
  }
  const maxChars = 12e3;
  let truncatedDiff = diff;
  if (diff.length > maxChars) {
    truncatedDiff = diff.slice(0, maxChars) + "\n\n... (diff truncated for length)";
  }
  const defaultSystemPrompt = `You are an expert Git commit assistant.
Your task is to generate a concise, meaningful, and professional Git commit message based on the provided diff.
Follow the Conventional Commits specification:
- Format: <type>(<optional scope>): <subject>
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- The summary line should be under 72 characters, lowercase imperative mood without trailing period.
- If there are multiple noteworthy changes, provide a concise bulleted description in the message body.
- If the user provides draft notes, incorporate and polish them.
- Output ONLY the plain text commit message with NO markdown code blocks (do NOT use \`\`\` or quotes).`;
  const systemPrompt = settings.aiPrompt?.trim() || defaultSystemPrompt;
  const userContent = [
    input.draft?.trim() ? `User draft notes:
${input.draft.trim()}
` : "",
    diff ? `Git diff (${isStaged ? "staged changes" : "unstaged working tree"}):
${truncatedDiff}` : "No diff available, please format and refine the user draft notes."
  ].filter(Boolean).join("\n\n");
  const endpoint = `${apiUrl}/chat/completions`;
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const modelKey = `${endpoint}|${model}`;
  const wantThinkless = !thinklessUnsupported.has(modelKey);
  const requestOnce = async (maxTokens, thinkless) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45e3);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
          ...thinkless ? { thinking: { type: "disabled" } } : {}
        })
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        if (thinkless && (res.status === 400 || res.status === 422)) {
          thinklessUnsupported.add(modelKey);
          return null;
        }
        throw new Error(`AI 服务请求失败 (${res.status}): ${errBody || res.statusText}`);
      }
      const json = await res.json();
      const choice = json.choices?.[0];
      const rawContent = choice?.message?.content ?? choice?.text;
      const text = Array.isArray(rawContent) ? rawContent.map((part) => part?.text ?? "").join("") : rawContent ?? "";
      return {
        text: text.trim(),
        finishReason: choice?.finish_reason,
        apiError: json.error?.message
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };
  try {
    let result = await requestOnce(2e3, wantThinkless);
    if (!result) result = await requestOnce(2e3, false);
    if (result && !result.text && result.finishReason === "length") {
      result = await requestOnce(4e3, false);
    }
    if (!result?.text) {
      const reason = result?.finishReason ?? result?.apiError ?? "empty response";
      throw new Error(`AI 服务未返回有效的 commit 消息内容（finish_reason: ${reason}）`);
    }
    return result.text.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI 服务请求超时 (45s)", { cause: err });
    }
    throw err;
  }
}
async function testAiConnection(input) {
  const apiUrl = resolveAiBaseUrl(input.apiUrl, "https://api.openai.com/v1");
  const apiKey = input.apiKey?.trim() || "";
  const model = input.model?.trim() || "gpt-4o-mini";
  const endpoint = `${apiUrl}/chat/completions`;
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15e3);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: 'Ping. Reply with "pong".' }],
        max_tokens: 10
      })
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`);
    }
    return { success: true, message: "连接成功，服务正常响应！" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("请求超时 (15s)", { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
const SUBMODULE_UPDATE_STRATEGIES = ["checkout", "merge", "rebase", "none"];
async function submoduleUpdate(repoPath, path2, recursive = false) {
  const args = ["submodule", "update", "--init"];
  if (recursive) args.push("--recursive");
  if (path2) args.push("--", path2);
  await execGitOrThrow({ cwd: repoPath, args });
}
async function submoduleInit(repoPath, path2) {
  const args = ["submodule", "init"];
  if (path2) args.push("--", path2);
  await execGitOrThrow({ cwd: repoPath, args });
}
async function getSubmoduleUpdate(repoPath, path2) {
  const result = await execGit({
    cwd: repoPath,
    args: ["config", "--get", `submodule.${path2}.update`]
  });
  if (result.code !== 0) return null;
  const value = result.stdout.trim();
  return SUBMODULE_UPDATE_STRATEGIES.includes(value) ? value : null;
}
async function setSubmoduleUpdate(repoPath, path2, strategy) {
  if (path2 === "" || path2.includes("\0")) throw new Error("invalid submodule path");
  const key = `submodule.${path2}.update`;
  if (strategy == null) {
    const result = await execGit({ cwd: repoPath, args: ["config", "--unset", key] });
    if (result.code !== 0 && result.code !== 5) {
      throw new Error(result.stderr.trim() || `git config --unset ${key} failed`);
    }
  } else {
    await execGitOrThrow({ cwd: repoPath, args: ["config", key, strategy] });
  }
}
async function getSubmoduleRecurse(repoPath) {
  const result = await execGit({ cwd: repoPath, args: ["config", "--get", "submodule.recurse"] });
  return result.code === 0 && result.stdout.trim() === "true";
}
async function setSubmoduleRecurse(repoPath, value) {
  await execGitOrThrow({
    cwd: repoPath,
    args: ["config", "submodule.recurse", value ? "true" : "false"]
  });
}
async function submoduleDetails(repoPath) {
  const subs = await listSubmodules(repoPath);
  return Promise.all(
    subs.map(async (s) => ({ ...s, update: await getSubmoduleUpdate(repoPath, s.path) }))
  );
}
function defaultShell() {
  if (process.platform === "win32") {
    return process.env["COMSPEC"] ?? "powershell.exe";
  }
  return process.env["SHELL"] ?? "/bin/zsh";
}
function resolveCwd(cwd) {
  if (cwd && node_fs.existsSync(cwd)) return cwd;
  return node_os.homedir();
}
const sessions = /* @__PURE__ */ new Map();
let listeners = null;
function setTerminalListeners(l) {
  listeners = l;
}
function createTerminal(opts) {
  const id = node_crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const pty = nodePty.spawn(defaultShell(), [], {
    name: "xterm-256color",
    cols: opts.cols,
    rows: opts.rows,
    cwd: resolveCwd(opts.cwd),
    env: { ...process.env, TERM: "xterm-256color" }
  });
  pty.onData((data) => listeners?.onData(id, data));
  pty.onExit(({ exitCode }) => {
    sessions.delete(id);
    listeners?.onExit(id, exitCode);
  });
  sessions.set(id, pty);
  return id;
}
function writeTerminal(id, data) {
  sessions.get(id)?.write(data);
}
function resizeTerminal(id, cols, rows) {
  const pty = sessions.get(id);
  if (!pty) return;
  try {
    pty.resize(cols, rows);
  } catch {
  }
}
function killTerminal(id) {
  const pty = sessions.get(id);
  if (!pty) return;
  sessions.delete(id);
  try {
    pty.kill();
  } catch {
  }
}
function killAllTerminals() {
  for (const id of [...sessions.keys()]) killTerminal(id);
  listeners = null;
}
function secretsDir() {
  try {
    const electron2 = require("electron");
    if (electron2 && typeof electron2 === "object" && electron2.app && typeof electron2.app.getPath === "function") {
      return electron2.app.getPath("userData");
    }
  } catch {
  }
  return process.env["GIT_GUI_USER_DATA"] || node_path.join(node_os.tmpdir(), "git-gui-data");
}
function secretsFile() {
  return node_path.join(secretsDir(), "secrets.json");
}
function getSafeStorage() {
  try {
    const electron2 = require("electron");
    if (typeof electron2 === "object" && electron2 !== null && electron2.safeStorage) {
      if (typeof electron2.safeStorage.isEncryptionAvailable === "function" && electron2.safeStorage.isEncryptionAvailable()) {
        return electron2.safeStorage;
      }
    }
  } catch {
  }
  return null;
}
function fallbackKey() {
  const seed = process.env["GIT_GUI_SECRET_KEY"] || "git-gui-fallback-secret-seed-2026";
  return node_crypto.createHash("sha256").update(seed).digest();
}
function encryptSecret(plain) {
  const ss = getSafeStorage();
  if (ss) {
    return "ss:" + ss.encryptString(plain).toString("base64");
  }
  const iv = node_crypto.randomBytes(12);
  const cipher = node_crypto.createCipheriv("aes-256-gcm", fallbackKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "fb:" + Buffer.concat([iv, tag, enc]).toString("base64");
}
function decryptSecret(cipherText) {
  if (cipherText.startsWith("ss:")) {
    const ss = getSafeStorage();
    if (ss) {
      const buf = Buffer.from(cipherText.slice(3), "base64");
      return ss.decryptString(buf);
    }
    throw new Error("OS keychain unavailable to decrypt secret");
  }
  if (cipherText.startsWith("fb:")) {
    const raw = Buffer.from(cipherText.slice(3), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = node_crypto.createDecipheriv("aes-256-gcm", fallbackKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  }
  return cipherText;
}
async function loadSecretsMap() {
  try {
    const raw = await promises.readFile(secretsFile(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function saveSecretsMap(map) {
  await promises.mkdir(secretsDir(), { recursive: true });
  await promises.writeFile(secretsFile(), JSON.stringify(map, null, 2), "utf8");
}
async function setSecret(key, secret) {
  const map = await loadSecretsMap();
  map[key] = encryptSecret(secret);
  await saveSecretsMap(map);
}
async function getSecret(key) {
  const map = await loadSecretsMap();
  const cipher = map[key];
  if (!cipher) return null;
  try {
    return decryptSecret(cipher);
  } catch {
    return null;
  }
}
async function deleteSecret(key) {
  const map = await loadSecretsMap();
  if (key in map) {
    delete map[key];
    await saveSecretsMap(map);
  }
}
const ADO_API_VERSION = "7.1-preview";
async function adoFetch(url, token, init) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Basic ${Buffer.from(":" + token).toString("base64")}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    let msg = `Azure DevOps API error: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody.message) msg = errBody.message;
    } catch {
    }
    if (res.status === 401) {
      throw new Error(`Azure DevOps 认证失败（PAT 无效或已过期）：${msg}`);
    }
    if (res.status === 404) {
      throw new Error(`Azure DevOps 资源不存在或无访问权限（404）：${msg}`);
    }
    throw new Error(msg);
  }
  return res;
}
function mapPr$1(p, ref) {
  const state = p.status === "completed" ? "merged" : p.status === "abandoned" ? "closed" : "open";
  return {
    id: p.pullRequestId,
    number: p.pullRequestId,
    title: p.title,
    state,
    author: {
      name: p.createdBy?.displayName ?? p.createdBy?.uniqueName ?? "Azure User",
      avatarUrl: p.createdBy?._links?.avatar?.href
    },
    sourceBranch: (p.sourceRefName ?? "").replace(/^refs\/heads\//, ""),
    targetBranch: (p.targetRefName ?? "").replace(/^refs\/heads\//, ""),
    createdAt: p.creationDate,
    updatedAt: p.creationDate,
    url: `https://dev.azure.com/${ref.org}/${ref.project}/_git/${ref.repo}/pullrequest/${p.pullRequestId}`,
    draft: Boolean(p.isDraft)
  };
}
class AzureDevOpsProvider {
  id = "azuredevops";
  async authenticatePat(token, options) {
    const org = options?.org;
    if (org) {
      const res = await adoFetch(
        `https://dev.azure.com/${org}/_apis/connectionData?api-version=${ADO_API_VERSION}`,
        token
      );
      const data = await res.json();
      const u = data.authenticatedUser;
      const name = u?.displayName ?? u?.providerDisplayName ?? "Azure DevOps User";
      return {
        provider: "azuredevops",
        username: name,
        displayName: name,
        authType: "pat",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        org
      };
    }
    try {
      const res = await adoFetch(
        `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=${ADO_API_VERSION}`,
        token
      );
      const data = await res.json();
      const name = data.displayName ?? data.emailAddress ?? "Azure DevOps User";
      return {
        provider: "azuredevops",
        username: name,
        displayName: name,
        authType: "pat",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch {
      return {
        provider: "azuredevops",
        username: "Azure DevOps User",
        displayName: "Azure DevOps User",
        authType: "pat",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  async listRepositories(token, options) {
    const org = options?.org;
    if (!org) return [];
    const url = `https://dev.azure.com/${org}/_apis/git/repositories?api-version=${ADO_API_VERSION}`;
    const res = await adoFetch(url, token);
    const data = await res.json();
    const list = data.value ?? [];
    return list.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.project?.name ? `${r.project.name} / ${r.name}` : r.name,
      cloneUrl: r.remoteUrl ?? `https://dev.azure.com/${org}/${r.project?.name ?? ""}/_git/${r.name}`,
      sshUrl: r.sshUrl,
      defaultBranch: (r.defaultBranch ?? "").replace(/^refs\/heads\//, ""),
      project: r.project?.name
    }));
  }
  async listPullRequests(ref, token, state = "open") {
    const { org, project, repo } = ref;
    if (!org || !project) throw new Error("Azure DevOps 仓库缺少 org 或 project");
    const adoStatus = state === "open" ? "active" : state === "merged" ? "completed" : state === "closed" ? "abandoned" : "all";
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests?searchCriteria.status=${adoStatus}&api-version=${ADO_API_VERSION}`;
    const res = await adoFetch(url, token);
    const json = await res.json();
    const list = json.value ?? [];
    return list.map((p) => mapPr$1(p, ref));
  }
  async getPullRequest(ref, token, id) {
    const { org, project, repo } = ref;
    if (!org || !project) throw new Error("Azure DevOps 仓库缺少 org 或 project");
    const prId = Number(id);
    const base = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}`;
    const [prRes, threadsRes, iterationsRes] = await Promise.all([
      adoFetch(`${base}?api-version=${ADO_API_VERSION}`, token),
      adoFetch(`${base}/threads?api-version=${ADO_API_VERSION}`, token).catch(() => null),
      adoFetch(`${base}/iterations?api-version=${ADO_API_VERSION}`, token).catch(() => null)
    ]);
    const pr = await prRes.json();
    const threadsJson = threadsRes ? await threadsRes.json() : null;
    const threads = threadsJson?.value ?? [];
    const comments = [];
    for (const t of threads) {
      for (const c of t.comments ?? []) {
        if (c.isDeleted || !c.content?.trim()) continue;
        if (c.commentType && c.commentType > 1) continue;
        comments.push({
          id: c.id,
          author: {
            name: c.author?.displayName ?? c.author?.uniqueName ?? "User",
            avatarUrl: c.author?._links?.avatar?.href
          },
          body: c.content,
          createdAt: c.publishedDate
        });
      }
    }
    let diff = "";
    try {
      const iterJson = iterationsRes ? await iterationsRes.json() : null;
      const iters = iterJson?.value ?? [];
      if (iters.length > 0) {
        const lastId = iters[iters.length - 1].id;
        const changesRes = await adoFetch(`${base}/iterations/${lastId}/changes?api-version=${ADO_API_VERSION}`, token);
        const changesJson = await changesRes.json();
        const changes = changesJson.changeEntries ?? [];
        diff = changes.map((ch) => `--- a${ch.item?.path ?? ""}
+++ b${ch.item?.path ?? ""}
[${ch.changeType}]`).join("\n\n");
      }
    } catch {
    }
    return {
      ...mapPr$1(pr, ref),
      description: pr.description ?? "",
      diff,
      comments,
      mergeable: pr.mergeStatus === "succeeded"
    };
  }
  async createPullRequest(ref, token, input) {
    const { org, project, repo } = ref;
    if (!org || !project) throw new Error("Azure DevOps 仓库缺少 org 或 project");
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests?api-version=${ADO_API_VERSION}`;
    const res = await adoFetch(url, token, {
      method: "POST",
      body: JSON.stringify({
        sourceRefName: `refs/heads/${input.sourceBranch}`,
        targetRefName: `refs/heads/${input.targetBranch}`,
        title: input.title,
        description: input.description,
        isDraft: input.draft ?? false
      })
    });
    const pr = await res.json();
    return mapPr$1(pr, ref);
  }
  async commentOnPullRequest(ref, token, id, body) {
    const { org, project, repo } = ref;
    if (!org || !project) throw new Error("Azure DevOps 仓库缺少 org 或 project");
    const prId = Number(id);
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}/threads?api-version=${ADO_API_VERSION}`;
    await adoFetch(url, token, {
      method: "POST",
      body: JSON.stringify({
        comments: [
          {
            parentCommentId: 0,
            content: body,
            commentType: 1
          }
        ],
        status: 1
      })
    });
  }
  async mergePullRequest(ref, token, id, method) {
    const { org, project, repo } = ref;
    if (!org || !project) throw new Error("Azure DevOps 仓库缺少 org 或 project");
    const prId = Number(id);
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests/${prId}?api-version=${ADO_API_VERSION}`;
    const mergeStrategy = method === "squash" ? "squash" : method === "rebase" ? "rebase" : "noFastForward";
    await adoFetch(url, token, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        completionOptions: {
          mergeStrategy,
          deleteSourceBranch: false
        }
      })
    });
  }
}
async function ghFetch(endpoint, token, init) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "GitGUI-Client");
  const res = await fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    let msg = `GitHub API error: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody.message) msg = errBody.message;
    } catch {
    }
    if (res.status === 401) {
      throw new Error(`GitHub 认证失败（Token 无效或已过期）：${msg}`);
    }
    if (res.status === 404) {
      throw new Error(`GitHub 资源不存在或无访问权限（404）：${msg}`);
    }
    throw new Error(msg);
  }
  return res;
}
function mapPr(p) {
  return {
    id: p.id,
    number: p.number,
    title: p.title,
    state: p.merged_at ? "merged" : p.state === "closed" ? "closed" : "open",
    author: { name: p.user?.login ?? "", avatarUrl: p.user?.avatar_url },
    sourceBranch: p.head?.ref ?? "",
    targetBranch: p.base?.ref ?? "",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    url: p.html_url,
    draft: Boolean(p.draft)
  };
}
class GitHubProvider {
  id = "github";
  async authenticatePat(token) {
    const res = await ghFetch("/user", token);
    const user = await res.json();
    return {
      provider: "github",
      username: user.login,
      displayName: user.name ?? user.login,
      avatarUrl: user.avatar_url,
      authType: "pat",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async listRepositories(token) {
    const res = await ghFetch(
      "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      token
    );
    const list = await res.json();
    return (list ?? []).map((r) => ({
      id: String(r.id),
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      defaultBranch: r.default_branch,
      isPrivate: Boolean(r.private),
      description: r.description ?? void 0
    }));
  }
  async listPullRequests(ref, token, state = "open") {
    const owner = ref.owner;
    const repo = ref.repo;
    if (!owner) throw new Error("GitHub 仓库缺少 owner");
    const ghState = state === "merged" ? "closed" : state === "all" ? "all" : state;
    const res = await ghFetch(`/repos/${owner}/${repo}/pulls?state=${ghState}&per_page=50`, token);
    const list = await res.json();
    const mapped = list.map(mapPr);
    if (state === "merged") {
      return mapped.filter((p) => p.state === "merged");
    }
    if (state === "closed") {
      return mapped.filter((p) => p.state === "closed");
    }
    return mapped;
  }
  async getPullRequest(ref, token, id) {
    const owner = ref.owner;
    const repo = ref.repo;
    if (!owner) throw new Error("GitHub 仓库缺少 owner");
    const num = Number(id);
    const [prRes, diffRes, commentsRes] = await Promise.all([
      ghFetch(`/repos/${owner}/${repo}/pulls/${num}`, token),
      ghFetch(`/repos/${owner}/${repo}/pulls/${num}`, token, {
        headers: { Accept: "application/vnd.github.v3.diff" }
      }).catch(() => null),
      ghFetch(`/repos/${owner}/${repo}/issues/${num}/comments`, token).catch(() => null)
    ]);
    const pr = await prRes.json();
    const diff = diffRes ? await diffRes.text() : "";
    const rawComments = commentsRes ? await commentsRes.json() : [];
    const comments = rawComments.map((c) => ({
      id: c.id,
      author: { name: c.user?.login ?? "", avatarUrl: c.user?.avatar_url },
      body: c.body ?? "",
      createdAt: c.created_at
    }));
    return {
      ...mapPr(pr),
      description: pr.body ?? "",
      diff,
      comments,
      mergeable: pr.mergeable ?? void 0
    };
  }
  async createPullRequest(ref, token, input) {
    const owner = ref.owner;
    const repo = ref.repo;
    if (!owner) throw new Error("GitHub 仓库缺少 owner");
    const res = await ghFetch(`/repos/${owner}/${repo}/pulls`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        body: input.description,
        head: input.sourceBranch,
        base: input.targetBranch,
        draft: input.draft ?? false
      })
    });
    const pr = await res.json();
    return mapPr(pr);
  }
  async commentOnPullRequest(ref, token, id, body) {
    const owner = ref.owner;
    const repo = ref.repo;
    if (!owner) throw new Error("GitHub 仓库缺少 owner");
    const num = Number(id);
    await ghFetch(`/repos/${owner}/${repo}/issues/${num}/comments`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
  }
  async mergePullRequest(ref, token, id, method) {
    const owner = ref.owner;
    const repo = ref.repo;
    if (!owner) throw new Error("GitHub 仓库缺少 owner");
    const num = Number(id);
    const ghMethod = method === "squash" ? "squash" : method === "rebase" ? "rebase" : "merge";
    await ghFetch(`/repos/${owner}/${repo}/pulls/${num}/merge`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merge_method: ghMethod })
    });
  }
}
const providers = {
  github: new GitHubProvider(),
  azuredevops: new AzureDevOpsProvider()
};
async function detectRepoRef(repoPath) {
  try {
    const res = await execGit({ cwd: repoPath, args: ["remote", "-v"] });
    const lines = res.stdout.split("\n");
    let originUrl = "";
    let anyUrl = "";
    for (const line of lines) {
      const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim());
      if (match) {
        const [, remoteName, url, direction] = match;
        if (remoteName === "origin" && direction === "fetch") {
          originUrl = url;
          break;
        }
        if (!anyUrl && direction === "fetch") {
          anyUrl = url;
        }
      }
    }
    const targetUrl = originUrl || anyUrl;
    if (!targetUrl) return null;
    return parseRepoRef(targetUrl);
  } catch {
    return null;
  }
}
async function listProviderAccounts() {
  const settings = await loadSettings();
  return settings.providerAccounts ?? [];
}
async function connectPat(args) {
  const p = providers[args.provider];
  if (!p) throw new Error(`未知的 Provider: ${args.provider}`);
  const account = await p.authenticatePat(args.token, { org: args.org });
  await setSecret(`provider:${args.provider}`, args.token);
  const settings = await loadSettings();
  const existing = (settings.providerAccounts ?? []).filter((a) => a.provider !== args.provider);
  await updateSettings({ providerAccounts: [...existing, account] });
  return account;
}
async function disconnectProvider(provider) {
  await deleteSecret(`provider:${provider}`);
  const settings = await loadSettings();
  const filtered = (settings.providerAccounts ?? []).filter((a) => a.provider !== provider);
  await updateSettings({ providerAccounts: filtered });
}
async function listRemoteRepositories(provider, org) {
  const p = providers[provider];
  if (!p) throw new Error(`未知的 Provider: ${provider}`);
  const token = await getSecret(`provider:${provider}`);
  if (!token) {
    const label = provider === "github" ? "GitHub" : "Azure DevOps";
    throw new Error(`未连接 ${label} 账号，请在设置中配置个人访问令牌（PAT）`);
  }
  const settings = await loadSettings();
  const account = (settings.providerAccounts ?? []).find((a) => a.provider === provider);
  const resolvedOrg = org || account?.org;
  return p.listRepositories(token, { org: resolvedOrg });
}
async function getProviderForRepo(repoPathOrRef) {
  let ref;
  if (typeof repoPathOrRef === "string") {
    ref = await detectRepoRef(repoPathOrRef);
  } else {
    ref = repoPathOrRef;
  }
  if (!ref) {
    throw new Error("当前仓库未检测到支持的远程提供商（GitHub 或 Azure DevOps）");
  }
  const token = await getSecret(`provider:${ref.provider}`);
  if (!token) {
    const label = ref.provider === "github" ? "GitHub" : "Azure DevOps";
    throw new Error(`未连接 ${label} 账号，请在设置中配置个人访问令牌（PAT）`);
  }
  const p = providers[ref.provider];
  return { provider: p, ref, token };
}
async function listPullRequests(repoPathOrRef, state = "open") {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef);
  return provider.listPullRequests(ref, token, state);
}
async function getPullRequest(repoPathOrRef, id) {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef);
  return provider.getPullRequest(ref, token, id);
}
async function createPullRequest(repoPathOrRef, input) {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef);
  return provider.createPullRequest(ref, token, input);
}
async function commentOnPullRequest(repoPathOrRef, id, body) {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef);
  return provider.commentOnPullRequest(ref, token, id, body);
}
async function mergePullRequest(repoPathOrRef, id, method) {
  const { provider, ref, token } = await getProviderForRepo(repoPathOrRef);
  return provider.mergePullRequest(ref, token, id, method);
}
async function checkoutPrBranch(repoPath, branch) {
  try {
    await execGit({ cwd: repoPath, args: ["checkout", branch] });
    return;
  } catch {
  }
  try {
    await execGit({ cwd: repoPath, args: ["fetch", "origin", branch] });
    await execGit({ cwd: repoPath, args: ["checkout", "-b", branch, `origin/${branch}`] });
  } catch {
    await execGit({ cwd: repoPath, args: ["checkout", branch] });
  }
}
const abortControllers = /* @__PURE__ */ new Map();
const watcher = new RepoWatcher();
async function notifyForOutcome(kind, ok, message) {
  const settings = await loadSettings();
  if (!settings.notifications) return;
  const lang = settings.language === "system" ? electron.app.getLocale().startsWith("zh") ? "zh" : "en" : settings.language;
  const n = notifyForSync(lang, kind, ok, message);
  if (n) showDesktopNotification(n);
}
const autoFetch = new AutoFetchScheduler({
  loadSettings,
  loadSession,
  fetch: (repoPath, opts) => fetch$1(repoPath, { prune: opts.prune }),
  onChanged: broadcastRepoChanged,
  // Don't compete with a manual sync op (fetch/pull/push/clone in flight).
  shouldSkip: () => abortControllers.size > 0,
  onOutcome: (_repoPath, ok, message) => {
    void notifyForOutcome("auto-fetch", ok, message);
  }
});
function handle(channel, schema, fn) {
  electron.ipcMain.handle(channel, async (_event, raw) => {
    return fn(schema.parse(raw));
  });
}
function progressSender(opId, contents) {
  return (e) => {
    if (!contents.isDestroyed()) contents.send(IPC_EVENTS.gitProgress, { opId, event: e });
  };
}
function broadcastRepoChanged(repoPath) {
  for (const win of electron.BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.repoChanged, { repoPath });
  }
}
function registerAbort(opId) {
  const existing = abortControllers.get(opId);
  if (existing) existing.abort();
  const controller = new AbortController();
  abortControllers.set(opId, controller);
  return controller;
}
function finishAbort(opId) {
  abortControllers.delete(opId);
}
async function withAbort(opId, fn) {
  const controller = registerAbort(opId);
  const contents = electron.BrowserWindow.getAllWindows()[0]?.webContents;
  try {
    await fn(
      controller.signal,
      contents ? progressSender(opId, contents) : () => {
      },
      contents
    );
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("operation cancelled", { cause: err });
    }
    throw err;
  } finally {
    finishAbort(opId);
  }
}
function registerIpcHandlers() {
  void initActivityLog(node_path.join(electron.app.getPath("userData"), "logs")).then(() => {
    setActivityListener((entry) => {
      for (const win of electron.BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.activityNew, entry);
      }
    });
    autoFetch.start();
  });
  handle(
    IPC.activityList,
    activityListRequestSchema,
    (arg) => listActivity(arg.limit)
  );
  electron.ipcMain.handle(IPC.appInfo, () => {
    return {
      name: electron.app.getName(),
      version: electron.app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform
    };
  });
  handle(IPC.pickDirectory, pickDirectorySchema, async (arg) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    const result = await electron.dialog.showOpenDialog(win ?? void 0, {
      title: arg.title,
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  handle(IPC.pickFile, pickFileSchema, async (arg) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    const result = await electron.dialog.showOpenDialog(win ?? void 0, {
      title: arg.title,
      properties: ["openFile"],
      filters: arg.filters
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  handle(IPC.pickSavePath, pickSavePathSchema, async (arg) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    const result = await electron.dialog.showSaveDialog(win ?? void 0, {
      title: arg.title,
      defaultPath: arg.defaultPath,
      filters: arg.filters
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
  handle(IPC.settingsGet, zod.z.void(), () => loadSettings());
  handle(IPC.settingsSet, settingsPatchSchema, (patch) => updateSettings(patch));
  handle(IPC.sessionGet, zod.z.void(), () => loadSession());
  handle(IPC.sessionSet, sessionPatchSchema, (patch) => updateSession(patch));
  handle(IPC.repoValidate, openRepoRequestSchema, async (arg) => {
    try {
      const info = await promises.stat(arg.path);
      if (!info.isDirectory()) return { path: arg.path, isRepo: false };
    } catch {
      return { path: arg.path, isRepo: false, missing: true };
    }
    return { path: arg.path, isRepo: await isRepo(arg.path) };
  });
  handle(IPC.gitStatus, gitStatusRequestSchema, (arg) => getStatus(arg.repoPath));
  handle(IPC.gitGraph, graphRequestSchema, async (arg) => {
    const commits = await getLog(arg.repoPath, {
      limit: arg.limit + 1,
      skip: arg.skip,
      all: true,
      topo: true
    });
    const hasMore = commits.length > arg.limit;
    return { commits: hasMore ? commits.slice(0, arg.limit) : commits, hasMore };
  });
  handle(IPC.gitCommitRange, commitRangeRequestSchema, async (arg) => {
    return await getCommitsBetween(arg.repoPath, arg.base, arg.head);
  });
  handle(IPC.gitRefs, refsRequestSchema, async (arg) => {
    const [branches, tags, stashes, submodules, head] = await Promise.all([
      listBranches(arg.repoPath),
      listTags(arg.repoPath),
      listStashes(arg.repoPath),
      listSubmodules(arg.repoPath),
      execGit({ cwd: arg.repoPath, args: ["branch", "--show-current"] })
    ]);
    return { branches, tags, stashes, submodules, current: head.stdout.trim() || void 0 };
  });
  handle(IPC.gitCheckout, checkoutRequestSchema, async (arg) => {
    await checkout(arg.repoPath, arg.target);
  });
  handle(IPC.gitStage, pathsRequestSchema, async (arg) => {
    await addPaths(arg.repoPath, arg.paths);
  });
  handle(IPC.gitUnstage, pathsRequestSchema, async (arg) => {
    await unstagePaths(arg.repoPath, arg.paths);
  });
  handle(IPC.gitDiscard, pathsRequestSchema, async (arg) => {
    await discardPaths(arg.repoPath, arg.paths);
  });
  handle(IPC.gitClean, pathsRequestSchema, async (arg) => {
    await cleanPaths(arg.repoPath, arg.paths);
  });
  handle(IPC.gitIgnore, ignoreRequestSchema, async (arg) => {
    await addToGitignore(arg.repoPath, arg.path);
  });
  handle(IPC.gitCommit, commitRequestSchema, async (arg) => {
    const oid = await commit(arg.repoPath, {
      message: arg.message,
      amend: arg.amend,
      signoff: arg.signoff
    });
    return { oid };
  });
  handle(IPC.gitApplyHunk, applyHunkRequestSchema, async (arg) => {
    await applyPatchToIndex(arg.repoPath, arg.patch, arg.reverse);
  });
  handle(IPC.gitDiffText, diffRequestSchema, async (arg) => {
    const encoding = await repoEncoding(arg.repoPath);
    if (arg.untracked) {
      const path2 = arg.paths?.[0];
      if (!path2) throw new Error("untracked diff requires a path");
      return getUntrackedDiff(arg.repoPath, path2, void 0, encoding);
    }
    return getDiffText(arg.repoPath, {
      cached: arg.cached,
      paths: arg.paths,
      contextLines: arg.context,
      encoding
    });
  });
  handle(IPC.gitCommitDiff, commitDiffRequestSchema, async (arg) => {
    const encoding = await repoEncoding(arg.repoPath);
    return getCommitDiffText(arg.repoPath, arg.oid, { encoding });
  });
  handle(IPC.gitBlob, blobRequestSchema, async (arg) => getFileBlob(arg.repoPath, arg.spec));
  handle(IPC.fileWorktree, worktreeFileSchema, async (arg) => {
    const { resolve, sep } = await import("node:path");
    const { readFile } = await import("node:fs/promises");
    const root = resolve(arg.repoPath);
    const abs = resolve(root, arg.path);
    if (abs !== root && !abs.startsWith(root + sep)) {
      throw new Error("path escapes repository");
    }
    const buf = await readFile(abs);
    return {
      base64: buf.toString("base64"),
      isImage: isImagePath(arg.path),
      size: buf.length
    };
  });
  async function withActivity(kind, repoPath, fn) {
    try {
      await fn();
      await logActivity({ kind, repoPath, ok: true });
      await notifyForOutcome(kind, true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await logActivity({ kind, repoPath, ok: false, message });
      await notifyForOutcome(kind, false, message);
      throw e;
    }
  }
  handle(
    IPC.gitFetch,
    syncRequestSchema,
    (arg) => withActivity(
      "fetch",
      arg.repoPath,
      () => withAbort(arg.opId, (signal, onProgress) => fetch$1(arg.repoPath, { signal, onProgress }))
    )
  );
  handle(
    IPC.gitPull,
    syncRequestSchema,
    (arg) => withActivity(
      "pull",
      arg.repoPath,
      () => withAbort(
        arg.opId,
        (signal, onProgress) => pull(arg.repoPath, { signal, onProgress, rebase: arg.rebase })
      )
    )
  );
  handle(
    IPC.gitPush,
    syncRequestSchema,
    (arg) => withActivity(
      "push",
      arg.repoPath,
      () => withAbort(
        arg.opId,
        (signal, onProgress) => push(arg.repoPath, {
          signal,
          onProgress,
          forceWithLease: arg.forceWithLease,
          setUpstream: arg.setUpstream
        })
      )
    )
  );
  handle(IPC.gitCancel, cancelRequestSchema, (arg) => {
    abortControllers.get(arg.opId)?.abort();
  });
  handle(
    IPC.gitClone,
    cloneRequestSchema,
    (arg) => withAbort(arg.opId, async (signal, onProgress) => {
      const parentDir = node_path.join(arg.targetDir, "..");
      await cloneRepo(
        arg.url,
        arg.targetDir,
        { depth: arg.depth, signal, onProgress },
        parentDir
      );
    })
  );
  handle(IPC.gitInit, initRequestSchema, async (arg) => {
    const repoPath = node_path.join(arg.dir, arg.name);
    await promises.mkdir(repoPath, { recursive: true });
    await initRepo(repoPath, arg.defaultBranch);
    return { repoPath };
  });
  handle(
    IPC.gitOpState,
    opRepoSchema,
    async (arg) => getOpState(arg.repoPath)
  );
  handle(
    IPC.gitMerge,
    mergeRequestSchema,
    async (arg) => merge(arg.repoPath, arg.branch, {
      noFF: arg.noFF,
      ffOnly: arg.ffOnly,
      message: arg.message
    })
  );
  handle(
    IPC.gitOpContinue,
    opRepoSchema,
    async (arg) => continueOp(arg.repoPath)
  );
  handle(IPC.gitOpAbort, opRepoSchema, async (arg) => {
    await abortOp(arg.repoPath);
  });
  handle(IPC.gitOpSkip, opRepoSchema, async (arg) => skipOp(arg.repoPath));
  handle(
    IPC.gitRebase,
    rebaseRequestSchema,
    async (arg) => rebase(arg.repoPath, arg.upstream, { autostash: arg.autostash })
  );
  handle(
    IPC.gitRebaseInteractive,
    rebaseInteractiveRequestSchema,
    async (arg) => rebaseInteractive(arg.repoPath, arg.upstream, arg.ops, { autostash: arg.autostash })
  );
  handle(
    IPC.gitRebaseRange,
    rebaseRangeRequestSchema,
    async (arg) => rebaseRange(arg.repoPath, arg.base)
  );
  handle(
    IPC.gitConflictRead,
    conflictFileRequestSchema,
    async (arg) => getConflictFile(arg.repoPath, arg.path)
  );
  handle(IPC.gitConflictResolve, conflictResolveRequestSchema, async (arg) => {
    await resolveConflict(arg.repoPath, arg.path, arg.content);
  });
  handle(IPC.gitConflictAccept, conflictSideRequestSchema, async (arg) => {
    await acceptConflictSide(arg.repoPath, arg.path, arg.side);
  });
  handle(IPC.gitSearch, searchRequestSchema, async (arg) => {
    if (arg.scope === "commits") return searchCommits(arg.repoPath, arg.query, arg.limit);
    if (arg.scope === "files") return searchFiles(arg.repoPath, arg.query, arg.limit);
    return searchContent(arg.repoPath, arg.query, arg.limit);
  });
  handle(
    IPC.gitUndoSnapshot,
    undoSnapshotRequestSchema,
    async (arg) => captureUndoSnapshot(arg.repoPath, { worktree: arg.worktree })
  );
  handle(
    IPC.gitUndoRecord,
    undoRecordRequestSchema,
    async (arg) => recordUndoEntry(arg.repoPath, arg.description, arg.before, arg.after)
  );
  handle(IPC.gitUndoList, opRepoSchema, async (arg) => undoList(arg.repoPath));
  handle(
    IPC.gitUndoApply,
    undoApplyRequestSchema,
    async (arg) => applyUndo(arg.repoPath, arg.direction, arg.force)
  );
  handle(
    IPC.gitCherryPick,
    cherryPickRequestSchema,
    async (arg) => cherryPick(arg.repoPath, arg.oids, { mainline: arg.mainline })
  );
  handle(
    IPC.gitRevert,
    cherryPickRequestSchema,
    async (arg) => revertCommits(arg.repoPath, arg.oids, { mainline: arg.mainline })
  );
  handle(IPC.gitReset, resetRequestSchema, async (arg) => {
    await reset(arg.repoPath, arg.mode, arg.target);
  });
  handle(IPC.gitStashPush, stashPushRequestSchema, async (arg) => {
    await stashPush(arg.repoPath, {
      message: arg.message,
      untracked: arg.untracked,
      staged: arg.staged
    });
  });
  handle(
    IPC.gitStashApply,
    stashApplyRequestSchema,
    async (arg) => stashApply(arg.repoPath, arg.ref, { pop: arg.pop })
  );
  handle(IPC.gitStashDrop, stashDropRequestSchema, async (arg) => {
    await stashDrop(arg.repoPath, arg.ref);
  });
  handle(IPC.gitTagCreate, tagCreateRequestSchema, async (arg) => {
    await tagCreate(arg.repoPath, arg.name, { message: arg.message, oid: arg.oid });
  });
  handle(IPC.gitTagDelete, tagDeleteRequestSchema, async (arg) => {
    await tagDelete(arg.repoPath, arg.names);
  });
  handle(IPC.gitBranchDelete, branchDeleteRequestSchema, async (arg) => {
    await deleteBranch(arg.repoPath, arg.name, arg.force);
  });
  handle(IPC.gitBranchRename, branchRenameRequestSchema, async (arg) => {
    await renameBranch(arg.repoPath, arg.from, arg.to);
  });
  handle(
    IPC.worktreeList,
    opRepoSchema,
    async (arg) => listWorktrees(arg.repoPath)
  );
  handle(IPC.worktreeAdd, worktreeAddRequestSchema, async (arg) => {
    await addWorktree(arg.repoPath, arg.path, {
      branch: arg.branch,
      startPoint: arg.startPoint
    });
  });
  handle(IPC.worktreeRemove, worktreeRemoveRequestSchema, async (arg) => {
    await removeWorktree(arg.repoPath, arg.path, arg.force);
  });
  handle(
    IPC.hooksList,
    hooksListRequestSchema,
    async (arg) => listHooks(arg.repoPath)
  );
  handle(
    IPC.hookRead,
    hookReadRequestSchema,
    async (arg) => readHook(arg.repoPath, arg.name)
  );
  handle(IPC.hookSetEnabled, hookSetEnabledRequestSchema, async (arg) => {
    await setHookEnabled(arg.repoPath, arg.name, arg.enabled);
    return listHooks(arg.repoPath);
  });
  handle(
    IPC.lfsStatus,
    lfsStatusRequestSchema,
    async (arg) => lfsStatus(arg.repoPath)
  );
  handle(IPC.lfsSetPolicy, lfsSetPolicyRequestSchema, async (arg) => {
    await setLfsFetchPolicy(arg.repoPath, {
      fetchInclude: arg.fetchInclude,
      fetchExclude: arg.fetchExclude
    });
    return lfsStatus(arg.repoPath);
  });
  handle(
    IPC.gitflowStatus,
    opRepoSchema,
    async (arg) => gitflowStatus(arg.repoPath)
  );
  handle(IPC.gitflowInit, opRepoSchema, async (arg) => {
    await gitflowInit(arg.repoPath);
    return gitflowStatus(arg.repoPath);
  });
  handle(IPC.gitflowStart, gitflowStartRequestSchema, async (arg) => {
    await gitflowStart(arg.repoPath, arg.kind, arg.name);
    return gitflowStatus(arg.repoPath);
  });
  handle(IPC.gitflowFinish, gitflowFinishRequestSchema, async (arg) => {
    await gitflowFinish(arg.repoPath, arg.kind);
    return gitflowStatus(arg.repoPath);
  });
  handle(
    IPC.signingStatus,
    opRepoSchema,
    async (arg) => signingStatus(arg.repoPath)
  );
  handle(IPC.signingSet, signingSetRequestSchema, async (arg) => {
    await setSigning(arg.repoPath, {
      signCommits: arg.signCommits,
      format: arg.format,
      signingKey: arg.signingKey
    });
    return signingStatus(arg.repoPath);
  });
  handle(IPC.toolsOpen, toolsOpenRequestSchema, async (arg) => {
    const { externalTools } = await loadSettings();
    const command = toolForKind(externalTools, arg.kind);
    await openExternalTool(command, { repo: arg.repoPath, path: arg.path });
  });
  handle(
    IPC.repoSettingsGet,
    opRepoSchema,
    (arg) => getRepoSettings(arg.repoPath)
  );
  handle(
    IPC.repoSettingsSet,
    repoSettingsSetRequestSchema,
    (arg) => setRepoSettings(arg.repoPath, {
      encoding: arg.encoding,
      defaultBranch: arg.defaultBranch
    })
  );
  handle(IPC.repoCleanOrig, opRepoSchema, (arg) => cleanOrigFiles(arg.repoPath));
  handle(
    IPC.submoduleDetails,
    opRepoSchema,
    async (arg) => submoduleDetails(arg.repoPath)
  );
  handle(IPC.submoduleInit, submodulePathRequestSchema, async (arg) => {
    await submoduleInit(arg.repoPath, arg.path);
    return submoduleDetails(arg.repoPath);
  });
  handle(
    IPC.submoduleUpdate,
    submodulePathRequestSchema,
    async (arg) => {
      await submoduleUpdate(arg.repoPath, arg.path, arg.recursive);
      return submoduleDetails(arg.repoPath);
    }
  );
  handle(IPC.submoduleSetUpdate, submoduleSetUpdateRequestSchema, async (arg) => {
    await setSubmoduleUpdate(arg.repoPath, arg.path, arg.strategy);
    return submoduleDetails(arg.repoPath);
  });
  handle(IPC.submoduleGetRecurse, opRepoSchema, async (arg) => ({
    recurse: await getSubmoduleRecurse(arg.repoPath)
  }));
  handle(IPC.submoduleSetRecurse, submoduleSetRecurseRequestSchema, async (arg) => {
    await setSubmoduleRecurse(arg.repoPath, arg.value);
    return { recurse: await getSubmoduleRecurse(arg.repoPath) };
  });
  setTerminalListeners({
    onData: (id, data) => {
      for (const win of electron.BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.terminalData, { id, data });
      }
    },
    onExit: (id, exitCode) => {
      for (const win of electron.BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.terminalExit, { id, exitCode });
      }
    }
  });
  handle(IPC.terminalCreate, terminalCreateRequestSchema, (arg) => ({
    id: createTerminal(arg)
  }));
  handle(IPC.terminalWrite, terminalWriteRequestSchema, (arg) => {
    writeTerminal(arg.id, arg.data);
  });
  handle(IPC.terminalResize, terminalResizeRequestSchema, (arg) => {
    resizeTerminal(arg.id, arg.cols, arg.rows);
  });
  handle(IPC.terminalKill, terminalKillRequestSchema, (arg) => {
    killTerminal(arg.id);
  });
  handle(IPC.providerListAccounts, zod.z.void(), async () => {
    return listProviderAccounts();
  });
  handle(IPC.providerListRepos, providerListReposSchema, async (arg) => {
    return listRemoteRepositories(arg.provider, arg.org);
  });
  handle(IPC.providerConnectPat, providerConnectPatSchema, async (arg) => {
    return connectPat(arg);
  });
  handle(IPC.providerDisconnect, providerDisconnectSchema, async (arg) => {
    await disconnectProvider(arg.provider);
  });
  handle(IPC.providerDetectRepoRef, providerDetectRepoRefSchema, async (arg) => {
    return detectRepoRef(arg.repoPath);
  });
  handle(IPC.prList, prListSchema, async (arg) => {
    return listPullRequests(arg.repoPath, arg.state);
  });
  handle(IPC.prGet, prGetSchema, async (arg) => {
    return getPullRequest(arg.repoPath, arg.id);
  });
  handle(IPC.prCreate, prCreateSchema, async (arg) => {
    return createPullRequest(arg.repoPath, arg);
  });
  handle(IPC.prComment, prCommentSchema, async (arg) => {
    await commentOnPullRequest(arg.repoPath, arg.id, arg.body);
  });
  handle(IPC.prMerge, prMergeSchema, async (arg) => {
    await mergePullRequest(arg.repoPath, arg.id, arg.method);
  });
  handle(IPC.prCheckout, prCheckoutSchema, async (arg) => {
    await checkoutPrBranch(arg.repoPath, arg.branch);
  });
  handle(IPC.patchExport, patchExportRequestSchema, async (arg) => {
    return exportPatch(arg.repoPath, { oid: arg.oid, targetPath: arg.targetPath });
  });
  handle(IPC.patchApply, patchApplyRequestSchema, async (arg) => {
    return applyPatch(arg.repoPath, { patchPath: arg.patchPath, patchContent: arg.patchContent });
  });
  handle(IPC.aiGenerateCommitMsg, aiGenerateCommitMsgSchema, async (arg) => {
    return generateAiCommitMessage(arg);
  });
  handle(IPC.aiTestConnection, aiTestConnectionSchema, async (arg) => {
    return testAiConnection(arg);
  });
  handle(IPC.watchStart, watchRequestSchema, (arg) => {
    watcher.start(arg.repoPath, broadcastRepoChanged);
  });
  handle(IPC.watchStop, watchRequestSchema, (arg) => {
    watcher.stop(arg.repoPath);
  });
}
function disposeWatchers() {
  autoFetch.stop();
  setActivityListener(null);
  setTerminalListeners(null);
  killAllTerminals();
  watcher.stopAll();
  for (const controller of abortControllers.values()) controller.abort();
  abortControllers.clear();
}
const { app, BrowserWindow } = electron__namespace;
if (!app) {
  console.error(
    "[git-gui] Electron APIs are unavailable: this process was started with ELECTRON_RUN_AS_NODE set, so Electron is running as plain Node. Unset ELECTRON_RUN_AS_NODE and start again (pnpm dev already strips it)."
  );
  process.exit(1);
}
if (!app.isPackaged) {
  app.commandLine.appendSwitch("remote-debugging-port", "9222");
}
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let createWindow = function() {
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      show: false,
      title: "Git GUI",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    });
    win.on("ready-to-show", () => win.show());
    if (process.env["ELECTRON_RENDERER_URL"]) {
      win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
      win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  };
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", () => {
    disposeWatchers();
  });
}
