# Git GUI 项目方案（对标 GitKraken Desktop）

> 状态：已定稿 · 创建日期：2026-10-13 · 版本：v1.0
>
> 功能需求逐条清单见 [GITKRAKEN_FEATURES.md](./GITKRAKEN_FEATURES.md)（本文第 3 章引用）。

---

## 1. 项目概述

### 1.1 背景

GitKraken Desktop（本机版本 12.5.0，Electron 应用）自 v6.5.3 起对**私有仓库**收费：免费版（Community plan）仅允许打开本地仓库与公共云托管仓库，打开任意私有远程仓库会触发 license 校验并被拒绝。

关键事实：**该付费墙只是 GitKraken 客户端的商业 license 校验，与 git 本身无关**。git 协议与本地 git 命令对仓库是否私有毫无概念；SSH key、HTTPS 凭据（系统钥匙串/credential helper）都是操作系统级能力。任何自研 GUI 只要调用系统 git（或 libgit2），即可天然、合法地免费操作私有仓库。

因此本项目目标不是"破解 GitKraken"，而是**自研一个功能对标的 Git GUI**，从根本上绕开商业限制，同时获得完全可控的定制空间。

### 1.2 目标

- 自研跨平台桌面 Git GUI 客户端，功能对标 GitKraken Desktop 的**核心 Git 能力 + 平台集成层**
- **私有仓库零门槛**：无账号、无 license、无云端依赖
- 界面**仿 GitKraken 三栏布局**（左侧面板 / Commit Graph / 右侧 Commit Panel），**视觉自绘简化**，不使用其任何代码、截图、图标、品牌资产
- 首发平台 macOS（架构预留 Linux / Windows），界面**中英双语**

### 1.3 成功标准

| # | 标准 | 验收点 |
|---|---|---|
| S1 | P2 结束后可日常替代 GitKraken 完成私有仓库「改→暂存→提交→推送」闭环 | 手动走通全流程 |
| S2 | GitKraken 文档所列 P0 级功能全部可用 | 对照功能清单逐条勾验 |
| S3 | 万级提交仓库打开 < 3 秒，滚动流畅（60fps 目标） | 性能基准测试 |
| S4 | `tsc --noEmit`、ESLint、vitest 全绿 | 每阶段门禁 |
| S5 | macOS 本机可安装运行（electron-builder 产物） | P5 打包验证 |

---

## 2. 范围定义

### 2.1 本期范围内（P0–P5）

| 阶段 | 主题 |
|---|---|
| P0 | 功能清单文档（`GITKRAKEN_FEATURES.md`） |
| P1 | 项目骨架 + Git 服务层 + IPC/安全基线 + i18n 结构 + 测试门禁 |
| P2 | MVP 三栏界面：仓库管理、Commit Graph、暂存/丢弃/提交/amend、diff、push/pull、文件监视、会话恢复 |
| P3 | 高级 Git 操作：merge/rebase/交互式 rebase/cherry-pick/revert/reset、stash/tag/submodule/worktree、撤销重做、冲突编辑器、hooks/LFS/Gitflow/签名、Auto-Fetch、通知、外部工具与仓库设置 |
| P4 | 内嵌终端、GitHub + Azure DevOps 集成（**仅认证 + PR + URL 克隆**）、Workspaces、多 Profile、主题、命令面板、本地 patch 导入导出、中英双语 |
| P5 | 性能优化、状态恢复、日志、打包、安全复查 |

### 2.2 明确排除（本期不做）

**依赖 GitKraken 云端/账号的对等功能：**

| 排除项 | 说明 |
|---|---|
| Cloud Patch 云存储 | 改为本地替代：`git format-patch` 导出 / `git am` 导入（见 P4） |
| Conflict Prevention / Team View | 依赖 GitKraken Org 云端协作 |
| DORA Insights、Codemaps | 云端分析服务 |
| GitKraken AI / Commit Composer | 后续可选接本地 LLM（backlog） |
| Code Suggest 云评审 | 降级为「浏览器打开 PR」 |
| On-Premise / Browser Extension / CLI | 无关 |

