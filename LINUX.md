# DSH Desktop on Linux（社区发行说明）

> **性质**：这是 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> 的 **社区 Linux 发行 fork**，基线为官方 `dsh 0.2.0-rc.2`（上游提交 `639ed01`）。
> 官方仓库目前只接收插件生态贡献、不收源码 PR（见官方 `CONTRIBUTING.zh.md`），
> 因此本 fork 作为「可复现的 Linux 构建源」独立维护，欢迎 clone / 构建 / 使用。

## 它能做什么

- 在 **Linux x64 / arm64** 上编译出 **DSH Desktop（Electron 壳）AppImage**
- 核心引擎与官方 win/mac 版完全一致（同 `0.2.0-rc.2`、同上游 commit）
- 内置 dsh 运行时（`prepare:dsh` 物化 `resources/app.asar/dsh`），CLI `dsh web/headless/tui` 可用

## 相对官方基线做了哪些适配

| 文件 | 改动 |
|------|------|
| `apps/desktop/scripts/desktop-build-paths.mjs` | `SUPPORTED_TARGETS` 增加 `linux-x64` / `linux-arm64`；`desktopTargetPlatform` 支持 `linux` 平台解析 |
| `apps/desktop/scripts/electron-builder-config.mjs` | Linux 出包走 unsigned、不启用 auto-update feed 与 policy service；Linux 图标 / 可执行名 `deepseek-harness`；target=AppImage + deb |
| `apps/desktop/scripts/prepare-dsh.ts` | Linux 运行时调整钩子：装 electron-safe sharp、修 LibreOfficeKit 引擎探测 |
| `apps/desktop/scripts/linux-runtime-adjustments.ts`（新增） | ① 用 `@janhapke/sharp-electron` 替换 sharp（规避 Electron 下 glib 符号冲突，electron/electron#46323，带 SHA-256 校验）② 修 ASAR 里 `lstatSync` 探测 LibreOfficeKit 原生引擎的 `null`/`undefined` 判定，使 Linux 能正确回退 WASM 引擎 |
| `apps/desktop/scripts/prepare-cli.ts` | CLI 启动器平台参数增加 `linux`；非 win32（含 linux）`chmod 0755` |
| `apps/desktop/scripts/prepare-runtime.ts` | 运行时平台解析支持 `linux`；Electron 可执行路径按平台选择 |
| `apps/desktop/package.json` | 增加 `homepage`（electron-builder metadata）+ `author`（deb 包元数据）；新增 `package:linux:x64` / `package:linux:arm64` 等 npm scripts |
| `apps/desktop/scripts/package-target.ts` | `DesktopPackageTargetName`/`TARGETS` 增加 `linux-x64` / `linux-arm64`；`writeReleaseRecord` 对 linux 跳过 auto-update 配置 |
| `apps/desktop/scripts/desktop-package-environment.{mjs,d.mts}` | linux 跳过 `.env.<plat>` 文件读取（unsigned 无凭据）；类型放宽 |
| `apps/desktop/scripts/desktop-toolchain-preflight.ts` | 平台联合类型放宽到 `linux` |
| `apps/desktop/scripts/desktop-auto-update-environment.{mjs,d.mts}` | `DesktopAutoUpdateTarget` 放宽到 `linux-x64` / `linux-arm64` |
| `apps/desktop/scripts/desktop-upload-plan.ts` | `TARGETS` 记录加 `linux-x64` / `linux-arm64` |
| `apps/desktop/src/linux-update-checker.ts`（新增） | 社区版"检查更新"：无 ESR feed 时回退查 fork 的 GitHub Releases（`GitHubReleaseUpdateChecker`） |
| `apps/desktop/src/update-coordinator.ts` | 构造器加 `linuxChecker` / `openReleasePage` 注入；`doCheck` 无 feed 时走社区检查器；`download`/`install` 对 Linux 社区版改为打开 Release 页 |
| `apps/desktop/src/ipc.ts` | `DesktopUpdateState` 加 `linuxRelease` 字段 |
| `apps/desktop/src/main.ts` | 构造 coordinator 时注入 Linux 检查器（`DSH_DESKTOP_UPDATE_REPO`，默认 `klzone/deepseek-harness`）；`openUpdatePrompt` 识别 `linuxRelease` 状态直接打开 Release 页 |
| `apps/desktop/src/locale.ts` | 中英文案：`updateCommunityNewerTitle` / `updateCommunityNewerDetail` / `updateCommunityLatest` |
| `update.sh`（新增） | 一键升级脚本：拉 fork 最新 Release 的 `.deb`，SHA-256 校验后 `dpkg -i` 原地升级；`--check-only` / `--version` 可选 |
| `.npmrc`（新增） | npmmirror registry + 重试参数（CN 网络构建提速） |

