#!/usr/bin/env bash
#
# update.sh — 一键升级本机已安装的 DSH Desktop (Linux DEB 版)
#
# 用法:
#   ./update.sh              检查并升级到 fork 最新 Release 的 .deb
#   ./update.sh --check-only 只查有没有新版, 不升级
#   ./update.sh --version 0.2.1   升到指定版本 (需对应 Release 里有 .deb)
#
# 原理:
#   1. 读当前已安装版本 (dpkg -s deepseek-harness)
#   2. 查 fork 最新 Release 里的 .deb 资产 URL
#   3. 下载 → 校验 SHA-256 → sudo dpkg -i 原地升级 (保留数据)
#
# 可选: 挂 cron 自动检查 (见文件末尾注释)

set -euo pipefail

REPO="klzone/deepseek-harness"
PKG="deepseek-harness"
API="https://api.github.com"
CHECK_ONLY=0
TARGET_VERSION=""

for arg in "$@"; do
  case "$arg" in
    --check-only) CHECK_ONLY=1 ;;
    --version) shift || true; TARGET_VERSION="${1:-}" ;;
    -h|--help) grep '^# ' "$0" | sed 's/^# //'; exit 0 ;;
    *) echo "unknown arg: $arg"; exit 2 ;;
  esac
done

# --- 当前已安装版本 (没装则为空) ---
CURRENT=""
if dpkg -s "$PKG" &>/dev/null; then
  CURRENT="$(dpkg-query -W -f='${Version}' "$PKG" 2>/dev/null || true)"
fi

# --- 目标版本 (默认 = 最新 Release) ---
if [[ -n "$TARGET_VERSION" ]]; then
  TAG="dsh-desktop-linux-${TARGET_VERSION}"
else
  # 最新 Release 的 tag_name
  TAG="$(curl -fsSL "$API/repos/$REPO/releases/latest" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tag_name",""))')"
  [[ -n "$TAG" ]] || { echo "✗ 拿不到最新 Release tag"; exit 1; }
fi

# --- 该 Release 里的 .deb 资产 + 校验 ---
ASSETS_JSON="$(curl -fsSL "$API/repos/$REPO/releases/tags/$TAG")"
read -r DEB_URL SHA_LINE <<<"$(python3 - "$TAG" <<'PY'
import json, sys, urllib.request
tag = sys.argv[1]
url = "https://api.github.com/repos/klzone/deepseek-harness/releases/tags/" + tag
d = json.load(urllib.request.urlopen(url))
deb = next((a["browser_download_url"] for a in d["assets"] if a["name"].endswith(".deb")), None)
# SHA256SUMS.txt 内容
sha = ""
for a in d["assets"]:
    if a["name"] == "SHA256SUMS.txt":
        sha = urllib.request.urlopen(a["browser_download_url"]).read().decode()
print(deb or "", sha.strip())
PY
)"
[[ -n "$DEB_URL" ]] || { echo "✗ Release $TAG 里没有 .deb 资产"; exit 1; }

NEW_VER="${TAG#dsh-desktop-linux-}"
echo "当前版本: ${CURRENT:-未安装}"
echo "最新版本: $NEW_VER"
if [[ -n "$CURRENT" && "$CURRENT" == "$NEW_VER" ]]; then
  echo "✓ 已是最新, 无需升级"
  exit 0
fi
if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "(--check-only, 不下载)"
  exit 0
fi

# --- 下载 + 校验 + 安装 ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "下载 .deb ..."
curl -fsSL -o "$TMP/$PKG.deb" "$DEB_URL"

# 校验 (仅当 Release 提供了 SHA256SUMS.txt)
if [[ -n "$SHA_LINE" && -f <(echo "$SHA_LINE") ]]; then
  echo "$SHA_LINE" > "$TMP/SHA256SUMS.txt"
  ( cd "$TMP" && sha256sum -c SHA256SUMS.txt ) \
    || { echo "✗ SHA-256 校验失败, 放弃安装"; exit 1; }
  echo "✓ 校验通过"
fi

echo "安装 (需要 sudo) ..."
sudo dpkg -i "$TMP/$PKG.deb"
# 补依赖 (electron 应用常缺的运行时库)
sudo apt-get install -f -y &>/dev/null || true

echo "✓ 已升级到 $NEW_VER"
echo "启动: $(command -v "$PKG" || echo '从菜单/桌面启动器找 DeepSeek Harness')"

# ------------------------------------------------------------------
# 可选: 全自动 (每周日晚上 2 点自动检查+升级)
#   crontab -e  加一行:
#   0 2 * * 7 /path/to/update.sh >> ~/.dsh-update.log 2>&1
# ------------------------------------------------------------------