**本期功能裁剪（用户决策）：**

| 排除项 | 说明 |
|---|---|
| Agent Sessions / 一切 agent·AI 功能 | 整体移入 backlog（见第 9 章） |
| Issues / Boards 工作项 | 平台集成只留 PR |
| GitHub Actions / Azure Pipelines CI 视图 | 移入 backlog |
| 平台仓库搜索 | 克隆仅支持粘贴 URL / 本地路径 |
| fork | 移入 backlog |
| GitLab / Bitbucket / 自托管（GHES / ADO Server） | 本期仅 GitHub.com + dev.azure.com |
| Jira / Trello 集成 | 移入 backlog |

### 2.3 平台矩阵（本期）

| 平台 | 认证 | 能力 |
|---|---|---|
| GitHub（github.com） | PAT / Device Flow，存 OS 钥匙串（Electron safeStorage） | PR 列表/详情/diff/评论/创建/合并；URL 克隆 |
| Azure DevOps（dev.azure.com） | PAT（HTTP Bearer，Base64 `:{pat}`） | Pull Requests 同左；URL 克隆 |

---

## 3. 功能需求

完整逐条清单（功能名、免费/付费标注、对应 git 命令/plumbing、UI 位置、优先级 P0/P1/P2）见 **[GITKRAKEN_FEATURES.md](./GITKRAKEN_FEATURES.md)**。此处摘要五大模块：

| 模块 | 内容摘要 |
|---|---|
| 一、仓库管理 | 打开/克隆（含浅克隆 depth）/初始化（默认分支名 main）、收藏、Workspaces 多仓库分组、活动日志、拖拽文件夹到窗口打开 |
| 二、提交与可视化 | Commit Graph（DAG、泳道、幽灵分支、列自定义、Hide/Solo、分页懒加载）、WIP 暂存（文件级 + hunk 级）、Discard、Amend、提交（co-author）、diff/blame/文件历史、搜索 |
| 三、分支与历史 | 拖拽 merge/rebase、交互式 rebase（pick/reword/squash/drop）、cherry-pick、revert、reset 三档、stash、tag、submodule、worktree、撤销/重做、detached HEAD、中断态恢复 |
| 四、同步与冲突 | fetch/pull/push（进度/取消、non-FF 引导、force-with-lease 确认）、三方冲突编辑器、外部 mergetool、Auto-Fetch/Prune |
| 五、外围 | 内嵌终端、命令面板、快捷键、主题、多 Profile、外部编辑器/diff/merge 工具、hooks/LFS/Gitflow/签名配置、GitHub + Azure DevOps PR 集成、通知、本地 patch 导入导出、中英双语 |

**优先级定义规则：**

- **P0**：日常使用不可缺（没它就无法替代 GitKraken 核心流程）→ P2/P3 必须完成
- **P1**：重要但可短暂用 CLI 代替 → P3/P4 完成
- **P2**：锦上添花 → P5 或 backlog

---

## 4. 技术方案

### 4.1 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 桌面壳 | Electron（最新稳定版） | 与 GitKraken / GitHub Desktop 同架构；生态最成熟；Node 26 已装 |
| 构建 | pnpm + electron-vite + TypeScript | 快、类型安全、主流组合 |
| 渲染层 | React 19 + Tailwind CSS + Zustand + Radix Primitives | 开发效率高；状态轻量；无障碍组件原语 |
| 虚拟滚动 | @tanstack/react-virtual | 大列表/图行渲染 |
| Git 操作 | **手写 spawn 封装调用系统 git**（不用 nodegit/isomorphic-git） | `--porcelain`/plumbing 输出稳定、性能好、与系统凭据（SSH agent、钥匙串 credential helper）天然互通；GitKraken 亦已从 NodeGit 迁移到 Git executable（见其 Experimental 文档），印证此路线 |
| 终端 | @xterm/xterm + node-pty | 行业标准；node-pty 需 electron-rebuild |
| 平台 API | GitHub：octokit 或轻量 fetch；Azure DevOps：REST + fetch | ADO 无重量级官方 JS SDK，REST 足够 |
| 密钥存储 | Electron safeStorage（OS 钥匙串） | 避开 keytar 原生依赖 |
| 设置/持久化 | 主进程 JSON 存储（electron-store 或自研） | 简单可靠 |
| 测试 | vitest + 临时 fixture 仓库 | 与 vite 同生态 |
| 打包 | electron-builder | macOS dmg/zip；签名/公证暂不做（本机安装） |

