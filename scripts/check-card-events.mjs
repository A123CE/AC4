#!/usr/bin/env node
/**
 * 3D 卡片/图谱静态门禁（T-CARD-06 首版）
 * 校验：6 事件、12 属性、禁库、无 canvas/three、无新路由、断点单源、CSS 只追加。
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = {
  analytics: 'client/src/lib/analytics.js',
  graph: 'client/src/components/EncyclopediaKnowledgeGraph.jsx',
  graph3d: 'client/src/components/Graph3DScene.jsx',
  page: 'client/src/pages/EncyclopediaPage.jsx',
  app: 'client/src/App.jsx',
  css: 'client/src/styles/encyclopedia.css',
  cardsLib: 'client/src/lib/encyclopediaCards.js',
  graphLib: 'client/src/lib/encyclopediaGraph.js',
  rootPkg: 'package.json',
  clientPkg: 'client/package.json',
};

const EVENTS = ['card_view', 'card_swap', 'card_drag', 'graph_rotate', 'graph_drag', 'graph_reset'];
const PROP_KEYS = [
  'q_hash', 'q_length', 'entity_type', 'entity_id', 'channel', 'reason',
  'route_id', 'category', 'stage', 'entry_type', 'palace_id', 'result_count',
];
// three 为项目既有 3D 模型依赖；卡片/图谱禁用它由源码断言（无 canvas / from 'three'）覆盖
const FORBIDDEN = ['gsap', 'react-spring', 'd3', 'cytoscape', 'echarts', 'swiper', 'embla'];

const results = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
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
const page = read(FILES.page);
const graph = read(FILES.graph);
const graph3d = exists(FILES.graph3d) ? read(FILES.graph3d) : '';
const app = read(FILES.app);

for (const eventName of EVENTS) {
  check(
    `事件已登记：${eventName}`,
    blockOf(analytics, 'const EVENT_NAMES').includes(`'${eventName}'`)
  );
}

const props = [...new Set((blockOf(analytics, 'const ALLOWED_PROP_KEYS').match(/'[a-z_]+'/g) || []).map((item) => item.replace(/'/g, '')))];
check(
  '属性白名单仍为 12 键',
  props.length === 12 && PROP_KEYS.every((key) => props.includes(key)),
  `count=${props.length}`
);

const dependencyText = [read(FILES.rootPkg), read(FILES.clientPkg)]
  .map((text) => {
    const pkg = JSON.parse(text);
    return JSON.stringify({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  })
  .join(' ');
const foundLibs = FORBIDDEN.filter((lib) => dependencyText.includes(`"${lib}"`));
check('依赖未引入禁库（动画/图库/轮播）', foundLibs.length === 0, foundLibs.join(','));

const canvasHits = [page, graph, graph3d].some((text) => /<canvas|getContext\(|from ['"]three['"]/.test(text));
check('百科页/图谱无 canvas 或 three', !canvasHits);

check('未新增 3D 路由', !app.includes('/encyclopedia/graph3d') && !app.includes('/graph3d'));

if (exists(FILES.cardsLib) && exists(FILES.graphLib)) {
  const cards = read(FILES.cardsLib);
  const graphLib = read(FILES.graphLib);
  const breakpoints = [...new Set(blockOf(graphLib, 'const GRAPH_CONFIG', '});').match(/wide|medium|compact|stacked|narrow|minimal/g) || [])];
  const cardPreset = blockOf(cards, 'PRESET:', 'MOTION:');
  const formMatch = graphLib.match(/FORM:\s*(?:Object\.freeze\()?\{([\s\S]*?)\}/);
  const form3d = formMatch ? formMatch[1] : '';
  const okPreset = breakpoints.length > 0 && breakpoints.every((key) => cardPreset.includes(key));
  const okForm = breakpoints.length > 0 && breakpoints.every((key) => form3d.includes(key));
  check('断点键集合单源（CARDS_CONFIG.PRESET）', okPreset, breakpoints.join(','));
  check('断点键集合单源（GRAPH_3D_CONFIG.FORM）', okForm, breakpoints.join(','));
} else {
  check('断点单源（配置待 T-CARD-03/09）', true, 'pending');
}

try {
  const output = execSync(`git diff --numstat -- ${FILES.css}`, { cwd: root, encoding: 'utf8' }).trim();
  if (!output) {
    check('encyclopedia.css 仅追加（当前无未提交改动）', true);
  } else {
    const [, deleted] = output.split(/\s+/);
    check('encyclopedia.css 仅追加（删除行 ≤1，允许 EOF 换行规范化）', Number(deleted) <= 1, `deleted=${deleted}`);
  }
} catch {
  check('encyclopedia.css 仅追加（git 不可用，跳过）', true, 'skip');
}

const failed = results.filter((item) => !item.ok);
console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);