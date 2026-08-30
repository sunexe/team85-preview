#!/usr/bin/env bash
# ============================================================
#  从服务器拉取最新文件到本地（rsync over SSH）。
#  用于服务器上有人直接改了图/JSON 时同步回本地。
#
#  用法:
#    ./scripts/pull-from-server.sh                   # 交互式确认
#    ./scripts/pull-from-server.sh --dry-run         # 只显示会做什么
#    ./scripts/pull-from-server.sh --yes             # 跳过确认
#    ./scripts/pull-from-server.sh --only=images     # 只同步图片
#    ./scripts/pull-from-server.sh --only=data       # 只同步 JSON 数据
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/deploy-common.sh"

DRY_RUN=0
ASSUME_YES=0
ONLY=""

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n)    DRY_RUN=1; shift ;;
    --yes|-y)        ASSUME_YES=1; shift ;;
    --only=*)        ONLY="${arg#--only=}"; shift ;;
    -h|--help)
      sed -n '3,12p' "$0"
      exit 0 ;;
    *) log_error "未知参数: $arg"; exit 1 ;;
  esac
done

log_info "项目根目录: $PROJECT_ROOT"
log_info "拉取源:     $REMOTE_TARGET"
echo ""

# 警告：pull 会覆盖本地改动
log_warn "此操作会用服务器上的文件覆盖本地同名文件"
log_warn "如果你有未提交的本地改动，请先 git stash 或 commit"
echo ""
if ! confirm "确认从服务器拉取？"; then
  log_info "已取消"
  exit 0
fi

# 拼装 rsync 命令
RSYNC_CMD=(rsync "${RSYNC_OPTS_COMMON[@]}")

if [ "$DRY_RUN" = "1" ]; then
  RSYNC_CMD+=("--dry-run")
fi

# 默认拉取全部目录；如果指定 --only 则只拉对应子目录
case "$ONLY" in
  "")
    # 全量拉取
    RSYNC_CMD+=("${EXCLUDE_ARGS[@]}")
    RSYNC_CMD+=("--exclude-from=<(echo '.git/')")
    REMOTE_SUBDIR=""
    LOCAL_SUBDIR=""
    ;;
  images)
    REMOTE_SUBDIR="matches/ members/ team/ images/"
    LOCAL_SUBDIR="matches/ members/ team/ images/"
    ;;
  data)
    REMOTE_SUBDIR="data/"
    LOCAL_SUBDIR="data/"
    ;;
  code)
    REMOTE_SUBDIR="css/ js/ *.html *.xml *.txt favicon.ico"
    LOCAL_SUBDIR="."
    ;;
  *)
    log_error "--only 必须是 images | data | code"
    exit 1
    ;;
esac

RSYNC_CMD+=("-e" "$REMOTE_SHELL")

if [ -n "$REMOTE_SUBDIR" ]; then
  # 多目录拉取
  for sub in $REMOTE_SUBDIR; do
    src="${REMOTE_TARGET}/${sub%/}"
    dst="${LOCAL_SUBDIR%/}/"
    log_info "拉取 ${sub} ..."
    "${RSYNC_CMD[@]}" "${src}" "${dst}" || log_warn "  跳过（可能不存在）"
  done
else
  RSYNC_CMD+=("$REMOTE_TARGET/")
  RSYNC_CMD+=("$PROJECT_ROOT/")
  "${RSYNC_CMD[@]}"
fi

RSYNC_EXIT=$?

echo ""
if [ "$DRY_RUN" = "1" ]; then
  log_info "DRY-RUN 完成"
elif [ "$RSYNC_EXIT" = "0" ]; then
  log_ok "拉取完成 ✓"
else
  log_error "rsync 退出码: $RSYNC_EXIT"
  exit "$RSYNC_EXIT"
fi