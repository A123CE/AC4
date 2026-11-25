# 华夏古建可视化 · 营造法式知识图谱与详情区空白治理 编码任务规划（tasks）

| 项 | 内容 |
|---|---|
| 文档编号 | TASKS-PUBLIC-BG-001 |
| 版本 | v2.1（重试版，覆盖写入 v2.0） |
| 状态 | 待评审（等待人工确认后方可进入编码；本文件不授权编码） |
| 上游文档 | `docs/requirements/encyclopedia-knowledge-graph-spec.md`（REQ-PUBLIC-BG-001，R-BG-01~39 / AC-BG-01~39）<br/>`docs/design/encyclopedia-knowledge-graph-design.md`（DESIGN-PUBLIC-BG-001，ADR-BG-01~14、CT-BG-01~04）<br/>`docs/tasks/building-knowledge-enrichment-tasks.md`（TASKS-PUBLIC-BK-001，任务卡格式与文件边界） |
| 全局约束 | `docs/requirements/s3-p2-requirements.md`（DFX-S3 全量沿用）、`docs/design/s3-p2-design.md`（ADR-S3-01~12、TR-09） |
| 任务范围 | `/encyclopedia` 单页：呈现层文案 i18n、详情区右侧空白治理（两列网格 + 常驻图谱栏）、纯函数图谱模型/裁剪/布局、SVG 图谱组件、页面接线与折叠状态机、4 类匿名埋点、量测/E2E/人工验收、发布门禁与纯前端回滚 |
| 关联代码库 | `D:\Ancient-architecture\ac1.1\acvisual 4`（分支：建筑模型的功能修改，基线 `55852d8`） |
| 技术栈 | React 19 + Vite（vitest 4.1.12 + jsdom + @testing-library/react）；Express + MySQL（`ac4_db` / `ac4_test`，**本轮零改动**） |
| 业务代码改动 | **无**（本阶段只输出任务规划；不新建/修改任何业务源文件） |
| 编号兼容 | 任务 `T-BG-01~17`；红线 `RED-BG-01~12`；记录项 `CF-BG-01~03`、`Q-BG-08/11/12`；不与 `T-BK-*`、`T-S3P2-*` 冲突 |

> 本文档回答「按什么顺序改、改哪些文件、做到什么程度、如何验收」。命令均已在当前仓库核实（§0.5），未核实项显式标注，不虚构脚本。
> **口径声明（全篇生效）**：词条数、建筑数、覆盖率一律取接口/数据库实时值；文中出现的「43 条」「20 座」仅为当前快照基线说明，**不是实现常量**。
> **已确认口径（不重开）**：文案只改呈现层；「全局样式」= G1 栏目内全局；图谱只读 + 轻量缩放/拖拽 + 邻接高亮；SVG 非 WebGL；纯前端复用既有三接口；<900 折叠、<480 列表；引导态显示概览图。
> **本版相对 v2.0 的 5 处收紧**：① 埋点任务前置到组件之前（编号 T-BG-02）；② 批次由 9 收敛为 8；③ 待确认项收敛为 0，仅留 6 条记录项；④ 布局/性能/文案/测试 DoD 全部改为可复制命令与公式；⑤ 发布门禁改为实际命令集合，回滚明确为纯前端 revert。

---

## 0. 阅读指引与全局约定

### 0.1 批次、任务数与人日（8 批次 / 17 任务 / 12.80 人日）

| 批次 | 名称 | 任务 | 任务数 | 人日 |
|---|---|---|---|---|
| 0 | 前置：阶段隔离与改造前基线 | T-BG-01 | 1 | 0.50 |
| A | 埋点与文案基座（**先埋点**） | T-BG-02~04 | 3 | 1.05 |
| B | 图谱纯函数 | T-BG-05~07 | 3 | 3.50 |
| C | 图谱组件 | T-BG-08~09 | 2 | 2.40 |
| D | 页面接线 | T-BG-10 | 1 | 1.40 |
| E | 样式追加 | T-BG-11 | 1 | 1.00 |
| F | 量测与验收 | T-BG-12~14 | 3 | 1.90 |
| G | 门禁、发布与回滚 | T-BG-15~17 | 3 | 1.05 |
| **合计** | | | **17** | **12.80** |

### 0.2 任务卡字段定义

| 字段 | 含义 |
|---|---|
| 目标 | 一句话可观察结果 |
| 前置 | 未满足不得开工（任务编号或外部条件） |
| 涉及文件 | 新增（标「新增」）/ 修改（标「修改」），精确到现有路径 |
| 实现要点 | 实现级约束，不含完整代码 |
| DoD | 可判定的完成标准，每条可用命令或操作验证 |
| 覆盖 AC | `R-BG-xx` → `AC-BG-xx` 追溯 |
| 预估 | 人日（0.05 步进，含单测） |
| 串行性 | 可并行 / 不可并行及阻塞关系 |
| 验证 | 可复制执行的命令或手工步骤 |
| 边界 | 防止顺手重构 |

### 0.3 通用 DoD（每条任务默认叠加）

1. `npm run lint` 退出码 0；新增/修改文件零新增告警（既有 1052 条 warning 全部来自 `client/public/draco/*`，不计入）。
2. 不改 `client/src/styles/global.css`、`guards.css`、`client/src/App.jsx`、`client/src/api.js`、`client/src/types.js`、`server/**`、`server/db/**`。
3. 新增前端测试放 `client/src/**/__tests__/*.test.js(x)`，由 vitest 自动发现（`client/vite.config.js` 的 `include`），无需登记脚本。
4. 新增样式**只追加到 `client/src/styles/encyclopedia.css` 文件末尾**，新起选择器；不改写任何既有选择器文本。
5. 不新增路由、查询参数、数据表、后端接口；`?term=<id>` 与既有筛选参数形态不变。
6. 新增呈现文案全部来自 `encyclopedia.*` 键，中英同批，**插值一律单花括号**（`{count}`/`{rate}`/`{shown}`/`{total}`/`{type}`/`{label}`）。
7. 既有 `encyclopedia.filter/group/empty/coverage/knowledge` 键一个不删、语义不改。
8. 新增交互继承 `prefers-reduced-motion: reduce` 归零；文字对比度 ≥ 4.5:1、线条 ≥ 3:1。
9. 不改写任何词条的 `term/synopsis/content/category`；不对 `selectedTerm.content` 做新改写（既有 `renderContent` 除外）。
10. 不新增运行时依赖；根与 `client/package.json` 的 `dependencies`/`devDependencies` 零变更（不新增 axe/图库/布局库）。

### 0.4 全局红线（任一违反即任务失败）

| 编号 | 红线 | 来源 |
|---|---|---|
| RED-BG-01 | 图谱渲染层只能是 SVG；不得用 WebGL / Three.js / Canvas 渲染图谱 | R-BG-10、ADR-BG-02 |
| RED-BG-02 | 不得引入 d3 / cytoscape / vis-network / sigma / echarts 等第三方图谱库 | R-BG-30 |
| RED-BG-03 | 不得新增 `/encyclopedia/graph` 等路由；不得做全站固定浮层/背景水印 | R-BG-15/17 |
| RED-BG-04 | `encyclopedia.css` 只允许末尾追加；`global.css` / `guards.css` 一行不改 | R-BG-04、TR-09 |
| RED-BG-05 | 不得改写 `.enc-article{max-width:1040px}` 规则文本，只追加 `.enc-article--fluid` | ADR-BG-03 |
| RED-BG-06 | 埋点只新增 4 个事件名，**属性键零新增**（保持 12 键） | R-BG-35、ADR-BG-11 |
| RED-BG-07 | 埋点不得携带账号、昵称、设备指纹、正文、搜索原词 | R-BG-34 |
| RED-BG-08 | 不改动词条正文语义；不得新增 `UPDATE encyclopedia_terms` | R-BG-25 |
| RED-BG-09 | 不得删除或改义既有 5 组键；新增键不得使用 `{{count}}` | R-BG-28 |
| RED-BG-10 | 图谱只消费 `published` 接口数据；不得用 localStorage 缓存内容 | R-BG-33 |
| RED-BG-11 | 折叠/缩放状态不得写入 URL 或 localStorage（仅 React state） | DFX-BG-C1 |
| RED-BG-12 | 文档、代码、文案、断言不得把词条/建筑数量写成固定事实 | DFX-BG-M2 |

### 0.5 命令核实（本次实测/仓库核对）

| 命令 | 核实结果 | 用法 |
|---|---|---|
| `npm run lint` | 根脚本存在（→ `client` oxlint）；退出码 0；1052 warning 来自 `client/public/draco/*` | 以「新增文件零告警」判定 |
| `npm run test:client` | 根脚本存在（→ `client` `vitest run`） | 前端全量 |
| `npx vitest run <file>`（在 `client/` 目录） | vitest `include: src/**/*.{test,spec}.{js,jsx}` | 单文件前端测试 |
| `npm run test:server` | 根脚本存在（→ `server`）；依赖 MySQL `ac4_test` | 前置 `npm run db:test:init` |
| `npm run test:e2e -- --project=desktop <spec>` | 根脚本存在；playwright 1.61.1；3 个 project（desktop / mobile-320 / no-webgl） | E2E 前必须 `npm run build` |
| `npm run bk:events` | 既有脚本 `scripts/check-bk-events.mjs`，14 项通过 | 回归不得破坏 |
| `npm run build` | 根脚本存在（→ `client` vite build） | 产物体积基线 |
| `npm run ci:gate` | **根 `package.json` 已存在**：`lint && test && test:contract && schema:diff && test:e2e`；**不含 build**，需 MySQL 与 `client/dist` | 仅作可选补充，不单独作为门禁；**无需新增** |
| `npm run bg:events` / `bg:measure` / `bg:hash` | **不存在**，由 T-BG-15 新增登记 | 门禁使用前须先完成 T-BG-15 |

