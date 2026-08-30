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

function apiGetStats(photoKeys) {
  const qs = photoKeys.map((k) => encodeURIComponent(k)).join(',');
  return requestJSON(`${INTERACTION_API}?action=get_stats&photos=${qs}`);
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

// 批量加载点赞/评论数：收集整页照片 key，合并成一次 get_stats 请求，避免逐张 N+1
const pendingStats = new Map(); // photoKey -> { likeEl, commentEl }
let statsFlushTimer = null;

function queueStatsLoad(photoKey, likeEl, commentEl) {
  pendingStats.set(photoKey, { likeEl, commentEl });
  if (statsFlushTimer === null) {
    statsFlushTimer = setTimeout(flushStats, 0);
  }
}

function flushStats() {
  statsFlushTimer = null;
  if (pendingStats.size === 0) return;
  const entries = [...pendingStats.entries()];
  pendingStats.clear();
  apiGetStats(entries.map(([key]) => key)).then((res) => {
    if (!res || !res.ok) return;
    for (const [photoKey, { likeEl, commentEl }] of entries) {
      const s = res.stats[photoKey];
      if (s) {
        likeEl.textContent = s.likes;
        commentEl.textContent = s.comments;
      }
    }
  }).catch(() => {});
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

  queueStatsLoad(photoKey, likeCount, commentCount);

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
