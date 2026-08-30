# 🛠 部署脚本使用说明

本目录包含把本地修改同步到生产服务器（`https://www.team85.cn/`）所需的全部脚本。

## 📦 脚本清单

| 脚本 | 作用 |
|---|---|
| `push-to-server.sh` | 把本地所有改动推送到服务器（rsync over SSH） |
| `pull-from-server.sh` | 从服务器拉取最新文件到本地（含 `--only=images/data/code`） |
| `sync-assets.sh` | 仅同步图片资源（`matches/`、`members/`、`team/`、`images/`） |
| `verify-mirror.sh` | 对比本地 vs 服务器，列出有差异的文件（不修改任何文件） |
| `preview.sh` | 启动本地预览服务器（端口 3000） |
| `deploy-common.sh` | 公共加载脚本，自动读取 `.deploy.env` |
| `.deploy.env.example` | 配置模板，复制为 `.deploy.env` 后填入真实值 |

## 🚀 首次使用

```bash
# 1. 复制配置模板
cp scripts/.deploy.env.example scripts/.deploy.env

# 2. 编辑 .deploy.env，至少确认这三项：
#    DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH
$EDITOR scripts/.deploy.env

# 3. 测试 SSH 连通性
ssh -p 22 -i ~/.ssh/id_ed25519 root@team85.cn 'echo OK'

# 4. 第一次完整同步（DRY-RUN 先看会做什么）
./scripts/push-to-server.sh --dry-run

# 5. 实际推送
./scripts/push-to-server.sh
```

## 📖 常用工作流

### 改完代码后推到服务器
```bash
git add -A && git commit -m "feat: xxx"
./scripts/push-to-server.sh --yes
```

### 服务器有人直接改了图/数据
```bash
./scripts/pull-from-server.sh --only=images   # 只拉图片
# 或
./scripts/pull-from-server.sh --only=data     # 只拉 JSON
```

### 只同步图片（速度更快）
```bash
./scripts/sync-assets.sh push --dry-run   # 先看
./scripts/sync-assets.sh push             # 推送
```

### 推送前先验证
```bash
./scripts/verify-mirror.sh --only=code
```

### 本地预览
```bash
./scripts/preview.sh              # 端口 3000
./scripts/preview.sh 8080         # 自定义端口
```

## 🔧 脚本参数一览

### `push-to-server.sh`
| 参数 | 说明 |
|---|---|
| `--dry-run` / `-n` | 只显示会做什么，不真的推送 |
| `--yes` / `-y` | 跳过所有确认 |
| `--no-delete` | 不删除服务器多余文件（默认会 `--delete`） |
| `--no-progress` | 不显示 rsync 进度条 |

### `pull-from-server.sh`
| 参数 | 说明 |
|---|---|
| `--dry-run` / `-n` | 只显示会做什么 |
| `--yes` / `-y` | 跳过所有确认 |
| `--only=images` | 只同步图片（`matches/ members/ team/ images/`） |
| `--only=data` | 只同步 JSON 数据 |
| `--only=code` | 只同步代码（`css/ js/ *.html` 等） |

### `sync-assets.sh push|pull`
| 参数 | 说明 |
|---|---|
| `--dry-run` / `-n` | 只显示会做什么 |
| `--yes` / `-y` | 跳过确认 |

### `verify-mirror.sh`
| 参数 | 说明 |
|---|---|
| `--only=all` | 对比全部（默认） |
| `--only=code` | 只对比代码 |
| `--only=data` | 只对比 JSON 数据 |

## ⚠️ 安全提示

1. **`scripts/.deploy.env`** 已在 `.gitignore`，不会上传到 Git
2. 默认会用 `--delete` 让服务器与本地完全同步；
   - 如果担心误删，先用 `--no-delete` 或先 DRY-RUN
3. SSH 默认走密钥认证；若用密码请自行配置 `sshpass` 或在 `~/.ssh/config` 里加
4. 推送前最好 `git commit`，这样出问题可以回滚

## 🐛 常见问题

### Q: 推送后服务器 502？
- 检查 nginx 是否启动了 php-fpm
- 检查 `data/`、`images/`、`matches/` 目录权限（nginx worker 用户应可读）

### Q: 推送图片后页面没刷新？
- 浏览器缓存：Ctrl/Cmd+Shift+R 硬刷新
- 或者把 `cache-control` 头改为 `no-cache`

### Q: rsync 报 "Permission denied"？
- 服务器上对应目录权限不够
- 当前用户 (`root`) 通常能写 `/www/wwwroot/www.team85.cn/`
- 如果是 www 用户，需要 `chown -R www:www /www/wwwroot/www.team85.cn`

### Q: 中文文件名乱码？
- macOS 默认 UTF-8，Linux 也是 UTF-8，应该没问题
- 如果遇到，加 `RSYNC_OPTS_COMMON+=(--iconv=UTF-8,UTF-8)`