### 0.6 记录项（待确认项 = 0，以下不阻塞开工）

| 编号 | 结论 | 处理 |
|---|---|---|
| CF-BG-01 | 无障碍验证**不新增 axe 依赖** | 用 Lighthouse Accessibility + 人工键盘/读屏（NVDA 或 VoiceOver） |
| CF-BG-02 | 1920 档案纸内约 250px 对称留白视为「档案纸页边距」 | 接受；结构空白率按 0% 验收（§13.1 主口径） |
| CF-BG-03 | 900 断点按设计执行 | ≤1024 沿用既有纵向布局 + 图谱折叠条/全宽展开，不做并排双列 |
| Q-BG-08 | 既有 `encyclopedia.group.count` 的 `{{count}}` 不改 | 仅记录，新增键用单花括号 |
| Q-BG-11 | 同域边固定显示 | 本轮不做「显示同域关联」开关 |
| Q-BG-12 | 详情区内部与列表区既有中文字面量本轮不迁移 | 验收只覆盖顶栏/导引/图谱/空态 |

---

## 1. 任务总览

### 1.1 任务清单总表

| 编号 | 任务名称 | 前置 | 人日 | 串行性 | 覆盖 AC |
|---|---|---|---|---|---|
| T-BG-01 | 阶段隔离提交 + 改造前基线（1920 空白率/CLS/行宽/content 哈希） | — | 0.50 | 不可并行（最先） | 02、25、36 |
| T-BG-02 | `analytics.js` 白名单 +4 事件，属性键不变（**先于组件**） | 01 | 0.35 | 可并行（仅 analytics）；阻塞 08 | 34、35、38 |
| T-BG-03 | i18n 36 键路径（page 4 / guide 8 / graph 24）+ 键集合单测 | 01 | 0.40 | 可并行；阻塞 04、10 | 26、27、28 |
| T-BG-04 | `EncyclopediaGuide.jsx` 文案 props 化 + 2 条组件测试 | 03 | 0.30 | 可并行（与 05）；阻塞 10 | 26 |
| T-BG-05 | `encyclopediaGraph.js`：常量 + 节点/边构造 + 裁剪 + 统计 | 01 | 1.80 | 不可并行（独占新文件） | 06、07、08、09、12、33 |
| T-BG-06 | 同文件追加：布局 / 邻接 / viewBox 夹紧 / 标签切分 | 05 | 0.90 | 不可并行（同文件同人） | 20、21 |
| T-BG-07 | 纯函数单测 G-01~G-22（22 条） | 06 | 0.80 | 不可并行（依赖冻结） | 06、07、09、12、20、21、33 |
| T-BG-08 | `EncyclopediaKnowledgeGraph.jsx`：SVG/图例/交互/空态/降级/错误边界/埋点 | 02、06 | 1.60 | 不可并行（独占新文件） | 07、09、10、14、18~24、29、31、32、35 |
| T-BG-09 | 组件测试 C-01~C-16（16 条） | 08 | 0.80 | 不可并行（缺陷回流 08） | 18~24、35 |
| T-BG-10 | `EncyclopediaPage.jsx` 唯一主改：网格 + 图谱挂载 + 折叠状态机 + i18n + 回调 + 打点 | 03、04、08 | 1.40 | 不可并行（独占页面）；阻塞 11 | 01、05、11、14、16、17、19、26、31、38 |
| T-BG-11 | `encyclopedia.css` **末尾追加**：网格/阅读测量/图谱面板/断点/打印 | 10 | 1.00 | 不可并行（独占 CSS）；阻塞 12 | 01~05、16、24、29、31、36 |
| T-BG-12 | 量测脚本：四组合空白率/行宽/CLS/横向/体积/`performance.now` | 11 | 0.60 | 可并行（与 13/14） | 02、04、05、30、36、38 |
| T-BG-13 | E2E `encyclopedia-graph.spec.js`（12 组断言） | 10、11 | 0.90 | 不可并行（收尾） | 03、08、11、14、16、18~21、23、26、31、34、35、37、38 |
| T-BG-14 | 人工验收（键盘/灰度/减少动效/打印/文案/Lighthouse+读屏） | 08、11 | 0.40 | 可并行（与 12/13） | 13、15、22、24、27、29、32、39 |
| T-BG-15 | 静态校验脚本 + 根 `package.json` 登记 `bg:*` | 09、12 | 0.30 | 可并行（与 16） | 10、15、17、30、34、35 |
| T-BG-16 | 发布说明、口径公告与纯前端回滚手册 | 13、14 | 0.25 | 可并行；阻塞 17 | 13、15、25 |
| T-BG-17 | 全量门禁 + 39 行签核报告 | 全部 | 0.50 | 不可并行（最后） | 36、37、38、39 |

### 1.2 关键路径与人日

**工程关键路径（单人串行）**

`T-BG-01(0.50) → T-BG-05(1.80) → T-BG-06(0.90) → T-BG-08(1.60) → T-BG-10(1.40) → T-BG-11(1.00) → T-BG-13(0.90) → T-BG-17(0.50) = 8.60 人日`

**含纯函数与组件测试的交付路径**：`8.60 + T-BG-07(0.80) + T-BG-09(0.80) = 10.20 人日`。

**次级链路**

- 埋点链：`02 → 08 → 09 → 15 → 17` = 0.35+1.60+0.80+0.30+0.50 = 3.55
- 文案链：`01 → 03 → 04 → 10` = 0.50+0.40+0.30+1.40 = 2.60
- 量测链：`11 → 12 → 15 → 17` = 1.00+0.60+0.30+0.50 = 2.40
- 发布链：`13 → 16 → 17` = 0.90+0.25+0.50 = 1.65

**并行建议**：模型流（05→06→07）、组件流（02→08→09）、页面样式流（10→11）由不同人承担时，日历下限可接近 8.60 人日；单人串行按 10.20~12.80 人日排期。

### 1.3 文件唯一主改与串行矩阵

| 文件 | 唯一主改 | 串行规则 |
|---|---|---|
| `client/src/pages/EncyclopediaPage.jsx` | **T-BG-10** | 网格/挂载/折叠/i18n/回调/打点一次改完；03/04/08/11 只提供依赖 |
| `client/src/styles/encyclopedia.css` | **T-BG-11** | 只在末尾追加；08 只输出类名契约，10 只挂类名 |
| `client/src/lib/encyclopediaGraph.js`（新） | **T-BG-05** | 06 由同一人在导出末尾追加；两人不得并行改 |
| `client/src/components/EncyclopediaKnowledgeGraph.jsx`（新） | **T-BG-08** | 09 只加测试；缺陷回流 08 |
| `client/src/i18n/zh-CN.json` / `en.json` | **T-BG-03** | 两文件同批同人；04/10 只消费 `t()` |
| `client/src/components/EncyclopediaGuide.jsx` | **T-BG-04** | 只加可选文案 props，不改结构/排序 |
| `client/src/lib/analytics.js` + `client/src/test/analytics.test.js` | **T-BG-02** | 白名单只在此扩展 |
| `client/src/lib/__tests__/encyclopediaGraph.test.js`（新） | **T-BG-07** | 22 条一次写完，不改实现 |
| `client/src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`（新） | **T-BG-09** | 16 条一次写完，不改实现 |
| `test/e2e/encyclopedia-graph.spec.js`（新） | **T-BG-13** | — |
| `scripts/bg-content-hash.mjs`（新） | **T-BG-01** | 门禁只执行不改 |
| `scripts/measure-bg-layout.mjs`（新） | **T-BG-12** | — |
| `scripts/check-bg-events.mjs`（新） + 根 `package.json` | **T-BG-15** | `bg:hash`/`bg:measure`/`bg:events` 一次登记，只增不改 |

### 1.4 里程碑

| 里程碑 | 判定 | 可对外说明 |
|---|---|---|
| M-BG1 基座就绪 | 01/02/03/04 DoD 通过 | 工作区隔离、基线留存、4 事件可入队、36 键中英齐全 |
| M-BG2 模型可测 | 05/06/07 DoD 通过 | 22 条纯函数单测全绿，同输入同输出 |
| M-BG3 图谱可交互 | 02/08/09 DoD 通过 | 五类节点四类边、键盘可达、16 条组件测试全绿 |
| M-BG4 空白达标 | 10/11/12 DoD 通过 | 1920 详情态结构空白率 0%（≤8%）、CLS ≤0.02、四断点无横向滚动 |
| M-BG5 可验收 | 13/14 DoD 通过 | 12 组 E2E + 6 项人工签核 |
| M-BG-Release | 15/16/17 DoD 通过 | 门禁命令全绿、校验 0 违规、纯前端回滚手册就位 |

---

## 2. 批次 0：前置——阶段隔离与基线

### T-BG-01 阶段隔离提交 + 改造前基线

