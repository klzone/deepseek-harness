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
- **Baseline & parity**: official dsh `0.2.0-rc.2` (upstream commit `639ed01`),
  packaging iteration `0.2.1`; the dsh runtime inside is byte-identical to the
  official win/mac builds — only Linux packaging/integration is changed.
  核心运行时与官方版本逐字节一致，本仓库只改 Linux 打包/集成。
- **Launch fix (`0.2.1-alpha.4`/`alpha.5`)**: `postinst` installs and loads the
  bundled **AppArmor profile** (grants `userns`) and keeps `chrome-sandbox` at
  `root:0755`, so the Chromium zygote uses the **user-namespace sandbox**.
  Fixes "cannot start" on systems with
  `kernel.apparmor_restrict_unprivileged_userns=1` (e.g. Ubuntu 26.04) — verified
  from a plain terminal launch. 修复受限 userns 系统（如 Ubuntu 26.04）安装后
  「无法启动」的问题，终端/菜单/systemd 任意上下文均可启动。
- **Desktop integration**: `.desktop` entry, standard-size hicolor icon set
  (512/256/128/64/48/32/24/16) and icon/desktop-database cache refresh in
  `postinst`. 应用菜单与 dock 图标正常显示。
- **AppImage builds (x64 / arm64)** from source — see [LINUX.md](LINUX.md)
  (`linux-desktop-build` branch).

## Quick install (`.deb`) / 快速安装

```bash
cd /tmp
REL=https://github.com/klzone/deepseek-harness/releases/download/dsh-desktop-linux-0.2.1-alpha.5
curl -LO "$REL/deepseek-harness-0.2.1-alpha.5-linux-amd64.deb"
curl -LO "$REL/SHA256SUMS-alpha.5"
sha256sum -c SHA256SUMS-alpha.5
sudo dpkg -i deepseek-harness-0.2.1-alpha.5-linux-amd64.deb
```

启动：`deepseek-harness`（或从应用菜单）。Start with `deepseek-harness`
(or from the application menu).

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
