# 汕头一中八五足球队宣传网站

[![Site](https://img.shields.io/badge/🏠_正式站-www.team85.cn-blue)](https://www.team85.cn/)
[![Pages 预览](https://img.shields.io/badge/🪞_Pages预览-sunexe.github.io-brightgreen)](https://sunexe.github.io/team85-preview/)
[![GitHub 主页](https://img.shields.io/badge/🐙_主仓库-sunexe%2Fteam85.cn-black)](https://github.com/sunexe/team85.cn)
[![GitHub 镜像](https://img.shields.io/badge/🪞_镜像-sunexe%2Fteam85--preview-black)](https://github.com/sunexe/team85-preview)
[![ICP](https://img.shields.io/badge/ICP-粤ICP备2025429887号-orange)](https://beian.miit.gov.cn/)
[![JS Style](https://img.shields.io/badge/code--style-eslint--flat-blueviolet)](https://eslint.org/docs/latest/use/configure/configuration-files)

> **因为热爱所以坚持，愿时光能缓，故人不散**

---

## 项目简介

- 🎨 **极简美学设计**：苹果风格（Apple-inspired）的简洁布局
- ⚡ **零依赖前端**：纯静态 HTML / CSS / 原生 JS，零构建工具链
- 📱 **响应式布局**：移动端、平板、桌面端自适应
- 🖼 **富媒体展示**：球队历史、成员风采、比赛瞬间、珍贵合影
- 🇨🇳 **中文界面**：完整中文支持与本地化体验

---

## 目录结构

```
team85.cn/
├── index.html              # 首页（球队最新动态）
├── history.html            # 球队历史与故事
├── members.html            # 成员风采展示
├── 404.html                # 自定义 404 错误页
│
├── css/                    # 样式表（按职责拆分）
│   ├── base.css            # 重置、变量、原子类
│   ├── layout.css          # 导航 / 页脚 / 主容器
│   ├── components.css      # 公共组件（按钮、卡片、轮播）
│   ├── members-gallery.css # 成员与相册样式
│   ├── responsive.css      # 响应式适配
│   └── style.css           # 主题与全局微调
│
├── js/                     # 前端脚本（模块化拆分）
│   ├── main.js             # 应用入口与轮播主页逻辑
│   ├── gallery.js          # 历史页相册
│   ├── members.js          # 成员页逻辑
│   ├── lightbox.js         # 图片灯箱
│   ├── cache.js            # 浏览器本地缓存
│   ├── state.js            # 全局状态
│   ├── utils.js            # 工具函数
│   └── error-handler.js    # 全局错误兜底
│
├── data/                   # 数据 JSON（按年份归档）
│   ├── matches.json        # 当前年份比赛
│   ├── matches2021.json    # 2021 年每周赛事实录
│   ├── matches2022.json    # 2022 年
│   ├── matches2023.json    # 2023 年
│   ├── matches2024.json    # 2024 年
│   ├── matches2025.json    # 2025 年
│   ├── matches_earlier.json# 2021 年之前的历史比赛
│   ├── members.json        # 球队成员数据
│   ├── members-初始化.json  # 初始成员模板
│   ├── announcements.json  # 最新公告
│   └── feedback.json       # 用户反馈数据
│
├── images/                 # 通用图片资源（被 .gitignore 排除）
├── matches/                # 比赛照片（按年份目录归档，被 .gitignore 排除）
├── members/                # 成员头像（被 .gitignore 排除）
├── team/                   # 球队活动图（被 .gitignore 排除）
│
├── package.json            # Node.js 依赖（仅用于本地预览）
├── server.js               # Express 静态服务器（仅用于本地预览）
├── eslint.config.js        # 代码风格配置（Flat Config）
│
├── .htaccess.example       # Apache 配置示例
├── .user.ini.example       # PHP-FPM 配置示例
├── .well-known.example/    # SSL 证书验证文件示例
│
└── .gitignore              # Git 忽略规则（包含图片与服务器配置）
```

> ⚠️ **重要**：比赛照片、成员头像等**图片资源位于工作目录但被 `.gitignore` 排除**，
> 因为图片体积大且与个人部署环境（宝塔面板目录）紧密相关。仓库只追踪代码与数据。

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/sunexe/team85.cn.git
cd team85.cn
```

### 2. 安装依赖（仅本地预览用）

```bash
npm install
```

### 3. 启动本地预览

```bash
npm start
```

默认访问 `http://localhost:3000` 即可预览完整网站。

也可在 VSCode / Cursor 中安装 `Live Server` 插件直接打开 `index.html`。

### 4. 代码风格检查

```bash
npx eslint js/
```

---

## 数据文件组织规范

### 比赛数据（`data/`）

| 文件 | 用途 |
|---|---|
| `matches.json` | **当前年份（默认 2026）**的赛事数据，按日期倒序 |
| `matches2021.json` | 2021 年每周赛事实录，按日期倒序 |
| `matches2022.json` | 2022 年 |
| `matches2023.json` | 2023 年 |
| `matches2024.json` | 2024 年 |
| `matches2025.json` | 2025 年 |
| `matches_earlier.json` | **2021 年之前**（2019-2020）较早期的合集 |

> ⚠️ **不要**把上一年或前几年的数据混入 `matches.json`。每年初建议把
> 上一年合集移动到 `matches20XX.json`，并把当前 `matches.json` 清空。

### 一场比赛的数据结构（参考）

```json
{
  "name": "与新疆天山纵队友谊赛",
  "date": "2026-1-4",
  "location": "汕头市体育中心足球场",
  "weather": "晴",
  "players": 25,
  "description": "潮汕情杯全国中老年足球邀请赛",
  "imageUrl": "matches/2026/20260104-1.jpg",
  "videoUrls": ["https://v.douyin.com/xxxxx/"]
}
```

### 成员数据（`data/members.json`）

```json
{
  "members": [
    {
      "name": "翁岗",
      "avatar": "members/wenggang.jpg",
      "number": 7,
      "nickname": "老翁",
      "position": "中场",
      "specialty": "远射",
      "quote": "因为热爱所以坚持"
    }
  ]
}
```

### 公告数据（`data/announcements.json`）

```json
{
  "announcements": [
    {
      "id": 10,
      "title": "秋冬季训练计划",
      "content": "随着秋冬季的到来，训练时间调整为下午 4 点开始…",
      "date": "2025-11-01",
      "type": "schedule",
      "priority": "medium",
      "category": "训练计划",
      "author": "教练组",
      "tags": ["冬季", "训练", "调整", "体能"]
    }
  ]
}
```

---

## 添加新比赛照片的工作流

1. **拍照**：队友拍完照片后按 `日期-序号.jpg` 命名（例如 `20260104-1.jpg`）。
2. **分类存放**：将照片放入 `matches/2026/` 对应目录。
3. **更新数据**：编辑 `data/matches.json`，在对应比赛记录的 `imageUrl` 字段填入路径。
4. **压缩优化**：上传前建议压缩到 ≤ 500 KB（推荐工具：[Squoosh](https://squoosh.app/)）。
5. **部署**：通过 FTP / 宝塔面板将 `data/` 与 `matches/` 同步到服务器。

---

## 部署流程

### 推荐方案：宝塔面板 + Git 钩子（推荐）

1. 在服务器 `/www/wwwroot/www.team85.cn/` 创建 Git 裸仓库
2. 添加 `post-receive` 钩子，自动 checkout 到网站目录
3. 本地 `git push production main` 即可一键部署

详见 [`CONTRIBUTING.md`](CONTRIBUTING.md) （待补充）。

### 临时方案：手动 FTP 上传

```bash
# 用 rsync 上传代码与数据
rsync -av --exclude='matches/' --exclude='members/' --exclude='team/' \
  --exclude='node_modules/' --exclude='.git/' \
  ./ user@server:/www/wwwroot/www.team85.cn/

# 上传图片（视情况选择）
rsync -av matches/ user@server:/www/wwwroot/www.team85.cn/matches/
```

---

## 浏览器兼容性

| 浏览器 | 版本 | 状态 |
|---|---|---|
| Chrome / Edge | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| iOS Safari | 14+ | ✅ 完全支持 |
| Android Chrome | 90+ | ✅ 完全支持 |
| IE 11 | - | ❌ 不支持 |

---

## License

本项目为校友内部项目，源码仅供球队成员查看与维护。
**未经授权请勿用于商业用途或公开镜像**。

如有问题或合作意向，请联系：

📧 **邮箱**: sunexe@139.com

---

<p align="center">
  <sub>Built with ❤️ by the team of 一中八五 since 2019</sub>
</p>

---

## 🌐 GitHub Pages 预览

本仓库的 **公开镜像仓库** 已自动部署到 GitHub Pages：

🔗 **预览地址**: <https://sunexe.github.io/team85-preview/>

> ⚠️ **重要提示：预览与正式版的差异**
>
> - 正式网站: <https://www.team85.cn/> —— **完整版**，包含所有比赛照片、成员头像、队旗等
> - 预览网站: <https://sunexe.github.io/team85-preview/> —— **代码与数据预览**，不含图片资源
>
> 由于比赛照片、成员头像等大量二进制资源被 `.gitignore` 排除（出于仓库体积考虑），
> 预览站点的图片位置为**占位显示**，但代码、样式、数据、SEO 配置完全一致。

### 如何同步预览更新？

```bash
# 一行命令：把 main 分支同步到预览仓库并触发 Pages 重建
git push preview main
```

GitHub Pages 通常 30 秒内自动重建。

---

## 🪞 公开镜像与生产环境差异一览

| 资源 | 生产 (www.team85.cn) | Pages 预览 |
|---|---|---|
| HTML/CSS/JS | ✅ 完整 | ✅ 完整 |
| 数据 (data/*.json) | ✅ 完整 | ✅ 完整 |
| 队徽 (SVG) | ✅ 矢量版优先 | ✅ 矢量版优先 |
| 队徽 (PNG) | ✅ 兼容老浏览器 | ⚠️ 占位（被 gitignore 排除） |
| 比赛照片 | ✅ 真实图片 | ⚠️ 占位 |
| 成员头像 | ✅ 真实图片 | ⚠️ 占位 |
| 球队队旗图 | ✅ 真实图片 | ⚠️ 占位 |
| favicon | ✅ 已部署 | ✅ SVG 版已部署 |
| 公告系统 | ✅ 实时 | ✅ 实时 |

---

## 🔄 同步流程示意

```
                    ┌──────────────────────────┐
                    │  本地开发 (/Documents/)   │
                    └────────────┬─────────────┘
                                 │ git push
                                 ▼
                    ┌──────────────────────────┐
                    │  GitHub: sunexe/team85.cn │ (私有)
                    └────┬─────────────────┬───┘
                         │                 │
                         │ (主仓库用于     │ (推送到预览仓库)
                         │  正式部署)      │ 
                         │                 ▼
                    FTP/手动      ┌──────────────────────────┐
                         │        │  GitHub: team85-preview  │ (公开)
                         ▼        └────────────┬─────────────┘
              ┌────────────────┐               │ 自动构建
              │ 生产服务器      │               ▼
              │ www.team85.cn  │     ┌─────────────────────┐
              └────────────────┘     │ github.io/team85-   │
                                     │ preview/            │
                                     └─────────────────────┘
```

---

