# Git GUI

跨平台的 Git 桌面客户端（Electron + React + TypeScript），界面参考 GitKraken，主打**免费支持私有仓库**。

核心能力：提交图、分支/标签管理、暂存与差异对比、Fetch/Pull/Push、Stash、Worktree、PR 面板、内置终端、命令面板、多仓库工作区、AI 生成 Commit Message。

## 技术栈

| 层       | 选型                                   |
| -------- | -------------------------------------- |
| 桌面壳   | Electron 44 + electron-vite 5          |
| 渲染层   | React 19 + TypeScript + Tailwind CSS 4 |
| 状态管理 | Zustand                                |
| 终端     | xterm.js + node-pty                    |
| 校验     | Zod（IPC 入参）                        |
| 测试     | Vitest                                 |

## 环境要求

| 依赖     | 版本                                        | 说明                                         |
| -------- | ------------------------------------------- | -------------------------------------------- |
| Node.js  | ≥ 20.19（建议 22 LTS）                      | Vite 7 的最低要求；开发与打包均需要          |
| pnpm     | ≥ 9                                         | 仓库使用 `pnpm-lock.yaml`，请勿混用 npm/yarn |
| Git      | ≥ 2.30                                      | 需要 `git` 在 `PATH` 中                      |
| 操作系统 | macOS 12+（Apple Silicon）/ Windows 10+ x64 | 打包产物仅覆盖这两个平台                     |

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

仓库内的 `.npmrc` 已配置国内 Electron 镜像（`electron_mirror`），下载 Electron 二进制会快很多。
`postinstall` 会自动执行 `scripts/fix-pty-perms.js`，修复 pnpm 解包后丢失的 `node-pty` 执行位（否则内置终端启动会报 `posix_spawnp` 失败）。

### 2. 本地启动

```bash
pnpm dev
```

启动后：

- 渲染进程 dev server 监听 `http://localhost:5173`
- 主进程 / preload 由 electron-vite 编译到 `out/`，并自动拉起 Electron 窗口
- 改 `src/renderer/**` → 热更新，窗口不重启
- 改 `src/main/**`、`src/preload/**` → 自动重新编译并重启 Electron

关闭窗口后进程可能仍在后台常驻（macOS 习惯行为），再次启动会因单实例锁直接复用旧进程。彻底退出请 `Cmd+Q`，或在终端 `Ctrl+C`。

### 3. 测试与检查

```bash
pnpm test          # 跑一遍全部测试（Vitest）
pnpm test:watch    # 监听模式
pnpm typecheck     # tsc 检查 node + web 两套 tsconfig
pnpm lint          # ESLint
pnpm format        # Prettier 全量格式化
```

### 4. AI 生成 Commit Message（可选）

打开「设置 → AI 助手」，填写三项即可：

| 字段     | 示例                        | 说明                                                                       |
| -------- | --------------------------- | -------------------------------------------------------------------------- |
| 接口地址 | `https://api.openai.com/v1` | 任意 OpenAI 兼容的 base URL；误填成 `.../v1/chat/completions` 会被自动纠正 |
| 模型     | `gpt-4o-mini`               | 用服务商实际的模型名                                                       |
| API Key  | `sk-...`                    | 本地模型（`http://localhost:11434/v1`）可留空                              |

密钥以明文保存在本地 `settings.json`，不会进仓库；但它会随配置一起被复制，公共机器上请注意。

## 打包

打包分两步：`electron-vite build` 产出 `out/`，再交给 `electron-builder` 按 `electron-builder.yml` 生成安装包。

| 命令             | 目标平台       | 产物（`dist/`）                                                             |
| ---------------- | -------------- | --------------------------------------------------------------------------- |
| `pnpm build`     | 仅编译，不打包 | `out/`（可直接用 `pnpm preview` 预览）                                      |
| `pnpm build:mac` | macOS arm64    | `GitGUI-<version>-mac-arm64.dmg`、`GitGUI-<version>-mac-arm64.zip`          |
| `pnpm build:win` | Windows x64    | `GitGUI-<version>-windows-x64.zip`、`GitGUI-<version>-windows-portable.exe` |

产物命名、图标、`asar` 打包规则都在 `electron-builder.yml` 里：

