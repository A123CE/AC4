// 仪表盘交互逻辑

// 全局变量
let currentBuildingIndex = 0;
let currentPeriodBuildings = [];
let currentPeriodIndex = 0;
let currentImageIndex = 0; // 当前图片索引

// 沉浸式导航栏相关变量
let hideTimer = null;
let isNavExpanded = false;
let isTouchDevice = false;
let lastTouchX = 0;
let lastTouchY = 0;

// 初始化沉浸式导航栏
function initImmersiveNavigation() {
    const sidebar = document.querySelector('.sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const triggerZone = document.createElement('div');
    
    triggerZone.className = 'nav-trigger-zone';
    triggerZone.id = 'nav-trigger-zone';
    document.body.appendChild(triggerZone);
    
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    if (isTouchDevice) {
        initTouchControls(triggerZone, sidebar);
    } else {
        initMouseControls(triggerZone, sidebar);
    }
    
    initNavItemClickHandlers(navItems);
    
    if (!isNavExpanded) {
        sidebar.classList.add('collapsed');
    }
}

function initMouseControls(triggerZone, sidebar) {
    let mouseInTriggerZone = false;
    let mouseInSidebar = false;
    
    triggerZone.addEventListener('mouseenter', function() {
        mouseInTriggerZone = true;
        clearTimeout(hideTimer);
        expandNavigation(sidebar);
    });
    
    triggerZone.addEventListener('mouseleave', function() {
        mouseInTriggerZone = false;
        scheduleHideNavigation(sidebar);
    });
    
    sidebar.addEventListener('mouseenter', function() {
        mouseInSidebar = true;
        clearTimeout(hideTimer);
    });
    
    sidebar.addEventListener('mouseleave', function() {
        mouseInSidebar = false;
        scheduleHideNavigation(sidebar);
    });
    
    document.addEventListener('mousemove', function(e) {
        const edgeDistance = e.clientX;
        if (edgeDistance <= 50 && !isNavExpanded) {
            clearTimeout(hideTimer);
            expandNavigation(sidebar);
        }
    });
}

function initTouchControls(triggerZone, sidebar) {
    let touchToggleEnabled = true;
    
    triggerZone.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (!touchToggleEnabled) return;
        
        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        
        if (isNavExpanded) {
            collapseNavigation(sidebar);
        } else {
            expandNavigation(sidebar);
        }
        
        touchToggleEnabled = false;
        setTimeout(() => {
            touchToggleEnabled = true;
        }, 300);
    });
    
    sidebar.addEventListener('touchstart', function(e) {
        if (!isNavExpanded) {
            e.stopPropagation();
        }
    });
    
    document.addEventListener('touchstart', function(e) {
        if (isNavExpanded && !sidebar.contains(e.target) && !triggerZone.contains(e.target)) {
            collapseNavigation(sidebar);
        }
    });
}

function initNavItemClickHandlers(navItems) {
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (isTouchDevice) {
                const sidebar = document.querySelector('.sidebar');
                triggerNavClickAnimation(this);
                setTimeout(() => {
                    collapseNavigation(sidebar);
                }, 400);
            }
        });
    });
}

function expandNavigation(sidebar) {
    if (!isNavExpanded) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
        isNavExpanded = true;
    }
}

function collapseNavigation(sidebar) {
    if (isNavExpanded) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        isNavExpanded = false;
    }
}

function scheduleHideNavigation(sidebar) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        collapseNavigation(sidebar);
    }, 500);
}

function triggerNavClickAnimation(navItem) {
    navItem.classList.add('clicked');
    setTimeout(() => {
        navItem.classList.remove('clicked');
    }, 400);
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化沉浸式导航栏
    initImmersiveNavigation();

    // 初始化导航系统
    initNavigation();

    // 初始化模态框
    initModal();

    // 初始化建筑图片查看模态框
    initBuildingModal();

    // 初始化历史长河
    initHistoryTimeline();

    // 初始化图表
    if (typeof initCharts === 'function') {
        initCharts();
    }
});

// 初始化导航系统
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const sectionTitle = document.getElementById('section-title');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // 更新导航项状态
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // 更新内容区域
            sections.forEach(section => {
                if (section.id === sectionId) {
                    section.classList.add('active');
                    section.classList.remove('hidden');
                    // 更新标题
                    sectionTitle.textContent = this.querySelector('span').textContent;
                } else {
                    section.classList.remove('active');
                    section.classList.add('hidden');
                }
            });
        });
    });
    
    // 初始化技术卡片点击事件
    const techCards = document.querySelectorAll('.tech-card');
    techCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 忽略来自语音按钮的点击
            if (e.target.closest('.play-audio-btn')) return;
            const tech = this.getAttribute('data-tech');
            showTechDetail(tech);
        });
    });

    // 初始化布局卡片点击事件
    const layoutCards = document.querySelectorAll('.layout-card');
    layoutCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 忽略来自语音按钮的点击
            if (e.target.closest('.play-audio-btn')) return;
            const layout = this.getAttribute('data-layout');
            showLayoutDetail(layout);
        });
    });

    // 初始化成就卡片点击事件
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 忽略来自语音按钮的点击
            if (e.target.closest('.play-audio-btn')) return;
            const achievement = this.getAttribute('data-achievement');
            showAchievementDetail(achievement);
        });
    });
}

