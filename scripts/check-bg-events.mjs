#!/usr/bin/env node
/**
 * 图谱静态门禁（T-BG-15）
 * 校验：7 事件、12 属性、跨 2 文件 7 处调用、无图库/WebGL、无新路由、无全站浮层、无 innerHTML。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = {
  analytics: 'client/src/lib/analytics.js',
  component: 'client/src/components/EncyclopediaKnowledgeGraph.jsx',
  page: 'client/src/pages/EncyclopediaPage.jsx',
  graphLib: 'client/src/lib/encyclopediaGraph.js',
  app: 'client/src/App.jsx',
  css: 'client/src/styles/encyclopedia.css',
  graph3d: 'client/src/components/Graph3DScene.jsx',
  rootPkg: 'package.json',
  clientPkg: 'client/package.json',
};

const GRAPH_EVENTS = [
  'graph_view',
  'graph_node_click',
  'graph_expand',
  'graph_fallback',
  'graph_rotate',
  'graph_drag',
  'graph_reset',
];
const PROP_KEYS = [
  'q_hash', 'q_length', 'entity_type', 'entity_id', 'channel', 'reason',
  'route_id', 'category', 'stage', 'entry_type', 'palace_id', 'result_count',
];
const FORBIDDEN_LIBS = ['d3', 'cytoscape', 'vis-network', 'sigma', 'echarts'];

const results = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
};

function blockOf(text, anchor, end = ']);') {
  const start = text.indexOf(anchor);
  if (start < 0) return '';
  const stop = text.indexOf(end, start);
  return text.slice(start, stop + end.length);
}

const analytics = read(FILES.analytics);
const component = read(FILES.component);
const graph3dExists = fs.existsSync(path.join(root, FILES.graph3d));
const graph3d = graph3dExists ? read(FILES.graph3d) : '';
const page = read(FILES.page);
const graphLib = read(FILES.graphLib);
const app = read(FILES.app);
const css = read(FILES.css);

const eventBlock = blockOf(analytics, 'const EVENT_NAMES');
const foundGraphEvents = [...new Set(eventBlock.match(/'graph_[a-z_]+'/g) || [])].map((item) =>
  item.replace(/'/g, '')
);
check(
  '图谱事件恰 7 个且与登记一致',
  foundGraphEvents.length === 7 &&
    GRAPH_EVENTS.every((name) => foundGraphEvents.includes(name)),
  foundGraphEvents.join(',')
);

const propBlock = blockOf(analytics, 'const ALLOWED_PROP_KEYS');
const foundProps = [...new Set(propBlock.match(/'[a-z_]+'/g) || [])].map((item) => item.replace(/'/g, ''));
check(
  '属性白名单仍为 12 键',
  foundProps.length === 12 && PROP_KEYS.every((key) => foundProps.includes(key)),
  `count=${foundProps.length}`
);

const trackCalls =
  (component.match(/track\('graph_/g) || []).length +
  (graph3d.match(/track\('graph_/g) || []).length;
const graph3dTrackCalls = (graph3d.match(/track\('graph_/g) || []).length;
check(
  '跨 2 文件 track(graph_*) 合计 ≥7，且 Graph3DScene 恰 3 处',
  trackCalls >= 7 && graph3dTrackCalls === 3,
  `count=${trackCalls}, graph3d=${graph3dTrackCalls}`
);

const dependencyText = [read(FILES.rootPkg), read(FILES.clientPkg)]
  .map((text) => {
    const pkg = JSON.parse(text);
    return JSON.stringify({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  })
  .join(' ');
const foundLibs = FORBIDDEN_LIBS.filter((lib) => dependencyText.includes(`"${lib}"`));
check('依赖未引入第三方图库', foundLibs.length === 0, foundLibs.join(','));

check(
  '图谱组件/纯函数无 WebGL/three',
  !/webgl|three/i.test(component) && !/webgl|three/i.test(graphLib),
  'webgl/three found'
);

check('App 未新增图谱路由', !app.includes('/encyclopedia/graph'), 'found /encyclopedia/graph');

const graphCss = css.slice(css.indexOf('/* ===== 知识图谱全局样式'));
check('新增样式无全站 fixed 浮层', !/position:\s*fixed/i.test(graphCss), 'position:fixed found');

check(
  '组件与页面无 dangerouslySetInnerHTML',
  !component.includes('dangerouslySetInnerHTML') && !page.includes('dangerouslySetInnerHTML')
);

check(
  '页面未使用 window.innerWidth',
  !page.includes('window.innerWidth')
);

check('纯函数模块无 React/DOM', !/from ['"]react['"]|window\.|document\./.test(graphLib));

const failed = results.filter((item) => !item.ok);
console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);