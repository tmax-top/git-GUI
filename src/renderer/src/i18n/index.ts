export const zh = {
  'app.title': 'Git GUI',
  'app.placeholder.repoPath': '输入仓库路径…',
  'app.action.checkStatus': '查看状态',
  'app.label.head': '当前分支',
  'app.label.aheadBehind': '领先/落后',
  'app.label.files': '变更文件',
  'app.label.untracked': '未跟踪',
  'app.empty.repo': '输入一个本地 git 仓库路径以查看状态',
  'app.error.load': '加载失败',

  'common.cancel': '取消',
  'common.close': '关闭',
  'common.confirm': '确认',
  'common.loading': '加载中…',
  'common.error': '错误',
  'common.remove': '移除',
  'common.retry': '重试',
  'common.search': '搜索',

  'start.open': '打开仓库',
  'start.clone': '克隆仓库',
  'start.init': '新建仓库',
  'start.favorites': '收藏的仓库',
  'start.recent': '最近打开',
  'start.empty': '还没有仓库 —— 打开、克隆或新建一个，或将仓库文件夹拖入窗口',
  'start.drop': '拖入文件夹以打开',
  'start.starAdd': '添加收藏',
  'start.starRemove': '取消收藏',
  'start.notRepo': '所选目录不是 git 仓库',
  'start.missing': '路径不存在',

  'clone.title': '克隆仓库',
  'clone.url': '仓库 URL',
  'clone.dir': '目标目录',
  'clone.depth': '浅克隆深度（可选）',
  'clone.submit': '克隆',
  'clone.cloning': '正在克隆…',
  'clone.pickDir': '选择目录',

  'init.title': '新建仓库',
  'init.dir': '父目录',
  'init.name': '仓库名称',
  'init.branch': '默认分支',
  'init.submit': '创建',

  'toolbar.fetch': '获取',
  'toolbar.pull': '拉取',
  'toolbar.push': '推送',
  'toolbar.refresh': '刷新',
  'toolbar.close': '关闭仓库',
  'toolbar.cancelOp': '取消操作',
  'toolbar.syncing': '同步中…',

  'left.branchesLocal': '本地分支',
  'left.branchesRemote': '远程分支',
  'left.tags': '标签',
  'left.stash': '暂存栈 (Stash)',
  'left.submodules': '子模块',
  'left.empty': '无',
  'left.current': '当前',

  'graph.wip': '未提交的更改',
  'graph.empty': '还没有提交记录',
  'graph.loading': '加载提交…',
  'graph.commits': '{n} 个提交',
  'graph.subject': '提交信息',
  'graph.author': '作者',
  'graph.date': '日期',
  'graph.oid': 'OID',

  'panel.staged': '已暂存',
  'panel.changes': '未暂存更改',
  'panel.newFiles': '未跟踪文件',
  'panel.stage': '暂存',
  'panel.unstage': '取消暂存',
  'panel.discard': '丢弃更改',
  'panel.clean': '删除文件',
  'panel.ignore': '加入 .gitignore',
  'panel.discardConfirm': '丢弃对 {path} 的更改？此操作不可恢复。',
  'panel.cleanConfirm': '删除未跟踪文件 {path}？此操作不可恢复。',
  'panel.amend': '修改上一次提交',
  'panel.coauthor': 'Co-author（可选）',
  'panel.coauthorName': '姓名',
  'panel.coauthorEmail': '邮箱',
  'panel.message': '提交消息',
  'panel.commit': '提交',
  'panel.committing': '提交中…',
  'panel.nothingStaged': '没有已暂存的更改',
  'panel.selectFile': '选择一个文件以查看差异',

  'commit.author': '作者',
  'commit.committer': '提交者',
  'commit.date': '时间',
  'commit.parents': '父提交',
  'commit.backToWip': '← 返回未提交更改',
  'commit.changes': '变更',

  'diff.unified': '统一视图',
  'diff.split': '并排视图',
  'diff.word': '词级高亮',
  'diff.stageHunk': '暂存此块',
  'diff.unstageHunk': '取消暂存此块',
  'diff.binary': '二进制文件',
  'diff.image': '图片预览',
  'diff.empty': '无差异',
  'diff.noChanges': '没有变更',
  'diff.rename': '重命名',
  'diff.new': '新增',
  'diff.deleted': '删除',

  'sync.rejected': '推送被拒绝：远程存在本地没有的提交（non-fast-forward）。',
  'sync.pullMerge': '拉取并合并',
  'sync.pullRebase': '拉取并变基',
  'sync.forcePush': '强制推送（--force-with-lease）',
  'sync.done': '完成',
  'sync.cancelled': '已取消',

  'status.staged': '已暂存 {n}',
  'status.unstaged': '未暂存 {n}',
  'status.untracked': '未跟踪 {n}',
  'status.detached': '游离 HEAD',

  'error.notRepo': '不是 git 仓库',
  'error.generic': '操作失败'
}