- `asar: true`，但 `node-pty` 通过 `asarUnpack` 解包（原生模块不能进 asar）
- macOS 未签名（`identity: null`），Windows 未做代码签名
- 输出目录 `dist/` 已在 `.gitignore` 中

### macOS

```bash
pnpm build:mac
```

未签名应用首次打开会被 Gatekeeper 拦截。解决方式任选其一：

```bash
# 方式一：右键 App → 打开
# 方式二：移除隔离属性
xattr -dr com.apple.quarantine "/Applications/GitGUI.app"
```

### Windows

```bash
pnpm build:win
```

`dist/win-unpacked/` 是解包后的完整目录。需要"绿色版"时直接压缩这个目录即可（`dist/` 里的 `GitGUI-windows-green.zip` 就是这类产物）。

`-portable.exe` 是单文件便携版，双击自解压运行；首次运行会被 SmartScreen 提示"未知发布者"，点「更多信息 → 仍要运行」。

### 跨平台打包说明

`node-pty` 自带 `darwin-arm64`、`darwin-x64`、`win32-arm64`、`win32-x64` 四套预编译二进制，因此**在 macOS 上可以直接打出 Windows 包**，反之亦然。

但要注意：

- **没有 Linux 预编译**，要出 Linux 包必须在 Linux 环境（或 Docker）里构建，并额外在 `electron-builder.yml` 中补 `linux` 配置
- 打包机需要能联网下载 Electron 对应平台的二进制（`.npmrc` 里已指向 npmmirror）
- 只想临时验证 Windows 版，可用 `pnpm build` 后手动 `electron-builder --win --x64 --dir`（不生成安装包，只出 `win-unpacked`）

## 常见问题

### 1. 启动报 `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`

环境里存在 `ELECTRON_RUN_AS_NODE=1`，Electron 被当成纯 Node 运行了。临时绕过：

```bash
env -u ELECTRON_RUN_AS_NODE pnpm dev      # macOS / Linux
```

```powershell
$env:ELECTRON_RUN_AS_NODE=""              # Windows PowerShell
pnpm dev
```

也可以直接把该变量从 shell 配置（`.zshrc` / 系统环境变量）里删掉。

### 2. 启动报 `sandbox initialization failed: Operation not permitted` 或 `Failed to unlink ... SingletonLock`

说明当前终端处于**受限沙箱**（AI Agent 的执行环境、部分容器、CI 的受限 runner）。Chromium 需要创建自己的沙箱并清理用户数据目录，被拒绝后必然崩溃。请在普通终端里运行 `pnpm dev`。

若上次崩溃留下了残留锁，先确认没有进程在跑，再删：

```bash
pgrep -f "git-gui" || echo "无进程"
rm -f "$HOME/Library/Application Support/git-gui/Singleton"{Lock,Socket,Cookie}
```

### 3. 端口 5173 被占用

改 `electron.vite.config.ts` 的 renderer 端口：

```ts
renderer: {
  server: { port: 5174 },
  // ...
}
```

或先释放占用：`lsof -i :5173`。

### 4. 内置终端起不来（`posix_spawnp failed`）

`node-pty` 的 `spawn-helper` 丢了可执行位。重跑安装脚本即可：

```bash
node scripts/fix-pty-perms.js
```

### 5. 设置项改了不生效

设置通过 IPC 用 Zod 校验后写入用户数据目录（macOS 为 `~/Library/Application Support/git-gui/settings.json`，Windows 在 `%APPDATA%` 下的同名目录）。若控制台出现 `ZodError`，说明传入值不符合 schema（例如宽度必须是整数），该次写入会被丢弃。想重置全部配置，删掉该目录即可。

## 目录结构

```
src/
  main/            Electron 主进程：窗口、IPC、Git 命令封装、Provider（GitHub/ADO）
    git/           所有 git 操作（ops/graph/diff/status/advanced）
  preload/         contextBridge 暴露的 window.api
  renderer/src/    React 界面
    layout/        三栏骨架、工具栏、左侧分支树、状态栏
    panel/         提交面板、差异面板
    graph/         提交图渲染
    pr/            PR 面板
    i18n/          中英文文案（zh/en 必须保持 key 与占位符一致）
  shared/          IPC 契约与 Zod schema、共享工具
tests/             Vitest 测试（fixtures 会创建临时 git 仓库）
docs/              项目计划与功能清单
scripts/           安装期辅助脚本
```