// 初始化模态框
function initModal() {
    const modal = document.getElementById('detail-modal');
    const closeBtn = document.querySelector('.close');
    
    // 关闭模态框
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 显示技术详情
function showTechDetail(tech) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // 技术详情数据
    const techDetails = {
        'wood-frame': {
            title: '木构架体系',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">技术原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>木构架体系是中国古代建筑的核心结构，以木材为主要材料，通过榫卯连接形成框架结构。 <span style="font-size: 1.2em;">🪵</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>抗震性能优异，施工灵活，易于维修。 <span style="font-size: 1.2em;">🏗️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">原始社会：</span>简单木结构开始出现 <span style="font-size: 1.2em;">🌳</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：原始人类利用天然木材搭建简单的居住结构，这是木构架体系的萌芽。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>木构架体系基本形成 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：秦汉时期的宫殿建筑已经采用了成熟的木构架体系，如未央宫的建筑结构。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">隋唐时期：</span>技术成熟，规模宏大 <span style="font-size: 1.2em;">🌟</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：唐代的大明宫含元殿采用了庞大的木构架结构，体现了当时木构架技术的高度成熟。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>高度成熟，规范化 <span style="font-size: 1.2em;">✨</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的紫禁城采用了严格规范的木构架体系，体现了木构架技术的高度成熟。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">佛光寺东大殿：</span>唐代木构建筑的典范 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">佛光寺东大殿是中国现存最早的木结构建筑之一，体现了唐代木构架技术的高超水平。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">紫禁城：</span>明清两代的皇宫，木构架体系的巅峰之作 <span style="font-size: 1.2em;">👑</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">紫禁城的木构架体系设计精巧，施工精湛，是中国古代木构架建筑的巅峰之作。</small></li>
                    </ul>
                </div>
            `
        },
        dougong: {
            title: '斗拱',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">技术原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>斗拱是中国古代建筑特有的结构构件，位于柱与梁之间，兼具结构和装饰功能。 <span style="font-size: 1.2em;">🔧</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>传递荷载，抗震减震，装饰美观。 <span style="font-size: 1.2em;">⚖️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">西周时期：</span>斗拱开始出现 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：西周时期的建筑遗址中已经发现了斗拱的雏形，这是斗拱技术的起源。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>斗拱结构基本形成 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：秦汉时期的建筑中，斗拱已经成为重要的结构构件，发挥着传递荷载的作用。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">隋唐时期：</span>斗拱宏大，结构作用明显 <span style="font-size: 1.2em;">🌟</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：唐代的斗拱尺寸宏大，结构作用明显，体现了斗拱技术的成熟。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>斗拱变小，装饰作用增强 <span style="font-size: 1.2em;">✨</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的斗拱尺寸变小，装饰作用增强，成为建筑装饰的重要元素。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">佛光寺东大殿：</span>唐代斗拱的典范 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">佛光寺东大殿的斗拱宏大而精巧，体现了唐代斗拱技术的高超水平。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">应县木塔：</span>辽代木塔，斗拱结构复杂 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">应县木塔使用了大量复杂的斗拱结构，是中国古代斗拱技术的杰出代表。</small></li>
                    </ul>
                </div>
            `
        },
        sunmao: {
            title: '榫卯',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">技术原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>榫卯是中国传统木工技艺，通过榫头和卯眼的配合实现木材的连接，不用钉子。 <span style="font-size: 1.2em;">🔗</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>结构牢固，拆装方便，抗震性能好。 <span style="font-size: 1.2em;">🛠️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">原始社会：</span>简单榫卯开始出现 <span style="font-size: 1.2em;">🌳</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：原始人类在制作工具和简单结构时，已经开始使用简单的榫卯连接方式。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">商周时期：</span>榫卯技术基本成熟 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：商周时期的青铜器和木器中已经出现了复杂的榫卯结构，体现了榫卯技术的成熟。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>榫卯技术广泛应用 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：秦汉时期的建筑中，榫卯技术得到广泛应用，成为木构架体系的重要组成部分。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>榫卯技术高度成熟 <span style="font-size: 1.2em;">✨</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的家具和建筑中，榫卯技术达到了很高的水平，结构精巧，连接牢固。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">应县木塔：</span>全塔不用一钉一铆，靠榫卯连接 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">应县木塔全塔不用一钉一铆，完全依靠榫卯连接，体现了榫卯技术的高超水平。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">紫禁城：</span>大量使用榫卯技术 <span style="font-size: 1.2em;">👑</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">紫禁城中的木构架结构大量使用榫卯技术，保证了建筑的牢固和稳定性。</small></li>
                    </ul>
                </div>
            `
        },
        'brick-tile': {
            title: '砖瓦技术',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">技术原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>砖瓦技术是中国古代建筑的重要材料技术，包括制砖、制瓦、砌筑等工艺。 <span style="font-size: 1.2em;">🧱</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>坚固耐用，防水防火，装饰美观。 <span style="font-size: 1.2em;">🛡️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">西周时期：</span>砖瓦开始出现 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：西周时期已经开始使用砖瓦作为建筑材料，这是砖瓦技术的起源。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>砖瓦技术成熟，广泛应用 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：秦汉时期的建筑中，砖瓦技术得到广泛应用，如长城的砖砌筑。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">隋唐时期：</span>砖瓦质量提高，装饰性增强 <span style="font-size: 1.2em;">🌟</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：唐代的砖瓦质量提高，装饰性增强，如彩色琉璃瓦的使用。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>砖瓦技术高度成熟，品种丰富 <span style="font-size: 1.2em;">✨</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的砖瓦技术高度成熟，品种丰富，如紫禁城的琉璃瓦。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">长城：</span>大量使用砖砌筑 <span style="font-size: 1.2em;">🏞️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">长城的修筑大量使用了砖砌筑技术，体现了砖瓦技术的广泛应用。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">紫禁城：</span>琉璃瓦的典范 <span style="font-size: 1.2em;">👑</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">紫禁城的屋顶使用了大量的琉璃瓦，色彩鲜艳，装饰精美，体现了砖瓦技术的高度成熟。</small></li>
                    </ul>
                </div>
            `
        }
    };
    
    // 显示详情
    modalTitle.textContent = techDetails[tech].title;
    modalBody.innerHTML = techDetails[tech].content;
    modal.style.display = 'block';

    // 卷轴浮筒效果
    setTimeout(() => {
        animateModalTitle(techDetails[tech].title);
    }, 200);
}

