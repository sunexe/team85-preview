# 访客互动功能设计（留言板 + 投票 + 照片评论/点赞）

> 日期：2026-08-30
> 状态：待评审

## 背景与目标

team85.cn 目前是纯静态网站（HTML/CSS/JS，数据在 JSON），没有任何访客互动。目标是增加三类互动：

1. **留言板 / 留言墙** —— 访客留下文字祝福、建议、打气
2. **投票 / 评选** —— 如「最佳进球」「最佳球员」等，实时展示结果
3. **照片评论 / 点赞** —— 在照片下评论、点赞

**约束：**
- 生产环境为 Nginx + PHP-FPM（宝塔面板），可跑轻量 PHP
- 现有数据以 JSON 文件为主，零构建工具链
- 部署走 `rsync --delete` 脚本
- 网站公开（有 ICP 备案、SEO、sitemap），垃圾信息是现实风险

## 技术方案

自建轻量 **PHP 后端 + JSON 文件存储**（不依赖第三方服务）。

### 架构

```
前端 JS（fetch） → api/interaction.php（PHP 单一入口） → data/interactions/*.json
```

### 文件布局

**新增：**

```
api/interaction.php              # PHP 入口：action 路由 + 统一防刷 + 读写 JSON
data/interactions/               # 运行时数据（访客产生，PHP 写入）
  ├── messages.json              # 留言板
  ├── poll-votes.json            # 投票计数
  ├── comments.json              # 照片评论
  └── likes.json                 # 照片点赞
data/polls.json                  # 投票题目配置（管理员本地编辑，git 追踪）
```

**修改（非功能但必须）：**

1. `.gitignore` 增加 `data/interactions/`（运行时数据不进 git）
2. `scripts/.deploy.env.example` 的 `EXCLUDES` 增加 `--exclude=data/interactions/`，并提醒同步更新实际的 `scripts/.deploy.env`（否则下次 `push` 的 `--delete` 会抹掉访客数据）
3. 服务器上 `data/interactions/` 需 PHP-FPM（`www` 用户）写权限

## 功能设计

### 1. 留言板

- 访客填写：昵称（必填）+ 留言内容（必填）+ 邮箱（可选）
- 提交后写入 `messages.json`，展示按时间倒序
- 展示位置：首页底部新增「留言板」区块
- 接口：`GET`（列表）/ `POST`（提交）

### 2. 投票 / 评选

- 题目与选项由管理员在 `data/polls.json` 配置，本地编辑后 push（沿用现有工作流）
- 访客选一项提交，实时展示票数与占比
- 防重复投票：按 IP + Cookie 去重（无登录场景下的近似方案）
- 展示位置：首页（「留言板」旁或侧边区块）
- 接口：`GET`（题目 + 计数）/ `POST`（投票）

### 3. 照片评论 / 点赞

- **唯一 key = 图片相对路径**（去前导斜杠），统一两类照片：
  - 主页比赛照片：`matches JSON` 里的 `imageUrl`
  - 历史页精选相册：`gallery.js` 里的 `src`
- 在照片上叠加「👍 点赞 / 💬 评论」交互
- 接口：`GET`（某照片的评论列表 + 点赞数）/ `POST`（评论）/ `POST`（点赞）

## 防刷机制（三功能共用，在 `api/interaction.php` 统一处理）

- **算术验证码**：如「3 + 5 = ?」，避开国内访问不了的 reCAPTCHA
- **IP 限频**：每 IP 每分钟最多 1 次提交
- **敏感词过滤**：内置过滤表，命中则拒绝
- **输入转义**：后端 `htmlspecialchars`（前端已有 `js/utils.js` 的 `sanitizeInput`）

## 数据与安全

- 游客输入一律经 `htmlspecialchars` 转义后落盘，避免 XSS
- PHP 读写 JSON 用 `flock` 文件锁，避免并发写覆盖
- 留言/评论记录含 `id`（`uniqid()`）+ `time`（ISO 8601，与现有 `feedback.json` 一致）
- 数据校验：昵称/内容非空、长度上限、非法字符过滤

## 分阶段实施

1. **阶段 1**：留言板 —— 跑通 PHP 后端 + 防刷 + JSON 读写这条链路
2. **阶段 2**：投票 / 评选
3. **阶段 3**：照片评论 / 点赞（相册 + 比赛照片）

## 风险与注意

- `rsync --delete` 抹数据 → 已通过 `EXCLUDES` 排除 `data/interactions/`
- PHP-FPM 写权限 → 部署时需 `chown`/`chmod` 目录
- 低流量场景下 JSON 文件存储足够；若未来量大再迁移 MySQL（方案 B）
- 评论/点赞按图片路径 key，若未来某张照片改名/删除，其评论会孤儿化（可接受，后续可加清理）
