// ===== 博物馆风格故宫展示系统 =====
let fcScene, fcCamera, fcRenderer, fcControls;
let fcCurrentPalace = null;
let fcCurrentModel = null;
let fcCurrentPalaceImageIndex = 0;
let fcRaycaster, fcMouse;
let fcOriginalMaterials = new Map();
let fcTooltipDiv = null;
let fcInitialized = false;
let fcExplodeMode = false;
let fcWireframeMode = false;
let fcOriginalPositions = new Map();
let fcLoadingDiv = null;
let dataManagerInitialized = false;

// 博物馆布局状态
let currentMuseumIndex = 0;
let filteredPalaces = [];
let museumInitialized = false;

// ==================== 博物馆布局初始化 ====================

function initMuseumLayout() {
    if (museumInitialized) return;

    const allPalaces = (window.forbiddenCityData && window.forbiddenCityData.palaces) || [];
    filteredPalaces = allPalaces.sort((a, b) => a.order - b.order);

    document.getElementById('sidebar-count').textContent = '共 ' + filteredPalaces.length + ' 卷';

    renderSidebar();
    renderCenterDots();
    bindMuseumEvents();
    loadMuseumPalace(0);

    museumInitialized = true;
    console.log('博物馆布局初始化完成');
}

function renderSidebar() {
    var list = document.getElementById('sidebar-list');
    if (!list) return;

    var html = '';
    for (var i = 0; i < filteredPalaces.length; i++) {
        var p = filteredPalaces[i];
        var imgSrc = (p.images && p.images.length > 0) ? p.images[0] : 'images/logo.png';
        var dynastyText = getDynastyText(p.basicInfo ? p.basicInfo.dynasty : '');
        var tag = getCategoryTag(p.id);
        html += '<div class="sidebar-item' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" data-id="' + p.id + '">';
        html += '<img class="sidebar-item-thumb" src="' + imgSrc + '" alt="' + p.name + '" onerror="this.src=\'images/logo.png\'">';
        html += '<div class="sidebar-item-info">';
        html += '<div class="sidebar-item-name">' + p.name + '</div>';
        html += '<div class="sidebar-item-meta">' + dynastyText + '</div>';
        html += '<span class="sidebar-item-tag">' + tag + '</span>';
        html += '</div>';
        html += '<span class="sidebar-item-order">' + padZero(i + 1) + '</span>';
        html += '</div>';
    }
    list.innerHTML = html;

    var items = list.querySelectorAll('.sidebar-item');
    for (var j = 0; j < items.length; j++) {
        (function(idx) {
            items[idx].addEventListener('click', function() {
                loadMuseumPalace(idx);
            });
        })(j);
    }
}

function renderCenterDots() {
    var container = document.getElementById('center-dots');
    if (!container) return;

    var html = '';
    for (var i = 0; i < filteredPalaces.length; i++) {
        html += '<div class="center-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></div>';
    }
    container.innerHTML = html;

    var dots = container.querySelectorAll('.center-dot');
    for (var j = 0; j < dots.length; j++) {
        (function(idx) {
            dots[idx].addEventListener('click', function() {
                loadMuseumPalace(idx);
            });
        })(j);
    }
}

function getDynastyText(dynasty) {
    if (!dynasty) return '';
    if (dynasty.indexOf('明') >= 0) return '明';
    if (dynasty.indexOf('清') >= 0) return '清';
    if (dynasty.indexOf('永乐') >= 0) return '明';
    return dynasty.substring(0, 2);
}

function getCategoryTag(id) {
    var map = {
        'wumen': '关隘', 'taihemen': '关隘', 'qianqingmen': '关隘', 'shenwumen': '关隘',
        'taihedian': '宫殿', 'zhonghedian': '宫殿', 'baohedian': '宫殿',
        'qianqinggong': '宫殿', 'jiaotaidian': '宫殿', 'kunninggong': '宫殿'
    };
    return map[id] || '宫殿';
}

function padZero(n) {
    return n < 10 ? '0' + n : '' + n;
}