// 显示布局详情
function showLayoutDetail(layout) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // 布局详情数据
    const layoutDetails = {
        'axis-symmetry': {
            title: '中轴对称',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">布局原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>中轴对称是中国古代建筑的重要布局原则，以中轴线为中心，左右对称布局。 <span style="font-size: 1.2em;">🏯</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>秩序井然，等级分明，体现礼制。 <span style="font-size: 1.2em;">⚖️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">夏商周时期：</span>中轴对称布局开始出现 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：二里头遗址的宫殿基址是中国最早的宫殿遗址之一，已经出现了明确的中轴线布局，为后世宫殿建筑奠定了基础。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>中轴对称布局基本形成 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：秦咸阳宫、汉未央宫都采用了严格的中轴对称布局，体现了大一统王朝的威严。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">隋唐时期：</span>中轴对称布局成熟，规模宏大 <span style="font-size: 1.2em;">🌟</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：唐长安城以朱雀大街为中轴线，将城市分为东西对称的两部分，是中国古代城市规划的典范。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>中轴对称布局高度规范化 <span style="font-size: 1.2em;">✨</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：紫禁城的中轴线从午门延伸至神武门，全长约1.6公里，两侧建筑严格对称，体现了皇家建筑的庄严与秩序。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">紫禁城：</span>严格的中轴对称布局 <span style="font-size: 1.2em;">👑</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">紫禁城的中轴线布局不仅体现了皇权的至高无上，也反映了中国传统文化中“居中为尊”的思想。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">孔庙：</span>中轴对称布局的典范 <span style="font-size: 1.2em;">📚</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">曲阜孔庙的中轴线布局体现了对孔子的尊崇，从棂星门到大成殿，层次分明，秩序井然。</small></li>
                    </ul>
                </div>
            `
        },
        hierarchy: {
            title: '等级制度',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">布局原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>等级制度是中国古代建筑的重要特征，通过建筑的规模、形式、装饰等体现社会等级。 <span style="font-size: 1.2em;">👑</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>严格的等级规定，体现社会秩序。 <span style="font-size: 1.2em;">📜</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">夏商周时期：</span>等级制度开始形成 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：周代的《考工记》中已经对不同等级的建筑规模和形式有了明确规定，体现了早期的等级制度。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>等级制度基本确立 <span style="font-size: 1.2em;">⚔️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：秦汉时期的宫殿建筑规模宏大，而民居建筑则受到严格限制，体现了鲜明的等级差异。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">隋唐时期：</span>等级制度成熟，规定详细 <span style="font-size: 1.2em;">📋</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：唐代的《营缮令》对不同等级官员的住宅规模、装饰等都有详细规定，形成了完整的等级制度体系。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>等级制度高度规范化 <span style="font-size: 1.2em;">🎯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的建筑等级制度更加严格，从屋顶形式、开间数量到装饰色彩都有明确规定，不可逾越。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">紫禁城：</span>严格的等级制度体现 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">紫禁城的太和殿是等级最高的建筑，采用重檐庑殿顶，开间数最多，装饰最华丽，体现了皇权的至高无上。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">民居：</span>根据社会地位不同，建筑规模和形式有严格规定 <span style="font-size: 1.2em;">🏠</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">明清时期，普通百姓的住宅不得使用斗拱、彩色琉璃瓦等装饰，体现了严格的等级限制。</small></li>
                    </ul>
                </div>
            `
        },
        courtyard: {
            title: '庭院空间',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">布局原理</h3>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">核心概念：</span>庭院空间是中国古代建筑的基本单元，通过围墙和建筑围合形成内向的空间。 <span style="font-size: 1.2em;">🏡</span></p>
                    <p style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">特点：</span>封闭性与开放性结合，体现人与自然的和谐。 <span style="font-size: 1.2em;">🌿</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史演变</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">原始社会：</span>简单庭院开始出现 <span style="font-size: 1.2em;">🏕️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：原始社会晚期，人类开始在房屋周围围合出简单的庭院空间，用于日常生活和活动。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">商周时期：</span>庭院布局基本形成 <span style="font-size: 1.2em;">🏛️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：商周时期的宫殿建筑已经形成了以庭院为中心的布局，体现了早期的庭院空间理念。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">秦汉时期：</span>庭院空间广泛应用 <span style="font-size: 1.2em;">🏯</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：秦汉时期的住宅建筑普遍采用庭院式布局，形成了“前堂后寝”的空间结构。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">明清时期：</span>庭院空间高度成熟，形式多样 <span style="font-size: 1.2em;">🌸</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：明清时期的北京四合院和江南园林，庭院空间的设计达到了很高的艺术水平，体现了中国传统的空间美学。</small></li>
                    </ul>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">应用实例</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">北京四合院：</span>庭院空间的典范 <span style="font-size: 1.2em;">🏘️</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">北京四合院以庭院为中心，四周环绕房屋，形成了封闭而又通透的空间，体现了中国传统的家庭伦理观念。</small></li>
                        <li style="margin-bottom: 15px;"><span style="color: #B5655D; font-weight: bold;">苏州园林：</span>庭院空间与自然景观的完美结合 <span style="font-size: 1.2em;">🎋</span><br>
                        <small style="color: #666; margin-left: 20px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">苏州园林通过巧妙的布局，将庭院空间与自然景观融为一体，创造出“虽由人作，宛自天开”的意境。</small></li>
                    </ul>
                </div>
            `
        }
    };
    
    // 显示详情
    modalTitle.textContent = layoutDetails[layout].title;
    modalBody.innerHTML = layoutDetails[layout].content;
    modal.style.display = 'block';

    // 卷轴浮筒效果
    setTimeout(() => {
        animateModalTitle(layoutDetails[layout].title);
    }, 200);
}

// 显示成就详情
function showAchievementDetail(achievement) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // 成就详情数据
    const achievementDetails = {
        structural: {
            title: '结构成就',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">成就内容</h3>
                    <p style="margin-bottom: 15px;">木构架体系的高度成熟，抗震性能优异，千年建筑至今屹立 <span style="font-size: 1.2em;">🏗️</span></p>
                    <p style="margin-bottom: 15px;">斗拱、榫卯等结构技术的发明和应用，体现了中国古代工匠的智慧 <span style="font-size: 1.2em;">🔧</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史意义</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑的结构技术不仅解决了建筑的实用问题，也为世界建筑技术的发展做出了贡献 <span style="font-size: 1.2em;">🌍</span></p>
                    <small style="color: #666; margin-left: 20px; display: block; margin-bottom: 15px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：佛光寺东大殿是中国现存最早的木结构建筑之一，体现了唐代木构架技术的高超水平。</small>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">现代影响</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑的结构理念和技术对现代建筑仍有启示，如抗震设计、可持续建筑等 <span style="font-size: 1.2em;">🔄</span></p>
                </div>
            `
        },
        artistic: {
            title: '艺术成就',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">成就内容</h3>
                    <p style="margin-bottom: 15px;">建筑与自然环境的和谐统一，体现了中国传统的天人合一思想 <span style="font-size: 1.2em;">🌿</span></p>
                    <p style="margin-bottom: 15px;">雕刻、彩画、装饰等艺术形式的高度发展，使建筑成为艺术的载体 <span style="font-size: 1.2em;">🎨</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史意义</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑艺术是中国传统文化的重要组成部分，反映了中国古代的审美观念和艺术水平 <span style="font-size: 1.2em;">🌟</span></p>
                    <small style="color: #666; margin-left: 20px; display: block; margin-bottom: 15px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：苏州园林通过巧妙的布局，将建筑与自然景观融为一体，创造出“虽由人作，宛自天开”的意境。</small>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">现代影响</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑艺术对现代建筑设计仍有启发，如传统元素的现代应用、环境与建筑的和谐等 <span style="font-size: 1.2em;">💡</span></p>
                </div>
            `
        },
        technical: {
            title: '技术成就',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">成就内容</h3>
                    <p style="margin-bottom: 15px;">《营造法式》等建筑专著的出现，标志着中国古代建筑技术的规范化 <span style="font-size: 1.2em;">📚</span></p>
                    <p style="margin-bottom: 15px;">标准化施工方法的建立，提高了建筑质量和效率 <span style="font-size: 1.2em;">⚙️</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史意义</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑技术的规范化和标准化，为建筑的传承和发展提供了保障 <span style="font-size: 1.2em;">🛡️</span></p>
                    <small style="color: #666; margin-left: 20px; display: block; margin-bottom: 15px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">案例：宋代李诫编写的《营造法式》是中国古代建筑技术的重要专著，对后世建筑产生了深远影响。</small>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">现代影响</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑的标准化思想对现代建筑工业化和标准化仍有启示 <span style="font-size: 1.2em;">🔄</span></p>
                </div>
            `
        },
        cultural: {
            title: '文化价值',
            content: `
                <div style="color: #333; line-height: 1.8; font-family: '黑体', Arial, sans-serif;">
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold;">成就内容</h3>
                    <p style="margin-bottom: 15px;">建筑作为文化载体，体现了中国传统哲学、礼制思想和审美观念 <span style="font-size: 1.2em;">📜</span></p>
                    <p style="margin-bottom: 15px;">不同地域的建筑风格反映了地域文化的多样性 <span style="font-size: 1.2em;">🌏</span></p>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">历史意义</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑是中国传统文化的重要组成部分，是历史的见证和文化的载体 <span style="font-size: 1.2em;">🏛️</span></p>
                    <small style="color: #666; margin-left: 20px; display: block; margin-bottom: 15px; font-size: 1em; font-family: '黑体', Arial, sans-serif;">小故事：紫禁城的布局体现了中国传统的“居中为尊”思想，是中国传统文化的重要载体。</small>
                    
                    <h3 style="color: #B5655D; border-bottom: 2px solid #B5655D; padding-bottom: 10px; margin: 30px 0 20px; font-weight: bold;">现代影响</h3>
                    <p style="margin-bottom: 15px;">中国古代建筑的文化价值对现代文化建设和文化自信的提升具有重要意义 <span style="font-size: 1.2em;">💪</span></p>
                </div>
            `
        }
    };
    
    // 显示详情
    modalTitle.textContent = achievementDetails[achievement].title;
    modalBody.innerHTML = achievementDetails[achievement].content;
    modal.style.display = 'block';

    // 卷轴浮筒效果
    setTimeout(() => {
        animateModalTitle(achievementDetails[achievement].title);
    }, 200);
}