### 4.2 目录结构

```
git-GUI/
├── package.json
├── electron.vite.config.ts
├── src/
│   ├── main/                      # Electron 主进程
│   │   ├── index.ts               # 入口：窗口、单实例锁、协议
│   │   ├── ipc.ts                 # 类型化 IPC 注册（白名单式）
│   │   ├── git/                   # GitService
│   │   │   ├── exec.ts            #   spawn 封装：异步、LC_ALL=C、超时、流式输出、取消
│   │   │   ├── queue.ts           #   每仓库写操作串行化 + index.lock 检测
│   │   │   ├── status.ts          #   git status --porcelain=v2 --branch
│   │   │   ├── log.ts             #   提交日志分页（--skip / 批量）
│   │   │   ├── graph.ts           #   git rev-list --topo-order --parents --all
│   │   │   ├── diff.ts            #   diff / patch / hunk 解析
│   │   │   ├── ops.ts             #   branch/merge/rebase/cherry/stash/worktree/...
│   │   │   └── progress.ts        #   --progress stderr 解析（fetch/push/pull/clone）
│   │   ├── undo/                  # 撤销/重做：refs + index 快照
│   │   ├── providers/             # GitProvider 接口 + github/ + azuredevops/
│   │   ├── profiles/              # 多 Profile（git 身份/设置集），-c 注入
│   │   ├── secrets.ts             # safeStorage 加解密
│   │   ├── settings.ts            # 应用/仓库级设置读写
│   │   ├── watcher.ts             # fs 监视（chokidar）→ status 刷新事件
│   │   └── log/activity.ts        # 活动日志
│   ├── preload/
│   │   └── index.ts               # contextBridge 白名单 API
│   └── renderer/                  # React 应用
│       ├── src/
│       │   ├── layout/            # 三栏骨架：Toolbar / LeftPanel / Graph / CommitPanel / StatusBar
│       │   ├── graph/             # DAG 布局算法 + Canvas 绘制 + 虚拟滚动
│       │   ├── staging/           # WIP、文件/hunk 暂存、discard
│       │   ├── diff/              # diff 查看器、blame、文件历史
│       │   ├── merge/             # 三方冲突编辑器
│       │   ├── rebase/            # 交互式 rebase 面板
│       │   ├── branches/          # 左栏：分支/标签/stash/remotes/submodule/worktree
│       │   ├── repos/             # 打开/克隆/初始化/收藏/Workspaces
│       │   ├── pr/                # GitHub / Azure DevOps PR 面板
│       │   ├── terminal/          # xterm 终端面板
│       │   ├── palette/           # 命令面板
│       │   ├── settings/          # 设置界面
│       │   ├── i18n/              # 中英双语文案（key 化）
│       │   └── store/             # Zustand stores
│       └── index.html
├── tests/
│   ├── fixtures/                  # 测试用 git 仓库生成脚本
│   ├── git/                       # 解析器单测
│   └── graph/                     # 布局 golden 测试（对拍 git log --graph）
└── docs/
    ├── PROJECT_PLAN.md            # 本文档
    └── GITKRAKEN_FEATURES.md      # 功能清单
```

### 4.3 进程模型与 IPC

- 主进程：一切 git 进程、文件系统、网络 API 调用、密钥
- 渲染进程：纯 UI，`contextIsolation: true`、`nodeIntegration: false`，仅通过 `preload` 暴露的类型化 API 通信
- IPC 契约：单一 `invoke` 通道 + 命名空间分发（`git.*`、`repo.*`、`provider.*`、`settings.*`），入参 zod 校验，出参序列化 DTO
- 事件流：主 → 渲染 单向推送（`git:statusChanged`、`git:progress`、`watcher:changed`）

