async function loadMembers() {
    try {
        const response = await fetch('data/members.json');
        const data = await response.json();
        renderMembers(data.members);
    } catch (error) {
        console.error('加载成员数据失败:', error);
    }
}

function renderMembers(members) {
    const grid = document.querySelector('.members-grid');
    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        // 添加点击事件
        if (member.videoUrl) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                window.open(member.videoUrl, '_blank', 'noopener noreferrer');
            });
        }
        
        card.innerHTML = `
            <div class="member-photo">
                <img src="${member.avatar}" alt="${member.name}">
                <div class="member-info">
                    <div class="info-row">
                        <span class="member-name">${member.name}</span>
                        <span class="member-nickname">昵称：${member.nickname}</span>
                    </div>
                    <div class="info-row">
                        <span>球衣号码：${member.number}</span>
                        <span>场上位置：${member.position}</span>
                        <span>特长：${member.specialty}</span>
                    </div>
                    <p class="quote">经典语录："${member.quote}"</p>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', loadMembers);
