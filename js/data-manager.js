/**
 * 数据管理模块 - Data Manager
 * 
 * 功能说明：
 * 1. 读取并管理multimedia-db.json数据
 * 2. 3D模型的CRUD操作
 * 3. 生长动画的CRUD操作
 * 4. 数据验证功能
 * 5. localStorage数据缓存
 * 
 * @version 1.0
 * @author Data Management Team
 */

(function(global) {
    'use strict';

    // ==================== 配置常量 ====================
    const CONFIG = {
        DATA_PATH: 'data/multimedia-db.json',
        STORAGE_KEY: 'ancient-architecture-data',
        CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24小时缓存
        MODEL_ID_PREFIX: 'model-',
        ANIMATION_ID_PREFIX: 'growth-'
    };

    // ==================== 数据状态 ====================
    let dataStore = {
        loaded: false,
        data: null,
        cacheTimestamp: null
    };

    // ==================== 工具函数 ====================

    /**
     * 生成唯一ID
     * @param {string} prefix - ID前缀
     * @returns {string} 唯一ID
     */
    function generateId(prefix) {
        return prefix + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取当前时间戳
     * @returns {number} 时间戳
     */
    function getTimestamp() {
        return Date.now();
    }

    /**
     * 深度克隆对象
     * @param {any} obj - 要克隆的对象
     * @returns {any} 克隆后的对象
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // ==================== 数据验证 ====================

    /**
     * 验证3D模型数据
     * @param {Object} modelData - 模型数据
     * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
     */
    function validateModel(modelData) {
        const errors = [];
        
        if (!modelData) {
            errors.push('模型数据不能为空');
            return { valid: false, errors };
        }

        if (!modelData.buildingId || typeof modelData.buildingId !== 'string') {
            errors.push('buildingId 必须是非空字符串');
        }

        if (!modelData.buildingName || typeof modelData.buildingName !== 'string') {
            errors.push('buildingName 必须是非空字符串');
        }

        if (!modelData.url || typeof modelData.url !== 'string') {
            errors.push('url 必须是非空字符串');
        }

        if (modelData.format && !['glb', 'gltf', 'obj', 'fbx'].includes(modelData.format)) {
            errors.push('format 必须是 glb, gltf, obj, fbx 之一');
        }

        if (modelData.polygonCount && typeof modelData.polygonCount !== 'number') {
            errors.push('polygonCount 必须是数字');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证生长动画数据
     * @param {Object} animationData - 动画数据
     * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
     */
    function validateAnimation(animationData) {
        const errors = [];
        
        if (!animationData) {
            errors.push('动画数据不能为空');
            return { valid: false, errors };
        }

        if (!animationData.buildingId || typeof animationData.buildingId !== 'string') {
            errors.push('buildingId 必须是非空字符串');
        }

        if (!animationData.title || typeof animationData.title !== 'string') {
            errors.push('title 必须是非空字符串');
        }

        if (!animationData.url || typeof animationData.url !== 'string') {
            errors.push('url 必须是非空字符串');
        }

        if (animationData.durationSeconds && typeof animationData.durationSeconds !== 'number') {
            errors.push('durationSeconds 必须是数字');
        }

        if (animationData.stages && !Array.isArray(animationData.stages)) {
            errors.push('stages 必须是数组');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ==================== localStorage 缓存管理 ====================

    /**
     * 保存数据到localStorage
     * @param {Object} data - 要保存的数据
     */
    function saveToCache(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: getTimestamp()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('无法保存到localStorage:', e);
        }
    }

    /**
     * 从localStorage加载数据
     * @returns {Object|null} 缓存的数据或null
     */
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const now = getTimestamp();
            
            if (now - cacheData.timestamp < CONFIG.CACHE_EXPIRY) {
                return cacheData.data;
            }
            
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        } catch (e) {
            console.warn('无法从localStorage加载:', e);
        }
        return null;
    }

    /**
     * 清除localStorage缓存
     */
    function clearCache() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        } catch (e) {
            console.warn('无法清除localStorage:', e);
        }
    }

    // ==================== 数据加载 ====================

    /**
     * 从JSON文件加载数据
     * @returns {Promise<Object>} 加载的数据
     */
    async function loadDataFromFile() {
        try {
            const response = await fetch(CONFIG.DATA_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('加载数据文件失败:', error);
            throw error;
        }
    }

    /**
     * 初始化数据管理器
     * @param {boolean} forceRefresh - 是否强制刷新（跳过缓存）
     * @returns {Promise<void>}
     */
    async function initDataManager(forceRefresh = false) {
        if (!forceRefresh) {
            const cachedData = loadFromCache();
            if (cachedData) {
                dataStore.data = cachedData;
                dataStore.loaded = true;
                dataStore.cacheTimestamp = getTimestamp();
                return;
            }
        }

        const data = await loadDataFromFile();
        dataStore.data = data;
        dataStore.loaded = true;
        dataStore.cacheTimestamp = getTimestamp();
        saveToCache(data);
    }

    /**
     * 检查数据是否已加载
     * @returns {boolean}
     */
    function isDataLoaded() {
        return dataStore.loaded && dataStore.data !== null;
    }

    /**
     * 确保数据已加载
     * @throws {Error} 如果数据未加载
     */
    function ensureDataLoaded() {
        if (!isDataLoaded()) {
            throw new Error('数据未加载，请先调用 initDataManager()');
        }
    }

    // ==================== 3D模型 CRUD 操作 ====================

    /**
     * 获取所有3D模型
     * @returns {Array} 3D模型数组
     */
    function getAllModels() {
        ensureDataLoaded();
        return deepClone(dataStore.data['3dModels'] || []);
    }

    /**
     * 根据ID获取3D模型
     * @param {string} id - 模型ID
     * @returns {Object|null} 找到的模型或null
     */
    function getModel(id) {
        ensureDataLoaded();
        const models = dataStore.data['3dModels'] || [];
        const model = models.find(m => m.id === id);
        return model ? deepClone(model) : null;
    }

    /**
     * 根据建筑ID获取3D模型
     * @param {string} buildingId - 建筑ID
     * @returns {Array} 匹配的模型数组
     */
    function getModelsByBuilding(buildingId) {
        ensureDataLoaded();
        const models = dataStore.data['3dModels'] || [];
        const filtered = models.filter(m => m.buildingId === buildingId);
        return deepClone(filtered);
    }

    /**
     * 创建新的3D模型
     * @param {Object} modelData - 模型数据
     * @returns {Object} 创建的模型
     */
    function createModel(modelData) {
        ensureDataLoaded();
        
        const validation = validateModel(modelData);
        if (!validation.valid) {
            throw new Error('模型数据验证失败: ' + validation.errors.join(', '));
        }

        if (!dataStore.data['3dModels']) {
            dataStore.data['3dModels'] = [];
        }

        const newModel = {
            id: modelData.id || generateId(CONFIG.MODEL_ID_PREFIX),
            ...deepClone(modelData),
            createdAt: getTimestamp()
        };

        dataStore.data['3dModels'].push(newModel);
        saveToCache(dataStore.data);
        
        return deepClone(newModel);
    }

    /**
     * 更新3D模型
     * @param {string} id - 模型ID
     * @param {Object} modelData - 更新的数据
     * @returns {Object|null} 更新后的模型或null
     */
    function updateModel(id, modelData) {
        ensureDataLoaded();
        
        const models = dataStore.data['3dModels'] || [];
        const index = models.findIndex(m => m.id === id);
        
        if (index === -1) {
            return null;
        }

        const validation = validateModel({ ...models[index], ...modelData });
        if (!validation.valid) {
            throw new Error('模型数据验证失败: ' + validation.errors.join(', '));
        }

        models[index] = {
            ...models[index],
            ...deepClone(modelData),
            id: id,
            updatedAt: getTimestamp()
        };

        saveToCache(dataStore.data);
        return deepClone(models[index]);
    }

    /**
     * 删除3D模型
     * @param {string} id - 模型ID
     * @returns {boolean} 是否删除成功
     */
    function deleteModel(id) {
        ensureDataLoaded();
        
        const models = dataStore.data['3dModels'] || [];
        const index = models.findIndex(m => m.id === id);
        
        if (index === -1) {
            return false;
        }

        models.splice(index, 1);
        saveToCache(dataStore.data);
        return true;
    }

    // ==================== 生长动画 CRUD 操作 ====================

    /**
     * 获取所有生长动画（从所有动画集合中扁平化）
     * @returns {Array} 动画数组
     */
    function getAllAnimations() {
        ensureDataLoaded();
        const collections = dataStore.data.growthAnimations || [];
        const animations = [];
        
        collections.forEach(collection => {
            if (collection.animations && Array.isArray(collection.animations)) {
                collection.animations.forEach(anim => {
                    animations.push({
                        ...anim,
                        collectionId: collection.id,
                        collectionBuildingId: collection.buildingId,
                        collectionBuildingName: collection.buildingName
                    });
                });
            }
        });
        
        return deepClone(animations);
    }

    /**
     * 根据ID获取生长动画
     * @param {string} id - 动画ID
     * @returns {Object|null} 找到的动画或null
     */
    function getAnimation(id) {
        ensureDataLoaded();
        const collections = dataStore.data.growthAnimations || [];
        
        for (const collection of collections) {
            if (collection.animations) {
                const animation = collection.animations.find(a => a.id === id);
                if (animation) {
                    return deepClone({
                        ...animation,
                        collectionId: collection.id,
                        collectionBuildingId: collection.buildingId,
                        collectionBuildingName: collection.buildingName
                    });
                }
            }
        }
        
        return null;
    }

    /**
     * 根据建筑ID获取生长动画
     * @param {string} buildingId - 建筑ID
     * @returns {Array} 匹配的动画数组
     */
    function getAnimationsByBuilding(buildingId) {
        ensureDataLoaded();
        const collections = dataStore.data.growthAnimations || [];
        const animations = [];
        
        collections.forEach(collection => {
            if (collection.animations && Array.isArray(collection.animations)) {
                collection.animations.forEach(anim => {
                    if (anim.buildingId === buildingId || collection.buildingId === buildingId) {
                        animations.push({
                            ...anim,
                            collectionId: collection.id,
                            collectionBuildingId: collection.buildingId,
                            collectionBuildingName: collection.buildingName
                        });
                    }
                });
            }
        });
        
        return deepClone(animations);
    }

    /**
     * 创建新的生长动画
     * @param {Object} animationData - 动画数据
     * @param {string} [collectionId] - 集合ID（可选，不指定则创建新集合）
     * @returns {Object} 创建的动画
     */
    function createAnimation(animationData, collectionId) {
        ensureDataLoaded();
        
        const validation = validateAnimation(animationData);
        if (!validation.valid) {
            throw new Error('动画数据验证失败: ' + validation.errors.join(', '));
        }

        if (!dataStore.data.growthAnimations) {
            dataStore.data.growthAnimations = [];
        }

        const newAnimation = {
            id: animationData.id || generateId(CONFIG.ANIMATION_ID_PREFIX),
            ...deepClone(animationData),
            createdAt: getTimestamp()
        };

        let targetCollection;
        
        if (collectionId) {
            targetCollection = dataStore.data.growthAnimations.find(c => c.id === collectionId);
        }

        if (!targetCollection) {
            targetCollection = {
                id: generateId('growth-collection-'),
                buildingId: animationData.buildingId,
                buildingName: animationData.buildingName || '未命名集合',
                category: 'custom',
                animations: []
            };
            dataStore.data.growthAnimations.push(targetCollection);
        }

        if (!targetCollection.animations) {
            targetCollection.animations = [];
        }

        targetCollection.animations.push(newAnimation);
        saveToCache(dataStore.data);
        
        return deepClone(newAnimation);
    }

    /**
     * 更新生长动画
     * @param {string} id - 动画ID
     * @param {Object} animationData - 更新的数据
     * @returns {Object|null} 更新后的动画或null
     */
    function updateAnimation(id, animationData) {
        ensureDataLoaded();
        
        const collections = dataStore.data.growthAnimations || [];
        let targetAnimation = null;
        let targetCollection = null;
        
        for (const collection of collections) {
            if (collection.animations) {
                const index = collection.animations.findIndex(a => a.id === id);
                if (index !== -1) {
                    targetAnimation = collection.animations[index];
                    targetCollection = collection;
                    break;
                }
            }
        }
        
        if (!targetAnimation) {
            return null;
        }

        const validation = validateAnimation({ ...targetAnimation, ...animationData });
        if (!validation.valid) {
            throw new Error('动画数据验证失败: ' + validation.errors.join(', '));
        }

        const updatedAnimation = {
            ...targetAnimation,
            ...deepClone(animationData),
            id: id,
            updatedAt: getTimestamp()
        };

        const animIndex = targetCollection.animations.findIndex(a => a.id === id);
        targetCollection.animations[animIndex] = updatedAnimation;
        
        saveToCache(dataStore.data);
        return deepClone(updatedAnimation);
    }

    /**
     * 删除生长动画
     * @param {string} id - 动画ID
     * @returns {boolean} 是否删除成功
     */
    function deleteAnimation(id) {
        ensureDataLoaded();
        
        const collections = dataStore.data.growthAnimations || [];
        
        for (const collection of collections) {
            if (collection.animations) {
                const index = collection.animations.findIndex(a => a.id === id);
                if (index !== -1) {
                    collection.animations.splice(index, 1);
                    saveToCache(dataStore.data);
                    return true;
                }
            }
        }
        
        return false;
    }

    // ==================== 导出API ====================
    
    const DataManager = {
        CONFIG,
        
        initDataManager,
        isDataLoaded,
        clearCache,
        
        validateModel,
        validateAnimation,
        
        createModel,
        getModel,
        getAllModels,
        getModelsByBuilding,
        updateModel,
        deleteModel,
        
        createAnimation,
        getAnimation,
        getAllAnimations,
        getAnimationsByBuilding,
        updateAnimation,
        deleteAnimation
    };

    global.DataManager = DataManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DataManager;
    }

})(typeof window !== 'undefined' ? window : this);
