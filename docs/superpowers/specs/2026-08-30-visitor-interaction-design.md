# 照片评论/点赞功能设计

> 日期：2026-08-30
> 状态：待评审

## 背景与目标

team85.cn 目前是纯静态网站（HTML/CSS/JS，数据在 JSON），无任何访客互动。本期目标是增加**照片评论 / 点赞**功能：访客可以在照片下发表评论、点赞。

**照片范围（两者都要）：**
- 主页比赛照片：`matches JSON` 里的 `imageUrl`
- 历史页精选相册：`gallery.js` 里的 `src`

> 原规划的「留言板」「投票/评选」两大功能**不在本期范围**，后续视需要再评估。

**约束：**
- 生产环境 Nginx + PHP-FPM（宝塔面板），可跑轻量 PHP
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
api/interaction.php              # PHP 入口：评论/点赞 action 路由 + 防刷 + 读写 JSON
data/interactions/               # 运行时数据（访客产生，PHP 写入）
  ├── comments.json              # 评论，key = 图片相对路径
  └── likes.json                 # 点赞，key = 图片相对路径
```

**修改（非功能但必须）：**

1. `.gitignore` 增加 `data/interactions/`（运行时数据不进 git）
2. `scripts/.deploy.env.example` 的 `EXCLUDES` 增加 `--exclude=data/interactions/`，并提醒同步更新实际的 `scripts/.deploy.env`（否则下次 `push` 的 `--delete` 会抹掉访客数据）
3. 服务器上 `data/interactions/` 需 PHP-FPM（`www` 用户）写权限

## 功能设计

### 照片唯一 key

- **key = 图片相对路径**（去前导斜杠），统一两类照片：
  - 主页比赛照片：`matches JSON` 里的 `imageUrl`
  - 历史页精选相册：`gallery.js` 里的 `src`
- 评论与点赞都按此 key 归属到具体照片

### 照片评论

- 每张照片一个评论列表，展示按时间正序（新评论在后）
- 访客填写：昵称（必填）+ 评论内容（必填）
- 接口：`GET`（某照片的评论列表）/ `POST`（发表评论）

### 照片点赞

- 每张照片一个点赞数，访客点击「👍」+1
- 去重：按 IP + Cookie，每人对每张照片限一次
- 接口：`GET`（某照片点赞数）/ `POST`（点赞）

### 前端集成

- **历史页相册**：在 `gallery.js` 渲染的每张照片叠加「👍 点赞 / 💬 评论」交互
- **主页比赛照片**：在比赛卡片 / 轮播叠加同样的交互

## 防刷机制（在 `api/interaction.php` 统一处理）

| 操作 | 防刷强度 |
|---|---|
| **评论** | 算术验证码 + IP 限频 + 敏感词过滤 + `htmlspecialchars` 转义 |
| **点赞** | IP + Cookie 去重 + IP 限频（无验证码，保持轻量） |

- **算术验证码**：如「3 + 5 = ?」，避开国内访问不了的 reCAPTCHA
- **IP 限频**：每 IP 每分钟最多 1 次提交
- **敏感词过滤**：内置过滤表，命中则拒绝评论

## 数据与安全

- 评论内容一律经 `htmlspecialchars` 转义后落盘，避免 XSS
- PHP 读写 JSON 用 `flock` 文件锁，避免并发写覆盖
- 评论记录含 `id`（`uniqid()`）+ `time`（ISO 8601，与现有 `feedback.json` 一致）
- 数据校验：昵称/内容非空、长度上限、非法字符过滤

## 实施顺序

1. **PHP 后端**：评论/点赞接口 + 防刷 + JSON 读写
2. **前端集成**：先历史页相册，再主页比赛照片

## 风险与注意

- `rsync --delete` 抹数据 → 已通过 `EXCLUDES` 排除 `data/interactions/`
- PHP-FPM 写权限 → 部署时需 `chown`/`chmod` 目录
- 图片改名/删除会导致其评论/点赞孤儿化（可接受，后续可加清理）
- 低流量场景下 JSON 文件存储足够；若未来量大再迁移 MySQL