export const en = {
  'app.title': 'Git GUI',
  'app.placeholder.repoPath': 'Enter repository path…',
  'app.action.checkStatus': 'Check status',
  'app.label.head': 'HEAD',
  'app.label.aheadBehind': 'Ahead / Behind',
  'app.label.files': 'Changed files',
  'app.label.untracked': 'Untracked',
  'app.empty.repo': 'Enter a local git repository path to view its status',
  'app.error.load': 'Failed to load',

  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.remove': 'Remove',
  'common.retry': 'Retry',
  'common.search': 'Search',

  'start.open': 'Open Repository',
  'start.clone': 'Clone Repository',
  'start.init': 'Create Repository',
  'start.favorites': 'Favorites',
  'start.recent': 'Recent',
  'start.empty': 'No repositories yet — open, clone or create one, or drop a folder into this window',
  'start.drop': 'Drop a folder to open',
  'start.starAdd': 'Add to favorites',
  'start.starRemove': 'Remove from favorites',
  'start.notRepo': 'Selected directory is not a git repository',
  'start.missing': 'Path does not exist',

  'clone.title': 'Clone Repository',
  'clone.url': 'Repository URL',
  'clone.dir': 'Target directory',
  'clone.depth': 'Shallow depth (optional)',
  'clone.submit': 'Clone',
  'clone.cloning': 'Cloning…',
  'clone.pickDir': 'Choose folder',

  'init.title': 'Create Repository',
  'init.dir': 'Parent folder',
  'init.name': 'Repository name',
  'init.branch': 'Default branch',
  'init.submit': 'Create',

  'toolbar.fetch': 'Fetch',
  'toolbar.pull': 'Pull',
  'toolbar.push': 'Push',
  'toolbar.refresh': 'Refresh',
  'toolbar.close': 'Close repository',
  'toolbar.cancelOp': 'Cancel',
  'toolbar.syncing': 'Syncing…',

  'left.branchesLocal': 'Local branches',
  'left.branchesRemote': 'Remote branches',
  'left.tags': 'Tags',
  'left.stash': 'Stashes',
  'left.submodules': 'Submodules',
  'left.empty': 'None',
  'left.current': 'current',

  'graph.wip': 'Uncommitted changes',
  'graph.empty': 'No commits yet',
  'graph.loading': 'Loading commits…',
  'graph.commits': '{n} commits',
  'graph.subject': 'Subject',
  'graph.author': 'Author',
  'graph.date': 'Date',
  'graph.oid': 'OID',

  'panel.staged': 'Staged',
  'panel.changes': 'Unstaged changes',
  'panel.newFiles': 'Untracked files',
  'panel.stage': 'Stage',
  'panel.unstage': 'Unstage',
  'panel.discard': 'Discard',
  'panel.clean': 'Delete',
  'panel.ignore': 'Add to .gitignore',
  'panel.discardConfirm': 'Discard changes to {path}? This cannot be undone.',
  'panel.cleanConfirm': 'Delete untracked file {path}? This cannot be undone.',
  'panel.amend': 'Amend last commit',
  'panel.coauthor': 'Co-author (optional)',
  'panel.coauthorName': 'Name',
  'panel.coauthorEmail': 'Email',
  'panel.message': 'Commit message',
  'panel.commit': 'Commit',
  'panel.committing': 'Committing…',
  'panel.nothingStaged': 'Nothing staged',
  'panel.selectFile': 'Select a file to view its diff',

  'commit.author': 'Author',
  'commit.committer': 'Committer',
  'commit.date': 'Date',
  'commit.parents': 'Parents',
  'commit.backToWip': '← Back to uncommitted changes',
  'commit.changes': 'Changes',

  'diff.unified': 'Unified',
  'diff.split': 'Split',
  'diff.word': 'Word highlight',
  'diff.stageHunk': 'Stage hunk',
  'diff.unstageHunk': 'Unstage hunk',
  'diff.binary': 'Binary file',
  'diff.image': 'Image preview',
  'diff.empty': 'No diff',
  'diff.noChanges': 'No changes',
  'diff.rename': 'Renamed',
  'diff.new': 'New',
  'diff.deleted': 'Deleted',

  'sync.rejected': 'Push rejected: remote has commits you do not have (non-fast-forward).',
  'sync.pullMerge': 'Pull (merge)',
  'sync.pullRebase': 'Pull (rebase)',
  'sync.forcePush': 'Force push (--force-with-lease)',
  'sync.done': 'Done',
  'sync.cancelled': 'Cancelled',

  'status.staged': '{n} staged',
  'status.unstaged': '{n} unstaged',
  'status.untracked': '{n} untracked',
  'status.detached': 'detached HEAD',

  'error.notRepo': 'Not a git repository',
  'error.generic': 'Operation failed'
}

export type Locale = 'zh' | 'en'
export type MessageKey = keyof typeof zh

const dicts: Record<Locale, Record<MessageKey, string>> = { zh, en }

let currentLocale: Locale = 'zh'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: MessageKey): string {
  return dicts[currentLocale][key] ?? key
}

/** Interpolate `{n}` (and other named tokens) in a translated message. */
export function tf(key: MessageKey, params: Record<string, string | number>): string {
  let msg = dicts[currentLocale][key] ?? key
  for (const [k, v] of Object.entries(params)) {
    msg = msg.replaceAll(`{${k}}`, String(v))
  }
  return msg
}