| 项 | 内容 |
|---|---|
| 目标 | 把上一轮未提交改动按阶段隔离，并留下改造前可复算的 1920 结构空白率、CLS、行宽与全量 content 哈希基线 |
| 前置 | — |
| 涉及文件 | 新增 `scripts/bg-content-hash.mjs`（唯一主改）<br/>新增 `docs/tasks/bg-baseline.md`（唯一主改）<br/>新增 `docs/tasks/assets/bg-baseline/*.png`<br/>只读：`git status`、根 `package.json`、`test/e2e/playwright.config.js` |
| 实现要点 | ① **先隔离**：按上一轮 BK 的 A 内容资源、B 数据迁移、C 后端 API、D 前端筛选展示、E 详情反查、F SEO 与 i18n、G 埋点与计量七组提交（跨组文件按主归属）；本轮 3 份 BG 文档单独 `docs(bg): …` 提交；`test-results/` 不入库；② 哈希脚本：一次取全量已发布词条（`include=content`，缺 content 回退详情），按 id 升序拼接 `id/term/synopsis/content/category` 取 SHA-256，输出 `{total, aggregate, perId, capturedAt}`，支持 `--base-url` / `--out`；③ 基线四组合（1920×1080、1440×900 × 引导/详情）记录：`detailClientWidth`、`padding`、`articleWidth`、`blankRatio`、`scrollOverflow`、CLS、`readingChars`、`titleRect`；④ 主口径公式见 §13.1；⑤ 截图命名 `{viewport}-{guide\|detail}-before.png`；⑥ 数量以接口 total 为准，脚本不写死「43」 |
| DoD | ① `git status --short` 仅剩忽略项，`git log --oneline -10` 可见 A~G + BG 文档提交；② `node scripts/bg-content-hash.mjs …` 退出 0，`perId` 键数 = `total`，`aggregate` 为 64 位十六进制；③ 基线表四组合齐全：1920 详情态 ≈30.7%（允许 30.0~31.0），1440 详情态 0%；④ 4 张改造前截图存在且命名符合；⑤ CLS/行宽/scroll/标题位置均有实测值；⑥ 文档不把「43 条」写成实现常量 |
| 覆盖 AC | R-BG-02/25/36 → AC-BG-02、AC-BG-25、AC-BG-36 |
| 预估 | 0.50 人日 |
| 串行性 | 不可并行（必须最先执行） |
| 验证 | `git status --short`；`git log --oneline -10`；`node scripts/bg-content-hash.mjs --base-url=http://localhost:3001 --out=docs/tasks/assets/bg-baseline/content-hash-before.json`；`npx playwright screenshot --viewport-size="1920,1080" --wait-for-timeout=1500 "http://localhost:3001/encyclopedia?term=<实时取到的 id>" docs/tasks/assets/bg-baseline/1920-detail-before.png` |
| 边界 | 不改业务代码；不做图谱/布局；不修 BK 缺陷；不提交 `test-results/`；不写死数量 |

---

## 3. 批次 A：埋点与文案基座（先埋点）

### T-BG-02 `analytics.js` 白名单 +4 事件、属性键不变

| 项 | 内容 |
|---|---|
| 目标 | `graph_view` / `graph_node_click` / `graph_expand` / `graph_fallback` 可通过白名单入队，属性只用既有 12 键 |
| 前置 | T-BG-01 |
| 涉及文件 | 修改 `client/src/lib/analytics.js`（唯一主改）<br/>修改 `client/src/test/analytics.test.js` |
| 实现要点 | ① `EVENT_NAMES` 由 21 项追加 4 项（共 25），注释标「图谱」；② `ALLOWED_PROP_KEYS` **完全不动**（12 键，`entity_type`/`entity_id`/`stage`/`result_count` 已在列）；③ 旁注 `stage` 取值域 `overview/detail/expand/collapse/empty/render_error/data_missing`；④ `entity_id` 必须是去前缀的 `ref`；⑤ 测试 +5：4 事件各入队 1 次、非法键（`term`/`query`/`content`）被丢弃、12 键快照与改造前逐项相等；⑥ 不改批量 5 条/批、`sendBeacon` 时机、`OFF_KEY` |
| DoD | ① `npx vitest run src/test/analytics.test.js`（在 `client/`）全绿；② 12 键快照相等；③ `rg "graph_" client/src/lib/analytics.js` 恰 4 个事件名；④ 事件总数 25；⑤ `npm run bk:events` 仍 14/14；⑥ `npm run lint` 退出 0 |
| 覆盖 AC | R-BG-34/35/38 → AC-BG-34、AC-BG-35、AC-BG-38 |
| 预估 | 0.35 人日 |
| 串行性 | 可并行（仅 analytics + 测试）；**硬顺序：必须先于 T-BG-08** |
| 验证 | `npx vitest run src/test/analytics.test.js`（`client/`）；`npm run bk:events`；`npm run lint` |
| 边界 | 不新增属性键；不上报 `q`/正文/身份；不改既有事件语义 |

### T-BG-03 i18n 36 键路径 + 键集合单测

| 项 | 内容 |
|---|---|
| 目标 | 顶栏、导引看板、图谱面板文案全部来自中英 i18n，键集合一致、插值一致，既有键一字不动 |
| 前置 | T-BG-01 |
| 涉及文件 | 修改 `client/src/i18n/zh-CN.json`、`client/src/i18n/en.json`（唯一主改）<br/>新增 `client/src/test/i18nGraphKeys.test.js` |
| 实现要点 | ① 只在既有 `encyclopedia` 内新增 `page`(4) / `guide`(8) / `graph`(24)，不重排既有；② 键值严格按 §10 表；③ 全部单花括号：`{count}{rate}{shown}{total}{type}{label}`；④ 禁止「智能/自动/实时/全息/3D 立体/全站知识网络/跨页面关联」；⑤ 单测 3 条：中英键集合差集为空、同键占位符集合一致、既有 5 组仍存在且 `group.count` 值未改 |
| DoD | ① `npx vitest run src/test/i18nGraphKeys.test.js` 3/3；② `git diff --numstat client/src/i18n/` 删除行数均 0；③ 中英各 36 键路径逐条相同；④ 新增块双花括号出现 0；⑤ 既有 5 组 + `englishComingSoon`/`summaryInChinese` 全保留；⑥ `npm run lint` 0 |
| 覆盖 AC | R-BG-26/27/28 → AC-BG-26、AC-BG-27、AC-BG-28 |
| 预估 | 0.40 人日 |
| 串行性 | 可并行（仅 json + 新测试）；阻塞 T-BG-04、T-BG-10 |
| 验证 | `npx vitest run src/test/i18nGraphKeys.test.js`（`client/`）；`npm run lint`；`git diff --stat client/src/i18n/` |
| 边界 | 不做详情/列表字面量迁移（Q-BG-12）；不改既有 5 组；不新增顶层命名空间 |

### T-BG-04 `EncyclopediaGuide.jsx` 文案 props 化

| 项 | 内容 |
|---|---|
| 目标 | 导引看板文案可由外部传入，不传时渲染结果与改造前逐字一致 |
| 前置 | T-BG-03 |
| 涉及文件 | 修改 `client/src/components/EncyclopediaGuide.jsx`（唯一主改）<br/>新增 `client/src/components/__tests__/EncyclopediaGuide.test.jsx` |
| 实现要点 | ① 可选 props：`heading`、`hint`、`flow{pick,diagram,model}`、`foot`、`cardDesc`、`cardTitle`；② 每处 `??` 回退现有中文字面量；③ 不改卡片数量/排序/`availableKeys`/`onPick`；④ 不引入 `useI18n`；⑤ `cardDesc` 缺省回退 `从{label}开始认识古建筑`；⑥ 测试 2 条：默认逐字一致；英文 props 生效且无中文残留（类目名除外） |
| DoD | ① 2/2 通过；② 默认文本逐字断言通过；③ 英文时 `queryByText('营造导引')` 为 `null`；④ 不删 `HINTS`/`FALLBACK`；⑤ `npm run lint` 0 |
| 覆盖 AC | R-BG-26 → AC-BG-26 |
| 预估 | 0.30 人日 |
| 串行性 | 可并行（与 T-BG-05 不同文件）；阻塞 T-BG-10 |
| 验证 | `npx vitest run src/components/__tests__/EncyclopediaGuide.test.jsx`（`client/`）；`npm run lint` |
| 边界 | 不改结构/CSS；不迁其他字面量；不新增键 |

---

## 4. 批次 B：图谱纯函数

### T-BG-05 `encyclopediaGraph.js`：常量 + 构造 + 裁剪 + 统计

| 项 | 内容 |
|---|---|
| 目标 | 用不依赖 DOM 的纯函数，把「已筛选词条 + taxonomy + 选中词条」确定性构造成受预算约束的 `GraphModel` |
| 前置 | T-BG-01 |
| 涉及文件 | 新增 `client/src/lib/encyclopediaGraph.js`（唯一主改，本任务创建）<br/>只读：`client/src/lib/encyclopediaFilters.js`、设计 §4 |
| 实现要点 | ① `GRAPH_CONFIG` 单一来源：120/300/60/2/3/0.5/2.0/4/断点/宽度/74；② 导出 `nodeId`/`parseNodeId`/`isGraphNodeKind`/`isGraphEdgeKind`/`buildGraphModel`/`selectWithinBudget`/`graphStats`；③ 节点 id `${type}:${ref}`，有向边 `${from}>${to}#${kind}`、无向边两端字典序；④ 严格按设计 4.2.2 十三步构造；⑤ 过滤：无 label 不建节点、自环丢弃、同对同 kind 唯一、每词条最多 1 条 primary、边端必在最终节点集；⑥ 排序键 `[depth, typeRank, -weight, label.localeCompare('zh-CN'), id]`；⑦ overview 中心取「名筑档案」类目（缺则词条最多类目），focus 中心为选中词条；⑧ `stats` 记录裁剪前后与 `truncated`；⑨ 不 import React、不访问 `window`/`document`；⑩ JSDoc，输出无 `undefined`；⑪ `Map` 索引，禁止全表嵌套扫描 |
| DoD | ① `node -e "import('./client/src/lib/encyclopediaGraph.js').then(m=>console.log(Object.keys(m).sort().join(',')))"` 含 8 项；② 200 词条 + 20 建筑 → `shownNodes ≤ 120`、`truncated=true`；500 边 → `shownEdges ≤ 300`；③ 打乱输入两次 `JSON.stringify` 相等；④ 所有边两端均在 `nodes`；⑤ `rg "import.*react\|window\.\|document\."` 0 命中；⑥ `rg "120\|300\|0\.5\|2\.0"` 仅命中 `GRAPH_CONFIG` 定义行；⑦ `npm run lint` 0 |
| 覆盖 AC | R-BG-06/07/08/09/12/33 → AC-BG-06、07、08、09、12、33 |
| 预估 | 1.80 人日 |
| 串行性 | 不可并行（独占新文件）；阻塞 06/07/08 |
| 验证 | `node -e` 冒烟；`npm run lint`；正式断言在 T-BG-07 |
| 边界 | 不做布局（06）；不渲染；不请求；不做筛选；不加依赖；不随机 |

