/**
 * 单帧调度器（T-CARD-04）
 * 卡片与图谱各注册一个回调，共享同一帧；非浏览器环境退化为 setTimeout。
 */
const registry = new Map();
let frameId = null;

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}

function cancelFrame(id) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

function tick(timestamp) {
  frameId = null;
  if (registry.size === 0) return;
  for (const callback of [...registry.values()]) {
    try {
      callback(timestamp);
    } catch {
      /* 单个回调异常不影响其他回调 */
    }
  }
  if (registry.size > 0 && frameId === null) {
    frameId = requestFrame(tick);
  }
}

function ensureFrame() {
  if (frameId === null) {
    frameId = requestFrame(tick);
  }
}

export function createRafLoop(callback) {
  const key = Symbol('raf-loop');
  let running = false;

  return {
    start() {
      if (running) return;
      running = true;
      registry.set(key, (timestamp) => {
        if (running) callback(timestamp);
      });
      ensureFrame();
    },
    stop() {
      running = false;
      registry.delete(key);
      if (registry.size === 0 && frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
    },
    get running() {
      return running;
    },
  };
}

export function activeLoopCount() {
  return registry.size;
}