// 语音播放函数
function playAudio(type, e) {
    // 阻止事件冒泡
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }

    // 停止之前的语音
    window.speechSynthesis.cancel();

    // 语音播放内容
    const audioContent = {
        'wood-frame': '木构架体系是中国古代建筑的核心结构，以木材为主要材料。原始人类利用天然木材搭建简单的居住结构，这是木构架体系的萌芽。',
        'dougong': '斗拱是中国古代建筑特有的结构构件，兼具结构和装饰功能。唐代的斗拱尺寸宏大，结构作用明显，体现了斗拱技术的成熟。',
        'sunmao': '榫卯是中国传统木工技艺，不用钉子的连接方式。应县木塔全塔不用一钉一铆，完全依靠榫卯连接。',
        'brick-tile': '砖瓦技术是中国古代建筑的重要材料技术。紫禁城的屋顶使用了大量的琉璃瓦，色彩鲜艳，装饰精美。',
        'axis-symmetry': '中轴对称是中国古代建筑的重要布局原则，体现等级制度。二里头遗址的宫殿基址是中国最早的宫殿遗址之一，已经出现了明确的中轴线布局。',
        'hierarchy': '等级制度是建筑规制体现社会等级，严格遵循礼制。《考工记》中对不同等级建筑的规模和装饰有明确规定。',
        'courtyard': '庭院空间是中国古代建筑的基本单元，体现人与自然的和谐。北京四合院是中国传统庭院空间的典型代表，体现了家族聚居的生活方式。',
        'structural': '结构成就是木构架体系的高度成熟，抗震性能优异，千年建筑至今屹立。佛光寺东大殿是中国现存最早的木结构建筑之一，体现了唐代木构架技术的高超水平。',
        'artistic': '艺术成就是建筑与自然环境的和谐统一，雕刻、彩画等装饰艺术的高度发展。苏州园林通过巧妙的布局，将建筑与自然景观融为一体，创造出虽由人作，宛自天开的意境。',
        'technical': '技术成就是《营造法式》等建筑专著的出现，标准化施工方法的建立。宋代李诫编写的《营造法式》是中国古代建筑技术的重要专著，对后世建筑产生了深远影响。',
        'cultural': '文化价值是建筑作为文化载体，体现中国传统哲学、礼制思想和审美观念。紫禁城的布局体现了中国传统的居中为尊思想，是中国传统文化的重要载体。'
    };

    const text = audioContent[type];
    if (!text) {
        console.warn('语音内容未找到:', type);
        return;
    }

    // 创建语音合成对象
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'zh-CN';
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    // 尝试获取中文语音
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(function(v) { return v.lang.indexOf('zh') >= 0; });
    if (zhVoice) speech.voice = zhVoice;

    // 播放语音
    window.speechSynthesis.speak(speech);

    // 视觉反馈：高亮当前播放的按钮
    const allBtns = document.querySelectorAll('.play-audio-btn');
    allBtns.forEach(function(btn) { btn.classList.remove('playing'); });
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('playing');
    }

    speech.onend = function() {
        if (e && e.currentTarget) {
            e.currentTarget.classList.remove('playing');
        }
    };
    speech.onerror = function() {
        if (e && e.currentTarget) {
            e.currentTarget.classList.remove('playing');
        }
    };
}