### T-BG-06 同文件追加：布局 / 邻接 / 夹紧 / 标签

| 项 | 内容 |
|---|---|
| 目标 | 固定逻辑坐标系下给出确定性三层环形坐标、一跳邻接与 viewBox 夹紧，保证「高亮不位移、缩放不丢图」 |
| 前置 | T-BG-05（同文件，同一人串行） |
| 涉及文件 | 修改 `client/src/lib/encyclopediaGraph.js`（在导出清单末尾追加 4 个导出） |
| 实现要点 | ① `1000×760`、圆心 `(500,380)`、`R0/R1/R2=0/190/330`；半径 14/18/12，标签 `y+20`；② 分环：building（主关联固定 -90°）→ term → category；R2 扇区 category/dynasty/region/其余；③ 角度从 -90° 均分，相邻半径交替 ×1.04/×0.96；单节点固定 -90°；④ 全程无随机、无迭代、无 DOM；⑤ `neighborIds` 仅一跳、不含自身；⑥ `clampViewBox`：`w ∈ [initial.w/ZOOM_MAX, initial.w/ZOOM_MIN]`、内容可见面积 ≥30%、越界夹紧；⑦ `splitLabel(label,6)` 最多 2 行、超出 `…`；⑧ 常量全部取自 `GRAPH_CONFIG` |
| DoD | ① 两次 `computeLayout` 逐节点 `x/y/ring/angle/radius` 完全相等；② 输出顺序与输入一致；③ `clampViewBox` 边界用例返回夹紧值且不抛错；④ A-B-C 的 `neighborIds` 为 `{B}`；⑤ `splitLabel('应县木塔斗拱',6)` ≤2 行且末行含 `…`；⑥ 无 `window`/`document`；⑦ `npm run lint` 0 |
| 覆盖 AC | R-BG-20/21 → AC-BG-20、AC-BG-21 |
| 预估 | 0.90 人日 |
| 串行性 | 不可并行（同文件同人）；阻塞 07/08 |
| 验证 | `node -e` 冒烟；`npm run lint`；正式断言在 T-BG-07 |
| 边界 | 不做力导向/自动避让/像素布局/双指缩放 |

### T-BG-07 纯函数单测 G-01~G-22（22 条）

| 项 | 内容 |
|---|---|
| 目标 | 22 条不渲染 DOM 的断言锁住构造、过滤、裁剪、确定性、布局与夹紧 |
| 前置 | T-BG-06 |
| 涉及文件 | 新增 `client/src/lib/__tests__/encyclopediaGraph.test.js`（唯一主改） |
| 实现要点 | ① 仅 vitest，不引入 testing-library；② 纯数据比对，不读 DOM；③ 按 §11.1 的 G-01~G-22 逐条；④ 数据用工厂构造，不写死真实 id；⑤ 确定性用「打乱两次 → 深比较」；⑥ 源码断言无 react/window/document；⑦ 不为通过而放宽实现契约 |
| DoD | ① `npx vitest run src/lib/__tests__/encyclopediaGraph.test.js` → `22 passed`；② 每条标题含 G 编号；③ G-07/G-08 预算断言分别 ≤120/≤300；④ G-10 两次相等、G-19 坐标相等；⑤ 实现文件 `git diff` 为空；⑥ `npm run test:client` 无新增失败 |
| 覆盖 AC | R-BG-06/07/09/12/20/21/33 → AC-BG-06、07、09、12、20、21、33 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（依赖导出冻结）；为 T-BG-17 提供模型证据 |
| 验证 | `npx vitest run src/lib/__tests__/encyclopediaGraph.test.js`（`client/`）；`npm run test:client`；`npm run lint` |
| 边界 | 不渲染；不加依赖；不改实现；不做性能断言 |

---

## 5. 批次 C：图谱组件

### T-BG-08 `EncyclopediaKnowledgeGraph.jsx` 全量实现

| 项 | 内容 |
|---|---|
| 目标 | 只读、键盘可达、可轻量缩放拖拽、可降级为列表的 SVG 图谱面板；不取数、不读写 URL |
| 前置 | T-BG-02（4 事件已入白名单）、T-BG-06 |
| 涉及文件 | 新增 `client/src/components/EncyclopediaKnowledgeGraph.jsx`（唯一主改）<br/>只读：设计 §5、`CT-BG-04` |
| 实现要点 | ① Props 按 `CT-BG-04`；组件内禁止 `navigate`/`setSearchParams`/`fetch`；② 子块 `head`/`legend`/`canvas`/`scale`/`tools`/`empty`/`fallback`/`list`/骨架；③ 双编码：节点形状+颜色（方/圆/六边/菱/三角），边线型+线宽（实/实/点划/点），只用 `--enc-*`/`--ink*`/`--vermillion`/`--radius-*`；④ 坐标来自 `computeLayout`，`useMemo` 只依赖 `model`；⑤ Pointer Events + `setPointerCapture`，位移 >4px 才拖拽，rAF 合并；缩放改 `viewBox` 并过 `clampViewBox`；滚轮仅 `focus-within` 或 Ctrl/Cmd；⑥ 高亮只切 `.is-neighbor`/`.is-dimmed`，不改 `x/y/r/transform`；⑦ 键盘：首个可聚焦为「跳至正文」，节点 `g role="button" tabindex="0" aria-label`，Enter/Space、方向键、Escape、`+/-/0`，焦点环描边 ≥2px；⑧ 空态/降级/骨架（`aria-busy`）；错误边界只包 `<aside>` 并上报 `graph_fallback`；⑨ 4 处 `track`；⑩ `mode='list'` 与 <480 不渲染 `<svg>`；⑪ 顶部注释输出类名契约清单供 T-BG-11 |
| DoD | ① jsdom 渲染 2 节点 1 边输出 `<svg viewBox="0 0 1000 760">` 与对应 `line/g`；② `rg "#[0-9A-Fa-f]{6}"` 0 命中；③ `rg "d3\|cytoscape\|echarts\|vis-network\|sigma\|getContext\('webgl'\)\|three"` 0 命中；④ `rg "navigate\|setSearchParams\|fetch\("` 0 命中；⑤ `track('graph_` 恰 4；⑥ `data-node-type`/`data-graph-ready` 存在；⑦ `npm run lint` 0；⑧ 类名契约写入注释 |
| 覆盖 AC | R-BG-07/09/10/14/18~24/29/31/32/35 → AC-BG-07、09、10、14、18~24、29、31、32、35 |
| 预估 | 1.60 人日 |
| 串行性 | 不可并行（独占新文件）；阻塞 09/10 |
| 验证 | `npm run lint`；`git diff --stat` 只新增 1 文件；正式断言在 T-BG-09 |
| 边界 | 不做布局计算；不请求/筛选；不读写 URL/localStorage；不做入场动画；不做双指缩放；不用玻璃/渐变 |

### T-BG-09 组件测试 C-01~C-16（16 条）

| 项 | 内容 |
|---|---|
| 目标 | 16 条断言锁住空态/降级/点击/键盘/aria/高亮不位移/折叠/列表/规模/复位/减少动效/埋点/依赖边界 |
| 前置 | T-BG-08 |
| 涉及文件 | 新增 `client/src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`（唯一主改） |
| 实现要点 | ① `@testing-library/react` + `jest-dom`（已装）；② `t` 用桩函数直接返回中文 fallback；③ `vi.mock('../../lib/analytics')` 断言调用参数；④ `matchMedia` 用 `vi.stubGlobal`；⑤ 按 §11.2 的 C-01~C-16 逐条；⑥ jsdom 无真实布局：只断言 `x/y` 属性与确定性；⑦ 测试不改组件源码 |
| DoD | ① `npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx` → `16 passed`；② 单条 <2s 无超时；③ 组件 `git diff` 为空；④ `npm run test:client` 无新增失败 |
| 覆盖 AC | R-BG-18~24/35 → AC-BG-18~24、AC-BG-35 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（依赖 props 冻结）；缺陷回流 T-BG-08 |
| 验证 | `npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`（`client/`）；`npm run test:client`；`npm run lint` |
| 边界 | 不做像素/截图；不为通过放宽契约；不加依赖 |

---

## 6. 批次 D：页面接线

### T-BG-10 `EncyclopediaPage.jsx` 唯一主改

