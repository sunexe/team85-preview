// 三部分照片数据
const topImages = [
  {src: "matches/2026/20260104-1.jpg",caption: "2026.1.4 与新疆天山纵队友谊赛",},
  {src: "matches/2026/20260104-2.JPG",caption: "2026.1.4 与新疆天山纵队友谊赛",},
  {src: "matches/2026/20260104-3.JPG",caption: "2026.1.4 与新疆天山纵队友谊赛",},
  {src: "matches/2025/20251206-1.JPG",caption: "2025.12.6 与湖南星城50+友谊赛",},
  {src: "matches/2025/20250706-1.JPG",caption: "2025.7.6 潮汕情足球邀请赛",},
  {src: "matches/2025/20250706-2.JPG",caption: "2025.7.6 潮汕情足球邀请赛",},
  {src: "matches/2025/20250706-3.JPG",caption: "2025.7.6 潮汕情足球邀请赛",},
  {src: "matches/2025/20250706-4.JPG",caption: "2025.7.6 潮汕情足球邀请赛",},
  {src: "matches/2025/20250419合影1.JPG",caption: "2025.4.19与北京锐旗足球队友谊赛",},
  {src: "matches/2024/20241116合影.JPG",caption: "2024.11.16与南澳队友谊赛",},
  {src: "matches/2024/20241019合影2.JPG",caption: "2024.10.19赴梅州友谊赛活动合影",},
  {src: "matches/2024/20241019合影1.JPG",caption: "2024.10.19赴梅州友谊赛活动合影",},
  {src: "matches/2024/20240810合影.JPG",caption: "2024.8.10与广州体院队友谊赛",},
  {src: "matches/2024/20240810大合影.JPG",caption: "2024.8.10与广州体院队友谊赛",},
  {src: "matches/2024/20240720大合影.JPG",caption: "2024.7.20与英华中学队友谊赛",},
  {src: "matches/2023/20230819.JPG",caption: "2023.8.19梅州队来访友谊赛",},
  {src: "matches/2022/20220806.jpg",caption: "2022.8.6与一中93队友谊赛",},
  {src: "matches/2022/20220516.jpg",caption: "2022.5.16与市中心医院友谊赛",},
  {src: "team/20220516-2.jpg",caption: "2022.5.16与市中心医院友谊赛",},
  {src: "matches/2021/20211113-2.JPG",caption: "2021.11.13往梅州与老马队友谊赛",},
];

const middleImages = [
  { src: "team/h1.jpg", caption: "2019.8.3活动全家福" },
  { src: "team/h2.jpg", caption: "2019.8.3活动全家福" },
  { src: "team/h3.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h4.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h5.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h6.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h7.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h8.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h9.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h10.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h11.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h12.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h13.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h14.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h15.jpg", caption: "2019.8.3活动合影" },
  { src: "team/h16.jpg", caption: "2019.8.3活动合影" },
];

const bottomImages = [
    {src: 'team/301.png', caption: '运动队合影' },
    {src: 'team/501.jpg', caption: '五班郊游合影' },
    {src: 'team/class1.jpg', caption: '初三（1）班集体照' },
    {src: 'team/class2.jpg', caption: '初三（2）班集体照' },
    {src: 'team/class3.jpg', caption: '初三（3）班集体照' },
    {src: 'team/class4.jpg', caption: '初三（4）班集体照' },
    {src: 'team/class5.jpg', caption: '初三（5）班集体照' },
    {src: 'team/class6.jpg', caption: '初三（6）班集体照' }
];

// 创建图片项目
function createGalleryItem(imageSrc, caption) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
        <img src="${imageSrc}" alt="${caption}" onerror="this.style.display='none'">
        <div class="photo-caption">${caption}</div>
    `;
    
    item.addEventListener('click', () => openLightbox(imageSrc, caption));

    if (typeof window.attachInteraction === 'function') {
        window.attachInteraction(item, imageSrc);   // 挂载点赞/评论
    }

    return item;
}

// 加载图片到对应容器
function loadGallery() {
    const topContainer = document.getElementById('gallery-top');
    const middleContainer = document.getElementById('gallery-middle');
    const bottomContainer = document.getElementById('gallery-bottom');

    if (topContainer) {
        topImages.forEach(item => {
            const galleryItem = createGalleryItem(item.src, item.caption);
            topContainer.appendChild(galleryItem);
        });
    }

    if (middleContainer) {
        middleImages.forEach(item => {
            const galleryItem = createGalleryItem(item.src, item.caption);
            middleContainer.appendChild(galleryItem);
        });
    }

    if (bottomContainer) {
        bottomImages.forEach(item => {
            const galleryItem = createGalleryItem(item.src, item.caption);
            bottomContainer.appendChild(galleryItem);
        });
    }
}

// 打开灯箱
function openLightbox(imageSrc, caption) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    lightboxImg.src = imageSrc;
    lightboxImg.alt = caption;
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭灯箱
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// 点击背景关闭灯箱
document.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        closeLightbox();
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', loadGallery);