### 4.4 Git 服务层设计

- **统一约定**：所有命令 `LC_ALL=C` / `LANG=C` 防本地化输出；`core.quotepath=false` 保中文文件名；一律使用 `--porcelain` 或自定义 `-z` 分隔格式
- **写操作串行化**：每仓库一个 Promise 队列；执行前探测 `.git/index.lock`，存在则等待/报错引导；`fetch` 等只读远端操作可并行
- **进度与取消**：fetch/pull/push/clone 加 `--progress`，解析 stderr `Progress:` 行推送到 UI；每个 spawn 持有 AbortController，UI 可 kill
- **凭据**：不自行管理密码——依赖系统 git 的 credential helper（macOS 钥匙串）与 SSH agent；HTTPS 私有仓库首次操作由 git 触发系统弹窗
- **编码**：仓库级设置可指定工作区文件编码（默认 UTF-8，支持 GBK 场景）；diff 输出按该编码解码

### 4.5 Commit Graph 算法

1. 数据：`git rev-list --topo-order --parents --all`（拓扑序 + 父链）；补充 `git log --format` 批量取 author/date/subject；refs 映射（分支/标签/远端/HEAD）
2. 泳道分配：单遍扫描拓扑序，维护活跃 lane 列表；遇分支点开新 lane、遇汇合点释放；处理 merge / octopus / criss-cross；输出每 commit 的 `(lane, 父连线几何)`
3. 渲染：**单 `<canvas>` 画泳道连线** + 虚拟化行列表（@tanstack/react-virtual）画每行文字；滚动时按可视区间重绘 canvas
4. 加载策略：初始加载上限（默认 500，最小 500，可配「显示全部」）；滚动到底 `--skip` 增量分页；解析放 Web Worker 防主线程卡顿
5. 正确性：golden 测试与 `git log --graph --topo-order` 输出对拍；fixture 覆盖 merge、octopus、criss-cross、多远端、浅仓库

### 4.6 撤销 / 重做

- 每次变更型操作（commit/merge/rebase/reset/checkout/cherry-pick 等）前快照：`HEAD` 与全部本地 refs 的 oid + index tree oid（`git write-tree`）+ 操作描述
- Undo：将 refs 重写回快照、`git read-tree` 恢复 index；Redo 为对称栈
- 边界：检测远端已被他人推进时警告「撤销可能需要 force push」；不支持 undo 的操作（如 gc）标记为不可撤销

### 4.7 冲突编辑器

- 读取冲突文件三阶段：`git show :1:path`（base）、`:2:`（ours）、`:3:`（theirs）；未冲突区域用 `git merge-file` 结果或 diff3 生成
- UI：三栏（ours | result | theirs）+ 块级按钮（Accept Current / Incoming / Both / 上下导航）+ 中间结果区可自由编辑
- 兜底：配置外部 mergetool（Beyond Compare / KDiff3 / P4Merge / Araxis / macOS opendiff），通过 `git mergetool` 调起
- 边界情况：rename/rename、add/add、delete/modify 提示用 CLI 处理并给出命令

### 4.8 交互式 Rebase

- GUI 编排：选定基点后列出 commits，拖拽排序 + 每行动作（Pick/Reword/Squash/Drop）+ 快捷键 P/S/R/D
- 执行：写 todo 到临时文件 → `GIT_SEQUENCE_EDITOR=<script>` + `GIT_EDITOR=脚本` 环境变量下执行 `git rebase -i <base>`（非交互终端）
- 冲突中断：进入「中断态恢复」流程（见 4.11），支持 Continue（编辑冲突文件后）/ Abort
- 限制与 GitKraken 一致：源分支含 merge commit 或含初始 commit 时不提供 GUI rebase，引导 CLI

### 4.9 hunk 级暂存

