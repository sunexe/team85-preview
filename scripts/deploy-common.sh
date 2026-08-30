#!/usr/bin/env bash
# ============================================================
#  公共加载脚本，被 push / pull / sync-assets 等脚本 source。
#  负责加载 .deploy.env 并校验必需变量。
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 加载配置：优先 .deploy.env，其次 .deploy.env.example
if [ -f "$SCRIPT_DIR/.deploy.env" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.deploy.env"
elif [ -f "$SCRIPT_DIR/.deploy.env.example" ]; then
  echo "⚠️  scripts/.deploy.env 不存在，加载 .deploy.env.example（默认值）"
  echo "   首次使用请执行: cp scripts/.deploy.env.example scripts/.deploy.env"
  echo ""
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.deploy.env.example"
fi

# 校验必需变量
: "${DEPLOY_HOST:?缺少 DEPLOY_HOST，请编辑 scripts/.deploy.env}"
: "${DEPLOY_USER:?缺少 DEPLOY_USER，请编辑 scripts/.deploy.env}"
: "${DEPLOY_PATH:?缺少 DEPLOY_PATH，请编辑 scripts/.deploy.env}"

# 拼接 SSH 选项
# StrictHostKeyChecking=accept-new: 首次连接自动信任并记录服务器指纹（TOFU），
# 之后指纹若变化则拒绝连接，防中间人。避免全新环境里 ssh 交互式询问卡死。
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
[ -n "${DEPLOY_PORT:-}" ] && SSH_OPTS+=(-p "$DEPLOY_PORT")
[ -n "${DEPLOY_SSH_KEY:-}" ] && [ -f "$DEPLOY_SSH_KEY" ] && SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")

# 拼接远程 shell 字符串（rsync 用）
if [ ${#SSH_OPTS[@]} -gt 0 ]; then
  REMOTE_SHELL="ssh ${SSH_OPTS[*]}"
else
  REMOTE_SHELL="ssh"
fi

# 拼接 rsync 排除参数
EXCLUDE_ARGS=("${EXCLUDES[@]}")
# 防御性排除：访客互动运行时数据绝不能被 --delete 抹掉（即使 .deploy.env 漏配此条）
EXCLUDE_ARGS+=("--exclude=data/interactions/")

# 远程 rsync 路径
REMOTE_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

# 彩色输出
if [ -t 1 ]; then
  C_RESET=$'\033[0m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'
else
  C_RESET=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
fi

log_info()  { echo "${C_BLUE}ℹ${C_RESET}  $*"; }
log_ok()    { echo "${C_GREEN}✓${C_RESET}  $*"; }
log_warn()  { echo "${C_YELLOW}⚠${C_RESET}  $*"; }
log_error() { echo "${C_RED}✗${C_RESET}  $*" >&2; }

# 确认函数：默认 N 除非 -y 标志
confirm() {
  local prompt="${1:-Continue?}"
  if [ "${ASSUME_YES:-0}" = "1" ] || [ "${FORCE:-0}" = "1" ]; then
    return 0
  fi
  read -r -p "$(echo -e "${C_YELLOW}?${C_RESET}  $prompt [y/N] ")" reply
  case "$reply" in
    [Yy]|[Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}