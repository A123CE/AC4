# 百科知识图谱发布说明、口径公告与回滚手册（T-BG-16）

- 分支：建筑模型的功能修改
- 日期：2026-11-24
- 范围：`/encyclopedia` 栏目内三栏布局 + 右侧常驻知识图谱（G1：栏目内全局，不做全站浮层）

## 1. 变更清单

**新增**

| 文件 | 作用 |
|---|---|
| `client/src/lib/encyclopediaGraph.js` | 纯函数：构造、预算裁剪、确定性布局、邻接、夹紧 |
| `client/src/components/EncyclopediaKnowledgeGraph.jsx` | 只读 SVG 图谱面板（折叠/列表/降级/键盘/缩放拖拽） |
| `scripts/bg-content-hash.mjs` | 词条内容哈希基线 |
| `scripts/measure-bg-layout.mjs` | 四组合空白率/行宽/CLS/性能/截图量测 |
| `scripts/check-bg-events.mjs` | 静态门禁（4 事件、12 属性、无图库/WebGL/新路由/浮层） |
| `test/e2e/encyclopedia-graph.spec.js` | 13 组 E2E（desktop + mobile-320） |
| `docs/tasks/bg-baseline.md`、`docs/tasks/bg-manual-checklist.md`、本文件 | 基线、人工清单、发布/回滚 |

**修改**

| 文件 | 变化 |
|---|---|
| `client/src/pages/EncyclopediaPage.jsx` | `.enc-detail-grid > .enc-detail-main` + 图谱栏；断点推导；`buildGraphModel` 同源；顶栏/导引接 i18n |
| `client/src/styles/encyclopedia.css` | **仅末尾追加** 484 行（三栏网格、面板、图例、节点/边、折叠、打印、减少动效） |
| `client/src/components/EncyclopediaGuide.jsx` | 文案 props 化（`heading/hint/flow/foot/cardDesc/cardTitle`） |
| `client/src/lib/analytics.js` | 新增 4 个 `graph_*` 事件（属性白名单不变） |
| `client/src/i18n/{zh-CN,en}.json` | 新增 36 键（page/guide/graph） |
| `package.json` | 新增 `bg:hash` / `bg:measure` / `bg:events`（仅增 3 行） |

## 2. 口径公告

- **“全局样式” = G1 栏目内全局**：图谱常驻 `/encyclopedia` 右侧（≥1284px），不做全站背景水印/浮层。
- **结构空白率口径**：`1 − (正文卡片宽 + gap + 图谱栏宽) / 内容盒宽`，内容盒 = 详情区 `clientWidth − 左右 padding`；1920 档案纸内对称页边距**不计入**。
- **实测**：1920/1440 × 引导/详情 四组合 **0.0%**（≤8%）；1920 详情正文列 1052px、图谱 420px。
- **图谱**：只读；缩放 0.5~2.0×；节点 ≤120、边 ≤300、概览 ≤60；确定性布局（无随机/无图库）。
- **断点**：≥1440 三栏、1284~1439 两栏、1025~1283 折叠条、≤1024 纵向 + 折叠/全宽展开、≤480 关联列表。
- **埋点**：4 事件（`graph_view/graph_node_click/graph_expand/graph_fallback`），属性键**零新增**，不采集身份。
- **无新增**：路由、后端接口、数据库表/迁移、第三方依赖。

## 3. 纯前端回滚

本特性**无数据库迁移、无 SQL 回滚**。按提交逆序 `git revert` 即可：

```bash
git revert --no-edit e150902 80d6801 f09ef2d e6a0f3d 492704b a670a05 ba1227b 089bde7
```

- 页面、组件、样式、i18n、埋点、基线/脚本同进同退；
- 回滚后 `coverage`/词条数据不受影响（BK 数据迁移与图谱无关，保留）。

## 4. 回滚后校验

| # | 校验项 | 期望 | dry-run 实测 |
|---|---|---|---|
| 1 | `npm run build` | 成功 | ✅ |
| 2 | `.enc-graph-panel` / `.enc-detail-grid` | 0 个 | ✅ 0 / 0 |
| 3 | `.enc-article` 宽度（1920） | 1040px 单列 | ✅ 1040px（max-width 1040px） |
| 4 | 横向滚动 | 无 | ✅ false |
| 5 | 深链 `?term=` | 正常渲染标题 | ✅「天坛·三重攒尖…」 |
| 6 | 埋点事件数 | 回到图谱前 | ✅ 20（任务卡写 21，按代码实际为 20） |

**dry-run 记录**：临时分支 `tmp-bg-rollback` → 逆序 revert 8 个提交（至 `77ab43c`）全部无冲突 → build 成功 → 上表 6 项通过 → 已删除临时分支并恢复工作分支构建。

## 5. 记录项（不阻塞发布）

| 编号 | 内容 | 处理 |
|---|---|---|
| Q-BG-07 | 900 断点按既有 1024 纵向 + 折叠/全宽（与需求文本“900–1439 双列”差异） | 按设计执行，登记 |
| Q-BG-08 | `encyclopedia.group.count` 的 `{{count}}` 与单花括号插值不匹配 | 既有键不改 |
| Q-BG-11 | 同域边默认显示，未做开关 | 后续可选 |
| Q-BG-12 | 详情/列表既有中文字面量未全量 i18n 化 | 后续可选 |
| CF-BG-01 | 不引入 axe，用 Lighthouse + 人工键盘/读屏 | 已按此执行 |
| CF-BG-02 | 1920 档案纸内约 250px 视为页边距（结构空白率 0%） | 已接受 |

## 6. 证据

- 布局/性能 JSON 与 4 张截图：`test-results/bg-measure/<timestamp>.json`（本地，不入库）
- 基线：`docs/tasks/assets/bg-baseline/`
- 人工签核：`docs/tasks/bg-manual-checklist.md`（3 项自动通过、3 项待签）