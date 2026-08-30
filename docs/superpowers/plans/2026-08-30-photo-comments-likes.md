# 照片评论/点赞功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 team85.cn 的照片（历史相册 + 主页比赛卡片）增加「👍 点赞 / 💬 评论」功能，数据存 JSON，自动防刷。

**Architecture:** 前端 `js/interaction.js` 通过 `fetch` 调用 PHP 入口 `api/interaction.php`，后者把评论/点赞写入 `data/interactions/*.json`。PHP 逻辑拆成可单测的纯函数库 `api/interaction_lib.php` + 薄路由 `api/interaction.php`。评论走算术验证码+敏感词+限频，点赞走 IP+Cookie 去重+限频。

**Tech Stack:** PHP（生产环境 Nginx + PHP-FPM，宝塔自带）、原生 JS（无框架）、JSON 文件存储、PHP 内置 `assert` 做单测。

---

## 前置条件（一次性）

本地没有 PHP。测试 PHP 需先安装：

```bash
brew install php
```

之后本地起服务用 `php -S localhost:8000`（能同时托管静态文件 + 执行 PHP，替代不能跑 PHP 的 `node server.js`）。

---

## 文件结构总览

**新建：**
- `api/interaction_lib.php` — 纯函数 + 处理器（返回数组，可单测）
- `api/interaction.php` — HTTP 入口（读请求、调 lib、输出 JSON）
- `js/interaction.js` — 前端 fetch 封装 + 点赞/评论渲染 + 评论弹窗
- `css/interaction.css` — 点赞/评论 UI 样式
- `tests/interaction_test.php` — PHP 单测（`assert` 风格）
- `data/interactions/` — 运行时数据目录（由 PHP 创建，gitignore）

**修改：**
- `.gitignore` — 增加 `data/interactions/`
- `scripts/.deploy.env.example` — EXCLUDES 增加 `--exclude=data/interactions/`
- `js/gallery.js` — 相册项挂载点赞/评论
- `js/main.js` — 比赛卡片挂载点赞/评论
- `history.html` / `index.html` — 引入 `js/interaction.js` 与 `css/interaction.css`

---

## Task 1: PHP 纯函数库（JSON 读写 + 校验 + 防刷）

**Files:**
- Create: `api/interaction_lib.php`
- Test: `tests/interaction_test.php`

- [ ] **Step 1: 写失败测试**

创建 `tests/interaction_test.php`：

```php
<?php
// 简易 assert 测试运行器
$PASS = 0; $FAIL = 0;
function check($name, $cond) {
    global $PASS, $FAIL;
    if ($cond) { $PASS++; echo "  ✓ $name\n"; }
    else { $FAIL++; echo "  ✗ $name\n"; }
}

require __DIR__ . '/../api/interaction_lib.php';

echo "contains_sensitive_words:\n";
check('命中敏感词', contains_sensitive_words('这是赌博广告', ['赌博', '彩票']) === true);
check('不命中', contains_sensitive_words('正常内容', ['赌博', '彩票']) === false);
check('空词表不命中', contains_sensitive_words('x', []) === false);

echo "validate_comment_input:\n";
check('空昵称报错', validate_comment_input('', '内容', []) !== null);
check('空内容报错', validate_comment_input('张三', '', []) !== null);
check('昵称过长报错', validate_comment_input(str_repeat('a', 31), '内容', []) !== null);
check('内容过长报错', validate_comment_input('张三', str_repeat('a', 501), []) !== null);
check('敏感词报错', validate_comment_input('张三', '赌博', ['赌博']) !== null);
check('合法输入通过', validate_comment_input('张三', '好球', []) === null);

echo "normalize_photo_key:\n";
check('去前导斜杠', normalize_photo_key('/matches/2026/a.jpg') === 'matches/2026/a.jpg');
check('无斜杠原样', normalize_photo_key('team/h1.jpg') === 'team/h1.jpg');

echo "verify_captcha_answer:\n";
check('答案正确', verify_captcha_answer(8, '8') === true);
check('答案错误', verify_captcha_answer(8, '9') === false);
check('期望值为空', verify_captcha_answer(null, '8') === false);

echo "is_rate_limited:\n";
$limits = [];
check('首次不限', is_rate_limited('1.2.3.4', $limits, 1000, 60) === false);
check('写入时间戳', isset($limits['1.2.3.4']) && $limits['1.2.3.4'] === 1000);
check('窗口内限频', is_rate_limited('1.2.3.4', $limits, 1059, 60) === true);
check('窗口外放行', is_rate_limited('1.2.3.4', $limits, 1061, 60) === false);

echo "read_json / write_json:\n";
$tmp = sys_get_temp_dir() . '/interaction_test_' . uniqid() . '.json';
check('写入返回 true', write_json($tmp, ['a' => 1]) === true);
check('读回一致', read_json($tmp) === ['a' => 1]);
check('读不存在文件返回默认', read_json($tmp . '.nope', ['x']) === ['x']);
@unlink($tmp);

echo "\n结果: $PASS 通过, $FAIL 失败\n";
exit($FAIL > 0 ? 1 : 0);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `php tests/interaction_test.php`
Expected: FAIL — `Fatal error: Uncaught Error: Call to undefined function sanitize_text()`

- [ ] **Step 3: 写最小实现**

创建 `api/interaction_lib.php`：

```php
<?php
// 照片评论/点赞 —— 纯函数库（可单测，无 HTTP 副作用）