| 项 | 内容 |
|---|---|
| 目标 | `/encyclopedia` 宽屏呈现「左栏筛选—正文列—图谱栏」常驻三栏，两态同网格，筛选与图谱同源，既有行为不变 |
| 前置 | T-BG-03、T-BG-04、T-BG-08 |
| 涉及文件 | 修改 `client/src/pages/EncyclopediaPage.jsx`（唯一主改） |
| 实现要点 | ① 复用既有 `filteredTerms`（已是 `useMemo`），直接传 `buildGraphModel`；② `<main class="encyclopedia-detail">` 内加 `.enc-detail-grid > .enc-detail-main`（原三态迁入）+ `aside.enc-graph-panel`；③ 档案纸加 `enc-article enc-article--fluid`，正文文本块加 `.enc-reading` 容器，正文容器加 `id="enc-article"`（不改 `renderContent`）；④ `graphCollapsed` 仅 React state；`matchMedia` 监听 5 断点，初始即取值，跨点重置默认；`mode` 推导为 `docked / collapsed / list`；⑤ 回调 `onSelectTerm=selectTerm`、`onOpenBuilding=navigate('/exhibition/'+id)`、`onApplyFilter=changeFilters`、`onClearFilters=changeFilters(清空)`；⑥ 接入 `useI18n()`，`title/subtitle/lead/back` 用 `t()`，`count←totals.published_terms`（缺则列表长度）、`rate←coverage_rate`；⑦ 页面 `try/catch` → `failed` + `graph_fallback(data_missing)`，同因每会话 1 次；下架轻提示用 `aria-live`；⑧ 性能打点仅 `DEV` 或 `?perf=1`，用 `performance.now()` 写 `window.__encGraphPerf`（§13.3）；⑨ 不动筛选/URL/`AnimatedList`/`renderContent`/分享/朗读/3D；⑩ 不新增路由与请求 |
| DoD | ① 1440/1920 两态均有 `.enc-detail-grid > .enc-detail-main` 与 `aside.enc-graph-panel`；② 两态 `gridTemplateColumns` 完全相同；③ `#enc-article` 存在；④ 筛「天坛」后 `term` 节点与列表同源；⑤ `?term=<id>` 刷新后中心节点带 `is-center`；⑥ 1920 折叠后 `.enc-detail-main` 宽度前后差 ≤1px；⑦ `rg "window\.innerWidth"` 0；⑧ `rg "43\|20 座"` 0；⑨ `npm run lint`、`npm run build`、`npm run test:client` 通过 |
| 覆盖 AC | R-BG-01/05/11/14/16/17/19/26/31/38 → AC-BG-01、05、11、14、16、17、19、26、31、38 |
| 预估 | 1.40 人日 |
| 串行性 | 不可并行（独占页面）；与 T-BG-11 串行；阻塞 11/13 |
| 验证 | `npm run lint`；`npm run build`；`npm run test:client`；`git diff --stat client/src/pages/EncyclopediaPage.jsx`；人工三态+折叠+深链+筛选联动 |
| 边界 | 不改筛选算法/`global.css`/`guards.css`/滚动归属/query/URL/浮层；**不承诺空白率数值**（由 11/12 负责） |

---

## 7. 批次 E：样式追加

### T-BG-11 `encyclopedia.css` 末尾追加

| 项 | 内容 |
|---|---|
| 目标 | 用末尾追加的独立选择器实现两列居中、行宽 60~75ch、≥1440 常驻、<900 折叠、<480 列表、打印与减少动效；无横向滚动 |
| 前置 | T-BG-10（DOM 与类名已挂） |
| 涉及文件 | 修改 `client/src/styles/encyclopedia.css`（唯一主改，**只允许末尾追加**） |
| 实现要点 | ① 变量：`--enc-detail-pad:24px`、`--enc-detail-gap:28px/20px`、`--enc-graph-w:clamp(320px,26vw,420px)`、`--enc-graph-rail-w:52px`、`--enc-reading-measure:74ch`，注释与 `GRAPH_CONFIG` 对齐；② `.enc-detail-grid`（`minmax(0,1fr)` + 图谱列）、`.enc-detail-main`（`container-type:inline-size`）、`.enc-article--fluid`、`.enc-reading`；③ `.enc-graph-panel` sticky，高度 `calc(100vh - 73px - 64px)`、`min-height:280px`，纸白底/1px 描边/`--radius-lg`；④ 内部 head/legend/canvas(1fr)/scale/tools；⑤ 双编码形状与线型；⑥ rail 52px `writing-mode:vertical-rl`，**不得 `display:none`**；⑦ 断点 1439/1283/1024/720/480；⑧ `@container (max-width:780px)` 导引 2 列；⑨ `@media print` 隐藏图谱、网格转块；⑩ `prefers-reduced-motion` 禁过渡/动画；⑪ 长文本 `overflow-wrap:anywhere`、图例 `flex-wrap:wrap`；⑫ 只用既有令牌 |
| DoD | ① `git diff --numstat client/src/styles/encyclopedia.css` 删除行数 0 且新增在末尾；② 四组合结构空白率 ≤8%（期望 0%，§13.1）；③ 320/900/1440/1920 `scrollWidth ≤ clientWidth`；④ 标题位置偏差 ≤2px、CLS ≤0.02；⑤ 1440 行宽 ∈[60,75]ch；⑥ 左栏仍 340px；⑦ 打印无图谱；⑧ 减少动效无过渡；⑨ CSS gzip 增量 ≤40KB；⑩ 无未登记 `#RRGGBB` |
| 覆盖 AC | R-BG-01~05/16/24/29/31/36 → AC-BG-01、02、03、04、05、16、24、29、31、36 |
| 预估 | 1.00 人日 |
| 串行性 | 不可并行（独占 CSS）；阻塞 12/13/14 |
| 验证 | §13.1 evaluate 公式；§13.2 四断点快照命令；`npm run build`；`git diff --numstat` |
| 边界 | 不改既有选择器（含 1040）；不改 guards；不加阴影/玻璃/渐变/大圆角；不改全站；不加品牌色 |

---

## 8. 批次 F：量测与验收

### T-BG-12 量测脚本 `scripts/measure-bg-layout.mjs`

| 项 | 内容 |
|---|---|
| 目标 | 一条命令复现四组合空白率、行宽、横向滚动、CLS、产物体积与 `performance.now` 渲染/重绘耗时 |
| 前置 | T-BG-11 |
| 涉及文件 | 新增 `scripts/measure-bg-layout.mjs`（唯一主改）<br/>产出 `test-results/bg-measure/<timestamp>.json` 与 `*.png` |
| 实现要点 | ① 复用根 `playwright`；② 参数 `--base-url`/`--viewports`/`--out`/`--baseline`；③ 详情词条从 API 实时取（有 `primary_palace_id` 且有 `related_terms`），等 `data-graph-ready="true"`；④ evaluate 按 §13.1；⑤ 行宽/CLS 按 §13.4；⑥ 性能按 §13.3 读 `window.__encGraphPerf`；⑦ 截图 `{viewport}-{state}-after.png`；⑧ `--baseline` 越界（>8%、溢出、CLS>0.02）退出 1；⑨ 体积读 `dist/assets/*` gzip 对比基线；⑩ 输出字段固定，不改源码 |
| DoD | ① `node scripts/measure-bg-layout.mjs …` 退出 0；② JSON 4 组合非 `null`，1920 详情 `blankRatio ≤ 8`；③ 两状态图谱宽 ∈[320,420]；④ `scrollOverflow=false`；⑤ `cls ≤ 0.02`；⑥ 1440 `readingChars ∈[60,75]`；⑦ 4 张截图；⑧ 两次 `blankRatio` 差 ≤0.5pp；⑨ `renderTotal`/`filterTotal` ≤200（记录中位数） |
| 覆盖 AC | R-BG-02/04/05/30/36/38 → AC-BG-02、04、05、30、36、38 |
| 预估 | 0.60 人日 |
| 串行性 | 可并行（与 13/14）；阻塞 15/17 |
| 验证 | `npm run build`；`npm run server`（另开）；`node scripts/measure-bg-layout.mjs --base-url=http://localhost:3001 --out=test-results/bg-measure`；`--baseline=docs/tasks/assets/bg-baseline/layout-baseline.json` |
| 边界 | 不引入 axe；不改页面；不做像素 diff；不测 3D/WebGL |

### T-BG-13 E2E `encyclopedia-graph.spec.js`（12 组）

| 项 | 内容 |
|---|---|
| 目标 | 端到端锁住空白消除、图谱常驻、四类节点可点、筛选双向联动、键盘可达、折叠不跳、窄屏降级、中英切换、性能、可点击率与降级 |
| 前置 | T-BG-10、T-BG-11 |
| 涉及文件 | 新增 `test/e2e/encyclopedia-graph.spec.js`（唯一主改） |
| 实现要点 | ① desktop + mobile-320 两 project；② 断言：1 空白 ≤8；2 图谱栏 320~420 两态；3 四断点无横向；4 四类节点点击（词条 `?term=`、建筑 `/exhibition/`、类目/朝代/地区筛选）；5 先筛后点口径一致；6 键盘 skip 首焦点 + Enter + 焦点环；7 折叠后 `main` 差 ≤1px；8 320 无 `svg` 有列表出口；9 中英切换；10 `?perf=1` 读 `renderTotal`/`filterTotal` ≤200（CI 波动记录实测）；11 抽 10 条词条均有 `term` 节点且 `role=button`；12 拦截详情 500 降级 + 零关联空态；13 埋点抓包含 4 事件无身份字段；③ 节点用 `data-node-type`/`aria-label`，不依赖坐标与固定 id |
| DoD | ① `npm run build` 成功；② `npm run test:e2e -- --project=desktop encyclopedia-graph.spec.js` 全绿；③ `npm run test:e2e -- --project=mobile-320 encyclopedia-graph.spec.js` 全绿；④ 每组独立 `test()` 标题可逐条对应 AC；⑤ 不依赖固定 id/坐标；⑥ 不改既有 spec；⑦ 失败产物可在 `test-results/` 定位 |
| 覆盖 AC | R-BG-03/08/11/14/16/18~21/23/26/31/34/35/37/38 → AC-BG-03、08、11、14、16、18~21、23、26、31、34、35、37、38 |
| 预估 | 0.90 人日 |
| 串行性 | 不可并行（收尾）；与 12 可并行开发；阻塞 16/17 |
| 验证 | `npm run build`；`npm run test:e2e -- --project=desktop encyclopedia-graph.spec.js`；`npm run test:e2e -- --project=mobile-320 encyclopedia-graph.spec.js`；`npm run test:e2e -- --project=desktop --list` |
| 边界 | 不加依赖；不改 `playwright.config.js` 的 webServer；不做视觉快照；不测后端 |