- 读取 `git diff`（unstaged）/ `git diff --cached`（staged）统一 diff 文本
- 解析为 文件 → hunk 结构；「暂存此 hunk」= 仅保留该 hunk 构造子 patch → `git apply --cached -`；「取消暂存 hunk」= `git apply --cached --reverse -`
- 行内选择（partial line staging）本期不做（P2 边界），保留 CLI 兜底提示

### 4.10 GitProvider 接口

```ts
interface GitProvider {
  id: 'github' | 'azuredevops'
  authenticate(kind: 'pat' | 'device-flow'): Promise<Account>
  listPullRequests(repo: RepoRef, filter): Promise<PullRequest[]>
  getPullRequest(repo, id): Promise<PullRequestDetail>   // 含 diff、评论
  createPullRequest(repo, input): Promise<PullRequest>
  commentOnPullRequest(repo, id, body): Promise<void>
  mergePullRequest(repo, id, method): Promise<void>
}
```

- RepoRef 统一表示 `github.com/{owner}/{repo}` 与 `dev.azure.com/{org}/{project}/_git/{repo}`
- 渲染层 PR 面板只依赖接口；新增平台 = 新增实现（后续 GitLab 等不动 UI）
- Token 存 safeStorage；请求带超时与错误映射（401 → 重新认证引导）

### 4.11 状态恢复

- 启动时扫描打开仓库的 `.git` 目录：存在 `rebase-merge`/`rebase-apply`/`MERGE_HEAD`/`CHERRY_PICK_HEAD`/`REVERT_HEAD` → 渲染「进行中操作」横幅（Continue / Abort / 打开冲突文件）
- 会话恢复（Remember Tabs）：窗口关闭时持久化「打开的仓库集合 + 各仓库激活 tab + 图滚动位置」，重启还原

### 4.12 i18n

- 所有界面文案 key 化（`t('commit.panel.title')`），zh-CN / en 两份资源，默认跟随系统语言，可在设置切换
- 日期/时间用 `Intl.DateTimeFormat` 按当前 locale 格式化；P4 结束时做一次硬编码文案扫描（测试断言资源 key 覆盖）