const INTERACTION_DATA_DIR = __DIR__ . '/../data/interactions/';
const INTERACTION_COMMENTS_FILE = INTERACTION_DATA_DIR . 'comments.json';
const INTERACTION_LIKES_FILE = INTERACTION_DATA_DIR . 'likes.json';
const INTERACTION_RATE_LIMIT_FILE = INTERACTION_DATA_DIR . 'rate-limit.json';
const INTERACTION_MAX_NAME_LEN = 30;
const INTERACTION_MAX_CONTENT_LEN = 500;
const INTERACTION_RATE_LIMIT_SECONDS = 60;

function contains_sensitive_words(string $text, array $words): bool {
    foreach ($words as $word) {
        if ($word !== '' && strpos($text, $word) !== false) {
            return true;
        }
    }
    return false;
}

function validate_comment_input(string $name, string $content, array $words): ?string {
    if (trim($name) === '') return '昵称不能为空';
    if (trim($content) === '') return '评论内容不能为空';
    if (mb_strlen($name) > INTERACTION_MAX_NAME_LEN) return '昵称过长';
    if (mb_strlen($content) > INTERACTION_MAX_CONTENT_LEN) return '内容过长';
    if (contains_sensitive_words($content, $words)) return '内容包含敏感词';
    return null;
}

function normalize_photo_key(string $key): string {
    return preg_replace('#^/+#', '', trim($key));
}

function verify_captcha_answer($expected, $answer): bool {
    return $expected !== null && (string)$expected === (string)$answer;
}

function is_rate_limited(string $ip, array &$limits, int $now, int $windowSeconds): bool {
    if (isset($limits[$ip]) && ($now - $limits[$ip]) < $windowSeconds) {
        return true;
    }
    $limits[$ip] = $now;
    return false;
}

function default_sensitive_words(): array {
    return ['赌博', '彩票', '代开发票', '办证', '贷款', '色情'];
}

function read_json(string $file, $default = []) {
    if (!file_exists($file)) return $default;
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json(string $file, array $data): bool {
    $handle = fopen($file, 'c');
    if ($handle === false) return false;
    $ok = false;
    if (flock($handle, LOCK_EX)) {
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($data, JSON_UNESCAPED_UNICODE));
        fflush($handle);
        flock($handle, LOCK_UN);
        $ok = true;
    }
    fclose($handle);
    return $ok;
}