function bindMuseumEvents() {
    var prevBtn = document.getElementById('prev-palace');
    var nextBtn = document.getElementById('next-palace');

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            var idx = (currentMuseumIndex - 1 + filteredPalaces.length) % filteredPalaces.length;
            loadMuseumPalace(idx);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            var idx = (currentMuseumIndex + 1) % filteredPalaces.length;
            loadMuseumPalace(idx);
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') prevBtn && prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn && nextBtn.click();
    });

    var autoRotateCb = document.getElementById('auto-rotate');
    if (autoRotateCb) {
        autoRotateCb.addEventListener('change', function() {
            if (fcControls) {
                fcControls.autoRotate = this.checked;
                fcControls.autoRotateSpeed = 2.0;
            }
        });
    }

    var tabs = document.querySelectorAll('.museum-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
            this.classList.add('active');
        });
    }

    var dynastyFilter = document.getElementById('dynasty-filter');
    if (dynastyFilter) {
        dynastyFilter.addEventListener('change', function() {
            filterByDynasty(this.value);
        });
    }
}

function filterByDynasty(dynasty) {
    if (!window.forbiddenCityData || !window.forbiddenCityData.palaces) return;

    if (dynasty === 'all') {
        filteredPalaces = window.forbiddenCityData.palaces.slice().sort(function(a, b) { return a.order - b.order; });
    } else {
        filteredPalaces = window.forbiddenCityData.palaces.filter(function(p) {
            var d = (p.basicInfo && p.basicInfo.dynasty) || '';
            if (dynasty === 'ming') return d.indexOf('明') >= 0;
            if (dynasty === 'qing') return d.indexOf('清') >= 0;
            if (dynasty === 'sui-tang') return d.indexOf('唐') >= 0;
            if (dynasty === 'song') return d.indexOf('宋') >= 0;
            if (dynasty === 'yuan') return d.indexOf('元') >= 0;
            if (dynasty === 'qin-han') return d.indexOf('秦') >= 0 || d.indexOf('汉') >= 0;
            return true;
        }).sort(function(a, b) { return a.order - b.order; });
    }

    document.getElementById('sidebar-count').textContent = '共 ' + filteredPalaces.length + ' 卷';
    renderSidebar();
    renderCenterDots();

    if (currentMuseumIndex >= filteredPalaces.length) currentMuseumIndex = 0;
    loadMuseumPalace(currentMuseumIndex);
}

function loadMuseumPalace(index) {
    if (index < 0 || index >= filteredPalaces.length) return;

    currentMuseumIndex = index;
    var palace = filteredPalaces[index];

    // 更新侧边栏
    var items = document.querySelectorAll('.sidebar-item');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('active', i === index);
    }

    // 更新导航点
    var dots = document.querySelectorAll('.center-dot');
    for (var j = 0; j < dots.length; j++) {
        dots[j].classList.toggle('active', j === index);
    }

    // 更新计数器
    var counterEl = document.getElementById('center-counter');
    if (counterEl) {
        counterEl.textContent = padZero(index + 1) + ' / ' + padZero(filteredPalaces.length);
    }

    // 更新底部信息
    var titleEl = document.getElementById('center-title');
    var subtitleEl = document.getElementById('center-subtitle');
    if (titleEl) titleEl.textContent = palace.name;
    if (subtitleEl) {
        var info = palace.basicInfo || {};
        var period = (info.dynasty || '明清') + ' · ' + (info.builtYear || '') + '年建成 · 北京';
        subtitleEl.textContent = period;
    }

    // 卷轴浮筒效果：为中央标题添加动画
    animatePalaceDetailTitle(palace.name);

    // 渲染右侧详情
    renderDetailPanel(palace);

    // 加载3D模型
    loadPalaceModel(palace.id);
}

// 语音播放状态
var currentSpeech = null;
var isPlayingAudio = false;
var audioProgressInterval = null;

