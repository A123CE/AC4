# 百科知识图谱人工验收清单（T-BG-14）

- 环境：`http://localhost:3001`（生产构建，`npm run build` + `npm run server`）
- 分支：建筑模型的功能修改；日期：2026-11-24
- 原则：**不引入 axe**；可自动化项用脚本/E2E 证据，其余由人工签核
- 证据目录：`docs/tasks/assets/bg-acceptance/`、`test-results/bg-measure/`

## 1. 键盘全流程

| 项 | 内容 |
|---|---|
| 方法 | 从左侧列表 Tab 进入图谱 → 首个焦点为「跳至正文」→ 节点逐个可达 → Enter 激活建筑/词条 → Shift+Tab 回到正文，全程无焦点陷阱 |
| 自动证据 | E2E「6 键盘」；组件测试 C-06/C-07/C-08（Enter 等价、skip 首焦点、`aria-label`） |
| 结论 | 自动化通过；人工全流程复验待签字 |
| 证据 | `test-results/bg-measure/*.json`、`test-results/encyclopedia-graph-*` |
| 跟进 | **BG-M-01** |

## 2. 灰度可辨（Achromatopsia）

| 项 | 内容 |
|---|---|
| 方法 | Chrome DevTools → Rendering → Emulate vision deficiencies → Achromatopsia；分别截图引导态与详情态，核对 5 类节点形状（圆/方/六边/菱/三角）与 4 类边线型（实/实/点划/点） |
| 结论 | 待人工签字 |
| 证据 | `docs/tasks/assets/bg-acceptance/achromatopsia-guide.png`、`achromatopsia-detail.png`（待生成） |
| 跟进 | **BG-M-02** |

## 3. 减少动效

| 项 | 内容 |
|---|---|
| 方法 | `prefers-reduced-motion: reduce`，检查图谱节点描边过渡与折叠按钮过渡为 `none` |
| 自动证据 | `scripts/measure-bg-layout.mjs` 的 reduced 采样；CSS `@media (prefers-reduced-motion: reduce)` |
| 结论 | **通过**（实测 `transition-duration ≈ 0`） |
| 证据 | `test-results/bg-measure/*.json` |
| 跟进 | 无 |

## 4. 打印

| 项 | 内容 |
|---|---|
| 方法 | `Ctrl+P` 预览：图谱不出现、正文单列、档案纸不再限宽 |
| 自动证据 | 量测脚本 print 采样（`.enc-graph-panel` → `display:none`）；CSS `@media print` |
| 结论 | **通过** |
| 证据 | `test-results/bg-measure/*.json` |
| 跟进 | 无 |

## 5. 文案检索（禁用词）

| 项 | 内容 |
|---|---|
| 方法 | 检索 `智能 / 自动 / 实时 / 全息 / 3D 立体 / 全站知识网络 / 跨页面关联` |
| 命令 | `grep -nE "智能|自动|实时|全息|3D 立体|全站知识网络|跨页面关联" client/src/i18n/zh-CN.json client/src/components/EncyclopediaKnowledgeGraph.jsx client/src/pages/EncyclopediaPage.jsx`，另对 `encyclopedia.*` 全键值程序化扫描 |
| 结论 | **0 命中，通过** |
| 证据 | 本文件与终端输出 |
| 跟进 | 无 |

## 6. Lighthouse Accessibility + 读屏

| 项 | 内容 |
|---|---|
| 方法 | Lighthouse（Chrome, Desktop）Accessibility ≥90 且无 critical；NVDA/VoiceOver 播报节点 `aria-label`（形如「词条：藻井」）、可整体跳过图谱 |
| 结论 | 待人工签字（未引入 axe） |
| 证据 | `docs/tasks/assets/bg-acceptance/lighthouse.json`（待导出）、读屏录屏（待补） |
| 跟进 | **BG-M-03** |

## 7. 依赖与边界

- `git diff package.json client/package.json` 依赖段 **0 变更**（本轮未新增依赖；T-BG-15 仅追加根 `scripts`）。
- 未引入 axe / d3 / cytoscape / echarts / vis-network / sigma。
- 未改 `playwright.config.js` 的 `webServer`。

## 8. 汇总

| 状态 | 数量 | 项 |
|---|---|---|
| 自动通过 | 3 | 减少动效、打印、文案检索 |
| 自动化通过 + 人工复验待签 | 1 | 键盘全流程 |
| 待人工签字 | 2 | 灰度可辨、Lighthouse + 读屏 |

未通过/待签项均已登记跟进编号（BG-M-01~03），不影响功能合入；发布前需补齐签名与证据。