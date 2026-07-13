/**
 * 卷轴浮筒文字效果 (Scroll Float Text Effect)
 * 主题：中国古代建筑可视化 · 卷轴展开式文字展示
 *
 * 功能：点击卡片后，模态框/面板标题以卷轴展开动画显示文字
 * 原理：GSAP 驱动每个字符从压缩→舒展的展开效果，配合卷轴装饰线同步出现
 */

// 确保 GSAP 已加载（如果未加载则动态引入）
(function ensureGSAP() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    script.onload = function() {
        const stScript = document.createElement('script');
        stScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
        stScript.onload = function() {
            gsap.registerPlugin(ScrollTrigger);
            console.log('[ScrollFloat] GSAP + ScrollTrigger loaded');
        };
        stScript.onerror = function() {
            console.warn('[ScrollFloat] Failed to load ScrollTrigger');
        };
        document.head.appendChild(stScript);
    };
    script.onerror = function() {
        console.warn('[ScrollFloat] Failed to load GSAP');
    };
    document.head.appendChild(script);
})();

/**
 * 将文本拆分为字符 span 元素
 * @param {string} text - 要拆分的文本
 * @returns {string} - HTML 字符串
 */
function splitTextToChars(text) {
    return text.split('').map((char, index) => {
        if (char === ' ') {
            return `<span class="scroll-char non-cn" data-index="${index}"> </span>`;
        }
        // 检测是否为中文字符或常见CJK标点
        const isCN = /[一-鿿　-〿＀-￯]/.test(char);
        const className = isCN ? 'scroll-char' : 'scroll-char non-cn';
        return `<span class="${className}" data-index="${index}">${char}</span>`;
    }).join('');
}

/**
 * 在容器内创建卷轴浮筒效果
 * @param {HTMLElement} container - 目标容器元素
 * @param {string} text - 要显示的文本
 * @param {Object} options - 配置选项
 * @returns {Object} - animation 对象，可用于控制
 */