function renderDetailPanel(palace) {
    // 建筑简介
    var descEl = document.getElementById('detail-description');
    if (descEl) {
        descEl.textContent = palace.description || '暂无简介';
    }

    // 图片画廊
    var galleryEl = document.getElementById('detail-gallery');
    if (galleryEl) {
        var images = palace.images || [];
        if (images.length > 0) {
            var gHtml = '';
            for (var i = 0; i < Math.min(images.length, 6); i++) {
                gHtml += '<img class="gallery-thumb' + (i === 0 ? ' active' : '') + '" src="' + images[i] + '" alt="' + palace.name + '" onclick="openImageGallery(\'' + palace.id + '\', ' + i + ')" onerror="this.style.display=\'none\'">';
            }
            galleryEl.innerHTML = gHtml;
        } else {
            galleryEl.innerHTML = '<p style="font-size:12px;color:#999;">暂无图片</p>';
        }
    }

    // 基本信息
    var basicEl = document.getElementById('detail-basic-info');
    if (basicEl && palace.basicInfo) {
        var info = palace.basicInfo;
        basicEl.innerHTML =
            '<div class="detail-info-row"><span class="detail-info-label">年代</span><span class="detail-info-value">' + (info.dynasty||'') + ' · ' + (info.builtYear||'') + '年建成</span></div>' +
            '<div class="detail-info-row"><span class="detail-info-label">地点</span><span class="detail-info-value">北京</span></div>' +
            '<div class="detail-info-row"><span class="detail-info-label">占地</span><span class="detail-info-value">' + (info.area||'-') + '</span></div>' +
            '<div class="detail-info-row"><span class="detail-info-label">殿宇</span><span class="detail-info-value">' + (info.height||'-') + '</span></div>' +
            '<div class="detail-info-row"><span class="detail-info-label">风格</span><span class="detail-info-value">' + (info.style||'-') + '</span></div>' +
            '<div class="detail-info-row"><span class="detail-info-label">意义</span><span class="detail-info-value">' + (info.significance||'-') + '</span></div>';
    }

    // 历史时间轴
    var timelineEl = document.getElementById('detail-timeline');
    if (timelineEl) {
        var events = palace.timeline || [];
        if (events.length > 0) {
            var tHtml = '';
            for (var j = 0; j < events.length; j++) {
                tHtml += '<div class="detail-timeline-item"><div class="timeline-dot"></div><span class="timeline-year">' + events[j].year + '</span><span class="timeline-event">' + events[j].event + '</span></div>';
            }
            timelineEl.innerHTML = tHtml;
        } else {
            timelineEl.innerHTML = '<p style="font-size:12px;color:#999;">暂无历史记录</p>';
        }
    }

    // 趣味典故
    var factsEl = document.getElementById('detail-fun-facts');
    if (factsEl) {
        var facts = palace.funFacts || [];
        if (facts.length > 0) {
            var fHtml = '';
            for (var k = 0; k < facts.length; k++) {
                fHtml += '<div class="fact-item">' + facts[k] + '</div>';
            }
            factsEl.innerHTML = fHtml;
        } else {
            factsEl.innerHTML = '<p style="font-size:12px;color:#999;">暂无趣味典故</p>';
        }
    }

    // 视频按钮
    var videoBtn = document.getElementById('palace-video-btn');
    if (videoBtn) {
        videoBtn.style.display = palace.hasVideo ? 'flex' : 'none';
    }

    // 重置语音播放状态
    resetAudioUI();
}

// 打开图片画廊（大图预览）
var currentGalleryPalaceId = '';
var currentGalleryIndex = 0;

function openImageGallery(palaceId, index) {
    currentGalleryPalaceId = palaceId;
    currentGalleryIndex = index;
    var palace = filteredPalaces.find(function(p) { return p.id === palaceId; });
    if (!palace || !palace.images || palace.images.length === 0) return;

    // 高亮缩略图
    var thumbs = document.querySelectorAll('.gallery-thumb');
    for (var i = 0; i < thumbs.length; i++) {
        thumbs[i].classList.toggle('active', i === index);
    }

    // 创建或更新大图模态框
    var modal = document.getElementById('image-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-viewer-modal';
        modal.className = 'modal';
        modal.innerHTML =
            '<div class="modal-content" style="max-width:900px;background:rgba(245,240,232,0.98);border-radius:4px;border:1px solid #d4c5a9;">' +
                '<span class="close" onclick="closeImageViewer()" style="position:absolute;top:10px;right:15px;font-size:24px;cursor:pointer;color:#5a4a3a;z-index:10;">&times;</span>' +
                '<div style="text-align:center;padding:20px;">' +
                    '<h3 id="viewer-title" style="color:#C23B22;margin-bottom:15px;font-weight:normal;letter-spacing:2px;"></h3>' +
                    '<img id="viewer-image" src="" alt="" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:2px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">' +
                    '<div style="margin-top:15px;display:flex;justify-content:center;gap:15px;">' +
                        '<button class="action-btn" onclick="prevViewerImage()" style="min-width:80px;"><i class="fas fa-chevron-left"></i> 上一张</button>' +
                        '<span id="viewer-counter" style="padding:8px 15px;color:#999;font-size:13px;"></span>' +
                        '<button class="action-btn" onclick="nextViewerImage()" style="min-width:80px;">下一张 <i class="fas fa-chevron-right"></i></button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
    }

    var images = palace.images;
    document.getElementById('viewer-title').textContent = palace.name + ' - 图片 ' + (index + 1) + '/' + images.length;
    document.getElementById('viewer-image').src = images[index];
    document.getElementById('viewer-counter').textContent = (index + 1) + ' / ' + images.length;
    modal.style.display = 'block';
}

