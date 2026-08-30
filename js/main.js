let matches = [];
let currentIndex = 0;

// 获取当前年份
function getCurrentYear() {
  const yearSelect = document.getElementById('yearSelect') || document.getElementById('yearSelectBottom');
  return yearSelect ? yearSelect.value : '2026';
}

// 加载赛事数据
async function loadMatchData() {
  // 清空现有数据
  matches = [];
  currentIndex = 0;
  document.querySelector('.matches-grid').innerHTML = '';
  document.querySelector('.slider').style.backgroundImage = '';
  document.querySelector('.match-info').innerHTML = '';

  const year = getCurrentYear();
  let dataFile;

  if (year === 'earlier') {
    dataFile = 'matches_earlier.json';
  } else {
    // 当前年份（2026）使用matches.json，其他年份使用matches${year}.json
    dataFile = year === '2026' ? 'matches.json' : `matches${year}.json`;
  }

  try {
    const response = await fetch(`data/${dataFile}`);
    const data = await response.json();
    matches = data.matches;
    currentIndex = matches.length - 1;
    initSlider();
    loadMatchesGrid(); // 重新加载网格
  } catch (error) {
    console.error(`加载${year}赛事数据失败:`, error);
  }
}

// 初始化轮播
function initSlider() {
  const slider = document.querySelector('.slider');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');

  // 清除现有的事件监听器
  const newPrevBtn = prevBtn.cloneNode(true);
  const newNextBtn = nextBtn.cloneNode(true);
  prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

  function updateNavButtons() {
    // 始终显示导航按钮，实现循环功能
    newPrevBtn.style.display = 'flex';
    newNextBtn.style.display = 'flex';
  }

  newPrevBtn.addEventListener('click', () => {
    // 实现循环到最后一张
    currentIndex = (currentIndex - 1 + matches.length) % matches.length;
    updateSlide();
    updateNavButtons();
  });

  newNextBtn.addEventListener('click', () => {
    // 实现循环到第一张
    currentIndex = (currentIndex + 1) % matches.length;
    updateSlide();
    updateNavButtons();
  });

  updateSlide();
  updateNavButtons();

  // 修改触摸滑动事件也实现循环
  let touchStartX = 0;
  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });

  slider.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        currentIndex = (currentIndex + 1) % matches.length;
      } else {
        currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      }
      updateSlide();
      updateNavButtons();
    }
  });
}

// 初始化年份导航事件
function initYearNav() {
  const yearSelects = document.querySelectorAll('#yearSelect, #yearSelectBottom');
  yearSelects.forEach((select) => {
    select.addEventListener('change', async (e) => {
      // 同步所有选择器的值
      yearSelects.forEach((otherSelect) => {
        if (otherSelect !== e.target) {
          otherSelect.value = e.target.value;
        }
      });
      await loadMatchData();
    });
  });
}

// 图片懒加载
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('loading');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach((img) => {
    img.classList.add('loading');
    imageObserver.observe(img);
  });
}

// 更新轮播图显示
function updateSlide() {
  if (!matches || !matches[currentIndex]) {
    console.error('无效的比赛数据或索引');
    return;
  }

  const match = matches[currentIndex];
  const slider = document.querySelector('.slider');

  slider.style.opacity = '0';
  setTimeout(() => {
    slider.style.backgroundImage = `url(${match.imageUrl})`;
    slider.style.opacity = '1';

    const matchInfo = document.querySelector('.match-info');
    matchInfo.innerHTML = `
            <h2>${match.name}</h2>
            <p>${match.date}</p>
            <p>${match.location}</p>
            <p>${match.weather}</p>
            <p>${match.players}人</p>
            <p>${match.description}</p>
            <div class="video-links">
                ${
                  match.videoUrls && match.videoUrls.length > 0
                    ? match.videoUrls
                        .map(
                          (url, index) =>
                            `<a href="${url}" target="_blank" rel="noopener noreferrer">视频${index + 1}</a>`,
                        )
                        .join('')
                    : ''
                }
            </div>
        `;
  }, 300);
}