**不影响**现有 `mac-arm64` / `mac-x64` / `win-x64` 目标（Linux 相关逻辑全部按平台分支，mac/win 行为不变）。

## 前置依赖（Linux）

- Node.js（≥ 18，建议 20/22）+ pnpm
- 系统图形栈：AppImage 基于 Electron/Chromium，需要 `libnss3`、`libgbm`、`libasound2`、`libxss1` 等（Ubuntu/Debian 一般自带；最小环境按需装）
- 网络：`prepare-dsh` 会下载 electron-safe sharp 预编译包（默认走 npmmirror，失败回退 npmjs）

## 构建步骤

```bash
git clone https://github.com/klzone/deepseek-harness.git
cd deepseek-harness

# 1) 装依赖（.npmrc 已配 npmmirror；海外可删掉该行走官方 registry）
pnpm install

# 2) 出 AppImage（按你的 CPU 选一个；这些脚本已在本 fork 加好）
pnpm --filter @deepseek-ai/dsh-desktop run package:linux:x64
# 或 arm 板：
pnpm --filter @deepseek-ai/dsh-desktop run package:linux:arm64

# 产物在 apps/desktop/.desktop-build/dist/linux-x64/*.AppImage（--dir 出目录包）
```

> 注：`package:linux:x64` 走 `scripts/package-target.ts linux-x64`，本 fork 已在该脚本的
> `TARGETS` 里注册了 `linux-x64` / `linux-arm64`（electron-builder `--linux` 选择器），
> 无需手写 `tsx scripts/package-target.ts linux-x64` 命令。

## 验证

```bash
# 1) 直接跑 CLI（不打包也行）：起 web 服务
cd apps/desktop/.desktop-build/targets/linux-x64/dsh
node node_modules/@deepseek-ai/dsh/lib/bin.js web --no-open
# 看到 "dsh web: http://127.0.0.1:<port>?token=..." 即运行时 OK

# 2) 起 AppImage
./DeepSeek-Harness-<version>.AppImage
```

## 升级与"检查更新"

**应用内检查更新**：本构建没有官方 ESR 更新通道（unsigned、无 feed），菜单里的
**"应用 → 检查更新"** 会自动回退到社区检查器（`src/linux-update-checker.ts`）：
查 fork 的最新 GitHub Release（`DSH_DESKTOP_UPDATE_REPO`，默认 `klzone/deepseek-harness`），
发现更新的 `.deb`/AppImage 时在浏览器打开对应 Release 页面。默认仓库可配：

```bash
DSH_DESKTOP_UPDATE_REPO=your-fork/repo ./deepseek-harness.AppImage
```

**一键升级脚本**（`update.sh`，已提交在 `linux-desktop-build` 分支）：

```bash
# 拉本 fork 最新 Release 的 .deb，校验 SHA-256 后 dpkg -i 原地升级（保留数据）
curl -fsSL https://raw.githubusercontent.com/klzone/deepseek-harness/linux-desktop-build/update.sh -o update.sh
chmod +x update.sh
./update.sh            # 升级
./update.sh --check-only   # 只查有无新版
```

**手动升级**：下载 Release 里新版 `.deb` 后 `sudo dpkg -i 新版.deb`，或替换 AppImage 文件重跑。

**已知启动告警（不影响使用）**：
- 若 `~/.dsh` profile 里残留 0.1.x 时代的插件（`dsh-tauri*`、旧 settings API 插件等），
  0.2.0-rc.2 运行时会安全 skip 并打 warning，属预期；
- `dsh doctor` 子命令在 rc.2 未实装，请勿当作体检命令，用 `--version` / `web` 起服务验证。

## 与官方 win/mac 版的出入（结论）

- **核心引擎**：完全一致（同版本、同 commit、同子包集合）
- **平台差异（正常）**：`dsh-sandbox-windows-acl`、`dsh-win32-process`、`dsh-pwsh-local`
  等 Windows 专属包在 Linux 上不生效；`apps/desktop/cli/dsh` 启动脚本里的
  `MacOS/...` 路径是 mac 包结构残留，Linux 请走 `.desktop-build/targets/linux-x64` 产物
- **签名**：官方 win/mac 有 codesign/notarize；本发行 unsigned（Linux 无强制签名，不影响运行）

## 维护约定

- 上游发新 rc/正式版时：在本 fork 上 rebase 基线并回归 Linux 适配文件（见上表），保证「官方基线 + Linux」始终可构建
- 欢迎 PR 回本 fork（`klzone/deepseek-harness`）：修 Linux 构建、补文档、加 CI 均可
- 按官方建议，本仓库带 `dsh-plugin` 话题，便于被社区发现
- 出新版流程：改代码 → 本地出 AppImage + deb → 上传到 Release（含 SHA256SUMS.txt）→ 用户跑 `update.sh` 或应用内"检查更新"拿到新版
