# DeepSeek Harness — 社区 Linux 发行版

[English](README.md) | 中文

> **关于本仓库：** 官方 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> （[DeepSeek AI](https://deepseek.com) 开发）的**社区 Linux 发行 fork**，
> 只增加「可安装的 Linux 桌面构建」，核心运行时不做改动。
> 官方项目说明以上游仓库 README（[英](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) /
> [中](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.zh.md)）与
> [官方文档](https://deepseek-harness.github.io/deepseek-harness/) 为准。

## 本仓库特点

- **可安装的 `.deb`（Ubuntu/Debian，amd64）**：发布在本仓库的
  [GitHub Releases](https://github.com/klzone/deepseek-harness/releases)，附 SHA256 校验文件（`SHA256SUMS`）。
- **基线与一致性**：官方 dsh `0.2.0-rc.2`（上游提交 `639ed01`），打包迭代 `0.2.1`；
  内置 dsh 运行时与官方 win/mac 版逐字节一致——本仓库只改 Linux 打包/集成。
- **启动修复（`0.2.1-alpha.4`/`alpha.5`）**：`postinst` 安装并加载自带的
  **AppArmor profile**（授予 `userns`），同时保持 `chrome-sandbox` 为 `root:0755`，
  让 Chromium zygote 走**用户命名空间沙箱**。修复
  `kernel.apparmor_restrict_unprivileged_userns=1` 系统（如 Ubuntu 26.04）
  安装后「无法启动」的问题——终端/菜单/systemd 任意上下文均可启动。
- **桌面集成**：`.desktop` 条目、标准尺寸 hicolor 图标集
  （512/256/128/64/48/32/24/16），`postinst` 刷新图标/桌面数据库缓存。
  应用菜单与 dock 图标正常显示。
- **AppImage 构建（x64 / arm64）**：见 [LINUX.md](LINUX.md)（`linux-desktop-build` 分支）。

## 快速安装（`.deb`）

```bash
cd /tmp
REL=https://github.com/klzone/deepseek-harness/releases/download/dsh-desktop-linux-0.2.1-alpha.5
curl -LO "$REL/deepseek-harness-0.2.1-alpha.5-linux-amd64.deb"
curl -LO "$REL/SHA256SUMS-alpha.5"
sha256sum -c SHA256SUMS-alpha.5
sudo dpkg -i deepseek-harness-0.2.1-alpha.5-linux-amd64.deb
```

启动：`deepseek-harness`（或从应用菜单）。

## 从源码构建（AppImage）

```bash
git checkout linux-desktop-build
pnpm install   # .npmrc 使用 npmmirror；海外可删除该文件走官方 registry
pnpm --filter @deepseek-ai/dsh-desktop run package:linux:x64     # x86_64
# pnpm --filter @deepseek-ai/dsh-desktop run package:linux:arm64  # arm64
chmod +x DeepSeek-Harness-*.AppImage && ./DeepSeek-Harness-*.AppImage
```

相对官方基线的逐项改动见 [LINUX.md](LINUX.md)。

## 官方项目

- 仓库与文档源：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 官方文档：[deepseek-harness.github.io/deepseek-harness](https://deepseek-harness.github.io/deepseek-harness/)
- 反馈与 bug：[GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- 官方安全说明：[SAFETY.zh.md](SAFETY.zh.md)

## 许可证

[MIT](LICENSE)

---

# 主项目说明（官方原文翻译）

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它构建于**一切皆插件**的架构之上，由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。

文档：[https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## 开发者预览

DeepSeek Harness 处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

运行本项目前，请阅读[安全说明](SAFETY.zh.md)。

<a id="run"></a>

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 会准备仓库产物。`pnpm dsh web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群！扫描下方二维码填写入群问卷，小助手会定期发送入群邀请。

<table>
  <thead>
    <tr>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

`pnpm run dev:web` 会在一个终端里完成构建、启动，并在源码修改时重建 client bundle；`make help` 列出 Web 与 Desktop 对应的 Make target。完整表格见开发指南的「应用命令」一节。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 引用

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
