#!/usr/bin/env bash
# ============================================================
#  启动本地预览服务器（与生产一致的环境）。
#  默认端口 3000，可在第一个参数传入自定义端口。
#
#  用法:
#    ./scripts/preview.sh              # 默认 3000
#    ./scripts/preview.sh 8080         # 自定义端口
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${1:-3000}"
cd "$PROJECT_ROOT"

# 优先使用 Node 的 server.js；如未安装 npm 依赖则提示
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules 未安装，先执行 npm install..."
  npm install
fi

echo "ℹ️  启动本地预览服务器"
echo "ℹ️  端口: $PORT"
echo "ℹ️  地址: http://localhost:${PORT}/"
echo "ℹ️  停止: Ctrl+C"
echo ""

exec node server.js "$PORT"