function closeImageViewer() {
    var modal = document.getElementById('image-viewer-modal');
    if (modal) modal.style.display = 'none';
}

function prevViewerImage() {
    var palace = filteredPalaces.find(function(p) { return p.id === currentGalleryPalaceId; });
    if (!palace || !palace.images) return;
    var images = palace.images;
    currentGalleryIndex = (currentGalleryIndex - 1 + images.length) % images.length;
    updateViewerImage(palace);
}

function nextViewerImage() {
    var palace = filteredPalaces.find(function(p) { return p.id === currentGalleryPalaceId; });
    if (!palace || !palace.images) return;
    var images = palace.images;
    currentGalleryIndex = (currentGalleryIndex + 1) % images.length;
    updateViewerImage(palace);
}

function updateViewerImage(palace) {
    var images = palace.images;
    document.getElementById('viewer-title').textContent = palace.name + ' - 图片 ' + (currentGalleryIndex + 1) + '/' + images.length;
    document.getElementById('viewer-image').src = images[currentGalleryIndex];
    document.getElementById('viewer-counter').textContent = (currentGalleryIndex + 1) + ' / ' + images.length;

    // 更新缩略图高亮
    var thumbs = document.querySelectorAll('.gallery-thumb');
    for (var i = 0; i < thumbs.length; i++) {
        thumbs[i].classList.toggle('active', i === currentGalleryIndex);
    }
}

// ==================== 语音讲解系统 ====================

function toggleAudioPlayback() {
    if (isPlayingAudio) {
        stopAudioPlayback();
    } else {
        startAudioPlayback();
    }
}

function startAudioPlayback() {
    if (!fcCurrentPalace) return;

    // 停止之前的语音
    window.speechSynthesis.cancel();

    var palace = fcCurrentPalace;
    var text = palace.audioGuide || palace.name + '，中国古代建筑的杰出代表。' + (palace.description || '');

    var speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'zh-CN';
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    // 获取中文语音
    var voices = window.speechSynthesis.getVoices();
    var zhVoice = voices.find(function(v) { return v.lang.indexOf('zh') >= 0; });
    if (zhVoice) speech.voice = zhVoice;

    // 更新UI
    isPlayingAudio = true;
    var btn = document.getElementById('audio-play-btn');
    var statusText = document.getElementById('audio-status-text');
    var progressBar = document.getElementById('audio-progress-bar');

    if (btn) {
        btn.classList.add('playing');
        btn.innerHTML = '<i class="fas fa-stop"></i><span id="audio-status-text">正在播放...</span>';
    }

    // 估算进度（语音合成没有progress事件，用文本长度估算）
    var estimatedDuration = Math.max(text.length * 80, 3000); // 每字约80ms，最少3秒
    var startTime = Date.now();
    if (audioProgressInterval) clearInterval(audioProgressInterval);
    audioProgressInterval = setInterval(function() {
        if (!isPlayingAudio) {
            clearInterval(audioProgressInterval);
            return;
        }
        var elapsed = Date.now() - startTime;
        var progress = Math.min((elapsed / estimatedDuration) * 100, 95);
        if (progressBar) progressBar.style.width = progress + '%';
    }, 200);

    speech.onend = function() {
        isPlayingAudio = false;
        resetAudioUI();
        if (audioProgressInterval) clearInterval(audioProgressInterval);
        if (progressBar) progressBar.style.width = '100%';
        setTimeout(function() {
            if (progressBar) progressBar.style.width = '0%';
        }, 1000);
    };

    speech.onerror = function() {
        isPlayingAudio = false;
        resetAudioUI();
        if (audioProgressInterval) clearInterval(audioProgressInterval);
    };

    currentSpeech = speech;
    window.speechSynthesis.speak(speech);
}

function stopAudioPlayback() {
    window.speechSynthesis.cancel();
    isPlayingAudio = false;
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
        audioProgressInterval = null;
    }
    resetAudioUI();
}

function resetAudioUI() {
    isPlayingAudio = false;
    var btn = document.getElementById('audio-play-btn');
    var progressBar = document.getElementById('audio-progress-bar');
    if (btn) {
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="fas fa-volume-up"></i><span id="audio-status-text">点击播放讲解</span>';
    }
    if (progressBar) progressBar.style.width = '0%';
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
        audioProgressInterval = null;
    }
}

// 确保语音列表加载
if (typeof window.speechSynthesis !== 'undefined') {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.getVoices();
        };
    }
}

// ==================== Three.js 场景初始化 ====================