// 加载网格图片
function loadMatchesGrid() {
  const grid = document.querySelector('.matches-grid');
  // 复制数组并反转，以保持原数组顺序不变
  [...matches].reverse().forEach((match, index) => {
    const matchCard = document.createElement('div');
    matchCard.className = 'match-card';
    matchCard.style.cursor = 'pointer';
    matchCard.innerHTML = `
            <img src="${match.imageUrl}" alt="${match.name}">
            <div class="match-card-info">
                <h3>${match.name}</h3>
                <div class="card-info-row">
                    <p class="match-date">${match.date}</p>
                    <div class="video-links">
                        ${
                          match.videoUrls && match.videoUrls.length > 0
                            ? match.videoUrls
                                .map(
                                  (url, index) =>
                                    `<a href="${url}" class="video-link" target="_blank" rel="noopener noreferrer">视频${index + 1}</a>`,
                                )
                                .join('')
                            : ''
                        }
                    </div>
                </div>
            </div>
        `;

    // 点击卡片更新hero区域并滚动
    matchCard.addEventListener('click', () => {
      // 由于网格是倒序显示的，需要反向计算索引
      currentIndex = matches.length - 1 - index;
      updateSlide();
      // 平滑滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    grid.appendChild(matchCard);
  });
}

// 加载成员数据
async function loadMembers() {
  try {
    const response = await fetch('data/members.json');
    const data = await response.json();
    const container = document.querySelector('.members-container');

    data.members.forEach((member) => {
      const memberElement = document.createElement('div');
      memberElement.className = 'member-item';

      // 处理图片路径
      const imagePath = member.avatar.startsWith('/')
        ? member.avatar.slice(1)
        : member.avatar;

      memberElement.innerHTML = `
                <div class="member-image">
                    <img src="${imagePath}" alt="${member.name}" 
                         onerror="this.onerror=null; this.src='images/placeholder.jpg';">
                    <div class="member-basic-info">
                        <p class="member-name">${member.name}</p>
                        <p class="member-number">${member.number}号</p>
                        <p class="member-nickname">昵称：${member.nickname}</p>
                    </div>
                    <div class="member-detail">
                        <div class="member-detail-name">${member.name}</div>
                        <div class="member-info-row">
                            <p class="member-position">场上位置：${member.position}</p>
                            <p class="member-specialty">特长：${member.specialty}</p>
                        </div>
                        <p class="member-quote">语录：${member.quote}</p>
                    </div>
                </div>
            `;
      container.appendChild(memberElement);
    });
  } catch (error) {
    console.error('加载成员数据失败:', error);
  }
}

function addScrollIndicator() {
  const container = document.querySelector('.members-container');
  const wrapper = document.querySelector('.members-scroll');

  if (container && wrapper) {
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    wrapper.appendChild(indicator);
  }
}

/**
 * 🎉 优雅的公告系统
 * 加载并显示最新公告，支持动画效果和响应式设计
 */
async function loadAnnouncementBanner() {
  try {
    const response = await fetch('data/announcements.json');
    const data = await response.json();
    
    if (data.announcements && data.announcements.length > 0) {
      // 按日期倒序取最新一条（数据文件本身有序，这里做双保险）
      const sorted = [...data.announcements].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      const latestAnnouncement = sorted[0];
      const banner = document.getElementById('announcement-banner');
      
      if (banner) {
        createElegantAnnouncement(latestAnnouncement, banner);
        animateAnnouncementEntrance(banner);
      }
    }
  } catch (error) {
    console.warn('公告加载失败，将隐藏公告横幅');
    hideAnnouncementBanner();
  }
}

/**
 * 🎨 创建优雅的公告显示
 */
function createElegantAnnouncement(announcement, container) {
  const isUrgent = isUrgentAnnouncement(announcement);
  const formattedDate = formatAnnouncementDate(announcement.date);
  
  container.innerHTML = `
    <div class="announcement-wrapper ${isUrgent ? 'urgent' : ''}">
      <div class="announcement-icon">
        ${isUrgent ? '🚨' : '📢'}
      </div>
      
      <div class="announcement-content-wrapper">
        <div class="announcement-header">
          <h3 class="announcement-title">${announcement.title}</h3>
          ${formattedDate ? `<time class="announcement-date" datetime="${announcement.date}">发布日期：${formattedDate}</time>` : ''}
        </div>
        
        <div class="announcement-body">
          <p class="announcement-text" id="announcement-text">${announcement.content}</p>
          <button class="announcement-expand-btn" id="expand-btn" style="display: none;">
            <span class="expand-text">展开</span>
            <svg class="expand-icon" width="16" height="16" viewBox="0 0 16 16">
              <path d="M8 12l-4-4h8l-4 4z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button class="announcement-close-btn" onclick="hideAnnouncementBanner()">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
  
  // 初始化展开/收起功能
  initializeContentToggle(announcement.content, container);
}

/**
 * 📅 格式化公告日期
 */
function formatAnnouncementDate(dateString) {
  if (!dateString) return null;
  
  try {
    // 处理不同的日期格式
    let date;
    if (dateString.includes('/')) {
      // 处理 "2025/7/1" 格式
      const parts = dateString.split('/');
      date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // 处理 "2025-07-01" 格式
      date = new Date(dateString);
    }
    
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    if (diffDays <= 7) return `${diffDays}天前`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)}周前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('日期格式化失败:', dateString);
    return dateString;
  }
}

/**
 * ⚡ 判断是否为紧急公告
 */
function isUrgentAnnouncement(announcement) {
  // 只根据 type 字段判断是否为紧急公告
  return announcement.type === 'urgent';
}

/**
 * 🎭 初始化内容展开/收起功能
 */
function initializeContentToggle(fullContent, container) {
  const isMobile = window.innerWidth <= 768;
  const maxLength = isMobile ? 60 : 120;
  
  if (fullContent.length <= maxLength) return;
  
  const textElement = container.querySelector('#announcement-text');
  const expandBtn = container.querySelector('#expand-btn');
  const expandText = expandBtn.querySelector('.expand-text');
  const expandIcon = expandBtn.querySelector('.expand-icon');
  
  const shortContent = fullContent.substring(0, maxLength) + '...';
  let isExpanded = false;
  
  // 显示展开按钮
  expandBtn.style.display = 'flex';
  textElement.textContent = shortContent;
  
  expandBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    // 添加过渡动画
    textElement.style.opacity = '0.7';
    expandBtn.classList.add('loading');
    
    setTimeout(() => {
      textElement.textContent = isExpanded ? fullContent : shortContent;
      expandText.textContent = isExpanded ? '收起' : '展开';
      expandIcon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      
      textElement.style.opacity = '1';
      expandBtn.classList.remove('loading');
      
      // 更新按钮状态
      expandBtn.classList.toggle('expanded', isExpanded);
    }, 150);
  });
}

/**
 * ✨ 公告入场动画
 */
function animateAnnouncementEntrance(banner) {
  banner.style.opacity = '0';
  banner.style.transform = 'translateY(-20px)';
  
  // 使用 requestAnimationFrame 确保动画流畅
  requestAnimationFrame(() => {
    banner.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    banner.style.opacity = '1';
    banner.style.transform = 'translateY(0)';
  });
  
  // 添加闪烁效果（仅紧急公告）
  // if (banner.querySelector('.urgent')) {
  //   setTimeout(() => {
  //     banner.classList.add('pulse-animation');
  //   }, 600);
  // }
}

/**
 * 🚫 隐藏公告横幅
 */
function hideAnnouncementBanner() {
  const banner = document.getElementById('announcement-banner');
  if (banner) {
    banner.style.transition = 'all 0.4s ease-out';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-100%)';

    setTimeout(() => {
      banner.style.display = 'none';
    }, 400);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initYearNav();
  loadMatchData();
  initLazyLoading();
  loadMembers();
  addScrollIndicator();
  loadAnnouncementBanner();
});
