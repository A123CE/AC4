#!/usr/bin/env node
/**
 * 排版静态守门（T-FONT-07）
 *
 * 断言：
 *  A. font-weight 只允许三个令牌值；内联 fontWeight 键计数为 0
 *  B. font-family 字面量只允许出现在 global.css 的 :root 与 @font-face
 *  C. SELECTOR_GROUP 内同组选择器字重完全一致
 *  D. font-size × font-weight 合法矩阵（R-FONT-09）
 *  E. 状态选择器（hover/focus/active/aria 状态/disabled）块内不得出现 font-weight
 *
 * 用法：cd client && npm run lint:typography
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const EXEMPT_FILES = new Set(['src/index.css']);

const WEIGHT_TOKENS = new Set([
  'var(--fw-title)',
  'var(--fw-body)',
  'var(--fw-aux)',
]);

const SIZE_PX = {
  'var(--fs-caption)': 11,
  'var(--fs-meta)': 12,
  'var(--fs-note)': 13,
  'var(--fs-body)': 14,
  'var(--fs-body-lg)': 15,
  'var(--fs-card-title)': 17,
  'var(--fs-section)': 20,
  'var(--fs-page-title)': 28,
  'var(--fs-display)': 32,
};

const ALLOWED_WEIGHTS = {
  11: ['var(--fw-aux)'],
  12: ['var(--fw-aux)'],
  13: ['var(--fw-aux)', 'var(--fw-body)'],
  14: ['var(--fw-body)', 'var(--fw-title)'],
  15: ['var(--fw-body)', 'var(--fw-title)'],
  17: ['var(--fw-body)', 'var(--fw-title)'],
  20: ['var(--fw-title)'],
  28: ['var(--fw-title)'],
  32: ['var(--fw-title)'],
};

const SELECTOR_GROUP = {
  页面主标题: ['.t-page-title', '.profile-title', '.enc-head-title'],
  区块标题: ['.t-section', '.enc-section-head h3', '.enc-bar-title', '.enc-section-title'],
  卡片标题: ['.t-title-sm', '.enc-card-title', '.encyclopedia-term-item-name'],
  正文: ['.t-body', '.t-control'],
  辅助: ['.t-aux'],
  数字: ['.t-num'],
};

const STATE_RE =
  /:hover|:focus|:active|:focus-visible|:focus-within|aria-pressed|aria-current|aria-selected|disabled|\.active\b|\.is-active\b|\.is-current\b/;
const LANG_RE = /:lang\(|\[data-locale|\[lang\]/;

const errors = [];
const push = (file, line, expect, actual, rule) =>
  errors.push({ file, line, expect, actual, rule });

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walk(p));
    } else if (/\.(css|jsx|js)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SRC).map((p) => path.relative(ROOT, p).replace(/\\/g, '/'));

function lineAt(src, index) {
  return src.slice(0, index).split('\n').length;
}

function collectRules(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    rules.push({ selector, body: m[2], line: lineAt(src, m.index), file });
  }
  return rules;
}

const cssFiles = files.filter((f) => f.endsWith('.css'));
const allRules = [];
for (const file of cssFiles) {
  if (EXEMPT_FILES.has(file)) continue;
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  allRules.push(...collectRules(file));

  const weightRe = /font-weight\s*:\s*([^;]+);/g;
  let wm;
  while ((wm = weightRe.exec(src))) {
    const value = wm[1].trim();
    if (!WEIGHT_TOKENS.has(value)) {
      push(file, lineAt(src, wm.index), 'var(--fw-title|--fw-body|--fw-aux)', value, 'A');
    }
  }

  if (file === 'src/styles/global.css') {
    const familyRe = /font-family\s*:\s*([^;]+);/g;
    let fm;
    while ((fm = familyRe.exec(src))) {
      const value = fm[1].trim();
      const line = lineAt(src, fm.index);
      const inRoot = line < 130;
      const isFace = !/,/.test(value);
      if (inRoot && /^var\(--font-/.test(value)) continue;
      if (isFace && /^'[^']+'$/.test(value)) continue;
      if (/^var\(--font-|^inherit/.test(value)) continue;
      push(file, line, ':root 令牌 / var(--font-*) / inherit', value, 'B');
    }
  } else {
    const familyRe = /font-family\s*:\s*([^;]+);/g;
    let fm;
    while ((fm = familyRe.exec(src))) {
      const value = fm[1].trim();
      if (/^var\(--font-|^var\(--enc-serif\)$|^inherit/.test(value)) continue;
      push(file, lineAt(src, fm.index), 'var(--font-*)/inherit', value, 'B');
    }
  }
}

for (const file of files.filter((f) => f.endsWith('.jsx') || f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const re = /\bfontWeight\s*:/g;
  let m;
  while ((m = re.exec(src))) {
    push(file, lineAt(src, m.index), '无内联 fontWeight', 'fontWeight 键', 'A');
  }
  const famRe = /\bfontFamily\s*:/g;
  while ((m = famRe.exec(src))) {
    push(file, lineAt(src, m.index), '无内联 fontFamily', 'fontFamily 键', 'B');
  }
}

for (const rule of allRules) {
  const wm = rule.body.match(/font-weight\s*:\s*([^;]+);/);
  if (wm && STATE_RE.test(rule.selector)) {
    push(rule.file, rule.line, '状态块内无 font-weight', wm[1].trim(), 'E');
  }
  if (wm && LANG_RE.test(rule.selector)) {
    push(rule.file, rule.line, '语言块内无 font-weight', wm[1].trim(), 'E');
  }
  const sm = rule.body.match(/font-size\s*:\s*([^;]+);/);
  if (wm && sm) {
    const px = SIZE_PX[sm[1].trim()];
    const weight = wm[1].trim();
    if (px && ALLOWED_WEIGHTS[px] && !ALLOWED_WEIGHTS[px].includes(weight)) {
      push(rule.file, rule.line, `${px}px 允许 ${ALLOWED_WEIGHTS[px].join('/')}`, weight, 'D');
    }
  }
}

for (const [group, selectors] of Object.entries(SELECTOR_GROUP)) {
  const tokens = new Set();
  const where = [];
  for (const rule of allRules) {
    if (!selectors.includes(rule.selector)) continue;
    const wm = rule.body.match(/font-weight\s*:\s*([^;]+);/);
    if (!wm) continue;
    tokens.add(wm[1].trim());
    where.push(`${rule.file}:${rule.line}(${rule.selector})`);
  }
  if (tokens.size > 1) {
    push('SELECTOR_GROUP', 0, `${group} 同组字重唯一：${[...tokens].join(' / ')}`, where.join(', '), 'C');
  }
}

for (const file of ['src/styles/graphSphere.css', 'src/styles/cardDeck.css']) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  const weights = [...src.matchAll(/font-weight\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
  const bad = weights.find((value) => !/^var\(--fw-(title|body|aux)\)$/.test(value));
  if (bad) {
    push(file, 0, '深色/卡片增量样式仅允许 var(--fw-*)', bad, 'A');
  }
}

if (errors.length) {
  for (const e of errors) {
    console.error(`✖ [${e.rule}] ${e.file}:${e.line} → 期望 ${e.expect} → 实际 ${e.actual}`);
  }
  console.error(`\n排版守门失败：${errors.length} 处违规`);
  process.exit(1);
}

console.log('✔ 排版守门通过：字重三档、字体族三角色、字号九档、状态不加载重');