function initForbiddenCity3D() {
    if (fcInitialized) return;

    var container = document.getElementById('forbidden-city-3d');
    if (!container) {
        console.warn('Museum 3D: container not found');
        return;
    }

    console.log('Museum 3D initializing...');

    fcScene = new THREE.Scene();
    fcScene.background = new THREE.Color(0xf0e8d8);

    fcCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    fcCamera.position.set(8, 6, 12);

    fcRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    fcRenderer.setSize(container.clientWidth, container.clientHeight);
    fcRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    fcRenderer.shadowMap.enabled = true;
    fcRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    fcRenderer.outputEncoding = THREE.sRGBEncoding;

    // 清空容器并添加renderer
    container.innerHTML = '';
    container.appendChild(fcRenderer.domElement);

    fcControls = new THREE.OrbitControls(fcCamera, fcRenderer.domElement);
    fcControls.enableDamping = true;
    fcControls.dampingFactor = 0.05;
    fcControls.screenSpacePanning = true;
    fcControls.minDistance = 3;
    fcControls.maxDistance = 50;
    fcControls.autoRotate = true;
    fcControls.autoRotateSpeed = 1.5;
    fcControls.target.set(0, 1.5, 0);

    // 光照
    var ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7);
    fcScene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    fcScene.add(dirLight);

    var fillLight = new THREE.DirectionalLight(0xc8b898, 0.4);
    fillLight.position.set(-8, 5, -5);
    fcScene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 3, -10);
    fcScene.add(rimLight);

    // 地面
    var groundGeo = new THREE.PlaneGeometry(60, 60);
    var groundMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.95, metalness: 0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    fcScene.add(ground);

    // 加载提示
    fcLoadingDiv = document.createElement('div');
    fcLoadingDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(245,240,232,0.95);color:#5a4a3a;padding:20px 30px;border-radius:4px;font-size:14px;z-index:100;display:none;text-align:center;border:1px solid #d4c5a9;font-family:宋体,serif;';
    fcLoadingDiv.innerHTML = '<div class="loading-spinner"></div><div style="margin-top:10px;" id="loading-text">加载中...</div>';
    container.appendChild(fcLoadingDiv);

    var style = document.createElement('style');
    style.textContent = '.loading-spinner{width:30px;height:30px;margin:0 auto 10px;border:3px solid rgba(181, 101, 93,0.2);border-radius:50%;border-top-color:#C23B22;animation:spin 1s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}';
    document.head.appendChild(style);

    // 工具提示
    fcTooltipDiv = document.createElement('div');
    fcTooltipDiv.style.cssText = 'position:absolute;background:rgba(90,74,58,0.9);color:#f5f0e8;padding:6px 10px;border-radius:2px;font-size:12px;pointer-events:none;display:none;z-index:1000;font-family:宋体,serif;letter-spacing:1px;';
    container.appendChild(fcTooltipDiv);

    container.addEventListener('mousemove', onMouseMoveForbiddenCity);
    container.addEventListener('click', onClickForbiddenCity);
    window.addEventListener('resize', onWindowResizeForbiddenCity);

    fcRaycaster = new THREE.Raycaster();
    fcMouse = new THREE.Vector2();

    fcInitialized = true;
    console.log('Museum 3D initialized successfully');

    animateForbiddenCity();
}

function onWindowResizeForbiddenCity() {
    var container = document.getElementById('forbidden-city-3d');
    if (!container || !fcCamera || !fcRenderer) return;

    fcCamera.aspect = container.clientWidth / container.clientHeight;
    fcCamera.updateProjectionMatrix();
    fcRenderer.setSize(container.clientWidth, container.clientHeight);
}

function animateForbiddenCity() {
    requestAnimationFrame(animateForbiddenCity);
    if (fcControls) fcControls.update();
    if (fcRenderer && fcScene && fcCamera) fcRenderer.render(fcScene, fcCamera);
}

// ==================== 模型加载 ====================

async function initDataManagerForbiddenCity() {
    if (dataManagerInitialized) return;
    if (typeof DataManager !== 'undefined') {
        try {
            await DataManager.init();
            dataManagerInitialized = true;
            console.log('DataManager initialized for Forbidden City');
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
        }
    }
}