// 刷新仪表盘
function refreshDashboard() {
    // 模拟刷新效果
    const contentBody = document.querySelector('.content-body');
    contentBody.style.opacity = '0.5';
    
    setTimeout(() => {
        // 重新初始化图表
        if (typeof initCharts === 'function') {
            initCharts();
        }
        
        // 恢复显示
        contentBody.style.opacity = '1';
        
        // 显示刷新成功提示
        showNotification('仪表盘已刷新');
    }, 1000);
}

// 显示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #B5655D;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 初始化历史长河 — 横向时间轴
let currentActivePeriod = -1; // -1 表示尚未选择任何时期

function initHistoryTimeline() {
    console.log('初始化横向时间轴');

    const wrapper = document.getElementById('horizontal-timeline-wrapper');
    if (!wrapper) {
        console.error('横向时间轴容器不存在');
        return;
    }

    // 检查数据是否加载
    if (typeof eraSummaryData === 'undefined' || !eraSummaryData || eraSummaryData.length === 0) {
        console.error('时期汇总数据未加载');
        return;
    }

    // 构建时期索引映射
    const periodIndexMap = {};
    historyData.forEach((period, idx) => {
        periodIndexMap[period.period] = idx;
    });

    // ---- 渲染时间轴 ----
    wrapper.innerHTML = '';

    // 标题栏
    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.innerHTML = `
        <h2>🏯 中国古代建筑发展 · 时间轴</h2>
        <p>点击图标探索各时代建筑成就</p>
    `;
    wrapper.appendChild(header);

    // 筛选标签
    const filters = document.createElement('div');
    filters.className = 'period-filters';
    filters.innerHTML = `
        <button class="period-filter-btn" data-filter="all">🌿 全部</button>
        ${eraSummaryData.map((era, i) => {
            return `<button class="period-filter-btn active" data-filter="${era.period}">${era.icon} ${era.title}</button>`;
        }).join('')}
        <span style="color:#999;font-size:0.85rem;padding:8px 5px;">共 ${eraSummaryData.length} 个时期</span>
    `;
    wrapper.appendChild(filters);

    // 时间轴主体
    const mainDiv = document.createElement('div');
    mainDiv.className = 'timeline-main';

    // 左箭头
    const leftArrow = document.createElement('div');
    leftArrow.className = 'timeline-scroll-arrow left';
    leftArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
    leftArrow.addEventListener('click', () => {
        const track = mainDiv.querySelector('.timeline-track');
        track.scrollBy({ left: -300, behavior: 'smooth' });
    });
    mainDiv.appendChild(leftArrow);

    // 轨道
    const track = document.createElement('div');
    track.className = 'timeline-track';

    eraSummaryData.forEach((era, index) => {
        const node = document.createElement('div');
        node.className = 'timeline-node';
        node.setAttribute('data-period', era.period);
        node.setAttribute('data-index', index);

        node.innerHTML = `
            <div class="timeline-node-icon">${era.icon}</div>
            <div class="timeline-connector"></div>
            <div class="timeline-node-label">
                <h4>${era.title}</h4>
                <span>${era.timeRange}</span>
            </div>
        `;

        node.addEventListener('click', () => {
            selectPeriod(index);
        });

        track.appendChild(node);
    });

    mainDiv.appendChild(track);

    // 右箭头
    const rightArrow = document.createElement('div');
    rightArrow.className = 'timeline-scroll-arrow right';
    rightArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
    rightArrow.addEventListener('click', () => {
        const trackEl = mainDiv.querySelector('.timeline-track');
        trackEl.scrollBy({ left: 300, behavior: 'smooth' });
    });
    mainDiv.appendChild(rightArrow);

    wrapper.appendChild(mainDiv);

    // 内容面板
    const panel = document.createElement('div');
    panel.className = 'timeline-content-panel empty-state';
    panel.id = 'era-content-panel';
    panel.innerHTML = `
        <i class="fas fa-hand-pointer"></i>
        <p>请点击上方时间轴图标，查看对应时代的建筑信息</p>
    `;
    wrapper.appendChild(panel);

    // 分页导航
    const pagination = document.createElement('div');
    pagination.className = 'timeline-pagination';
    pagination.innerHTML = `
        <button class="pagination-btn" id="prev-period-btn" disabled>
            <i class="fas fa-arrow-left"></i> 上一时期
        </button>
        <span class="pagination-info" id="pagination-info">0 / ${eraSummaryData.length}</span>
        <button class="pagination-btn" id="next-period-btn" disabled>
            下一时期 <i class="fas fa-arrow-right"></i>
        </button>
    `;
    wrapper.appendChild(pagination);

    document.getElementById('prev-period-btn').addEventListener('click', () => {
        if (currentActivePeriod > 0) {
            selectPeriod(currentActivePeriod - 1);
        }
    });

    document.getElementById('next-period-btn').addEventListener('click', () => {
        if (currentActivePeriod < eraSummaryData.length - 1) {
            selectPeriod(currentActivePeriod + 1);
        }
    });

    // 筛选按钮事件
    filters.querySelectorAll('.period-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            filters.querySelectorAll('.period-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            if (filter === 'all') {
                selectPeriod(0);
            } else {
                // 根据筛选条件找到对应的时期
                const idx = eraSummaryData.findIndex(e => e.period === filter);
                if (idx >= 0) selectPeriod(idx);
            }
        });
    });

    console.log('横向时间轴初始化完成');
}

