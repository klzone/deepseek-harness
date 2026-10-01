# DeepSeek Harness

English | [中文](README.zh.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

## 社区 Linux 发行说明（本 fork）

> 本仓库为官方 `deepseek-harness` 的社区 Linux 构建 fork（基线：dsh 0.2.0-rc.2，上游提交 `639ed01`）。
> 官方仓库暂不接受源码 PR，故 Linux 桌面构建支持在此独立维护。详见 **[LINUX.md](LINUX.md)**（`linux-desktop-build` 分支）。

### 在 Linux 上快速构建 DSH Desktop（AppImage）

```bash
# 1. 切到含 Linux 适配的分支
git checkout linux-desktop-build

# 2. 安装依赖（.npmrc 已配 npmmirror；海外可删掉该文件走官方 registry）
pnpm install

# 3. 出 AppImage（按 CPU 选）
pnpm --filter @deepseek-ai/dsh-desktop run package:linux:x64      # x86_64
# pnpm --filter @deepseek-ai/dsh-desktop run package:linux:arm64  # arm 板

# 4. 运行（产物在 apps/desktop/.desktop-build/dist/linux-x64/）
chmod +x DeepSeek-Harness-*.AppImage && ./DeepSeek-Harness-*.AppImage
```

验证运行时可执行 `dsh web` 起本地服务：
```bash
cd apps/desktop/.desktop-build/targets/linux-x64/dsh
node node_modules/@deepseek-ai/dsh/lib/bin.js web --no-open
```

---

以下为主项目说明（官方原文）。