function getPalaceData(palaceId) {
    console.log('Getting palace data for:', palaceId);
    var palace = null;

    if (dataManagerInitialized && typeof DataManager !== 'undefined') {
        try {
            var models = DataManager.getModelsByBuilding(palaceId);
            if (models && models.length > 0) {
                palace = convertModelDataToPalaceFormat(models[0]);
                console.log('Loaded palace data from DataManager:', palaceId);
            }
        } catch (error) {
            console.warn('Error getting data from DataManager, falling back:', error);
        }
    }

    if (!palace && window.forbiddenCityData && forbiddenCityData.palaces) {
        palace = forbiddenCityData.palaces.find(function(p) { return p.id === palaceId; });
        if (palace) console.log('Loaded palace data from forbiddenCityData:', palaceId);
    }

    return palace;
}

function convertModelDataToPalaceFormat(modelData) {
    var palace = {
        id: modelData.buildingId,
        name: modelData.buildingName,
        nameEnglish: modelData.buildingNameEnglish || '',
        description: modelData.description || '',
        model: modelData.url,
        images: modelData.previewImages || [],
        basicInfo: modelData.basicInfo || {},
        hasVideo: modelData.hasVideo || false,
        videoUrl: modelData.videoUrl || '',
        order: 0, axisPosition: 0,
        timeline: [], funFacts: [], audioGuide: ''
    };

    if (window.forbiddenCityData && forbiddenCityData.palaces) {
        var fallback = forbiddenCityData.palaces.find(function(p) { return p.id === modelData.buildingId; });
        if (fallback) {
            palace.timeline = fallback.timeline || [];
            palace.funFacts = fallback.funFacts || [];
            palace.audioGuide = fallback.audioGuide || '';
            palace.order = fallback.order || 0;
            palace.axisPosition = fallback.axisPosition || 0;
        }
    }

    return palace;
}

async function loadPalaceModel(palaceId) {
    var palace = getPalaceData(palaceId);
    if (!palace) { console.error('Palace not found:', palaceId); return; }

    if (!fcInitialized) initForbiddenCity3D();

    if (fcCurrentModel) {
        fcScene.remove(fcCurrentModel);
        fcOriginalMaterials.clear();
        fcOriginalPositions.clear();
    }

    showLoading('加载模型中...');

    var loader = new THREE.GLTFLoader();

    try {
        var gltf = await new Promise(function(resolve, reject) {
            loader.load(palace.model, resolve, function(progress) {
                if (progress.total > 0) {
                    var pct = Math.round((progress.loaded / progress.total) * 100);
                    updateLoadingText('加载中... ' + pct + '%');
                }
            }, reject);
        });

        fcCurrentModel = gltf.scene;

        fcCurrentModel.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                fcOriginalMaterials.set(child.uuid, child.material.clone());
                fcOriginalPositions.set(child.uuid, child.position.clone());
            }
        });

        var box = new THREE.Box3().setFromObject(fcCurrentModel);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());

        fcCurrentModel.position.sub(center);
        fcCurrentModel.position.y += size.y / 2 - 0.5;
        fcScene.add(fcCurrentModel);

        var maxDim = Math.max(size.x, size.y, size.z);
        var distance = maxDim * 1.8;

        fcCamera.position.set(distance * 0.6, distance * 0.5, distance * 0.7);
        fcControls.target.set(0, size.y / 3, 0);
        fcControls.update();

        fcCurrentPalace = palace;
        hideLoading();
        console.log('Palace model loaded:', palaceId);

    } catch (error) {
        console.error('Error loading palace model:', error);
        hideLoading();
        createPlaceholderModel(palace);
    }
}

function createPlaceholderModel(palace) {
    if (fcCurrentModel) fcScene.remove(fcCurrentModel);

    var group = new THREE.Group();

    // 台基
    var baseGeo = new THREE.BoxGeometry(3, 0.2, 2);
    var baseMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a9, roughness: 0.8 });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.4;
    base.receiveShadow = true;
    group.add(base);

    // 主体
    var bodyGeo = new THREE.BoxGeometry(2.5, 2, 1.5);
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xB5655D, roughness: 0.6 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // 屋顶
    var roofGeo = new THREE.ConeGeometry(2, 1, 4);
    var roofMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.5 });
    var roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    fcCurrentModel = group;
    fcCurrentPalace = palace;
    fcScene.add(group);

    fcCamera.position.set(5, 4, 6);
    fcControls.target.set(0, 1, 0);
    fcControls.update();

    console.log('Placeholder created for:', palace.name);
}

// ==================== UI交互 ====================

