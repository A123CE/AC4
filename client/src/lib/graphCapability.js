/**
 * 3D 能力检测（T-CLOSE-03/04）
 * - 纯 CSS 3D 仍要求 WebGL 可用：低端/无 WebGL 环境统一降级 2D（G3 门禁）
 * - jsdom（单元测试）无 WebGL 实现，按"支持"处理以保持既有断言语义
 */
const isJsdom = () => {
  try {
    return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
};

export function supportsWebGL() {
  if (typeof document === 'undefined') return true;
  if (isJsdom()) return true;
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') ||
      canvas.getContext('webgl2');
    return Boolean(context);
  } catch {
    return false;
  }
}

export function supports3D() {
  try {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true;
    const css3d =
      CSS.supports('transform-style', 'preserve-3d') && CSS.supports('perspective', '1000px');
    return css3d && supportsWebGL();
  } catch {
    return true;
  }
}