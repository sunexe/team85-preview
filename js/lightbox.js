class Lightbox {
    constructor() {
        this.createLightbox();
        this.bindEvents();
    }

    createLightbox() {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="" alt="">
                <button class="close-btn">&times;</button>
                <button class="prev-btn">&lt;</button>
                <button class="next-btn">&gt;</button>
            </div>
        `;
        document.body.appendChild(lightbox);
        this.element = lightbox;
    }

    show(imgSrc) {
        const img = this.element.querySelector('img');
        img.src = imgSrc;
        this.element.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.element.classList.remove('active');
        document.body.style.overflow = '';
    }

    bindEvents() {
        this.element.querySelector('.close-btn').onclick = () => this.hide();
        this.element.onclick = (e) => {
            if (e.target === this.element) this.hide();
        };
    }
}

const lightbox = new Lightbox();
