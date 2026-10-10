# DeepSeek Harness — Community Linux Distribution

[中文](README.zh.md) | [English](README.md)

> **About this repository:** a community **Linux distribution fork** of
> [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> (official project by [DeepSeek AI](https://deepseek.com)).
> This fork only adds **installable Linux desktop builds** — the core runtime is
> unmodified. The official project documentation lives in the
> [upstream repository](https://github.com/deepseek-ai/deepseek-harness) and the
> [official docs site](https://deepseek-harness.github.io/deepseek-harness/).
>
> **关于本仓库：** 官方 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> （[DeepSeek AI](https://deepseek.com) 开发）的**社区 Linux 发行 fork**，
> 只增加「可安装的 Linux 桌面构建」，核心运行时不做改动。官方说明以上游仓库与
> [官方文档](https://deepseek-harness.github.io/deepseek-harness/) 为准。

## What this fork provides / 本仓库特点

- **Installable `.deb` (Ubuntu/Debian, amd64)** — packaged in this repo's
  [GitHub Releases](https://github.com/klzone/deepseek-harness/releases) with
  SHA256 checksums (`SHA256SUMS`). 可在 Releases 直接下载 `.deb` 安装。
- **Baseline & parity**: current `.deb` release is based on official dsh
  `0.2.1-alpha.2` (upstream commit `d743267`); the earlier iteration was based
  on `0.2.0-rc.2` (commit `639ed01`) / upstream `0.2.1-alpha.1`. The dsh
  runtime inside is byte-identical to the official win/mac build of the same
  base — only Linux packaging/integration is changed.
  当前 `.deb` 基于官方 dsh `0.2.1-alpha.2`（上游提交 `d743267`）；更早的迭代
  基于 `0.2.0-rc.2`（`639ed01`）/ 上游 `0.2.1-alpha.1`。核心运行时与同一基线的
  官方 win/mac 构建逐字节一致，本仓库只改 Linux 打包/集成。
- **Launch fix**: `postinst` installs and loads the bundled **AppArmor
  profile** (grants `userns`) and keeps `chrome-sandbox` at `root:0755`, so the
  Chromium zygote uses the **user-namespace sandbox** in every launch context
  (terminal, menu, systemd). Fixes "cannot start" on systems with
  `kernel.apparmor_restrict_unprivileged_userns=1` (e.g. Ubuntu 26.04).
  安装时自动安装/加载随包 AppArmor profile（放行 userns），`chrome-sandbox`
  保持 0755 不走 SUID，受限 userns 系统（如 Ubuntu 26.04）任意上下文均可启动。
- **Desktop integration**: `.desktop` entry, standard-size hicolor icon set
  (512/256/128/64/48/32/24/16, generated from the 1104px artwork) and
  icon/desktop-database cache refresh in `postinst`; window association with
  the dock pinned launcher aligned via `desktopName`. 应用菜单与 dock 图标
  正常显示。
- **AppImage builds (x64 / arm64)** from source — see [LINUX.md](LINUX.md)
  (`linux-desktop-build` branch).

## Quick install (`.deb`) / 快速安装

```bash
cd /tmp
REL=https://github.com/klzone/deepseek-harness/releases/download/dsh-desktop-linux-0.2.1-alpha.2
curl -LO "$REL/deepseek-harness-0.2.1-alpha.2-linux-amd64.deb"
curl -LO "$REL/SHA256SUMS-0.2.1-alpha.2"
sha256sum -c SHA256SUMS-0.2.1-alpha.2
sudo apt install ./deepseek-harness-0.2.1-alpha.2-linux-amd64.deb
```

启动：`deepseek-harness`（或从应用菜单）。Start with `deepseek-harness`
(or from the application menu).

> **Version ordering note / 版本序说明**: the earlier
> `dsh-desktop-linux-0.2.1-alpha.5` release carries dpkg package version
> `0.2.1~alpha.5` (a community repackaging of the *older* upstream
> `0.2.1-alpha.1` base). This release is package version `0.2.1~alpha.2` —
> semantically newer content, but lower in dpkg ordering. If `0.2.1~alpha.5`
> is installed, upgrade with
> `sudo apt install --allow-downgrade ./…-alpha.2…deb`, or
> `sudo apt purge deepseek-harness` first.
> 若本机装过更早发布的 `0.2.1~alpha.5`（基于旧上游 alpha.1 的重打包），
> 安装本包需 `sudo apt install --allow-downgrade` 或先 `sudo apt purge
> deepseek-harness`。

## Build from source (AppImage) / 从源码构建

```bash
git checkout linux-desktop-build
pnpm install   # .npmrc uses npmmirror; remove it for the official registry
pnpm --filter @deepseek-ai/dsh-desktop run package:linux:x64     # x86_64
# pnpm --filter @deepseek-ai/dsh-desktop run package:linux:arm64  # arm64
chmod +x DeepSeek-Harness-*.AppImage && ./DeepSeek-Harness-*.AppImage
```

Per-file changes vs. the official baseline are documented in [LINUX.md](LINUX.md).
相对官方基线的逐项改动见 [LINUX.md](LINUX.md)。

## Official project / 官方项目

- Repository & docs source: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Documentation: [deepseek-harness.github.io/deepseek-harness](https://deepseek-harness.github.io/deepseek-harness/)
- Feedback & bug reports: [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Safety notice (official): [SAFETY.md](SAFETY.md)

## License / 许可证

[MIT](LICENSE)
