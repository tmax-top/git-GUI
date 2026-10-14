# GitKraken Desktop 功能清单（复刻需求基线）

> 对标对象：GitKraken Desktop **12.5.0**（本机安装版，Electron）· 调研来源：help.gitkraken.com 官方文档 + 本机应用
>
> 配套方案见 [PROJECT_PLAN.md](./PROJECT_PLAN.md)。本文档是 P0 交付物，作为 P1–P5 开发的逐条需求基线。

## 标注说明

- **GK 计费**：`免费` = Community plan 可用（本地/公共仓库）；`付费` = 需 Pro/Advanced。付费墙仅为 GitKraken 客户端 license 校验，自研复刻无此限制（对应行照做）
- **本期优先级**：`P0` = 日常不可缺（P2/P3 完成）；`P1` = 重要（P3/P4 完成）；`P2` = 锦上添花（P5 或 backlog）
- **阶段**：P2–P5 对应 PROJECT_PLAN 第 5 章阶段；`backlog` = 本期不做，仅占位

---

## 模块一：仓库管理

| # | 功能 | GK 计费 | 对应 git 命令 / 实现 | UI 位置 | 优先级 | 阶段 |
|---|---|---|---|---|---|---|
| 1.1 | 打开本地仓库 | 免费 | 目录选择 + 验证 `.git` | File 菜单 / 启动页 | P0 | P2 |
| 1.2 | 克隆仓库（URL / 本地路径） | 免费 | `git clone [--depth N] <url> <dir>` | File > Clone | P0 | P2 |
| 1.3 | 浅克隆（depth 选项） | 免费 | `git clone --depth N` | Clone 对话框 | P1 | P2 |
| 1.4 | 初始化仓库（默认分支名可配，main） | 免费 | `git init -b <name>` | File > Init | P0 | P2 |
| 1.5 | 收藏仓库 / 最近打开列表 | 免费 | 本地 JSON 持久化 | 启动页 | P0 | P2 |
| 1.6 | 拖拽文件夹到窗口打开 | 免费 | Electron drag-drop 路径 | 窗口 | P1 | P2 |
| 1.7 | Workspaces 多仓库分组 | 付费 | 本地 JSON + 批量切换 | 左栏 Workspaces | P1 | P4 |
| 1.8 | 活动日志（操作历史） | 免费 | 主进程记录每次 git 调用 | Help > Activity Log | P1 | P3 |
| 1.9 | 会话恢复（Remember Tabs） | 免费 | 持久化打开仓库/tab/滚动位置 | 应用设置 | P1 | P2 |
| 1.10 | URL 识别归入平台 Provider | 免费 | RepoRef 解析（github.com / dev.azure.com） | 克隆/PR 面板 | P1 | P4 |
| 1.11 | Deep linking（`gitgui://`） | 免费 | Electron protocol handler | 全局 | P2 | backlog |
| 1.12 | 平台仓库搜索克隆 | 付费 | Provider API search | Clone 对话框 | — | backlog |

## 模块二：提交与可视化

