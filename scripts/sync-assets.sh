#!/usr/bin/env bash
# ============================================================
#  只同步图片资源（matches/、members/、team/、images/）。
#  比 push-to-server.sh / pull-from-server.sh 更快，因为不传代码。
#
#  用法:
#    ./scripts/sync-assets.sh push [--dry-run]   # 本地 → 服务器
#    ./scripts/sync-assets.sh pull [--dry-run]   # 服务器 → 本地
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/deploy-common.sh"

DIRECTION="${1:-}"
shift || true
DRY_RUN=0
ASSUME_YES=0

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    --yes|-y)     ASSUME_YES=1 ;;
    *) log_error "未知参数: $arg"; exit 1 ;;
  esac
done

case "$DIRECTION" in
  push|pull) ;;
  *)
    log_error "用法: $0 push|pull [--dry-run]"
    exit 1
    ;;
esac

ASSET_DIRS=(matches/ members/ team/ images/)

log_info "方向: $DIRECTION"
log_info "同步目录: ${ASSET_DIRS[*]}"
[ "$DRY_RUN" = "1" ] && log_warn "DRY-RUN 模式"

RSYNC_CMD=(rsync "${RSYNC_OPTS_COMMON[@]}" "--info=progress2")
[ "$DRY_RUN" = "1" ] && RSYNC_CMD+=("--dry-run")
RSYNC_CMD+=("-e" "$REMOTE_SHELL")

if [ "$DIRECTION" = "push" ]; then
  for dir in "${ASSET_DIRS[@]}"; do
    [ -d "$PROJECT_ROOT/$dir" ] || continue
    log_info "上传 $dir ..."
    "${RSYNC_CMD[@]}" "$PROJECT_ROOT/$dir" "$REMOTE_TARGET/" \
  || log_warn "  $dir 上传失败，跳过"
  done
else
  for dir in "${ASSET_DIRS[@]}"; do
    log_info "下载 $dir ..."
    "${RSYNC_CMD[@]}" "$REMOTE_TARGET/$dir" "$PROJECT_ROOT/" \
  || log_warn "  $dir 下载失败或不存在，跳过"
  done
fi

echo ""
log_ok "$DIRECTION 完成 ✓"