### T-BG-14 人工验收（6 项，不新增 axe）

| 项 | 内容 |
|---|---|
| 目标 | 完成键盘、灰度、减少动效、打印、文案、Lighthouse+读屏 6 项签核并归档 |
| 前置 | T-BG-08、T-BG-11 |
| 涉及文件 | 新增 `docs/tasks/bg-manual-checklist.md`（唯一主改）<br/>产出 `docs/tasks/assets/bg-acceptance/*.png` |
| 实现要点 | ① 键盘全流程「列表选词条 → Tab 进图谱 → 激活建筑 → Shift+Tab 回正文」；② Chrome Achromatopsia 灰度截图，核对五类节点形状与四类边线型；③ `prefers-reduced-motion: reduce` 无过渡/位移；④ `Ctrl+P` 图谱不出现、正文单列；⑤ 文案检索「智能/自动/实时/全息/3D 立体/全站知识网络/跨页面关联」0 命中；⑥ **Lighthouse Accessibility（不新增 axe）** + NVDA/VoiceOver 播报「词条：藻井」且可整体跳过；⑦ 每项记录通过/不通过 + 证据路径 + 日期 + 执行人 + 跟进编号 |
| DoD | ① 6 项结论与证据齐全；② 键盘全程可达无陷阱；③ 灰度可辨 5 类节点与 4 类边；④ Lighthouse Accessibility ≥90 且无 critical；⑤ 文案检索 0；⑥ 未通过项有跟进；⑦ `git diff package.json client/package.json` 依赖段 0 变更 |
| 覆盖 AC | R-BG-13/15/22/24/27/29/32/39 → AC-BG-13、15、22、24、27、29、32、39 |
| 预估 | 0.40 人日 |
| 串行性 | 可并行（与 12/13）；阻塞 17 |
| 验证 | 按 `docs/tasks/bg-manual-checklist.md` 逐项执行；Lighthouse 报告导出归档 |
| 边界 | 不引入 axe；不改代码修问题（缺陷回流）；不做视觉改版 |

---

## 9. 批次 G：门禁、发布与回滚

### T-BG-15 静态校验脚本 + 根 `package.json` 登记 `bg:*`

| 项 | 内容 |
|---|---|
| 目标 | 一条命令证明「4 事件、属性零新增、无图库、无 WebGL、无全站浮层、无新路由」，并登记本轮脚本入口 |
| 前置 | T-BG-09、T-BG-12 |
| 涉及文件 | 新增 `scripts/check-bg-events.mjs`（唯一主改）<br/>修改根 `package.json`（唯一主改，新增 3 个脚本） |
| 实现要点 | ① 仿 `scripts/check-bk-events.mjs` 的 PASS/FAIL 与退出码；② 校验：`graph_` 事件恰 4、`ALLOWED_PROP_KEYS` 12 键相等、`track('graph_` 4 处、两侧 `package.json` 无 d3/cytoscape/vis-network/sigma/echarts、组件无 webgl/three、`App.jsx` 无 `/encyclopedia/graph`、无 `position:fixed` 全站浮层、组件无 `dangerouslySetInnerHTML`；③ 根 `package.json` 追加 `bg:hash` / `bg:measure` / `bg:events`，只增不改；④ 脚本只用 `fs`/`path`/`url` |
| DoD | ① `node scripts/check-bg-events.mjs` 退出 0 全 PASS；② 注入 `graph_extra` 后退出 1，恢复后退出 0；③ `npm run bg:events` 可用；④ `git diff package.json` 删除 0、新增 3 行；⑤ `npm run bk:events` 14/14；⑥ `npm run lint` 0 |
| 覆盖 AC | R-BG-10/15/17/30/34/35 → AC-BG-10、15、17、30、34、35 |
| 预估 | 0.30 人日 |
| 串行性 | 可并行（与 16）；阻塞 17 |
| 验证 | `node scripts/check-bg-events.mjs`；`npm run bg:events`；`npm run bk:events`；`git diff package.json` |
| 边界 | 不做运行时抓包（13 覆盖）；不改 `bk:*`；不加依赖 |

### T-BG-16 发布说明、口径公告与纯前端回滚手册

| 项 | 内容 |
|---|---|
| 目标 | 一页看清变更范围、验收口径、纯前端回滚步骤与回滚后校验 |
| 前置 | T-BG-13、T-BG-14 |
| 涉及文件 | 新增 `docs/tasks/bg-release-notes.md`（唯一主改） |
| 实现要点 | ① 变更清单：新增 2 源文件（`encyclopediaGraph.js`、`EncyclopediaKnowledgeGraph.jsx`）+ 5 修改文件 + 测试/脚本；② 口径公告：G1、结构空白率详情区口径、1920 详情 0%、只读 + 0.5~2.0×、120/300/60、<900 折叠 <480 列表、4 事件属性零新增、无路由/接口/依赖/表；③ 回滚：`git revert` 对应提交，页面/组件/样式同进同退，**无 DB 迁移、无 SQL 回滚**；④ 回滚后校验：详情态恢复 1040 单列、无 `.enc-graph-panel`、`scrollWidth ≤ clientWidth`、深链正常、事件数回 21；⑤ 记录 6 条记录项 |
| DoD | ① 含变更/口径/回滚/校验/记录项；② 写明无迁移；③ 命令可复制；④ 口径与 §10、T-BG-12 输出一致；⑤ 临时分支 dry-run 一次并记录结果 |
| 覆盖 AC | R-BG-13/15/25 → AC-BG-13、AC-BG-15、AC-BG-25 |
| 预估 | 0.25 人日 |
| 串行性 | 可并行；阻塞 17 |
| 验证 | 临时分支按手册 revert → `npm run build` → 执行回滚校验清单 → 回工作分支 |
| 边界 | 不写后端 SQL；不承诺未实现能力；不写发布日历 |

### T-BG-17 全量门禁 + 39 行签核报告

| 项 | 内容 |
|---|---|
| 目标 | 用一次全量门禁证明「39 条需求全部有任务、有验收、有证据」 |
| 前置 | T-BG-01~16 全部完成 |
| 涉及文件 | 新增 `docs/tasks/bg-gate-report.md`（唯一主改） |
| 实现要点 | ① 依序执行 §14.1 门禁命令；② 逐条签核 §12 的 39 行（任务 → AC → 证据 → 通过/不通过）；③ 回归 9 项：抽样深链、搜索「斗拱」「屋顶」命中不减、双主轴筛选不变、`AnimatedList` 键盘、3D 联动、`ShareButton`、canonical、noindex、其他页面冒烟；④ 体积与依赖审计；⑤ 未通过项写明影响 AC、跟进任务、是否阻塞；⑥ 结论明确「可发布/有条件发布/不发布」 |
| DoD | ① §14.1 命令全部退出 0（`ci:gate` 可选，需 MySQL）；② 词条 `aggregate` 与基线一致；③ 39 行均有「通过+证据」或「不通过+跟进」；④ 回归 9 项通过；⑤ 体积/依赖入表；⑥ 结论明确 |
| 覆盖 AC | R-BG-36/37/38/39 → AC-BG-36~39（并复核 AC-BG-01~35 证据齐备） |
| 预估 | 0.50 人日 |
| 串行性 | 不可并行（最后执行） |
| 验证 | 按 §14.1 逐条执行并留存输出 |
| 边界 | 不顺手改代码；不放宽阈值；不提交 `test-results/` 大文件 |

---

## 10. 文案键值表（36 键，T-BG-03 唯一来源）

### 10.1 页面与导引（12）

| 键 | 中文 | 英文 |
|---|---|---|
| `encyclopedia.page.title` | 营造法式 | The Yingzao Fashi |
| `encyclopedia.page.subtitle` | 中国古代建筑知识百科 · 已发布 {count} 条 · 建筑覆盖 {rate}% | Ancient Chinese architecture knowledge · {count} entries · {rate}% building coverage |
| `encyclopedia.page.lead` | 按建筑、构件、朝代或地区筛选，右侧知识图谱会同步呈现它们的关联 | Filter by building, element, dynasty or region — the graph on the right shows the same relationships |
| `encyclopedia.page.back` | 返回宫城 | Back to the palace |
| `encyclopedia.guide.heading` | 营造导引 | How to start |
| `encyclopedia.guide.hint` | 从建筑或构件进入，查看对应的古建筑知识 | Enter from a building or an element to read the related knowledge |
| `encyclopedia.guide.flow.pick` | 选择条目 | Pick an entry |
| `encyclopedia.guide.flow.diagram` | 读图解 | Read the diagram |
| `encyclopedia.guide.flow.model` | 进三维 | Open in 3D |
| `encyclopedia.guide.foot` | 点击卡片进入对应分类，或从左侧列表直接选择词条 | Pick a category card, or choose an entry from the list on the left |
| `encyclopedia.guide.lead` | 先选一类构件或一座建筑，右侧图谱会展示它们的关联 | Pick an element or a building; the graph on the right shows how they connect |
| `encyclopedia.guide.cardDesc` | 类目名 → 一句描述（缺省回退 `从{label}开始认识古建筑`） | category → one-line description（fallback `Start with {label}`） |