| # | 功能 | GK 计费 | 对应 git 命令 / 实现 | UI 位置 | 优先级 | 阶段 |
|---|---|---|---|---|---|---|
| 2.1 | Commit Graph（DAG 泳道图） | 免费 | `git rev-list --topo-order --parents --all` + 自研布局 | 主视图中央 | P0 | P2 |
| 2.2 | 图分页懒加载 + 初始上限（≥500，可配「显示全部」） | 免费 | `--skip` 增量 `git log` | 图组件 | P0 | P2 |
| 2.3 | refs 展示：本地/远端分支、标签、HEAD | 免费 | `git for-each-ref` | 图行 + 左栏 | P0 | P2 |
| 2.4 | 幽灵分支（悬空提交显示所属分支） | 免费 | 布局计算 | 图 hover | P1 | P2 |
| 2.5 | 图列自定义（作者/时间/SHA/消息、排序显隐、紧凑模式） | 免费 | 设置驱动表头 | 图表头 | P1 | P4 |
| 2.6 | Hide / Solo（隐藏/独显某分支线） | 免费 | 布局过滤 | 图右键 | P2 | P3 |
| 2.7 | WIP 节点（未提交改动虚拟节点） | 免费 | `git status --porcelain=v2` | 图顶端 | P0 | P2 |
| 2.8 | 文件级暂存 / 取消暂存 | 免费 | `git add` / `git restore --staged` | Commit Panel | P0 | P2 |
| 2.9 | hunk 级暂存 / 取消暂存 | 付费 | diff 解析 + `git apply --cached [--reverse]` | Commit Panel | P0 | P2 |
| 2.10 | Discard changes（丢弃工作区/暂存区改动，可选 stash 保护） | 免费 | `git restore` / `git checkout --` / `git clean` | 文件右键 | P0 | P2 |
| 2.11 | 右键文件 → 加入 .gitignore | 免费 | 追加 `.gitignore` | 文件右键 | P1 | P2 |
| 2.12 | 提交（消息、多行 body、co-author 行） | 免费 | `git commit -m`（Co-Authored-By trailer） | Commit Panel | P0 | P2 |
| 2.13 | Amend 上次提交 | 免费 | `git commit --amend` | Commit Panel | P0 | P2 |
| 2.14 | Diff 查看器（并排 / 统一切换） | 免费 | `git diff` / `git diff --cached` / `git show` | Commit Panel | P0 | P2 |
| 2.15 | Word-level diff | 免费 | `git diff --word-diff` | Diff 视图 | P1 | P2 |
| 2.16 | 图片 / 二进制文件预览 | 免费 | blob 读取 + 渲染 | Diff 视图 | P1 | P2 |
| 2.17 | 文件历史（按文件过滤提交） | 免费 | `git log -- <path>` | 图过滤 | P0 | P3 |
| 2.18 | Blame | 免费 | `git blame` | Diff/编辑视图 | P1 | P3 |
| 2.19 | 搜索：commit 消息 | 免费 | `git log --grep` | 搜索框 | P1 | P3 |
| 2.20 | 搜索：文件路径 | 免费 | `git ls-files` 过滤 | 搜索框 | P1 | P3 |
| 2.21 | 搜索：内容 | 免费 | `git grep` | 搜索框 | P2 | P3 |
| 2.22 | 选中 commit 范围（Shift/Cmd 多选） | 免费 | UI 状态 | 图 | P1 | P3 |
| 2.23 | 内置代码编辑器 | 付费 | Monaco / CodeMirror 集成 | Diff 视图编辑 | P2 | backlog |
| 2.24 | 行内（partial line）暂存 | 付费 | 精细 patch 构造 | Commit Panel | P2 | backlog |

## 模块三：分支与历史操作

| # | 功能 | GK 计费 | 对应 git 命令 / 实现 | UI 位置 | 优先级 | 阶段 |
|---|---|---|---|---|---|---|
| 3.1 | 创建分支（任意 commit 处） | 免费 | `git branch <name> <commit>` | 图右键 / 左栏 | P0 | P2 |
| 3.2 | Checkout / 切换分支 | 免费 | `git checkout` / `git switch` | 左栏 / 图 | P0 | P2 |
| 3.3 | 重命名 / 删除分支 | 免费 | `git branch -m / -d` | 左栏右键 | P0 | P3 |
| 3.4 | 拖拽分支 → 分支 = Merge / Rebase 菜单 | 免费 | `git merge` / `git rebase` | 图拖拽 | P0 | P3 |
| 3.5 | Merge（含 --no-ff / ff-only / squash 选项） | 免费 | `git merge` / `--squash` | 右键菜单 | P0 | P3 |
| 3.6 | 交互式 Rebase（Pick/Reword/Squash/Drop、拖拽排序、P/S/R/D 快捷键） | 免费 | `GIT_SEQUENCE_EDITOR` + `git rebase -i` | rebase 面板 | P0 | P3 |
| 3.7 | Rebase 指定 commit 区间到目标分支 | 免费 | `git rebase --onto` | 图右键 | P1 | P3 |
| 3.8 | Rebase 到指定 commit | 免费 | `git rebase <commit>` | 图右键 | P1 | P3 |
| 3.9 | Cherry-pick（单/多 commit，含交互面板） | 免费 | `git cherry-pick` | 图右键 | P0 | P3 |
| 3.10 | Revert commit | 免费 | `git revert` | 图右键 | P0 | P3 |
| 3.11 | Reset to commit（soft / mixed / hard 三档 UI） | 免费 | `git reset --soft/--mixed/--hard` | 图右键 | P0 | P3 |
| 3.12 | 撤销 / 重做（一键 Undo/Redo 任意 git 操作） | 免费 | refs+index 快照恢复（见方案 4.6） | Toolbar | P0 | P3 |
| 3.13 | Stash 创建（含消息）/ apply / pop / drop | 免费 | `git stash push/apply/pop/drop` | 左栏 Stash | P0 | P3 |
| 3.14 | Tag 创建（annotated/lightweight）/ 删除 / 推送 | 免费 | `git tag [-a] / -d / origin --tags` | 左栏 Tags | P0 | P3 |
| 3.15 | Submodule：状态 / init / update / keep up to date 设置 | 免费 | `git submodule status/init/update` | 左栏 | P1 | P3 |
| 3.16 | Worktree：list / add / remove / lock | 免费 | `git worktree list/add/remove/lock` | 左栏 | P1 | P3 |
| 3.17 | Detached HEAD 状态展示与退出 | 免费 | `git checkout <branch>` 恢复 | 状态横幅 | P0 | P3 |
| 3.18 | 中断态恢复（rebase/merge/cherry-pick/revert 的 Continue/Abort） | 免费 | `git rebase --continue/--abort` 等 | 状态横幅 | P0 | P3 |
| 3.19 | Git Hooks 管理 UI（列表/启停/查看输出） | 免费 | `.git/hooks` 文件管理 | 仓库设置 | P1 | P3 |
| 3.20 | Git LFS 状态展示 / 拉取策略 | 免费 | `git lfs` 透传 | 仓库设置 | P1 | P3 |
| 3.21 | Gitflow 操作（feature/release/hotfix） | 免费 | gitflow 命令序列（AVH 版） | Toolbar 菜单 | P2 | P3 |
| 3.22 | 提交签名（GPG/SSH key 配置，git 自签名） | 免费 | `-c user.signingkey` + `git commit -S` | 仓库/全局设置 | P1 | P3 |
| 3.23 | Compare 任意两个 commit/分支 | 免费 | `git diff A..B` | 图右键 | P1 | P3 |