function onMouseMoveForbiddenCity(event) {
    if (!fcCurrentModel || !fcRaycaster) return;
    var container = document.getElementById('forbidden-city-3d');
    var rect = container.getBoundingClientRect();

    fcMouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    fcMouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    fcRaycaster.setFromCamera(fcMouse, fcCamera);
    var intersects = fcRaycaster.intersectObject(fcCurrentModel, true);

    if (intersects.length > 0 && fcCurrentPalace) {
        fcTooltipDiv.style.display = 'block';
        fcTooltipDiv.textContent = fcCurrentPalace.name + ' - ' + (fcCurrentPalace.nameEnglish || '');
        fcTooltipDiv.style.left = (event.clientX - rect.left + 15) + 'px';
        fcTooltipDiv.style.top = (event.clientY - rect.top - 10) + 'px';
    } else {
        fcTooltipDiv.style.display = 'none';
    }
}

function onClickForbiddenCity(event) {
    if (!fcCurrentModel || !fcRaycaster) return;
    var container = document.getElementById('forbidden-city-3d');
    var rect = container.getBoundingClientRect();

    fcMouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    fcMouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    fcRaycaster.setFromCamera(fcMouse, fcCamera);
    var intersects = fcRaycaster.intersectObject(fcCurrentModel, true);

    if (intersects.length > 0 && fcCurrentPalace) {
        showPalaceDetail(fcCurrentPalace.id);
    }
}

// 博物馆风格的showPalaceDetail
function showPalaceDetail(palaceId) {
    var palace = filteredPalaces.find(function(p) { return p.id === palaceId; });
    if (palace) {
        var idx = filteredPalaces.indexOf(palace);
        loadMuseumPalace(idx);
    } else {
        // 回退到旧版模态框
        showPalaceDetailModal(palaceId);
    }
}

function showPalaceDetailModal(palaceId) {
    var palace = getPalaceData(palaceId);
    if (!palace) return;

    var modal = document.getElementById('palace-detail-modal');
    if (!modal) return;

    document.getElementById('palace-modal-title').textContent = palace.name;

    // 卷轴浮筒效果：为故宫详情模态框标题添加动画
    setTimeout(() => {
        animateModalTitle(palace.name);
    }, 300);

    var images = palace.images || [];
    fcCurrentPalaceImageIndex = 0;
    var img = document.getElementById('palace-image');
    img.src = images.length > 0 ? images[0] : 'images/logo.png';
    img.onerror = function() { this.src = 'images/logo.png'; };
    document.getElementById('palace-image-counter').textContent = images.length > 0 ? '1/' + images.length : '0/0';

    var info = palace.basicInfo || {};
    document.getElementById('palace-basic-info').innerHTML =
        '<h4 style="color:#C23B22;margin-bottom:15px;">基本信息</h4>' +
        '<div class="info-row"><span class="info-label">建造年份</span><span class="info-value">' + (info.builtYear||'-') + '</span></div>' +
        '<div class="info-row"><span class="info-label">朝代</span><span class="info-value">' + (info.dynasty||'-') + '</span></div>' +
        '<div class="info-row"><span class="info-label">高度</span><span class="info-value">' + (info.height||'-') + '</span></div>' +
        '<div class="info-row"><span class="info-label">面积</span><span class="info-value">' + (info.area||'-') + '</span></div>';

    var tlHtml = '<h4>历史事件时间轴</h4>';
    (palace.timeline || []).forEach(function(item) {
        tlHtml += '<div class="palace-timeline-item"><div class="year">' + item.year + '</div><div class="event">' + item.event + '</div></div>';
    });
    document.getElementById('palace-timeline').innerHTML = tlHtml;

    var fHtml = '<h4>趣味典故</h4><ul>';
    (palace.funFacts || []).forEach(function(fact) { fHtml += '<li>' + fact + '</li>'; });
    fHtml += '</ul>';
    document.getElementById('palace-fun-facts').innerHTML = fHtml;

    var videoBtn = document.getElementById('palace-video-btn');
    if (videoBtn) videoBtn.style.display = palace.hasVideo ? 'block' : 'none';

    modal.style.display = 'block';
}

// ==================== 操作按钮 ====================

function closePalaceDetailModal() {
    var modal = document.getElementById('palace-detail-modal');
    if (modal) modal.style.display = 'none';
}

function prevPalaceImage() {
    if (!fcCurrentPalace) return;
    var images = fcCurrentPalace.images || [];
    if (images.length === 0) return;
    fcCurrentPalaceImageIndex = (fcCurrentPalaceImageIndex - 1 + images.length) % images.length;
    updatePalaceImage();
}

function nextPalaceImage() {
    if (!fcCurrentPalace) return;
    var images = fcCurrentPalace.images || [];
    if (images.length === 0) return;
    fcCurrentPalaceImageIndex = (fcCurrentPalaceImageIndex + 1) % images.length;
    updatePalaceImage();
}