### 4.13 安全基线

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`（renderer）
- preload 仅暴露显式白名单方法；IPC 入参 zod 校验；路径参数规范化并限制在仓库根内（防路径穿越）
- 渲染进程永不接触 token 明文（provider 调用全部经主进程）
- 无远程代码加载；CSP 严格

---

## 5. 阶段计划

依赖关系：P0 → P1 → P2 → P3 → P4 → P5（严格串行；P4 的终端/主题等子项可在 P3 尾部并行预研）。

工作量为单人粗估（含调试与文档），单位：人日。

### P0 调研文档（0.5 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| 落成本方案 | `docs/PROJECT_PLAN.md` | 10 章齐全 |
| 落成功能清单 | `docs/GITKRAKEN_FEATURES.md` | 五大模块 + 排除项 + backlog 占位；每条含 git 命令映射与 P0/P1/P2 |

### P1 骨架 + Git 服务层（3–4 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| electron-vite + pnpm + TS 脚手架 | 可启动空窗口应用 | `pnpm dev` 出窗 |
| GitService 全部解析函数（exec/queue/status/log/graph/diff/ops/progress） | `src/main/git/*` | vitest：fixture 仓库解析全绿 |
| 类型化 IPC + preload 白名单 + zod 校验 | `ipc.ts` / `preload` | 契约文档 + 单测 |
| 安全基线配置 | BrowserWindow 设置 | 检查清单勾验 |
| i18n 骨架（key 工具 + zh/en 资源文件） | `renderer/i18n` | 示例 key 双语切换 |
| 质量门禁脚本 | `pnpm typecheck` / `lint` / `test` | 三命令全绿 |
| 图布局纯算法实现（不接 UI） | `renderer/graph/layout.ts` | golden 测试对拍 `git log --graph` |

### P2 MVP 三栏界面（5–7 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| 打开/克隆（含 depth 浅克隆）/初始化（默认分支 main）/收藏；拖拽文件夹打开 | repos 模块 | 四种方式均可打开仓库 |
| 三栏布局 + Toolbar + StatusBar | layout 模块 | 仿 GitKraken 结构 |
| 左栏列表：本地/远端分支、标签、stash、submodule | branches 模块 | 只读展示 + checkout |
| Commit Graph UI（虚拟滚动 + canvas 连线 + 分页懒加载 + 初始上限设置） | graph 模块 | 万级提交仓库 < 3s 打开 |
| WIP 面板：状态文件列表、文件级 + hunk 级暂存、**Discard changes**、右键加入 .gitignore | staging 模块 | 与 CLI 结果一致 |
| 提交（消息 + co-author）+ **Amend** | commit 流程 | 图上出现新节点 |
| Diff 查看器（并排/统一、word diff、图片预览、新增/删除/重命名渲染） | diff 模块 | 覆盖常见文件类型 |
| fetch/pull/push：进度条、取消、non-FF 冲突引导（pull --rebase 选项）、force-with-lease 确认 | sync 模块 | 模拟被拒场景走通引导 |
| 文件系统监视自动刷新 status | watcher.ts | 外部编辑保存后 1s 内 UI 更新 |
| Remember Tabs 会话恢复 | settings | 重启还原 |

**P2 里程碑（S1）**：真实私仓库日常「改→暂存→提交→推送」闭环，可卸载 GitKraken 做基础使用。

### P3 高级 Git 操作（7–9 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| 分支拖拽到分支 → Merge / Rebase 菜单 | 图交互 | 历史正确 |
| 交互式 rebase 面板（拖拽排序、Pick/Reword/Squash/Drop、快捷键、GIT_SEQUENCE_EDITOR 执行） | rebase 模块 | 合成场景往返验证 |
| cherry-pick（单/多 commit）、revert、reset（soft/mixed/hard 三档 UI） | ops UI | 各操作图上可见 |
| stash CRUD（消息、apply/pop/drop、从暂存区入 stash） | stash UI | 与 CLI 一致 |
| tag 创建/删除/推送 | tag UI | annotated/lightweight 均可 |
| submodule（状态、init/update、keep up to date 设置） | submodule UI | 示例仓库验证 |
| worktree（list/add/remove/lock） | worktree UI | 多 worktree 并存 |
| 撤销/重做栈 | undo 模块 | 覆盖 P2/P3 各操作 |
| 三方冲突编辑器 + 外部 mergetool | merge 模块 | 人工制造冲突走通 |
| 搜索：commit 消息 / 文件路径 / 内容（git grep） | search | 三种搜索可用 |
| detached HEAD 状态展示与退出 | 状态机 | 检出游离提交可恢复 |
| 中断态恢复横幅（rebase/merge/cherry-pick/revert Continue/Abort） | 4.11 | kill -9 模拟中断后可恢复 |
| Auto-Fetch（0–60 分钟）+ Auto-Prune | 后台任务 | 日志可见周期 fetch |
| 桌面通知（推送完成/冲突/fetch 失败） | 通知 | 系统通知栏可见 |
| Hooks 管理 UI（列表/启用/禁用/查看输出） | hooks | 示例 pre-commit 验证 |
| LFS UI（状态展示、拉取策略） | lfs | LFS 仓库验证 |
| Gitflow 操作按钮 | gitflow | feature/release/hotfix 走通 |
| 签名配置（GPG/SSH key 选择，git 自执行签名） | settings | verified commit |
| 外部工具配置：编辑器 / diff / merge / 终端 | settings | 调起 VS Code 等 |
| 仓库级设置：编码（含 GBK）、默认分支名、.orig 清理 | settings | 中文文件名/GBK 仓库正确显示 |
| 活动日志 | activity log | 操作可追溯 |

### P4 集成与终端（5–7 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| 内嵌终端（xterm.js + node-pty，字体设置，多 tab） | terminal 模块 | 可跑任意 shell 命令 |
| GitProvider 接口 + GitHub 实现（PAT/Device Flow、safeStorage） | providers/github | 认证成功 |
| Azure DevOps 实现（PAT Bearer） | providers/azuredevops | 认证成功 |
| PR 面板：列表（open/closed/merged）、详情、diff、评论、创建、合并 | pr 模块 | 两平台真实 PR 走通 |
| URL 克隆时识别 RepoRef 自动归入 provider | repos | 粘贴两平台 URL 正确识别 |
| Workspaces（多仓库分组、分组切换） | workspaces | ≥3 仓库分组管理 |
| 多 Profile（git 身份 + 设置集，-c 注入不改全局） | profiles | 两身份提交作者正确 |
| 主题（至少 dark/light 两套 + 系统跟随） | themes | 切换即时生效 |
| 命令面板（Cmd+K）+ 全局快捷键表 | palette | 常用操作均可面板触达 |
| 本地 patch 导出/导入（format-patch / am，替代 Cloud Patch） | patch 功能 | 导出文件可被 git am 应用 |
| i18n 双语全覆盖 + 硬编码文案扫描测试 | i18n | 切换语言无漏翻 |

### P5 打磨 + 打包（3–5 人日）

| 任务 | 交付物 | 验收 |
|---|---|---|
| 大仓库性能：增量加载调优、Worker 化解析、内存剖析 | 性能报告 | S3 达标（万级提交 < 3s） |
| 错误恢复完善：各种 git 失败路径的友好提示 | 错误处理清单 | 人为制造失败场景验证 |
| 崩溃日志、单实例锁 | 主进程加固 | 杀进程后可正常重启 |
| electron-builder 打包（macOS dmg/zip） | 安装包 | 本机安装运行；Gatekeeper 提示说明写入 README |
| 安全复查 | 检查清单 | 4.13 逐项复核 |

**总工作量粗估：24–33 人日。**

---

## 6. 测试与质量

| 类型 | 内容 | 工具 |
|---|---|---|
| 单元测试 | porcelain/v2、log、diff、progress 解析器；hunk 切分；undo 快照结构 | vitest + fixture 仓库（脚本生成真实 git 仓库于 tmp） |
| Golden 测试 | 图布局输出与 `git log --graph --topo-order` ASCII 对拍；覆盖 merge/octopus/criss-cross/多远端/浅仓库 | vitest |
| 集成测试 | GitService 各 ops 在 fixture 仓库上的效果断言（分支图、status 变化） | vitest |
| 手动验收 | 每阶段验收表 + P0 功能清单逐条勾验 | 清单文档 |
| 性能基准 | 万级提交仓库打开耗时、滚动帧率、diff 大文件渲染 | 手动 + Performance 面板 |
| 静态门禁 | `pnpm typecheck`（tsc --noEmit）、`pnpm lint`（ESLint）、`pnpm test` | 每阶段结束必跑 |

---

## 7. 风险与对策

| # | 风险 | 影响 | 对策 |
|---|---|---|---|
| R1 | 图布局正确性（octopus/criss-cross/多远端边角） | 高：核心体验 | golden 对拍 + fixture 矩阵；先做纯算法（P1）再接 UI；预留「退化为 --graph 文本」兜底 |
| R2 | 大仓库性能（十万级提交/巨型 diff） | 高 | 分页 + Worker + 虚拟化；初始上限设置；diff 懒加载 |
| R3 | node-pty 原生模块与 Electron ABI 不匹配 | 中 | electron-rebuild 标准流程；终端放 P4，不阻塞核心 |
| R4 | 冲突编辑器边角情况（rename/rename 等） | 中 | 三栏覆盖常见场景；复杂边角引导 CLI 并给出准确命令 |
| R5 | ADO/GitHub API 变更或限流 | 低 | Provider 接口隔离；错误映射友好提示 |
| R6 | 工期失控（功能面大） | 中 | 严格串行阶段 + 门禁；每阶段结束都有可用产物；P2 即可日用，后续阶段可随时暂停不烂尾 |
| R7 | macOS 未签名应用 Gatekeeper 拦截 | 低 | README 写明 `xattr -cr` / 右键打开方法；正式签名列为以后事项 |
| R8 | 撤销/重做与并发改动冲突 | 中 | undo 操作前检测工作区是否已变化，变化则提示风险 |

---

## 8. 打包发布

- **工具**：electron-builder；目标 `mac dmg` + `mac zip`（x64/arm64 或 universal）
- **签名/公证**：本期不做（本机及可控环境安装）；产物首次打开需「右键→打开」或 `xattr -cr /Applications/GitGUI.app`，写入 README
- **自动更新**：不做（backlog；如需将来自建 electron-updater 通道）
- **加固**：单实例锁（`app.requestSingleInstanceLock`）；崩溃转储与活动日志落盘 `~/Library/Application Support/GitGUI/logs/`
- **版本号**：SemVer；打包脚本 `pnpm dist`

---

## 9. Backlog（后续迭代，本期不做）

按预期价值排序：

1. **Agent Sessions**：一键建 worktree + 配置/启动编码 agent（Claude Code / Codex / OpenCode 等）+ 多会话状态面板；agent status 插件/钩子
2. **AI 辅助**：commit message 生成、diff 摘要（可接本地 LLM / Ollama，可选云端）
3. **平台能力扩展**：Issues/Boards 面板、GitHub Actions / Azure Pipelines CI 视图、平台仓库搜索、fork
4. **更多平台**：GitLab、Bitbucket、GitHub Enterprise Server、Azure DevOps Server（自托管）、Gitea/Forgejo
5. **Jira / Trello 集成**
6. **行内（partial line）暂存**
7. **自动更新**（electron-updater）
8. **代码签名与公证**、正式渠道分发
9. **Windows / Linux** 正式适配与测试
10. **深链接协议**（`gitgui://` 从浏览器一键克隆）

---

## 10. 附录

### 10.1 术语表

| 术语 | 含义 |
|---|---|
| Commit Graph | 提交历史 DAG 的图形化视图 |
| WIP | Work In Progress，未提交改动节点（图顶端虚拟节点） |
| hunk | diff 中的一个连续变更块 |
| porcelain | git 面向 UI 的稳定输出命令（如 `git status --porcelain`） |
| plumbing | git 底层命令（如 `rev-list`、`write-tree`） |
| lane | 图中一条纵向提交通道（泳道） |
| non-FF | non fast-forward，push 被拒的经典场景 |
| RepoRef | 本项目对远程仓库地址的统一抽象 |

### 10.2 GitKraken 官方文档索引（调研来源）

- 总入口：https://help.gitkraken.com/gitkraken-desktop/
- 界面：/interface/ · 命令面板：/command-palette/ · 快捷键：/keyboard-shortcuts/ · 偏好设置：/preferences/
- 文件操作：/adding-and-removing/ · cherry-pick：/cherrypick/ · 提交：/commits/ · detached HEAD：/detached-head-state/ · diff/blame：/diff/ · 编辑文件：/editing-files/
- 暂存：/staging/ · squash：/squash/ · stash：/stashing/ · 搜索：/search/ · 撤销重做：/undo-and-redo/
- 克隆/初始化：/open-clone-init/ · 活动日志：/activity-logs/ · 收藏：/favorites/ · 分支合并：/branching-and-merging/ · 交互式 rebase：/interactive-rebase/
- push/pull/fetch：/pushing-and-pulling/ · PR：/pull-requests/ · submodule：/submodules/ · tags：/tags/ · 终端：/terminal/ · worktrees：/worktrees/
- Git hooks：/githooks/ · Hide/Solo：/hiding-and-soloing/ · deep linking：/linking/ · Gitflow：/git-flow/ · LFS：/git-lfs/ · 签名：/commit-signing-with-gpg/ · GitHub Actions：/github-actions/
- 集成：/github-gitkraken-desktop/ · /azure-devops/ · 实验特性：/experimental-features/（Git Executable 迁移佐证）
- 官网：https://gitkraken.com/git-client

### 10.3 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-13 | v1.0 | 定稿：范围（GitHub+ADO 仅 PR；无 agent/AI/Issues/CI/搜索/fork）、技术方案、P0–P5 阶段计划 |