## 模块四：同步与冲突

| # | 功能 | GK 计费 | 对应 git 命令 / 实现 | UI 位置 | 优先级 | 阶段 |
|---|---|---|---|---|---|---|
| 4.1 | Fetch（单远端 / 全部、含进度与取消） | 免费 | `git fetch --progress` | Toolbar | P0 | P2 |
| 4.2 | Pull（默认 / --ff-only / --rebase 三选项） | 免费 | `git pull [--ff-only\|--rebase]` | Toolbar | P0 | P2 |
| 4.3 | Push（普通推送） | 免费 | `git push` | Toolbar | P0 | P2 |
| 4.4 | Push 被拒（non-FF）引导流程 | 免费 | 解析错误 → 提供 pull --rebase / force 选项 | 弹窗 | P0 | P2 |
| 4.5 | Force push（--force-with-lease + 二次确认） | 免费 | `git push --force-with-lease` | 右键/弹窗 | P0 | P3 |
| 4.6 | Auto-Fetch 定时（0–60 分钟，0 关闭） | 免费 | 后台定时 fetch | 应用设置 | P1 | P3 |
| 4.7 | Auto-Prune（fetch --prune） | 免费 | `git fetch --prune` | 应用设置 | P1 | P3 |
| 4.8 | 推送 tag 开关 | 免费 | `git push origin --tags` | push 选项 | P1 | P3 |
| 4.9 | 三方冲突编辑器（ours/result/theirs + 块级 Accept） | 付费* | `git show :1/:2/:3:` + 结果区编辑 | 冲突时自动打开 | P0 | P3 |
| 4.10 | Take current / Take incoming（整文件级） | 免费 | 取 `:2:` 或 `:3:` 写回 | 冲突文件右键 | P0 | P3 |
| 4.11 | 外部 mergetool 集成（KDiff3/P4Merge/Araxis/opendiff 等） | 免费 | `git mergetool` + mergetool.* 配置 | 设置 + 冲突菜单 | P1 | P3 |
| 4.12 | 冲突导航（文件间跳转） | 免费 | 冲突文件列表 | Commit Panel | P1 | P3 |
| 4.13 | 远端管理（add/remove/rename remote、设置上游） | 免费 | `git remote add/remove/rename`、`-u` | 左栏 Remotes | P1 | P3 |
| 4.14 | 远端分支跟踪关系展示 / prune | 免费 | `git branch -vv`、`fetch --prune` | 左栏 | P1 | P3 |
| 4.15 | Conflict Prevention（他人改动预警） | 付费 | 依赖 GitKraken Org 云 | — | — | 排除 |

\* 4.9 在 GitKraken 中冲突「输出编辑器」模式需付费；本项目照做（自研无付费墙）。

## 模块五：外围功能

