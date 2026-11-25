/**
 * 图谱主题偏好（T-G3D-18 / R-G3D-19）
 * - 不依赖 React / DOM 结构，可在 Node 环境单测
 * - localStorage 不可用或抛错时降级为内存态，不抛出
 */
export const GRAPH_THEME_KEY = 'ac4_graph_theme';
export const GRAPH_THEMES = Object.freeze(['dark', 'light']);
export const DEFAULT_GRAPH_THEME = 'dark';

const memory = { value: DEFAULT_GRAPH_THEME };

export function resolveGraphTheme(raw) {
  return GRAPH_THEMES.includes(raw) ? raw : DEFAULT_GRAPH_THEME;
}

export function readGraphTheme() {
  try {
    if (typeof localStorage === 'undefined') return memory.value;
    return resolveGraphTheme(localStorage.getItem(GRAPH_THEME_KEY));
  } catch {
    return memory.value;
  }
}

export function writeGraphTheme(theme, options = {}) {
  const value = resolveGraphTheme(theme);
  memory.value = value;
  if (options.readOnly === true) return value;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(GRAPH_THEME_KEY, value);
  } catch {
    /* 隐私模式等存储不可用时保持内存态 */
  }
  return value;
}

export function nextTheme(theme) {
  return resolveGraphTheme(theme) === 'dark' ? 'light' : 'dark';
}