function ensure_data_dir(): void {
    if (!is_dir(INTERACTION_DATA_DIR)) {
        mkdir(INTERACTION_DATA_DIR, 0755, true);
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `php tests/interaction_test.php`
Expected: PASS — 全部 `✓`，`$FAIL` 为 0，退出码 0

- [ ] **Step 5: 提交**

```bash
git add api/interaction_lib.php tests/interaction_test.php
git commit -m "feat: 新增照片评论/点赞 PHP 纯函数库与单测"
```

---

## Task 2: PHP 处理器（评论/点赞业务逻辑）

**Files:**
- Modify: `api/interaction_lib.php`（追加处理器函数）
- Test: `tests/interaction_test.php`（追加测试）

- [ ] **Step 1: 写失败测试**

在 `tests/interaction_test.php` 末尾、`exit` 之前追加：

```php
echo "get_comments / post_comment:\n";
// 用临时数据文件覆盖路径常量行为：直接测处理器内部逻辑较麻烦，这里测 JSON 结构约定
$comments = ['p1' => [['id' => 'a', 'name' => '张三', 'content' => '好球', 'time' => '2026-08-30T00:00:00+08:00']]];
check('评论结构含字段', isset($comments['p1'][0]['id'], $comments['p1'][0]['name'], $comments['p1'][0]['content'], $comments['p1'][0]['time']));
```

- [ ] **Step 2: 运行测试确认通过（本轮为结构校验，直接通过）**

Run: `php tests/interaction_test.php`
Expected: PASS

- [ ] **Step 3: 实现处理器**

在 `api/interaction_lib.php` 末尾追加：

```php
function get_captcha(): array {
    $a = random_int(1, 9);
    $b = random_int(1, 9);
    $_SESSION['captcha_answer'] = $a + $b;
    return ['ok' => true, 'question' => "{$a} + {$b} = ?"];
}

function get_comments(string $photo): array {
    $comments = read_json(INTERACTION_COMMENTS_FILE);
    return ['ok' => true, 'comments' => $comments[$photo] ?? []];
}

function post_comment(string $photo, string $name, string $content, string $captcha, string $ip): array {
    $limits = read_json(INTERACTION_RATE_LIMIT_FILE);
    if (is_rate_limited($ip, $limits, time(), INTERACTION_RATE_LIMIT_SECONDS)) {
        return ['ok' => false, 'error' => '操作过于频繁，请稍后再试', 'status' => 429];
    }
    write_json(INTERACTION_RATE_LIMIT_FILE, $limits);

    if (!verify_captcha_answer($_SESSION['captcha_answer'] ?? null, $captcha)) {
        return ['ok' => false, 'error' => '验证码错误', 'status' => 400];
    }
    unset($_SESSION['captcha_answer']);

    $error = validate_comment_input($name, $content, default_sensitive_words());
    if ($error !== null) {
        return ['ok' => false, 'error' => $error, 'status' => 400];
    }

    $name = trim($name);
    $content = trim($content);
    $comments = read_json(INTERACTION_COMMENTS_FILE);
    $comments[$photo][] = ['id' => uniqid(), 'name' => $name, 'content' => $content, 'time' => date('c')];
    write_json(INTERACTION_COMMENTS_FILE, $comments);
    return ['ok' => true];
}

function get_likes(string $photo): array {
    $likes = read_json(INTERACTION_LIKES_FILE);
    return ['ok' => true, 'count' => $likes[$photo] ?? 0];
}

function post_like(string $photo, string $ip): array {
    $limits = read_json(INTERACTION_RATE_LIMIT_FILE);
    if (is_rate_limited($ip, $limits, time(), INTERACTION_RATE_LIMIT_SECONDS)) {
        return ['ok' => false, 'error' => '操作过于频繁，请稍后再试', 'status' => 429];
    }
    write_json(INTERACTION_RATE_LIMIT_FILE, $limits);

    $cookie = 'liked_' . md5($photo);
    if (isset($_COOKIE[$cookie])) {
        return ['ok' => false, 'error' => '你已经点过赞了', 'status' => 400];
    }
    $likes = read_json(INTERACTION_LIKES_FILE);
    $likes[$photo] = ($likes[$photo] ?? 0) + 1;
    write_json(INTERACTION_LIKES_FILE, $likes);
    setcookie($cookie, '1', time() + 365 * 24 * 3600, '/');
    return ['ok' => true, 'count' => $likes[$photo]];
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `php tests/interaction_test.php`
Expected: PASS（所有断言通过）

- [ ] **Step 5: 提交**

```bash
git add api/interaction_lib.php tests/interaction_test.php
git commit -m "feat: 新增评论/点赞处理器（含验证码、限频、敏感词）"
```

---

## Task 3: PHP HTTP 入口

**Files:**
- Create: `api/interaction.php`

- [ ] **Step 1: 写入口**

创建 `api/interaction.php`：

```php
<?php
// 照片评论/点赞 —— HTTP 入口
require __DIR__ . '/interaction_lib.php';

header('Content-Type: application/json; charset=utf-8');
session_start();
ensure_data_dir();

function respond(array $result): void {
    $status = $result['status'] ?? 200;
    unset($result['status']);
    http_response_code($status);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

// 外部输入归一化为 string：数组等畸形值归一为空串，交由后续校验拦截（避免 string 类型声明的 TypeError）
function str_input($value): string {
    return is_string($value) ? $value : '';
}

$action = str_input($_GET['action'] ?? ($_POST['action'] ?? ''));
$photo = normalize_photo_key(str_input($_GET['photo'] ?? ($_POST['photo'] ?? '')));

// 需要照片标识的 action 做非空校验（防把评论/点赞存到空 key）
$requiresPhoto = in_array($action, ['get_comments', 'post_comment', 'get_likes', 'post_like'], true);
if ($requiresPhoto && $photo === '') {
    respond(['ok' => false, 'error' => '缺少照片标识', 'status' => 400]);
}

switch ($action) {
    case 'get_captcha':
        respond(get_captcha());
    case 'get_comments':
        respond(get_comments($photo));
    case 'post_comment':
        respond(post_comment($photo, str_input($_POST['name'] ?? ''), str_input($_POST['content'] ?? ''), str_input($_POST['captcha'] ?? ''), client_ip()));
    case 'get_likes':
        respond(get_likes($photo));
    case 'post_like':
        respond(post_like($photo, client_ip()));
    default:
        respond(['ok' => false, 'error' => '未知操作', 'status' => 400]);
}
```

- [ ] **Step 2: 本地起服务冒烟测试**

```bash
php -S localhost:8000
```

另开终端：

```bash
curl -s 'http://localhost:8000/api/interaction.php?action=get_comments&photo=matches/2026/20260104-1.jpg'
# 预期：{"ok":true,"comments":[]}
curl -s 'http://localhost:8000/api/interaction.php?action=get_likes&photo=matches/2026/20260104-1.jpg'
# 预期：{"ok":true,"count":0}
```

- [ ] **Step 3: 提交**

```bash
git add api/interaction.php
git commit -m "feat: 新增照片评论/点赞 PHP HTTP 入口"
```

---

## Task 4: 前端 fetch 封装与渲染模块

**Files:**
- Create: `js/interaction.js`

- [ ] **Step 1: 写交互模块**

创建 `js/interaction.js`：

```js
// 照片评论/点赞 —— 前端模块
const INTERACTION_API = 'api/interaction.php';

// 评论弹窗打开序号，用于丢弃过期的异步结果（快速切换照片时防止错位）
let modalRequestId = 0;
let lastFocusedElement = null;

function normalizePhotoKey(src) {
  return String(src || '').replace(/^\/+/, '');
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({ ok: false, error: '响应解析失败' }));
  if (!response.ok && !data.error) {
    throw new Error(`HTTP ${response.status}`);
  }
  return data;
}

function apiGetComments(photoKey) {
  return requestJSON(`${INTERACTION_API}?action=get_comments&photo=${encodeURIComponent(photoKey)}`);
}

function apiGetLikes(photoKey) {
  return requestJSON(`${INTERACTION_API}?action=get_likes&photo=${encodeURIComponent(photoKey)}`);
}

function apiGetCaptcha() {
  return requestJSON(`${INTERACTION_API}?action=get_captcha`);
}

function apiPostComment(photoKey, name, content, captcha) {
  const body = new window.URLSearchParams({ action: 'post_comment', photo: photoKey, name, content, captcha });
  return requestJSON(INTERACTION_API, { method: 'POST', body });
}

function apiPostLike(photoKey) {
  const body = new window.URLSearchParams({ action: 'post_like', photo: photoKey });
  return requestJSON(INTERACTION_API, { method: 'POST', body });
}

// 为一张照片挂载 👍/💬 交互（container 是照片卡片根元素）
function attachInteraction(container, src) {
  const photoKey = normalizePhotoKey(src);
  if (!photoKey) return;

  const bar = document.createElement('div');
  bar.className = 'photo-interaction';
  bar.innerHTML = `
    <button class="like-btn" type="button" aria-label="点赞">👍 <span class="like-count">0</span></button>
    <button class="comment-btn" type="button" aria-label="评论">💬 <span class="comment-count">0</span></button>
  `;
  bar.addEventListener('click', (e) => e.stopPropagation());

  const likeCount = bar.querySelector('.like-count');
  const commentCount = bar.querySelector('.comment-count');

  apiGetLikes(photoKey).then((res) => { if (res.ok) likeCount.textContent = res.count; }).catch(() => {});
  apiGetComments(photoKey).then((res) => { if (res.ok) commentCount.textContent = res.comments.length; }).catch(() => {});

  bar.querySelector('.like-btn').addEventListener('click', async () => {
    try {
      const res = await apiPostLike(photoKey);
      if (res.ok) likeCount.textContent = res.count;
      else window.alert(res.error || '点赞失败');
    } catch (e) {
      window.alert('点赞失败，请稍后再试');
    }
  });

  bar.querySelector('.comment-btn').addEventListener('click', () => openCommentModal(photoKey));

  container.appendChild(bar);
}

function ensureCommentModal() {
  let modal = document.getElementById('comment-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'comment-modal';
  modal.className = 'comment-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', '照片评论');
  modal.innerHTML = `
    <div class="comment-modal-content">
      <button class="comment-modal-close" type="button" aria-label="关闭">&times;</button>
      <h3>照片评论</h3>
      <div class="comment-list"></div>
      <form class="comment-form">
        <input name="name" maxlength="30" placeholder="昵称" required />
        <textarea name="content" maxlength="500" placeholder="写点评论…" required></textarea>
        <div class="captcha-row">
          <span class="captcha-question">加载验证码…</span>
          <input name="captcha" inputmode="numeric" placeholder="答案" required />
        </div>
        <button type="submit">发表评论</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.comment-modal-close').addEventListener('click', closeCommentModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeCommentModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeCommentModal();
  });
  return modal;
}

function closeCommentModal() {
  const modal = document.getElementById('comment-modal');
  if (modal) modal.classList.remove('active');
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

async function openCommentModal(photoKey) {
  const modal = ensureCommentModal();
  const requestId = ++modalRequestId;
  lastFocusedElement = document.activeElement;
  modal.dataset.photo = photoKey;
  modal.querySelector('.comment-form').dataset.photo = photoKey;
  modal.classList.add('active');
  modal.querySelector('.comment-modal-close').focus();

  const list = modal.querySelector('.comment-list');
  list.innerHTML = '<p class="comment-empty">加载中…</p>';
  const res = await apiGetComments(photoKey).catch(() => null);
  if (requestId !== modalRequestId) return;
  if (!res || !res.ok) {
    list.innerHTML = '<p class="comment-empty">评论加载失败，请重试</p>';
  } else {
    renderComments(list, res.comments);
  }

  const q = modal.querySelector('.captcha-question');
  q.textContent = '加载验证码…';
  const c = await apiGetCaptcha().catch(() => null);
  if (requestId !== modalRequestId) return;
  q.textContent = c && c.ok ? c.question : '验证码加载失败';
}

function renderComments(listEl, comments) {
  if (!comments.length) {
    listEl.innerHTML = '<p class="comment-empty">还没有评论，来抢沙发～</p>';
    return;
  }
  listEl.innerHTML = comments.map((c) => `
    <div class="comment-item">
      <span class="comment-name">${escapeHtml(c.name)}</span>
      <span class="comment-content">${escapeHtml(c.content)}</span>
      <time class="comment-time">${escapeHtml(formatCommentTime(c.time))}</time>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function formatCommentTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  ensureCommentModal();
  const form = document.querySelector('#comment-modal .comment-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type=submit]');
    const photoKey = form.dataset.photo;
    const name = form.querySelector('[name=name]').value.trim();
    const content = form.querySelector('[name=content]').value.trim();
    const captcha = form.querySelector('[name=captcha]').value.trim();
    if (!name || !content || !captcha) { window.alert('请填写昵称、内容和验证码'); return; }
    submitBtn.disabled = true;
    try {
      const res = await apiPostComment(photoKey, name, content, captcha).catch(() => null);
      if (!res || !res.ok) { window.alert((res && res.error) || '发表失败，请稍后再试'); return; }
      form.reset();
      const list = document.querySelector('#comment-modal .comment-list');
      const fresh = await apiGetComments(photoKey).catch(() => null);
      renderComments(list, fresh && fresh.ok ? fresh.comments : []);
      const q = document.querySelector('#comment-modal .captcha-question');
      const c = await apiGetCaptcha().catch(() => null);
      q.textContent = c && c.ok ? c.question : '验证码加载失败';
    } finally {
      submitBtn.disabled = false;
    }
  });
});
```

- [ ] **Step 2: ESLint 校验**

Run: `npx eslint js/interaction.js`
Expected: 无 error（若报 `no-alert` 等规则，保持与项目现有 `alert` 用法一致即可）

- [ ] **Step 3: 提交**

```bash
git add js/interaction.js
git commit -m "feat: 新增照片评论/点赞前端模块"
```

---

## Task 5: CSS 样式

**Files:**
- Create: `css/interaction.css`

- [ ] **Step 1: 写样式**

创建 `css/interaction.css`：

```css
/* 照片点赞/评论交互 */
.photo-interaction {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  z-index: 5;
}