### 10.2 图谱区（24）

| 键 | 中文 | 英文 |
|---|---|---|
| `encyclopedia.graph.title` | 知识图谱 | Knowledge graph |
| `encyclopedia.graph.hint` | 从一座建筑或一个构件出发，沿连线继续阅读 | Start from a building or an element, then follow the lines to keep reading |
| `encyclopedia.graph.legend.node.building` | 建筑 | Building |
| `encyclopedia.graph.legend.node.term` | 词条 | Entry |
| `encyclopedia.graph.legend.node.category` | 类目 | Category |
| `encyclopedia.graph.legend.node.dynasty` | 朝代 | Dynasty |
| `encyclopedia.graph.legend.node.region` | 地区 | Region |
| `encyclopedia.graph.legend.edge.primary` | 主关联 | Primary link |
| `encyclopedia.graph.legend.edge.palace` | 关联建筑 | Related building |
| `encyclopedia.graph.legend.edge.term` | 关联术语 | Related entry |
| `encyclopedia.graph.legend.edge.peer` | 同域 | Same domain |
| `encyclopedia.graph.scale` | 已展示 {shown} / 共 {total} 个节点 | Showing {shown} of {total} nodes |
| `encyclopedia.graph.collapse` | 收起图谱 | Collapse graph |
| `encyclopedia.graph.expand` | 展开图谱 | Expand graph |
| `encyclopedia.graph.reset` | 复位视图 | Reset view |
| `encyclopedia.graph.zoomIn` | 放大 | Zoom in |
| `encyclopedia.graph.zoomOut` | 缩小 | Zoom out |
| `encyclopedia.graph.listView` | 列表视图 | List view |
| `encyclopedia.graph.skip` | 跳至正文 | Skip graph and read the article |
| `encyclopedia.graph.loading` | 知识图谱加载中 | Loading the knowledge graph |
| `encyclopedia.graph.empty` | 当前筛选下暂无可展示的关联 | No related items under current filters |
| `encyclopedia.graph.fallback` | 图谱暂不可用，已切换为关联列表 | Graph unavailable; showing a related list instead |
| `encyclopedia.graph.nodeLabel` | {type}：{label} | {type}: {label} |
| `encyclopedia.graph.unavailableTarget` | 该内容已下线 | This item is no longer available |

### 10.3 既有键（不得触碰）

`encyclopedia.filter.*`、`group.*`（含 `count` 的 `{{count}}`，Q-BG-08）、`empty.*`、`coverage.*`、`knowledge.*`、`englishComingSoon`、`summaryInChinese`：全部保留，语义不改；图谱空态使用新键 `graph.empty`，不复用 `empty.*`。

---

## 11. 测试断言归属（22 + 16）

### 11.1 纯函数 G-01~G-22（全部归 **T-BG-07**）

| 用例 | 断言要点 |
|---|---|
| G-01 空输入 | `nodes:[]`、`edges:[]`、`totalNodes=0`、`mode='overview'` |
| G-02 仅 published | 池外 id 不出现 |
| G-03 失效建筑边 | `related_palaces:['ghost']` 的边丢弃，其余保留 |
| G-04 自环 | 自身不连自身，节点保留 |
| G-05 无向去重 | A↔B 仅 1 条 `term` 边 |
| G-06 主关联唯一 | `primary_palace_id=p1` + `related_palaces=[p1,p2]` → 1 primary + 1 palace |
| G-07 节点预算 | 200 词条 + 20 建筑 → `shownNodes ≤ 120`、`truncated=true` |
| G-08 边预算 | 500 边 → `shownEdges ≤ 300` |
| G-09 悬空边剔除 | 裁剪后两端均在节点集 |
| G-10 确定性 | 打乱两次 `JSON.stringify` 相等 |
| G-11 概览模式 | `mode='overview'`、`shownNodes ≤ 60`、含类目与建筑 |
| G-12 邻域模式 | 中心 depth=0，depth=1 优先保留 |
| G-13 排序兜底 | 同 label/weight/depth 时由 id 决定 |
| G-14 id 解析 | `t:caisson` 正常，`bad` 返回 `null` |
| G-15 标签兜底 | 建筑 `name` 为 null → 不生成该节点、无 id 文本 |
| G-16 邻接集合 | 仅一跳，不含二跳 |
| G-17 常量单源 | `GRAPH_CONFIG` 导出值存在且组件/CSS 同源 |
| G-18 同域上限 | 同类目 10 条 → 代表间 `peer` 边 ≤3 |
| G-19 布局确定性 | 两次坐标完全相等，中心在画布中心 |
| G-20 布局分环 | depth 0/1/2 对应三种 ring，同环半径差 ≤8% |
| G-21 viewBox 夹紧 | `w` 在 `initial.w/2.0 ~ initial.w/0.5`，可见 ≥30% |
| G-22 无 React 依赖 | 源码无 `import react`、无 `window`/`document` |

### 11.2 组件 C-01~C-16（全部归 **T-BG-09**）

| 用例 | 断言要点 |
|---|---|
| C-01 空模型 | 空态文案 + 「清除筛选」，不渲染节点层 |
| C-02 `failed=true` | 降级文案 + 关联列表，点击触发 `onSelectTerm` |
| C-03 词条节点点击 | `onSelectTerm(ref)` 一次，参数去前缀 |
| C-04 建筑节点点击 | `onOpenBuilding(ref)` |
| C-05 类目节点点击 | `onApplyFilter({category})` |
| C-06 键盘 Enter | 与点击等价 |
| C-07 Tab 顺序 | 首个可聚焦为「跳至正文」，节点依次可达 |
| C-08 aria-label | 形如 `词条：藻井` |
| C-09 高亮不位移 | 激活前后 `x/y` 不变，仅 class 变化 |
| C-10 折叠态 | 渲染折叠条，宽度类为 `enc-graph-panel--rail` |
| C-11 list 模式 | 不渲染 `<svg>`，渲染 `<ul>` |
| C-12 规模提示 | 仅 `truncated=true` 显示「已展示 N / 共 M」 |
| C-13 复位 | 缩放后点复位，`viewBox` 回初始值 |
| C-14 减少动效 | `matchMedia` 桩为 reduce 时无过渡 class |
| C-15 埋点 | 曝光/点击/折叠/降级各调用对应 `track` |
| C-16 无第三方库 | import 清单不含 d3/cytoscape/echarts |

---

## 12. R-BG-01~39 → 任务 → AC 映射表（39/39）

| 需求 | 任务 | AC | 主要证据 |
|---|---|---|---|
| R-BG-01 内容占满并居中 | 10、11 | AC-01 | 1920 量取右边缘 |
| R-BG-02 空白率 ≤8% | 01、11、12 | AC-02 | 四组合 JSON + 改造前后截图 |
| R-BG-03 四断点无横向滚动 | 11、13 | AC-03 | `scrollWidth ≤ clientWidth` |
| R-BG-04 不挤压筛选与阅读 | 11、12 | AC-04 | 左栏 340、行宽 60~75ch |
| R-BG-05 布局不跳动 | 10、11、12 | AC-05 | 位置偏差 ≤2px、CLS ≤0.02 |
| R-BG-06 节点限定五类 | 05、07 | AC-06 | G-02/G-15 |
| R-BG-07 边四类且可区分 | 05、07、08 | AC-07 | G-06 + 图例 |
| R-BG-08 只用公开接口数据 | 05、13 | AC-08 | 请求数不增 + 抓包 |
| R-BG-09 预算与裁剪可复现 | 05、07、08、09 | AC-09 | G-07/G-08 + 规模提示 |
| R-BG-10 非 WebGL、≤200ms | 08、15 | AC-10 | 源码检索 + 性能 |
| R-BG-11 与筛选上下文一致 | 10、13 | AC-11 | 筛选后天坛口径 |
| R-BG-12 无效关联忽略 | 05、07 | AC-12 | G-03 |
| R-BG-13 三方案对比留档 | 16 | AC-13 | 发布说明引用设计 2.2.1 |
| R-BG-14 ≥1440 常驻侧栏 | 10、11、13 | AC-14 | 两态均有图谱栏 |
| R-BG-15 「全局」语义唯一 | 15、16 | AC-15 | 全仓库无浮层检索 |
| R-BG-16 不遮挡正文与操作 | 10、11、13 | AC-16 | 可点击性 + 人工 |
| R-BG-17 不新增路由 | 15 | AC-17 | `App.jsx` 检索 |
| R-BG-18 节点指向真实对象 | 08、09、13 | AC-18 | C-03~C-05 + E2E |
| R-BG-19 图谱与筛选双向联动 | 10、13 | AC-19 | 先筛后点 + 先点后筛 |
| R-BG-20 邻接高亮且不位移 | 06、07、08、09 | AC-20 | G-16 + C-09 |
| R-BG-21 缩放拖拽有边界与复位 | 06、07、08、09、13 | AC-21 | G-21 + C-13 |
| R-BG-22 键盘可达 | 08、09、14 | AC-22 | C-06/C-07 + 人工走查 |
| R-BG-23 空态/降级有出口 | 08、09、13 | AC-23 | C-01/C-02 + E2E |
| R-BG-24 尊重减少动效 | 11、14 | AC-24 | C-14 + 人工 |
| R-BG-25 文案范围限呈现层 | 01、16 | AC-25 | 改造前后哈希一致 |
| R-BG-26 文案进 i18n 命名空间 | 03、04、10、13 | AC-26 | 键集合 + 中英切换 |
| R-BG-27 不承诺未实现能力 | 03、14 | AC-27 | 文案检索 0 |
| R-BG-28 既有键兼容 | 03、07 | AC-28 | 键集合单测 |
| R-BG-29 复用设计契约 | 11、14 | AC-29 | 令牌表 + 基线截图 |
| R-BG-30 不引第三方图谱库 | 15、17 | AC-30 | 依赖审计 + 体积 |
| R-BG-31 <900 折叠不遮挡 | 10、11、13 | AC-31 | 320/900 E2E |
| R-BG-32 信息双编码 | 08、11、14 | AC-32 | 灰度截图 |
| R-BG-33 只含 published | 05、07 | AC-33 | G-02 |
| R-BG-34 不采集身份 | 02、13、15 | AC-34 | 白名单 + 抓包 |
| R-BG-35 仅四个新增事件 | 02、08、09、15 | AC-35 | 白名单 + 4 调用点 |
| R-BG-36 空白可度量 | 01、11、12、17 | AC-36 | 四组合量测 + 截图 |
| R-BG-37 可见性与可点击率 | 13 | AC-37 | 抽 10 条词条 |
| R-BG-38 转化与性能可度量 | 10、12、13 | AC-38 | `performance.now` + 埋点 |
| R-BG-39 无障碍与回归 | 14、17 | AC-39 | Lighthouse + 人工 + 回归 |