// 选中某个时期
function selectPeriod(index) {
    if (index < 0 || index >= eraSummaryData.length) return;

    currentActivePeriod = index;
    const era = eraSummaryData[index];

    // 更新节点激活状态
    document.querySelectorAll('.timeline-node').forEach((node, i) => {
        node.classList.toggle('active', i === index);
    });

    // 滚动到选中的节点
    const nodes = document.querySelectorAll('.timeline-node');
    if (nodes[index]) {
        nodes[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // 更新分页按钮
    document.getElementById('prev-period-btn').disabled = (index === 0);
    document.getElementById('next-period-btn').disabled = (index === eraSummaryData.length - 1);
    document.getElementById('pagination-info').textContent = `${index + 1} / ${eraSummaryData.length}`;

    // 渲染内容面板
    renderEraContent(era, index);
}

// 渲染时期内容面板
function renderEraContent(era, index) {
    const panel = document.getElementById('era-content-panel');
    if (!panel) return;

    // 查找对应的历史数据
    const periodIdx = historyData.findIndex(h => h.period === era.period);
    const buildings = (periodIdx >= 0 && historyData[periodIdx]) ? historyData[periodIdx].buildings : [];

    panel.className = 'timeline-content-panel';
    panel.style.animation = 'none';
    panel.offsetHeight; // 触发重排以重新播放动画
    panel.style.animation = 'fadeInUp 0.5s ease-out';

    panel.innerHTML = `
        <!-- 时期标题行 -->
        <div class="era-header">
            <div class="era-icon-badge">${era.icon}</div>
            <div class="era-title-block">
                <h3><span id="era-title-text"></span></h3>
                <div class="time-range">${era.timeRange}</div>
                <div class="era-tagline">${era.tagline}</div>
            </div>
            <div class="era-description-box">
                <p>${era.tagline}</p>
            </div>
        </div>

        <!-- 建筑卡片网格 -->
        ${buildings.length > 0 ? `
            <h4 class="buildings-section-title"><i class="fas fa-building"></i> 代表建筑</h4>
            <div class="buildings-grid" id="era-buildings-grid-${index}">
                ${buildings.map((building, bIdx) => {
                    const images = building.images || (building.image ? [building.image] : []);
                    const thumb = images.length > 0 ? images[0] : '';
                    const typeLabels = {
                        palace: '宫殿', temple: '宗教', residential: '民居',
                        garden: '园林', bridge: '桥梁', defense: '防御', tomb: '陵墓', other: '其他'
                    };
                    const typeLabel = typeLabels[building.type] || building.type || '其他';
                    return `
                        <div class="era-building-card" data-period-index="${periodIdx}" data-building-index="${bIdx}">
                            <div class="building-card-image">
                                ${thumb ? `<img src="${thumb}" alt="${building.name}" onerror="this.style.display='none'">` : ''}
                                <div class="card-type-badge">${typeLabel}</div>
                                <div class="image-count"><i class="fas fa-images"></i> ${images.length} 张</div>
                            </div>
                            <div class="building-card-body">
                                <h4>${building.name}</h4>
                                <p>${building.description}</p>
                            </div>
                            <div class="building-card-footer">
                                <span class="era-tag"><i class="fas fa-clock"></i> ${era.title}</span>
                                <span class="view-detail">点击查看详情 <i class="fas fa-eye"></i></span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}

        <!-- 三栏信息 -->
        <div class="era-info-grid">
            <!-- 技术创新 -->
            <div class="era-info-card">
                <h4><i class="fas fa-lightbulb"></i> <i class="fas fa-wrench"></i> 技术创新</h4>
                <ul>
                    ${era.innovations.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <!-- 历史背景 -->
            <div class="era-info-card">
                <h4><i class="fas fa-book-open"></i> <i class="fas fa-scroll"></i> 历史背景</h4>
                <ul>
                    ${era.history.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <!-- 代表遗存 -->
            <div class="era-info-card">
                <h4><i class="fas fa-church"></i> <i class="fas fa-trophy"></i> 代表遗存</h4>
                <ul>
                    ${era.heritage.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    // 绑定建筑卡片点击事件
    panel.querySelectorAll('.era-building-card').forEach(card => {
        card.addEventListener('click', function() {
            const periodIndex = parseInt(this.getAttribute('data-period-index'));
            const buildingIndex = parseInt(this.getAttribute('data-building-index'));
            showBuildingDetail(periodIndex, buildingIndex);
        });
    });

    // 卷轴浮筒效果：为时期标题添加动画
    const eraTitleTextEl = document.getElementById('era-title-text');
    if (eraTitleTextEl) {
        eraTitleTextEl.textContent = era.title;
        setTimeout(() => {
            animateEraTitle(eraTitleTextEl, era.title);
        }, 300);
    }
}

// 初始化建筑图片查看模态框
function initBuildingModal() {
    const modal = document.getElementById('building-modal');
    const closeBtn = modal.querySelector('.close');
    const prevBtn = document.getElementById('prev-image');
    const nextBtn = document.getElementById('next-image');
    
    // 关闭模态框
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 上一张图片
    prevBtn.addEventListener('click', function() {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateBuildingModal();
        }
    });
    
    // 下一张图片
    nextBtn.addEventListener('click', function() {
        const building = currentPeriodBuildings[currentBuildingIndex];
        const images = building.images || (building.image ? [building.image] : []);
        if (currentImageIndex < images.length - 1) {
            currentImageIndex++;
            updateBuildingModal();
        }
    });
}

// 显示建筑详情
function showBuildingDetail(periodIndex, buildingIndex) {
    console.log('显示建筑详情，时期索引:', periodIndex, '建筑索引:', buildingIndex);
    
    if (!historyData || !historyData[periodIndex] || !historyData[periodIndex].buildings[buildingIndex]) {
        console.error('建筑数据不存在', {
            historyData: historyData,
            periodIndex: periodIndex,
            buildingIndex: buildingIndex
        });
        return;
    }
    
    const period = historyData[periodIndex];
    const building = period.buildings[buildingIndex];
    
    console.log('时期数据:', period);
    console.log('建筑数据:', building);
    
    // 保存当前建筑数据和时期索引
    currentPeriodBuildings = period.buildings;
    currentBuildingIndex = buildingIndex;
    currentPeriodIndex = periodIndex; // 保存当前时期索引
    currentImageIndex = 0; // 初始化图片索引为 0，支持图片数组
    
    console.log('准备更新模态框，当前建筑数组:', currentPeriodBuildings, '当前时期索引:', currentPeriodIndex);
    
    // 更新模态框内容
    updateBuildingModal();
    
    // 显示模态框
    const modal = document.getElementById('building-modal');
    if (modal) {
        modal.style.display = 'block';
        console.log('模态框已显示');
    } else {
        console.error('模态框元素不存在');
    }
}

// 更新建筑模态框
function updateBuildingModal() {
    console.log('更新模态框，当前建筑索引:', currentBuildingIndex);
    console.log('当前建筑数组:', currentPeriodBuildings);
    console.log('当前时期索引:', currentPeriodIndex);
    
    if (currentPeriodBuildings.length === 0 || currentBuildingIndex < 0 || currentBuildingIndex >= currentPeriodBuildings.length) {
        console.error('建筑数据无效');
        return;
    }
    
    const building = currentPeriodBuildings[currentBuildingIndex];
    const period = historyData[currentPeriodIndex];
    
    console.log('当前建筑:', building);
    console.log('当前时期:', period);
    
    if (!building || !period) {
        console.error('建筑或时期数据不存在');
        return;
    }
    
    // 获取图片数组（支持单个 image 或 images 数组）
    const images = building.images || (building.image ? [building.image] : []);
    
    if (images.length === 0) {
        console.error('建筑图片不存在');
        return;
    }
    
    // 确保图片索引在有效范围内
    if (currentImageIndex < 0) {
        currentImageIndex = 0;
    } else if (currentImageIndex >= images.length) {
        currentImageIndex = images.length - 1;
    }
    
    // 获取 DOM 元素
    const buildingTitle = document.getElementById('building-title');
    const buildingName = document.getElementById('building-name');
    const buildingDescription = document.getElementById('building-description-text');
    const buildingPeriod = document.getElementById('building-period');
    const buildingImage = document.getElementById('building-image');
    const prevButton = document.getElementById('prev-image');
    const nextButton = document.getElementById('next-image');
    
    if (!buildingTitle || !buildingName || !buildingDescription || !buildingPeriod || !buildingImage) {
        console.error('模态框元素不存在');
        return;
    }
    
    // 更新模态框内容
    buildingTitle.textContent = '建筑详情';
    buildingName.textContent = building.name;
    buildingDescription.textContent = building.description;
    buildingPeriod.textContent = `时期：${period.name}（${period.timeRange}）`;
    buildingImage.src = images[currentImageIndex];
    buildingImage.alt = building.name;

    // 卷轴浮筒效果：为建筑名称添加动画
    animateBuildingModalTitle(building.name);
    
    console.log('图片数组:', images);
    console.log('当前图片索引:', currentImageIndex);
    console.log('图片路径:', images[currentImageIndex]);
    console.log('图片加载状态:', buildingImage.complete);
    
    // 图片加载错误处理
    buildingImage.onerror = function() {
        console.error('图片加载失败:', images[currentImageIndex]);
        this.alt = '图片加载失败：' + building.name;
    };
    
    buildingImage.onload = function() {
        console.log('图片加载成功:', images[currentImageIndex]);
    };
    
    // 更新导航按钮状态
    if (prevButton && nextButton) {
        prevButton.disabled = currentImageIndex === 0;
        nextButton.disabled = currentImageIndex === images.length - 1;
    }
}

// 搜索功能
let searchDebounceTimer = null;

// 处理搜索输入（支持回车键和自动搜索）
function handleSearchInput(event) {
    clearTimeout(searchDebounceTimer);
    
    if (event.key === 'Enter') {
        performSearch();
    } else {
        searchDebounceTimer = setTimeout(() => {
            const query = document.getElementById('search-input').value.trim();
            if (query.length > 0) {
                performSearch();
            }
        }, 500);
    }
}

// 执行搜索
function performSearch() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    
    if (!query) {
        showNotification('请输入搜索内容');
        return;
    }
    
    if (!historyData || historyData.length === 0) {
        showNotification('历史数据未加载');
        return;
    }
    
    const results = [];
    
    historyData.forEach((period, periodIndex) => {
        period.buildings.forEach((building, buildingIndex) => {
            const searchText = [
                building.name,
                building.description,
                period.name,
                period.timeRange,
                building.type
            ].join(' ').toLowerCase();
            
            if (searchText.includes(query)) {
                results.push({
                    period: period,
                    periodIndex: periodIndex,
                    building: building,
                    buildingIndex: buildingIndex,
                    matchType: getMatchType(building, period, query)
                });
            }
        });
    });
    
    if (typeof forbiddenCityData !== 'undefined' && forbiddenCityData.palaces) {
        forbiddenCityData.palaces.forEach((palace) => {
            const searchText = [
                palace.name,
                palace.nameEnglish,
                palace.description,
                palace.basicInfo.builtYear,
                palace.basicInfo.dynasty,
                palace.basicInfo.style,
                palace.basicInfo.significance
            ].join(' ').toLowerCase();
            
            if (searchText.includes(query)) {
                results.push({
                    type: 'forbidden-city',
                    palace: palace,
                    matchType: '故宫建筑'
                });
            }
        });
    }
    
    showSearchResults(results, query);
}

// 获取匹配类型
function getMatchType(building, period, query) {
    const queryLower = query.toLowerCase();
    
    if (building.name.toLowerCase().includes(queryLower)) {
        return '建筑名称';
    } else if (period.name.toLowerCase().includes(queryLower)) {
        return '历史时期';
    } else if (building.description.toLowerCase().includes(queryLower)) {
        return '描述';
    } else {
        return '相关内容';
    }
}

// 显示搜索结果
function showSearchResults(results, query) {
    const modal = document.getElementById('search-modal');
    const modalTitle = document.getElementById('search-modal-title');
    const resultsContainer = document.getElementById('search-results');
    
    if (!modal || !resultsContainer) {
        console.error('搜索结果模态框元素不存在');
        return;
    }
    
    modalTitle.textContent = `搜索结果："${query}"`;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                <p style="font-size: 18px;">未找到匹配的建筑信息</p>
                <p style="font-size: 14px; color: #999; margin-top: 10px;">请尝试其他关键词</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = `
            <div class="search-summary" style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p style="color: #333; font-size: 14px;">
                    <i class="fas fa-info-circle" style="color: #B5655D; margin-right: 8px;"></i>
                    找到 <strong style="color: #B5655D;">${results.length}</strong> 个相关建筑
                </p>
            </div>
            <div class="results-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                ${results.map((result, index) => createSearchResultCard(result, index)).join('')}
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

// 创建搜索结果卡片
function createSearchResultCard(result, index) {
    if (result.type === 'forbidden-city') {
        return createForbiddenCitySearchCard(result, index);
    }
    const { period, building, matchType } = result;
    const images = building.images || (building.image ? [building.image] : []);
    const imageUrl = images.length > 0 ? images[0] : 'images/logo.png';
    
    return `
        <div class="search-result-card" style="
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px solid transparent;
        "
        onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.borderColor='#B5655D';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';"
        onclick="viewSearchResult(${result.periodIndex}, ${result.buildingIndex})">
            
            <div class="result-image" style="height: 180px; overflow: hidden; background: #f5f5f5;">
                <img src="${imageUrl}" alt="${building.name}" style="width: 100%; height: 100%; object-fit: cover;" 
                     onerror="this.src='images/logo.png'">
            </div>
            
            <div class="result-content" style="padding: 15px;">
                <div class="result-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0;">${building.name}</h3>
                    <span class="match-badge" style="
                        background: #B5655D;
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: bold;
                    ">${matchType}</span>
                </div>
                
                <div class="result-period" style="
                    display: inline-block;
                    background: #f0f0f0;
                    color: #666;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-bottom: 10px;
                ">
                    <i class="fas fa-clock" style="margin-right: 4px;"></i>
                    ${period.name} (${period.timeRange})
                </div>
                
                <p class="result-description" style="
                    color: #666;
                    font-size: 13px;
                    line-height: 1.6;
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                ">${building.description}</p>
                
                <div class="result-footer" style="
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span style="color: #999; font-size: 12px;">
                        <i class="fas fa-eye" style="margin-right: 4px;"></i>
                        点击查看详情
                    </span>
                    <i class="fas fa-arrow-right" style="color: #B5655D; font-size: 14px;"></i>
                </div>
            </div>
        </div>
    `;
}

function createForbiddenCitySearchCard(result, index) {
    const palace = result.palace;
    const images = palace.images || [];
    const imageUrl = images.length > 0 ? images[0] : 'images/logo.png';
    const info = palace.basicInfo;
    
    return `
        <div class="search-result-card" style="
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px solid transparent;
        "
        onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.borderColor='#B5655D';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';"
        onclick="viewForbiddenCitySearchResult('${palace.id}')">
            
            <div class="result-image" style="height: 180px; overflow: hidden; background: #f5f5f5;">
                <img src="${imageUrl}" alt="${palace.name}" style="width: 100%; height: 100%; object-fit: cover;" 
                     onerror="this.src='images/logo.png'">
            </div>
            
            <div class="result-content" style="padding: 15px;">
                <div class="result-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 0;">${palace.name}</h3>
                    <span class="match-badge" style="
                        background: #B5655D;
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: bold;
                    ">${result.matchType}</span>
                </div>
                
                <div class="result-period" style="
                    display: inline-block;
                    background: #f0f0f0;
                    color: #666;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-bottom: 10px;
                ">
                    <i class="fas fa-city" style="margin-right: 4px;"></i>
                    ${info.dynasty} · ${info.builtYear}
                </div>
                
                <p class="result-description" style="
                    color: #666;
                    font-size: 13px;
                    line-height: 1.6;
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                ">${palace.description}</p>
                
                <div class="result-footer" style="
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span style="color: #999; font-size: 12px;">
                        <i class="fas fa-eye" style="margin-right: 4px;"></i>
                        点击查看详情
                    </span>
                    <i class="fas fa-arrow-right" style="color: #B5655D; font-size: 14px;"></i>
                </div>
            </div>
        </div>
    `;
}

// 查看搜索结果详情
function viewSearchResult(periodIndex, buildingIndex) {
    closeSearchModal();
    setTimeout(() => {
        showBuildingDetail(periodIndex, buildingIndex);
    }, 300);
}

function viewForbiddenCitySearchResult(palaceId) {
    closeSearchModal();
    setTimeout(() => {
        const palace = forbiddenCityData.palaces.find(p => p.id === palaceId);
        if (palace) {
            if (typeof showPalaceDetail === 'function') {
                showPalaceDetail(palace);
            }
        }
    }, 300);
}

// 关闭搜索模态框
function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