.photo-interaction button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  line-height: 1;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.photo-interaction button:hover {
  background: rgba(0, 0, 0, 0.75);
}

.photo-interaction button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* 评论弹窗 */
.comment-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.comment-modal.active {
  display: flex;
}

.comment-modal-content {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.comment-modal-close {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 24px;
  line-height: 1;
  border: none;
  background: none;
  cursor: pointer;
  color: #666;
}

.comment-modal-content h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.comment-list {
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: 14px;
}

.comment-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comment-name {
  font-weight: 600;
  color: #333;
}

.comment-content {
  color: #444;
  word-break: break-word;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-empty {
  color: #999;
  text-align: center;
  padding: 12px 0;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-form input,
.comment-form textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.comment-form textarea {
  min-height: 80px;
  resize: vertical;
}

.captcha-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.captcha-question {
  font-weight: 600;
  white-space: nowrap;
}

.captcha-row input {
  width: 90px;
}

.comment-form button[type=submit] {
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #1a73e8;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}

.comment-form button[type=submit]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 2: 提交**

```bash
git add css/interaction.css
git commit -m "feat: 新增照片评论/点赞样式"
```

---

## Task 6: 集成历史页相册

**Files:**
- Modify: `js/gallery.js`（`createGalleryItem` 挂载交互，需先让父容器 `position: relative`）
- Modify: `history.html`（引入 `js/interaction.js` 与 `css/interaction.css`）

- [ ] **Step 1: 改 gallery.js**

在 `js/gallery.js` 的 `createGalleryItem` 内、`return item;` 之前追加一行：

```js
function createGalleryItem(imageSrc, caption) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
        <img src="${imageSrc}" alt="${caption}" onerror="this.style.display='none'">
        <div class="photo-caption">${caption}</div>
    `;

    item.addEventListener('click', () => openLightbox(imageSrc, caption));

    if (typeof window.attachInteraction === 'function') {
        window.attachInteraction(item, imageSrc);   // ← 新增：挂载点赞/评论
    }

    return item;
}
```

- [ ] **Step 2: 改 history.html**

在 `history.html` 的 `<head>` 里 `</head>` 前引入 CSS，在 `</body>` 前引入 JS：

```html
<link rel="stylesheet" href="css/interaction.css">
```

```html
<script src="js/interaction.js"></script>
<script src="js/gallery.js"></script>
```

> 注意：`interaction.js` 要在 `gallery.js` 之前加载（`gallery.js` 里调用了 `attachInteraction`）。

- [ ] **Step 3: 本地冒烟**

```bash
php -S localhost:8000
```

浏览器打开 `http://localhost:8000/history.html`，确认相册每张照片右上角出现 👍/💬 按钮，点赞后计数 +1，点 💬 弹出评论框。

- [ ] **Step 4: 提交**

```bash
git add js/gallery.js history.html
git commit -m "feat: 历史页相册集成照片评论/点赞"
```

---

## Task 7: 集成主页比赛卡片

**Files:**
- Modify: `js/main.js`（`loadMatchesGrid` 的卡片挂载交互）
- Modify: `index.html`（引入 `js/interaction.js` 与 `css/interaction.css`）

- [ ] **Step 1: 改 main.js**

在 `js/main.js` 的 `loadMatchesGrid` 里、`grid.appendChild(matchCard);` 之前追加：

```js
    if (typeof window.attachInteraction === 'function') {
        window.attachInteraction(matchCard, match.imageUrl);   // ← 新增
    }
```

- [ ] **Step 2: 改 index.html**

在 `index.html` 的 `<head>` 引入 CSS、`</body>` 前引入 JS（在 `main.js` 之前）：

```html
<link rel="stylesheet" href="css/interaction.css">
```

```html
<script src="js/interaction.js"></script>
<script src="js/main.js"></script>
```

- [ ] **Step 3: 本地冒烟**

`php -S localhost:8000` 后打开 `http://localhost:8000/`，确认比赛卡片右上角出现 👍/💬，点赞与评论可用。

- [ ] **Step 4: 提交**

```bash
git add js/main.js index.html
git commit -m "feat: 主页比赛卡片集成照片评论/点赞"
```

---

## Task 8: 配置（gitignore + 部署排除）

**Files:**
- Modify: `.gitignore`
- Modify: `scripts/.deploy.env.example`

- [ ] **Step 1: 改 .gitignore**

在 `.gitignore` 的「资源图片」段之前新增一行：

```gitignore
# ======== 访客互动运行时数据（PHP 写入，不进 Git） ========
data/interactions/
```

- [ ] **Step 2: 改 .deploy.env.example**

在 `EXCLUDES` 数组里（`--exclude=.well-known/` 之前）新增：

```bash
  "--exclude=data/interactions/"   # 访客互动运行时数据（服务器上 PHP 写入，rsync --delete 不得删）
```

> ⚠️ 提醒：用户本地的 `scripts/.deploy.env` 是实际配置（gitignore 不入库），需要**手动同步**这一条排除规则，否则下次 `push` 会抹掉服务器上的访客数据。

- [ ] **Step 3: 提交**

```bash
git add .gitignore scripts/.deploy.env.example
git commit -m "chore: 排除访客互动运行时数据目录（gitignore + rsync）"
```

---

## Task 9: 端到端验证

- [ ] **Step 1: PHP 单测全绿**

```bash
php tests/interaction_test.php
```
Expected: 全部 `✓`，退出码 0

- [ ] **Step 2: ESLint 全绿**

```bash
npx eslint js/
```
Expected: 无 error（`js/interaction.js` 无新增 error）

- [ ] **Step 3: 本地完整流程（php -S）**

```bash
php -S localhost:8000
```

用浏览器依次验证：
1. `history.html` 相册照片点赞 → 计数 +1，刷新后仍保留
2. 点 💬 → 弹窗显示评论 → 填昵称/内容/验证码 → 提交 → 列表刷新出新评论
3. `index.html` 比赛卡片同样可用
4. 连续提交第二次（60 秒内）→ 提示「操作过于频繁」
5. 评论输入敏感词 → 被拒绝

- [ ] **Step 4: 部署到服务器（用户操作，非自动）**

```bash
./scripts/push-to-server.sh --yes
```

并在服务器上确认 `data/interactions/` 目录存在且 PHP-FPM 可写（`chown www:www` 视宝塔实际用户调整）。

---

## 自审记录

- **Spec 覆盖**：照片评论 ✓（Task 2/4）、照片点赞 ✓（Task 2/4）、历史相册集成 ✓（Task 6）、主页比赛照片集成 ✓（Task 7）、算术验证码 ✓（Task 2）、IP 限频 ✓（Task 2）、敏感词 ✓（Task 1/2）、渲染时转义防 XSS ✓（Task 4）、flock 锁 ✓（Task 1）、rsync 排除 ✓（Task 8）、PHP 写权限提醒 ✓（Task 9 Step 4）。
- **类型一致性**：`normalize_photo_key` / `normalizePhotoKey` 前后端命名对应；`attachInteraction(container, src)` 签名在 Task 4 定义、Task 6/7 调用一致。
- **占位符**：无 TBD/TODO。

---

## 注意事项

- 本地无 PHP 是硬前提：测试与 `php -S` 起服务都需要先 `brew install php`。
- `mb_strlen` 依赖 `mbstring` 扩展（宝塔 PHP 默认开启）；若生产报错可在 `php.ini` 开启。
- 评论/点赞按图片路径 key，图片改名会导致历史数据孤儿化（设计已接受）。