function updatePalaceImage() {
    if (!fcCurrentPalace) return;
    var images = fcCurrentPalace.images || [];
    var img = document.getElementById('palace-image');
    img.src = images[fcCurrentPalaceImageIndex];
    img.onerror = function() { this.src = 'images/logo.png'; };
    document.getElementById('palace-image-counter').textContent = (fcCurrentPalaceImageIndex + 1) + '/' + images.length;
}

function playPalaceAudio() {
    if (!fcCurrentPalace) return;
    var speech = new SpeechSynthesisUtterance();
    speech.text = fcCurrentPalace.audioGuide || fcCurrentPalace.name + '，中国古代建筑的杰出代表。';
    speech.lang = 'zh-CN';
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
}

function playPalaceVideo() {
    if (!fcCurrentPalace) return;
    var videoModal = document.getElementById('video-modal');
    var video = document.getElementById('palace-video');
    video.src = fcCurrentPalace.videoUrl || '';
    videoModal.style.display = 'block';
    video.play();
}

function closeVideoModal() {
    var videoModal = document.getElementById('video-modal');
    var video = document.getElementById('palace-video');
    video.pause();
    video.currentTime = 0;
    videoModal.style.display = 'none';
}

function toggleExplodeView() {
    if (!fcCurrentModel) return;
    fcExplodeMode = !fcExplodeMode;
    fcCurrentModel.traverse(function(child) {
        if (child.isMesh) {
            var originalPos = fcOriginalPositions.get(child.uuid);
            if (originalPos) {
                if (fcExplodeMode) {
                    var dir = new THREE.Vector3().subVectors(child.position, new THREE.Vector3(0, 0, 0));
                    dir.normalize();
                    child.position.copy(originalPos.clone().add(dir.multiplyScalar(1.5)));
                } else {
                    child.position.copy(originalPos);
                }
            }
        }
    });
}

function toggleWireframeMode() {
    if (!fcCurrentModel) return;
    fcWireframeMode = !fcWireframeMode;
    fcCurrentModel.traverse(function(child) {
        if (child.isMesh) child.material.wireframe = fcWireframeMode;
    });
}

function resetView() {
    if (!fcCamera || !fcControls) return;
    fcCamera.position.set(8, 6, 12);
    fcControls.target.set(0, 1.5, 0);
    fcControls.update();
    if (fcExplodeMode) toggleExplodeView();
    if (fcWireframeMode) toggleWireframeMode();
}

function resetView() {
    if (!fcCamera || !fcControls) return;
    fcCamera.position.set(8, 6, 12);
    fcControls.target.set(0, 1.5, 0);
    fcControls.update();
    if (fcExplodeMode) toggleExplodeView();
    if (fcWireframeMode) toggleWireframeMode();
}

// 加载提示工具函数
function showLoading(text) {
    if (fcLoadingDiv) { fcLoadingDiv.style.display = 'block'; updateLoadingText(text); }
}
function updateLoadingText(text) {
    var el = document.getElementById('loading-text');
    if (el) el.textContent = text;
}
function hideLoading() {
    if (fcLoadingDiv) fcLoadingDiv.style.display = 'none';
}

// ==================== 全局导出 ====================

window.loadPalaceModel = loadPalaceModel;
window.showPalaceDetail = showPalaceDetail;
window.closePalaceDetailModal = closePalaceDetailModal;
window.prevPalaceImage = prevPalaceImage;
window.nextPalaceImage = nextPalaceImage;
window.playPalaceAudio = playPalaceAudio;
window.playPalaceVideo = playPalaceVideo;
window.closeVideoModal = closeVideoModal;
window.toggleExplodeView = toggleExplodeView;
window.toggleWireframeMode = toggleWireframeMode;
window.resetView = resetView;
window.initMuseumLayout = initMuseumLayout;
window.openImageGallery = openImageGallery;
window.closeImageViewer = closeImageViewer;
window.prevViewerImage = prevViewerImage;
window.nextViewerImage = nextViewerImage;
window.toggleAudioPlayback = toggleAudioPlayback;
window.stopAudioPlayback = stopAudioPlayback;

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(async function() {
            await initDataManagerForbiddenCity();
            initMuseumLayout();
            initForbiddenCity3D();
        }, 500);
    });
} else {
    setTimeout(async function() {
        await initDataManagerForbiddenCity();
        initMuseumLayout();
        initForbiddenCity3D();
    }, 500);
}