| # | 功能 | GK 计费 | 对应 git 命令 / 实现 | UI 位置 | 优先级 | 阶段 |
|---|---|---|---|---|---|---|
| 5.1 | 内嵌终端（xterm.js + node-pty，多 tab） | 免费 | node-pty 起 login shell | 底部面板 | P1 | P4 |
| 5.2 | 终端设置（字体/字号/行高/光标） | 免费 | xterm 配置 | 设置 | P2 | P4 |
| 5.3 | 命令面板（Cmd+K 全局命令搜索） | 免费 | UI | 全局 | P1 | P4 |
| 5.4 | 全局快捷键（含 rebase P/S/R/D） | 免费 | UI | 全局 | P1 | P4 |
| 5.5 | 主题（dark/light + 系统跟随） | 免费 | CSS 变量 | 设置 | P1 | P4 |
| 5.6 | 多 Profile（git 身份 + 设置集，`-c` 注入） | 付费 | `git -c user.name/email=...` | 设置 | P1 | P4 |
| 5.7 | 外部编辑器配置（VS Code 等「在外部打开」） | 免费 | spawn 编辑器命令 | 设置 + 右键 | P1 | P3 |
| 5.8 | 外部 diff 工具配置 | 免费 | `difftool.*` 配置 | 设置 | P1 | P3 |
| 5.9 | 自定义终端命令 | 免费 | spawn 自定义 shell | 设置 | P2 | P4 |
| 5.10 | 仓库级设置：文件编码（含 GBK） | 免费 | diff 输出按编码解码 | 仓库设置 | P1 | P3 |
| 5.11 | 仓库级设置：默认分支名 / .orig 清理 / squash merge 默认 | 免费 | `init.defaultBranch` 等 | 仓库设置 | P1 | P3 |
| 5.12 | 桌面通知（推送完成/冲突/fetch 失败） | 免费 | Electron Notification | 系统通知 | P1 | P3 |
| 5.13 | 扩展日志开关 / 错误日志落盘 | 免费 | 主进程日志 | Help 菜单 | P1 | P5 |
| 5.14 | 清除已存凭据 | 免费 | `git credential reject` / 系统钥匙串清理 | 设置 | P2 | P3 |
| 5.15 | 本地 patch 导出 / 导入（Cloud Patch 免费替代） | 付费 | `git format-patch` / `git am` | Commit Panel / 应用菜单 | P1 | P4 |
| 5.16 | 中英双语界面（设置切换） | 免费 | i18n 资源 key | 设置 | P0 | P4 |
| 5.17 | GitHub 集成：认证（PAT/Device Flow） | 付费 | REST API + safeStorage | 设置 | P0 | P4 |
| 5.18 | GitHub PR：列表/详情/diff/评论/创建/合并 | 付费 | GraphQL/REST | PR 面板 | P0 | P4 |
| 5.19 | Azure DevOps 集成：认证（PAT Bearer） | 付费 | REST + safeStorage | 设置 | P0 | P4 |
| 5.20 | Azure DevOps PR：列表/详情/diff/评论/创建/合并 | 付费 | REST API | PR 面板 | P0 | P4 |
| 5.21 | WSL 2 支持 | 免费 | Windows 专属 | — | — | 不适用（macOS 优先） |
| 5.22 | GitKraken AI（commit 生成等） | 付费 | 本地 LLM（可选） | — | — | backlog |
| 5.23 | Agent Sessions（worktree + agent 编排） | 付费 | 见 backlog | — | — | backlog |
| 5.24 | Cloud Patch 云存储 | 付费 | 依赖其云 | — | — | 排除（用 5.15 替代） |
| 5.25 | Launchpad（PR+Issue 聚合中心） | 付费 | 本期仅 PR 面板 | — | P0 | P4 |
| 5.26 | GitHub Actions / ADO Pipelines 视图 | 付费 | REST | — | — | backlog |
| 5.27 | Issues / Boards 面板 | 付费 | REST | — | — | backlog |
| 5.28 | fork | 付费 | REST | — | — | backlog |
| 5.29 | Jira / Trello 集成 | 付费 | REST | — | — | backlog |
| 5.30 | Team View / DORA / Codemaps | 付费 | 依赖其云 | — | — | 排除 |

## 本期平台集成矩阵

| 能力 | GitHub.com | Azure DevOps (dev.azure.com) |
|---|---|---|
| 认证 | PAT / Device Flow | PAT（Bearer） |
| PR 列表（open/closed/merged） | ✅ | ✅ |
| PR 详情 + diff | ✅ | ✅ |
| PR 评论 / 创建 / 合并 | ✅ | ✅ |
| URL 克隆识别 | ✅ | ✅ |
| Issues / CI / 搜索 / fork | backlog | backlog |

## 明确排除（本期）

Cloud Patch 云、Conflict Prevention、Team View、DORA Insights、Codemaps、GitKraken AI、Code Suggest、On-Premise、Browser Extension、GitKraken CLI、WSL（macOS 不适用）。

## Backlog 占位（详见 PROJECT_PLAN 第 9 章）

Agent Sessions（5.23）· AI 辅助（5.22）· Issues/CI（5.26/5.27）· fork/搜索（5.28）· 更多平台与自托管 · Jira/Trello（5.29）· 行内暂存（2.24）· 内置编辑器（2.23）· 自动更新 · 代码签名 · Windows/Linux 适配 · deep linking（1.11）。