> 覆盖结论：39 条需求全部映射到至少一个任务与 AC；AC-BG-13/15/27/32/36 为人工/评审签核项，须在 `bg-manual-checklist.md` 与 `bg-gate-report.md` 中留痕。

---

## 13. 可测 DoD：公式与命令

### 13.1 结构空白率（浏览器 Console / Playwright `page.evaluate`）

**主口径公式**

```text
结构空白率 = 1 − (正文卡片宽 + gap + 图谱栏宽) / 内容盒宽
内容盒宽   = 详情区 clientWidth − 左 padding − 右 padding
```

**可复制片段（详情态打开且图谱节点已渲染、非骨架后执行）**

```js
(() => {
  const d = document.querySelector('.encyclopedia-detail');
  const g = document.querySelector('.enc-detail-grid');
  const m = document.querySelector('.enc-detail-main');
  const p = document.querySelector('.enc-graph-panel');
  if (!d || !m) return { error: 'missing .enc-detail-grid/.enc-detail-main' };
  const cs = getComputedStyle(d);
  const contentBox = d.clientWidth
    - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const mainW = m.getBoundingClientRect().width;
  const panelW = p ? p.getBoundingClientRect().width : 0;
  const gap = parseFloat(getComputedStyle(g).columnGap) || 0;
  const covered = mainW + (panelW > 0 ? gap + panelW : 0);
  return {
    contentBox: +contentBox.toFixed(2),
    mainW: +mainW.toFixed(2),
    panelW: +panelW.toFixed(2),
    gap,
    blankRatio: +((1 - covered / contentBox) * 100).toFixed(1), // 验收 ≤8
    scrollOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
})()
```

判定：四组合（1440/1920 × 引导/详情）均 ≤8%；期望 1920 详情为 0.0%；两次测量差 ≤0.5pp。1920 档案纸内约 250px 对称留白属于页边距，**不计入**该口径（CF-BG-02）。

### 13.2 四断点快照命令（320/900/1440/1920）

先 `npm run build`，再另开 `npm run server`（默认 3001）；`<id>` 从接口实时取（`/api/encyclopedia?page_size=1`），不写死。

```bash
npx playwright screenshot --viewport-size="320,568"  --wait-for-timeout=1500 "http://localhost:3001/encyclopedia" docs/tasks/assets/bg-acceptance/320.png
npx playwright screenshot --viewport-size="900,900"  --wait-for-timeout=1500 "http://localhost:3001/encyclopedia" docs/tasks/assets/bg-acceptance/900.png
npx playwright screenshot --viewport-size="1440,900" --wait-for-timeout=1500 "http://localhost:3001/encyclopedia?term=<id>" docs/tasks/assets/bg-acceptance/1440-detail.png
npx playwright screenshot --viewport-size="1920,1080" --wait-for-timeout=1500 "http://localhost:3001/encyclopedia?term=<id>" docs/tasks/assets/bg-acceptance/1920-detail.png
```

判定：四张图对应断点布局可用；另在每张页面执行 13.1 片段，`scrollOverflow=false`。

### 13.3 性能：`performance.now` 测量（≤200ms）

```js
// 仅 import.meta.env.DEV 或 URL 含 ?perf=1 时启用；生产不写全局
const t0 = performance.now();
const model = buildGraphModel({ terms, taxonomy, filters, selectedTermId, selectedTerm });
const layout = computeLayout(model.nodes, model.edges, { width: 1000, height: 760 });
requestAnimationFrame(() => requestAnimationFrame(() => {
  const renderTotal = performance.now() - t0;         // 首帧：≤200
  window.__encGraphPerf = {
    renderTotal: +renderTotal.toFixed(1),
    filterTotal: +(window.__encFilterStart ? performance.now() - window.__encFilterStart : 0).toFixed(1),
    nodes: model.stats.shownNodes,
    edges: model.stats.shownEdges,
    at: Date.now(),
  };
}));
// 筛选重绘：在 changeFilters 前 window.__encFilterStart = performance.now()，paint 后同上计算
```

复测 5 次取中位数；超 200ms 用 Performance 面板拆「构造 / 布局 / React 提交 / 绘制」定位。

### 13.4 行宽（ch）与 CLS

```js
// 行宽：目标段落宽度 / 单字符宽，验收 60~75ch（1440 详情态）
(() => {
  const el = document.querySelector('.enc-reading')
    || document.querySelector('.encyclopedia-article-content p');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  probe.textContent = '0'.repeat(100);
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
  document.body.appendChild(probe);
  const ch = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return { chars: +(el.getBoundingClientRect().width / ch).toFixed(1) };
})()
```

```js
// CLS：页面稳定后采集 3s，验收 ≤0.02
new Promise((resolve) => {
  let cls = 0;
  const obs = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
  });
  obs.observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => { obs.disconnect(); resolve(+cls.toFixed(4)); }, 3000);
})
```

---

## 14. 发布门禁与回滚

### 14.1 门禁命令集合（实际可执行，按序）

| 序 | 命令 | 前置/说明 |
|---|---|---|
| 1 | `npm run lint` | 新增文件零告警 |
| 2 | `npm run test:client` | 全部前端（含 22 + 16 条新增） |
| 3 | `npm run db:test:init && npm run test:server` | 需 MySQL `ac4_test` |
| 4 | `npm run build` | E2E 与体积基线的前置 |
| 5 | `npm run bk:events` | 既有 14 项不破坏 |
| 6 | `npm run bg:events` | **T-BG-15 完成后可用** |
| 7 | `npm run bg:measure`（或 `node scripts/measure-bg-layout.mjs --baseline=…`） | 四组合空白率/CLS/行宽/体积/性能 |
| 8 | `npm run test:e2e -- --project=desktop encyclopedia-graph.spec.js` | 需 `ac4_test` + `dist` |
| 9 | `npm run test:e2e -- --project=mobile-320 encyclopedia-graph.spec.js` | 320 断点 |
| 10 | `npm run ci:gate`（可选） | 根脚本已存在；含 lint/test/test:contract/schema:diff/test:e2e，**不含 build**，需 MySQL；不单独作为门禁 |

判定：1~9 全部退出码 0；第 7 条输出 `blankRatio ≤8`、`cls ≤0.02`、`readingChars ∈[60,75]`、`renderTotal/filterTotal ≤200`；第 6 条 0 违规；词条 `aggregate` 与 T-BG-01 基线一致。

### 14.2 回滚（纯前端 revert，无迁移）

| 项 | 内容 |
|---|---|
| 迁移 | **无**：本轮不改表、不写数据，无 SQL 回滚 |
| 方式 | 按任务对应提交 `git revert`；页面/组件/样式三者**同进同退** |
| 不采用的替代 | 不做「局部关停开关」（会留下两列网格套单列内容的半残状态） |
| 回滚后校验 | 详情态恢复 1040 单列；无 `.enc-graph-panel`；`scrollWidth ≤ clientWidth`；`?term=` 深链正常；`EVENT_NAMES` 回 21；`npm run build` 成功 |
| 记录 | 在 `bg-release-notes.md` 写明步骤、命令与 dry-run 结果 |

---

## 15. 记录项与文档收尾

本轮**待确认项 = 0**；以下 6 条仅为记录项，不阻塞开工，也不在编码中扩大范围：

1. **CF-BG-01**：无障碍验证不新增 axe，用 Lighthouse Accessibility + 人工键盘/读屏。
2. **CF-BG-02**：1920 档案纸内约 250px 对称留白视为页边距，接受；结构空白率按 0% 验收。
3. **CF-BG-03**：900 断点按设计，≤1024 沿用纵向 + 图谱折叠条/全宽展开，不做并排双列。
4. **Q-BG-08**：既有 `group.count` 的 `{{count}}` 不改，仅记录。
5. **Q-BG-11**：同域边固定显示，本轮不做开关。
6. **Q-BG-12**：详情区内部与列表区既有中文字面量本轮不迁移。

> 本文件只做任务规划，**不授权编码**。人工确认任务清单后，由「任务执行」阶段按 T-BG-01~17 顺序实施；确认前不新建/修改任何业务源文件。