function createScrollFloat(container, text, options = {}) {
    const {
        duration = 1.2,          // 总动画时长
        stagger = 0.04,          // 字符间隔延迟
        ease = 'back.out(1.7)',   // 缓动函数
        fontSize = null,         // 字体大小
        color = '#C23B22',       // 文字颜色
        onComplete = null        // 完成回调
    } = options;

    // 清空容器
    container.innerHTML = '';
    container.classList.add('scroll-float-container');

    // 创建卷轴装饰头
    const rodTop = document.createElement('div');
    rodTop.className = 'scroll-rod-top';
    container.appendChild(rodTop);

    const rodBottom = document.createElement('div');
    rodBottom.className = 'scroll-rod-bottom';
    container.appendChild(rodBottom);

    // 创建文字行
    const line = document.createElement('div');
    line.className = 'scroll-text-line';
    line.innerHTML = splitTextToChars(text);
    container.appendChild(line);

    // 获取所有字符元素
    const chars = container.querySelectorAll('.scroll-char');
    if (chars.length === 0) return null;

    // 应用自定义样式
    if (fontSize) {
        chars.forEach(ch => { ch.style.fontSize = fontSize; });
    }
    if (color) {
        chars.forEach(ch => { ch.style.color = color; });
    }

    // 创建动画时间线
    const tl = gsap.timeline({
        onComplete: onComplete
    });

    // 1) 卷轴装饰金线淡入（通过 rod 元素模拟）
    tl.to(rodTop, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
    tl.to(rodBottom, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);

    // 2) 卷轴头从中间向两侧展开
    tl.fromTo(rodTop, { scaleX: 0 }, {
        scaleX: 1,
        duration: 0.5,
        ease: 'power2.out'
    }, 0);

    tl.fromTo(rodBottom, { scaleX: 0 }, {
        scaleX: 1,
        duration: 0.5,
        ease: 'power2.out'
    }, 0);

    // 3) 每个字符依次从压缩状态舒展到正常
    tl.to(chars, {
        opacity: 1,
        scaleY: 1,
        scaleX: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: duration,
        ease: ease,
        stagger: stagger
    }, 0.1);

    // 4) 标记为已动画状态（用于 CSS 装饰）
    tl.call(() => {
        container.classList.add('animated');
    }, null, duration + 0.2);

    return tl;
}

/**
 * 重置卷轴浮筒效果（用于重新播放）
 * @param {HTMLElement} container - 目标容器（.scroll-float-container 或其父级）
 */
function resetScrollFloat(container) {
    // 找到实际的卷轴容器
    const scrollContainer = container.classList.contains('scroll-float-container')
        ? container
        : container.querySelector('.scroll-float-container');
    if (!scrollContainer) return;

    const chars = scrollContainer.querySelectorAll('.scroll-char');
    const rodTop = scrollContainer.querySelector('.scroll-rod-top');
    const rodBottom = scrollContainer.querySelector('.scroll-rod-bottom');

    // 重置 GSAP 动画
    gsap.set(scrollContainer, { clearProps: 'all' });
    scrollContainer.classList.remove('animated');

    gsap.set(chars, {
        opacity: 0,
        scaleY: 2.5,
        scaleX: 0.7,
        y: 40,
        filter: 'blur(2px)'
    });

    gsap.set([rodTop, rodBottom], {
        opacity: 0,
        scaleX: 0
    });
}

/**
 * 为模态框标题添加卷轴浮筒效果
 * @param {string} titleText - 标题文本
 * @returns {HTMLElement} - 创建的卷轴容器
 */
function animateModalTitle(titleText) {
    const modalBody = document.getElementById('modal-body');
    if (!modalBody) return null;

    // 在 modal-body 顶部插入卷轴标题
    let wrapper = modalBody.querySelector('.scroll-title-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'scroll-title-wrapper';
        modalBody.insertBefore(wrapper, modalBody.firstChild);
    }

    // 重置并创建新动画
    resetScrollFloat(wrapper);
    const container = document.createElement('div');
    container.className = 'scroll-float-container';
    wrapper.appendChild(container);

    createScrollFloat(container, titleText, {
        duration: 1.0,
        stagger: 0.05,
        ease: 'back.out(1.7)',
        fontSize: '2.2rem',
        color: '#C23B22'
    });

    return container;
}

/**
 * 为时间轴时期标题添加卷轴浮筒效果
 * @param {HTMLElement} eraTitleEl - 时期标题元素 (<h3>)
 * @param {string} newText - 新的标题文本
 */
function animateEraTitle(eraTitleEl, newText) {
    if (!eraTitleEl || !newText) return;

    // 保存原始文本
    const originalHTML = eraTitleEl.innerHTML;
    eraTitleEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-title-wrapper';
    eraTitleEl.appendChild(wrapper);

    const container = document.createElement('div');
    container.className = 'scroll-float-container';
    wrapper.appendChild(container);

    createScrollFloat(container, newText, {
        duration: 0.8,
        stagger: 0.04,
        ease: 'back.out(1.7)',
        fontSize: '1.8rem',
        color: '#C23B22',
        onComplete: () => {
            console.log(`[ScrollFloat] Era title "${newText}" animation complete`);
        }
    });
}

/**
 * 为搜索结果卡片标题添加卷轴效果
 * @param {HTMLElement} cardEl - 卡片元素
 * @param {string} titleText - 标题文本
 */
function animateSearchCardTitle(cardEl, titleText) {
    if (!cardEl || !titleText) return;

    const titleEl = cardEl.querySelector('h3');
    if (!titleEl) return;

    titleEl.style.textAlign = 'center';
    titleEl.style.padding = '10px 0';
    titleEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-title-wrapper';
    titleEl.appendChild(wrapper);

    const container = document.createElement('div');
    container.className = 'scroll-float-container';
    wrapper.appendChild(container);

    createScrollFloat(container, titleText, {
        duration: 0.6,
        stagger: 0.03,
        ease: 'back.out(1.5)',
        fontSize: '1.1rem',
        color: '#C23B22'
    });
}

/**
 * 为建筑图片模态框标题添加卷轴效果
 * @param {string} buildingName - 建筑名称
 */
function animateBuildingModalTitle(buildingName) {
    const buildingNameEl = document.getElementById('building-name');
    if (!buildingNameEl || !buildingName) return;

    buildingNameEl.style.textAlign = 'center';
    buildingNameEl.style.padding = '15px 0';
    buildingNameEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-title-wrapper';
    buildingNameEl.appendChild(wrapper);

    const container = document.createElement('div');
    container.className = 'scroll-float-container';
    wrapper.appendChild(container);

    createScrollFloat(container, buildingName, {
        duration: 0.8,
        stagger: 0.04,
        ease: 'back.out(1.7)',
        fontSize: '1.8rem',
        color: '#C23B22'
    });
}

/**
 * 为故宫详情面板标题添加卷轴效果
 * @param {string} palaceName - 宫殿名称
 */
function animatePalaceDetailTitle(palaceName) {
    const centerTitle = document.getElementById('center-title');
    if (!centerTitle || !palaceName) return;

    centerTitle.style.textAlign = 'center';
    centerTitle.style.padding = '5px 0';
    centerTitle.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-title-wrapper';
    centerTitle.appendChild(wrapper);

    const container = document.createElement('div');
    container.className = 'scroll-float-container';
    wrapper.appendChild(container);

    createScrollFloat(container, palaceName, {
        duration: 0.7,
        stagger: 0.035,
        ease: 'back.out(1.7)',
        fontSize: '1.8rem',
        color: '#3a3a3a'
    });
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.createScrollFloat = createScrollFloat;
    window.resetScrollFloat = resetScrollFloat;
    window.animateModalTitle = animateModalTitle;
    window.animateEraTitle = animateEraTitle;
    window.animateSearchCardTitle = animateSearchCardTitle;
    window.animateBuildingModalTitle = animateBuildingModalTitle;
    window.animatePalaceDetailTitle = animatePalaceDetailTitle;
}
