#!/usr/bin/env bash
# ============================================================
#  把本地修改推送到服务器（rsync over SSH）。
#
#  用法:
#    ./scripts/push-to-server.sh                 # 交互式确认
#    ./scripts/push-to-server.sh --dry-run       # 只显示会做什么
#    ./scripts/push-to-server.sh --yes           # 跳过确认
#    ./scripts/push-to-server.sh --no-delete     # 不删除服务器多余文件
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/deploy-common.sh"

DRY_RUN=0
ASSUME_YES=0
DO_DELETE=1
PUSH_PROGRESS=1

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n)    DRY_RUN=1; shift ;;
    --yes|-y)        ASSUME_YES=1; shift ;;
    --no-delete)     DO_DELETE=0; shift ;;
    --no-progress)   PUSH_PROGRESS=0; shift ;;
    -h|--help)
      sed -n '3,12p' "$0"
      exit 0 ;;
    *) log_error "未知参数: $arg"; exit 1 ;;
  esac
done

log_info "项目根目录: $PROJECT_ROOT"
log_info "部署目标:   $REMOTE_TARGET"
echo ""

# 1. 预检：是否有未提交改动
if command -v git >/dev/null 2>&1 && [ -d "$PROJECT_ROOT/.git" ]; then
  if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]; then
    log_warn "检测到未提交的改动:"
    git -C "$PROJECT_ROOT" status --short | sed 's/^/    /'
    echo ""
    if [ "$ASSUME_YES" != "1" ]; then
      if ! confirm "继续推送（不会自动提交）？"; then
        log_info "已取消"
        exit 0
      fi
    fi
  fi
fi

# 2. 拼装 rsync 命令
RSYNC_CMD=(rsync "${RSYNC_OPTS_COMMON[@]}")

if [ "$DO_DELETE" = "0" ]; then
  # 用 --no-delete 覆盖脚本里可能的 --delete
  RSYNC_CMD=("${RSYNC_CMD[@]/--delete/--no-delete}")
fi

if [ "$DRY_RUN" = "1" ]; then
  RSYNC_CMD+=("--dry-run")
  log_warn "DRY-RUN 模式：不会真的修改任何东西"
fi

if [ "$PUSH_PROGRESS" = "1" ] && [ "$DRY_RUN" = "0" ]; then
  RSYNC_CMD+=("--info=progress2")
fi

RSYNC_CMD+=("${EXCLUDE_ARGS[@]}")
RSYNC_CMD+=("-e" "$REMOTE_SHELL")
RSYNC_CMD+=("$PROJECT_ROOT/")
RSYNC_CMD+=("$REMOTE_TARGET/")

echo ""
echo "准备执行:"
printf '  %s\n' "${RSYNC_CMD[@]}" | sed 's/ /\n  /g' | head -20
echo "  ..."
echo ""

# 3. 真正执行
"${RSYNC_CMD[@]}"
RSYNC_EXIT=$?

echo ""
if [ "$DRY_RUN" = "1" ]; then
  log_info "DRY-RUN 完成（上方列出了将会发生的变更）"
elif [ "$RSYNC_EXIT" = "0" ]; then
  log_ok "推送完成 ✓"
  log_info "访问 https://${DEPLOY_HOST}/ 验证"
else
  log_error "rsync 退出码: $RSYNC_EXIT"
  exit "$RSYNC_EXIT"
fi