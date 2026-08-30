#!/usr/bin/env bash
# ============================================================
#  对比本地与服务器：列出有差异的文件 (按 SHA256 校验)。
#  不修改任何文件，纯只读检查。
#
#  用法:
#    ./scripts/verify-mirror.sh                  # 全部对比
#    ./scripts/verify-mirror.sh --only=code      # 只对比代码
#    ./scripts/verify-mirror.sh --only=data      # 只对比 JSON
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/deploy-common.sh"

ONLY="all"
for arg in "$@"; do
  case "$arg" in
    --only=*) ONLY="${arg#--only=}"; shift ;;
    -h|--help)
      sed -n '3,10p' "$0"
      exit 0 ;;
    *) log_error "未知参数: $arg"; exit 1 ;;
  esac
done

log_info "项目根: $PROJECT_ROOT"
log_info "服务器: $REMOTE_TARGET"
log_info "范围:   $ONLY"
echo ""

# 远端文件清单：rsync --list-only 模式
REMOTE_LIST=$(mktemp)
trap 'rm -f "$REMOTE_LIST"' EXIT

log_info "获取服务器文件清单（rsync --list-only）..."
case "$ONLY" in
  all)
    rsync -e "$REMOTE_SHELL" --list-only --recursive \
      "${EXCLUDE_ARGS[@]}" \
      "$REMOTE_TARGET/" > "$REMOTE_LIST" 2>/dev/null || true
    ;;
  code)
    rsync -e "$REMOTE_SHELL" --list-only \
      "$REMOTE_TARGET/css/" "$REMOTE_TARGET/js/" \
      "$REMOTE_TARGET/"*.html "$REMOTE_TARGET/"*.xml "$REMOTE_TARGET/"*.txt \
      > "$REMOTE_LIST" 2>/dev/null || true
    ;;
  data)
    rsync -e "$REMOTE_SHELL" --list-only \
      "$REMOTE_TARGET/data/" > "$REMOTE_LIST" 2>/dev/null || true
    ;;
  *)
    log_error "--only 必须是 all|code|data"
    exit 1
    ;;
esac

# 解析远端清单（取相对路径）
awk '{print $NF}' "$REMOTE_LIST" \
  | sed "s|^${DEPLOY_PATH}/||" \
  | grep -v '^\.$' \
  | grep -v '^$' \
  > /tmp/remote_paths.txt

LOCAL_PATHS=/tmp/local_paths.txt
> "$LOCAL_PATHS"
case "$ONLY" in
  all)
    (cd "$PROJECT_ROOT" && find . -type f \
      ! -path './.git/*' \
      ! -path './node_modules/*' \
      ! -path './_live_check/*' \
      ! -path './scripts/.deploy.env' \
      | sed 's|^\./||' | sort)
    ;;
  code)
    find "$PROJECT_ROOT" -maxdepth 1 -type f -name '*.html' -o -name '*.xml' -o -name '*.txt' -o -name '*.ico' 2>/dev/null
    find "$PROJECT_ROOT/css" "$PROJECT_ROOT/js" -type f 2>/dev/null
    ;;
  data)
    find "$PROJECT_ROOT/data" -type f 2>/dev/null
    ;;
esac | sort -u | sed "s|^${PROJECT_ROOT}/||" > "$LOCAL_PATHS"

# 对比
ONLY_LOCAL=$(comm -23 "$LOCAL_PATHS" /tmp/remote_paths.txt || true)
ONLY_REMOTE=$(comm -13 "$LOCAL_PATHS" /tmp/remote_paths.txt || true)

echo ""
if [ -z "$ONLY_LOCAL" ] && [ -z "$ONLY_REMOTE" ]; then
  log_ok "本地与服务器在 [$ONLY] 范围完全一致 ✓"
  exit 0
fi

if [ -n "$ONLY_LOCAL" ]; then
  echo ""
  echo "${C_YELLOW}只在本地存在（服务器上没有）:${C_RESET}"
  echo "$ONLY_LOCAL" | sed 's/^/    /'
fi
if [ -n "$ONLY_REMOTE" ]; then
  echo ""
  echo "${C_BLUE}只在服务器存在（本地没有）:${C_RESET}"
  echo "$ONLY_REMOTE" | sed 's/^/    /'
fi
echo ""
log_info "如需同步，运行 ./scripts/pull-from-server.sh 或 ./scripts/push-to-server.sh"