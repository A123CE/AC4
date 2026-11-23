#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const scanDir = path.join(root, 'client', 'src');

const ALLOWED_FILES = new Set([
  'pages/SearchPage.jsx',
  'components/GlobalSearchDialog.jsx',
  'components/CollectionDialog.jsx',
  'components/ShareButton.jsx',
  'components/AchievementToast.jsx',
  'components/RecommendationRail.jsx',
  'styles/global.css',
]);

const FORBIDDEN_FILES = [
  'components/DetailPanel.jsx',
  'pages/QuizPage.jsx',
  'pages/EncyclopediaPage.jsx',
  'pages/ExhibitionPage.jsx',
];

const EXTENSIONS = new Set(['.jsx', '.js', '.css']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) check(full);
  }
}

const violations = [];
let hits = 0;

function check(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('glass-panel')) return;
  hits += 1;

  const relative = path.relative(scanDir, file).split(path.sep).join('/');
  if (!ALLOWED_FILES.has(relative)) {
    violations.push(`白名单外出现 glass-panel: ${relative}`);
  }
}

fs.existsSync(scanDir) && walk(scanDir);

for (const forbidden of FORBIDDEN_FILES) {
  const file = path.join(scanDir, forbidden);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('glass-panel')) {
    violations.push(`禁止位置出现 glass-panel: ${forbidden}`);
  }
}

if (hits === 0) violations.push('未发现任何 glass-panel 应用点，检查扫描路径');

if (violations.length > 0) {
  console.error('[glass-allowlist] 失败');
  for (const item of violations) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`[glass-allowlist] 通过：${hits} 处应用点均在白名单内`);
process.exit(0);