# 华夏古建可视化 · 「营造法式」3D 悬浮卡片选择与知识图谱 3D 立体旋转 编码任务规划（tasks）

| 项 | 内容 |
|---|---|
| 文档编号 | TASKS-PUBLIC-CARD-001 |
| 版本 | v1.0（初版） |
| 状态 | 待评审（等待人工确认后方可进入编码；本文件不授权编码） |
| 上游需求 | `docs/requirements/encyclopedia-3d-card-ui-spec.md`（REQ-PUBLIC-CARD-001，v1.1，R-CARD-01~65 / AC-CARD-01~65） |
| 上游设计 | `docs/design/encyclopedia-3d-card-ui-design.md`（DESIGN-PUBLIC-CARD-001，13 章 + ADR-01~16） |
| 格式与门禁参考 | `docs/tasks/encyclopedia-knowledge-graph-tasks.md`（TASKS-PUBLIC-BG-001，文件边界与 `bg:*` 门禁）<br/>`docs/tasks/building-knowledge-enrichment-tasks.md`（TASKS-PUBLIC-BK-001，任务卡字段） |
| 任务范围 | `/encyclopedia` 单页：依赖与图标适配、卡片纯函数与 `CardSwap` 自研组件、3D 图谱纯函数与 `Graph3DScene`、页面接线、样式末尾追加、6 个新埋点、测试/E2E/性能量测、门禁与纯前端回滚 |
| 关联代码库 | `D:\Ancient-architecture\ac1.1\acvisual 4`（分支：建筑模型的功能修改） |
| 技术栈 | React 19 + Vite（vitest 4.1.12 + jsdom + @testing-library/react）+ framer-motion（既有）；Express + MySQL（**本轮零改动**） |
| 业务代码改动 | **无**（本阶段只输出任务规划，不新建/修改任何业务源文件） |
| 编号兼容 | 任务 `T-CARD-01~24`；红线 `RED-CARD-01~14`；不与 `T-BG-*`、`T-BK-*`、`T-S3P2-*` 冲突 |

> 本文档回答「按什么顺序改、改哪些文件、做到什么程度、如何验收」。命令均已在当前仓库核实（§0.5），未核实项显式标注，不虚构脚本。
> **口径声明（全篇生效）**：词条数、建筑数一律取接口实时值；文中出现的「43 条」「20 座」「10 条建筑专属」仅为当前快照基线，**不是实现常量**。

---

## 0. 阅读指引与全局约定

### 0.1 批次、任务数与人日（8 批次 / 24 任务 / 15.70 人日）

| 批次 | 名称 | 任务 | 任务数 | 人日 |
|---|---|---|---|---|
| A | 基座与依赖（门禁断言先改、hugeicons、纯函数、文案、埋点名） | T-CARD-01~06 | 6 | 2.35 |
| B | CardSwap 组件与测试 | T-CARD-07~08 | 2 | 1.80 |
| C | 3D 图谱纯函数、组件与测试 | T-CARD-09~12 | 4 | 3.50 |
| D | 页面接线与图谱形态分支 | T-CARD-13~14 | 2 | 2.30 |
| E | 样式末尾追加（卡片 / 3D / 断点 / 打印 / 减效） | T-CARD-15~16 | 2 | 1.60 |
| F | 埋点调用点与门禁脚本 | T-CARD-17~18 | 2 | 0.85 |
| G | E2E、既有回归、性能量测 | T-CARD-19~21 | 3 | 2.10 |
| H | 人工验收、发布回滚、全量门禁 | T-CARD-22~24 | 3 | 1.20 |
| **合计** | | | **24** | **15.70** |

> 15.70 人日含单测、自检与量测，不含等待评审/签核的日历时间。

### 0.2 任务卡字段定义（沿用项目既有格式）

| 字段 | 含义 |
|---|---|
| 目标 | 一句话可观察结果 |
| 前置 | 未满足不得开工（任务编号或外部条件） |
| 涉及文件 | 新增（标「新增」）/ 修改（标「修改」），精确到现有路径 |
| 实现要点 | 实现级约束，不含完整代码 |
| DoD | 可判定的完成标准，每条可用命令或操作验证 |
| 覆盖 AC | `R-CARD-xx` → `AC-CARD-xx` 追溯 |
| 预估 | 人日（0.05 步进，含单测） |
| 串行性 | 可并行 / 不可并行及阻塞关系 |
| 验证 | 可复制执行的命令或手工步骤 |
| 边界 | 防止顺手重构 |

### 0.3 通用 DoD（每条任务默认叠加）

1. `npm run lint` 退出码 0；新增/修改文件零新增告警（既有 `client/public/draco/*` 告警不计）。
2. 不改 `client/src/styles/global.css`、`guards.css`、`client/src/App.jsx`、`client/src/api.js`、`server/**`、`server/db/**`。
3. 新增前端测试放 `client/src/**/__tests__/*.test.js(x)` 或 `client/src/**/__tests__/*.test.jsx`，由 vitest（`client/vite.config.js` 的 include）自动发现；新增 `scripts/*.mjs` 与根脚本入口由 T-CARD-18 统一登记，不重复登记。
4. 新增样式**只追加到 `client/src/styles/encyclopedia.css` 文件末尾**，新起 `.enc-deck-* / .enc-card-* / .enc-graph3d-*` 选择器；不改写任何既有选择器文本。
5. 不新增路由、不新增 URL 参数、不新增数据表/后端接口；`?term=<id>` 与既有 6 个筛选参数形态不变。
6. 新增文案全部进 `encyclopedia.card.*`（22 键）与 `encyclopedia.graph3d.*`（12 键），中英同批，插值一律单花括号；JSX 内不新增中文字面量。
7. 既有 `encyclopedia.page/guide/graph` 键一个不删、语义不改。
8. 新增交互继承 `prefers-reduced-motion: reduce` 归零；文字对比度 ≥4.5:1、描边/焦点环 ≥3:1。
9. 不改写任何词条 `term/synopsis/content/category`；不新增 `UPDATE encyclopedia_terms`。
10. 除 Q-CARD-04 允许的 2 个 hugeicons 包外，`client/package.json` / 根 `package.json` 的 `dependencies` **零新增**。

### 0.4 全局红线（任一违反即任务失败）

| 编号 | 红线 | 来源 |
|---|---|---|
| RED-CARD-01 | 卡片与图谱只用 CSS 3D；禁 WebGL / Three.js / Canvas / `getContext(`；禁 gsap / react-spring / d3 / cytoscape / echarts / swiper / embla | R-CARD-06/46/65、ADR-01 |
| RED-CARD-02 | 不新增路由（含 `/encyclopedia/card`）；`App.jsx` 零改动 | R-CARD-42/64 |
| RED-CARD-03 | `global.css` / `guards.css` 一行不改；`encyclopedia.css` 只允许末尾追加、不改既有行 | R-CARD-23/65、DFX-CARD-C3/C5 |
| RED-CARD-04 | 不新增后端接口、不改数据库、不做数据迁移；`server/**` 零改动 | R-CARD-03、OOS-CARD-05/06 |
| RED-CARD-05 | 埋点只新增 6 个事件（3 卡片 + 3 旋转）、**属性键零新增**（12 键）；不上报角度/帧率/设备/身份/正文 | R-CARD-39/40/63 |
| RED-CARD-06 | 轮播索引/拖拽偏移/视角/缩放/开关一律只存 React 状态；不入 URL、不入 localStorage/sessionStorage | R-CARD-27/62、RED-BG-11 |
| RED-CARD-07 | 不改 `computeLayout` / `buildGraphModel` / `selectWithinBudget` 的排序、环归属、邻接、裁剪与签名；3D 只增加 z 与视角 | R-CARD-47 |
| RED-CARD-08 | 不改写既有 `.enc-graph-*` 规则文本与 2D SVG 渲染路径；2D 必须作为降级与回滚路径持续可用 | R-CARD-64、DFX-CARD-C4 |
| RED-CARD-09 | hugeicons 精确版本、仅 client 依赖、具名按需导入 ≤6 个、仅用于卡片区与 3D 新增控件；既有 `fas fa-*` 一个不动 | R-CARD-18/19 |
| RED-CARD-10 | 文档、代码、文案、断言不得把词条/建筑数量写成固定事实 | DFX-BG-M2 |
| RED-CARD-11 | 禁渐变、`backdrop-filter` 玻璃、大圆角、大阴影（不透明度 >0.08 或模糊 >12px）；虚线用 `border-style` 不用渐变 | R-CARD-36/60 |
| RED-CARD-12 | 不渲染 `id`/`status`/审核字段/`primary_palace_id`；标题摘要按纯文本转义 | R-CARD-02、DFX-CARD-S2 |
| RED-CARD-13 | 减效时自动轮播、自动旋转、透视位移、视差、回弹、缩放缓动全部关闭；卡片/节点/边/出口数量不减 | R-CARD-34/57、DFX-CARD-A4/A8 |
| RED-CARD-14 | 两处 3D 的横向手势按区域划界（卡片区切卡、图谱区转视角）；纵向一律交还页面滚动 | R-CARD-55、ADR-07 |

### 0.5 命令核实（本次实测/仓库核对）

| 命令 | 核实结果 | 用法 |
|---|---|---|
| `npm run test:client` | 根脚本存在（→ `client` 的 `vitest run`） | 前端全量 |
| `npx vitest run <file>`（在 `client/` 目录） | vitest include `src/**/*.{test,spec}.{js,jsx}` | 单文件/单组前端测试 |
| `npm run test:e2e -- --project=desktop <spec>` | 根脚本存在（playwright，projects：`desktop` / `mobile-320` / `no-webgl`）；**E2E 前须先 `npm run build`** | E2E |
| `npm run lint` | 根脚本存在（→ `client` oxlint） | 静态检查 |
| `npm run build` | 根脚本存在（→ `client` vite build） | 构建与包体基线 |
| `npm run bg:events` | 根脚本存在（`scripts/check-bg-events.mjs`） | 既有图谱门禁回归 |
| `npm run bg:measure` | 根脚本存在（`scripts/measure-bg-layout.mjs`） | 既有布局量测回归 |
| `npm run enc3d:events` | **不存在**，由 T-CARD-18 登记 | 新门禁 |
| `npm run enc3d:measure` | **不存在**，由 T-CARD-18 登记 | 新量测 |
| `npm run ci:gate` | 根脚本存在，但含 `test:server`/`schema:diff`（需 MySQL） | 仅作可选补充，**不作为本文件唯一门禁** |

### 0.6 已采用默认口径与设计差异

| 编号 | 口径 | 落地任务 | 备注 |
|---|---|---|---|
| Q-CARD-09 | 不引 WebGL/Three，CSS 3D 合成 | 09/11/16 | 书面说明 `OOS-BG-02`/`R-BG-10` 不含 CSS 3D（R-CARD-47） |
| Q-CARD-10 | wide/medium 并存；compact 及以下折叠/切换 | 13/14/16 | 不改既有 `order:-1`（OQ-04） |
| Q-CARD-11 | 桌面自动旋转开（8°/s）、触屏关；可暂停/关闭/记忆 | 09/11/17 | 记忆仅页面内内存 |
| Q-CARD-12 | 俯仰 -30~+30，默认 -8；方位默认 -18 | 09/11 | 常量单源 `GRAPH_3D_CONFIG` |
| Q-CARD-13 | ≥1284 完整 3D；1025~1283 静态 2.5D；≤1024 回退 2D；≤480 列表 | 03/14/16 | `FORM` 映射与 `GRAPH_CONFIG.BREAKPOINTS` 键集合一致 |
| Q-CARD-14 | 背向 >60° 隐藏视觉文字、保留 aria-label | 11/12/16 | 用 `opacity` 不 `display:none` |
| OQ-01 | 禁 sessionStorage，页面内记忆 | 07/11 | — |
| OQ-02 | `entity_type:'graph'` 可接受（取值扩展，非新增键） | 17 | 若审核否决，改用 `entity_type:'category'` |
| OQ-03 | **选卡后焦点移入正文标题** | 13 | ⚠ 与设计 §13.2 暂定「留在卡片」不同；本文件以用户口径为准，建议回填设计/需求 |
| OQ-04 | compact 折叠条保持既有 `order:-1` | 13/16 | 不改既有布局声明 |
| OQ-05 | 默认不使用图片，`imagePath` 仅在有本地授权资源时填充 | 03/15 | 占位不裂图、尺寸不变 |
| OQ-06 | 旋转期默认不降采样，不达标再启用（仅主关联+邻接 ≤60） | 21 | 需在量测报告中记录是否启用 |
| OQ-08 | hugeicons 锁版本并确认 MIT/Free 商用条款 | 02 | 版本以安装当日为准，不预填虚构版本号 |

### 0.7 冲突文件唯一主改矩阵

| 文件 | 唯一主改 | 串行规则 |
|---|---|---|
| `client/src/pages/EncyclopediaPage.jsx` | **T-CARD-13** | 引导态接卡组、详情态返回、选中态/URL、焦点管理、回滚开关一次改完；其余任务只提供依赖 |
| `client/src/components/EncyclopediaKnowledgeGraph.jsx` | **T-CARD-14** | 只加形态分支与工具条；2D 路径零改动 |
| `client/src/styles/encyclopedia.css` | **T-CARD-15（卡片段）+ T-CARD-16（3D 段）** | 同一人先后两段追加；两人不得并行改 |
| `client/src/lib/analytics.js` | **T-CARD-06** | `EVENT_NAMES` 只在此追加 6 项；键不动 |
| `client/src/i18n/zh-CN.json` / `en.json` | **T-CARD-05** | 两文件同批同人 |
| `scripts/check-bg-events.mjs` | **T-CARD-01** | 一处断言 4→7；与 T-CARD-06 同提交合入 |
| `client/package.json` / `client/package-lock.json` | **T-CARD-02** | 只加 2 个 hugeicons，精确版本 |
| 根 `package.json` | **T-CARD-18** | 只追加 `enc3d:events` / `enc3d:measure` 两行 |
| `client/src/lib/encyclopediaGraph.js` | **T-CARD-09** | 只在末尾追加 `GRAPH_3D_CONFIG` 与 3D 纯函数 |
| `client/src/components/CardSwap.jsx` / `CardIcon.jsx` / `lib/encyclopediaCards.js` / `lib/encyclopediaGestures.js` / `lib/raf.js` / `components/Graph3DScene.jsx` / `components/Graph3DControls.jsx` | 各新文件对应任务（02/03/04/07/11） | 新增文件互不重叠 |
| `client/src/lib/__tests__/encyclopediaCards.test.js` / `encyclopediaGraph3d.test.js` / `encyclopediaGestures.test.js` / `components/__tests__/CardSwap.test.jsx` / `Graph3DScene.test.jsx` | 03/04/08/10/12 | 测试只读实现，缺陷回流实现任务 |
| `test/e2e/encyclopedia-3d-card.spec.js` | **T-CARD-19（卡片组）+ T-CARD-20（图谱）** | 同一 spec 文件两段，按任务顺序追加 |
| `scripts/check-card-events.mjs` | **T-CARD-06（建立）+ T-CARD-18（补全）** | 同文件串行 |
| `scripts/measure-enc-3d.mjs` | **T-CARD-21** | 新增 |

---

## 1. 任务总览

### 1.1 任务清单总表

| 编号 | 任务名称 | 前置 | 人日 | 串行性 | 覆盖 AC |
|---|---|---|---|---|---|
| T-CARD-01 | `check-bg-events.mjs` 图谱事件断言 4→7（与 06 同提交） | — | 0.15 | 与 06 同提交；阻塞 18 | 46、63、65 |
| T-CARD-02 | 安装 hugeicons（精确版本）+ `CardIcon.jsx` 双路径适配 | 01 | 0.30 | 可并行（仅依赖/新文件） | 18、19、20、21 |
| T-CARD-03 | `encyclopediaCards.js`：`CARDS_CONFIG` + 6 纯函数 + 18 单测 | 01 | 0.90 | 不可并行（独占新文件）；阻塞 07/13 | 01~05、07、14、28、37 |
| T-CARD-04 | `encyclopediaGestures.js` + `raf.js` + 6 单测 | 01 | 0.30 | 可并行（新文件） | 09、30、50 |
| T-CARD-05 | i18n 34 键（22 card + 12 graph3d）+ 键集合单测 | 01 | 0.35 | 可并行；阻塞 07/11/13/14 | 33、38、56、57 |
| T-CARD-06 | `analytics.js` +6 事件（键不变）+ `check-card-events.mjs` 建立 | 01 | 0.35 | 硬顺序：先于 07/11 的 track 调用 | 39、40、63 |
| T-CARD-07 | `CardSwap.jsx`：卡组/`Card`/错误边界/15 参数/手势/轮播/键盘/降级 | 02、03、04、05、06 | 1.00 | 不可并行（独占新文件）；阻塞 08/13 | 06~17、24、30~35、37、38 |
| T-CARD-08 | `CardSwap.test.jsx` 20 条组件测试 | 07 | 0.80 | 不可并行（缺陷回流 07） | 07~17、24、30~35 |
| T-CARD-09 | `encyclopediaGraph.js` 末尾追加 `GRAPH_3D_CONFIG` + 7 个 3D 纯函数 | 01 | 0.80 | 不可并行（同文件追加）；阻塞 10/11 | 46~48、51、59、65 |
| T-CARD-10 | `encyclopediaGraph3d.test.js` 20 条纯函数单测（含 2D 回归） | 09 | 0.70 | 不可并行（依赖冻结） | 45、47、48、53 |
| T-CARD-11 | `Graph3DScene.jsx` + `Graph3DControls.jsx`（分层 DOM/旋转/拖拽/缩放/复位/键盘/背向） | 04、05、09、10 | 1.30 | 不可并行（独占新文件）；阻塞 12/14 | 45~54、56、57、59 |
| T-CARD-12 | `Graph3DScene.test.jsx` 16 条 + 既有图谱组件测试扩展 8 条 | 11 | 0.70 | 不可并行（缺陷回流 11） | 45~54、56、57 |
| T-CARD-13 | `EncyclopediaPage.jsx` 唯一主改：卡片区/详情返回/选中态与 URL/焦点/回滚开关 | 05、07、08、14 | 1.40 | 不可并行（独占页面）；阻塞 15/19/20 | 10~12、22~27、42~44、55、62、64 |
| T-CARD-14 | `EncyclopediaKnowledgeGraph.jsx` 形态分支（3D/2.5D/2D/list）+ 工具条 + 回退 | 11、12 | 0.90 | 不可并行（独占组件）；阻塞 13 | 45、52~58、61、62 |
| T-CARD-15 | `encyclopedia.css` 末尾追加卡片样式 + 高度占比 + 焦点环 | 13 | 0.80 | 不可并行（独占 CSS 段）；阻塞 16 | 15、29~31、36~38、43、60 |
| T-CARD-16 | 同文件追加 3D 图谱样式 + 断点/打印/减效块 | 15、14 | 0.80 | 不可并行（同人串行）；阻塞 20/21 | 28、34、36、54、57、58、60、61、64 |
| T-CARD-17 | 埋点调用点收口（3 卡片 + 3 旋转，节流与去重） | 07、11、14 | 0.45 | 可并行（与 15/16 不同文件） | 09、39~41、49、63 |
| T-CARD-18 | 根 `package.json` 登记 `enc3d:*` + `check-card-events.mjs` 补全 | 06、17 | 0.40 | 不可并行（独占根 package.json） | 18、46、63、65 |
| T-CARD-19 | E2E `encyclopedia-3d-card.spec.js` 卡片组（E-01~05、09~13） | 13、15、16 | 0.70 | 收尾；阻塞 24 | 01~12、24~31、42~43、55 |
| T-CARD-20 | E2E 图谱 3D（E-06~08、14）+ 既有 `encyclopedia-graph.spec.js` 回归 | 14、16、19 | 0.70 | 不可并行（同 spec 文件） | 22、45~64 |
| T-CARD-21 | `measure-enc-3d.mjs` 六断点/首帧/fps/CLS/包体量测 | 16、18 | 0.70 | 可并行（与 19/20） | 16、29、41、59、61 |
| T-CARD-22 | 人工验收 14 项签核（键盘/读屏/触屏/减效/打印/灰度/边界） | 19、20 | 0.40 | 可并行（与 21） | 08、09、20、30、32~35、38、47、54、56~58 |
| T-CARD-23 | 发布说明、口径公告与纯前端回滚手册 | 21、22 | 0.30 | 可并行；阻塞 24 | 21、44、64、65 |
| T-CARD-24 | 全量门禁 + 65 行签核报告 | 全部 | 0.50 | 不可并行（最后） | 全部 65 |

### 1.2 关键路径与人日

**单人串行总量**：15.70 人日。

**工程关键路径（双人并行）**

`T-CARD-01(0.15) → T-CARD-09(0.80) → T-CARD-10(0.70) → T-CARD-11(1.30) → T-CARD-14(0.90) → T-CARD-13(1.40) → T-CARD-16(0.80) → T-CARD-19(0.70) → T-CARD-24(0.50) = 7.25 人日`

**次级链路**

- 卡片链：`01 → 03 → 07 → 08 → 13` = 0.15+0.90+1.00+0.80+1.40 = 4.25（小于主链）
- 依赖链：`01 → 02 → 07` = 1.45
- 文案链：`01 → 05 → 07` = 1.50
- 图谱测试链：`09 → 10 → 11 → 12 → 14` = 4.40
- 量测链：`16 → 18 → 21 → 23 → 24` = 0.80+0.40+0.70+0.30+0.50 = 2.70

**并行建议**：卡片流（03→07→08→15）与图谱流（09→10→11→12→14→16）由两人承担时，日历下限接近 7.25 人日；单人串行按 15.70 人日排期。

### 1.3 里程碑

| 里程碑 | 判定 | 可对外说明 |
|---|---|---|
| M-CARD1 基座就绪 | 01~06 DoD 通过 | 门禁断言 7、hugeicons 锁定、纯函数夹紧可测、34 键中英齐全、6 事件可入队 |
| M-CARD2 卡片可交互 | 07/08 DoD 通过 | 两种用法、15 参数生效、键盘/拖拽/轮播可用、20 条组件测试全绿 |
| M-CARD3 3D 图谱可交互 | 09~12 DoD 通过 | CSS 3D 分层、旋转/拖拽/缩放/复位、文字不镜像、20+16 条测试全绿 |
| M-CARD4 页面就位 | 13~16 DoD 通过 | 卡片区替代导引主位、卡片与图谱并存、六断点无横向滚动 |
| M-CARD5 可计量可验收 | 17~22 DoD 通过 | 6 事件 0 新键、E2E 全绿、四项性能达标、14 项人工签核 |
| M-CARD-Release | 23/24 DoD 通过 | 门禁全绿、纯前端回滚手册就位、65 行签核报告 |

---

## 2. 批次 A：基座与依赖

### T-CARD-01 `check-bg-events.mjs` 图谱事件断言 4→7

| 项 | 内容 |
|---|---|
| 目标 | 门禁脚本从「图谱事件恰 4 个 / 组件内 `track('graph_*)` 恰 4 处」改为「7 个事件与登记一致 / 跨 2 文件合计 7 处」，新增 3 个旋转事件后 CI 不再误红 |
| 前置 | — |
| 涉及文件 | 修改 `scripts/check-bg-events.mjs`（唯一主改） |
| 实现要点 | ① `GRAPH_EVENTS` 扩为 7 项：`graph_view/graph_node_click/graph_expand/graph_fallback/graph_rotate/graph_drag/graph_reset`；② 断言名与判据由 `length === 4` 改为 `length === 7 && GRAPH_EVENTS.every(includes)`，**保留**既有 4 基础事件（用 `includes`，不删除）；③ `track('graph_*)` 计数改为 `EncyclopediaKnowledgeGraph.jsx` + `Graph3DScene.jsx`（`FILES.graph3d` 新增）合计 7；④ 12 键、禁库、无 WebGL/three、无新路由、无全站 fixed、无 `innerHTML`、无 `window.innerWidth` 断言全部原样；⑤ 文件头注释由「4 事件」改为「7 事件」 |
| DoD | ① `node scripts/check-bg-events.mjs` 退出 0（与 T-CARD-06 同提交后）；② 脚本对 7 个事件名逐项列出，缺任一项 FAIL；③ `npm run bg:events` 退出 0、项数由 12 变 12（不减少）；④ `git diff scripts/check-bg-events.mjs` 只出现事件清单、断言判据、FILES 与注释四处 |
| 覆盖 AC | R-CARD-46/63/65 → AC-CARD-46、AC-CARD-63、AC-CARD-65 |
| 预估 | 0.15 人日 |
| 串行性 | 必须先写脚本；**与 T-CARD-06 同一提交合入**（否则单独合入会因事件未登记而 FAIL）；阻塞 18 |
| 验证 | `node scripts/check-bg-events.mjs`；`npm run bg:events` |
| 边界 | 不改禁库清单；不放宽 12 键断言；不删除既有 4 事件校验 |

### T-CARD-02 安装 hugeicons（精确版本）+ `CardIcon.jsx` 双路径适配

| 项 | 内容 |
|---|---|
| 目标 | `@hugeicons/react` 与 `@hugeicons/core-free-icons` 以精确版本进入 `client` 依赖，并具备可在构建期切回 Font Awesome 的图标适配层 |
| 前置 | T-CARD-01 |
| 涉及文件 | 修改 `client/package.json`、`client/package-lock.json`（唯一主改）<br/>新增 `client/src/components/CardIcon.jsx` |
| 实现要点 | ① 在 `client/` 执行 `npm install --save-exact @hugeicons/react @hugeicons/core-free-icons`，版本不带 `^`/`~`，仅写入 `dependencies`；② `CardIcon.jsx`：`CARD_ICON_SET = import.meta.env.VITE_CARD_ICON_SET \|\| 'hugeicons'`；③ 静态双分支——hugeicons 分支具名导入 ≤6 个图标（立方体/建筑/左/右/暂停/播放/刷新），fa 分支渲染 `<i className={"fas "+fallbackFa}>`；④ **禁止** `import * as`、禁止动态 `import()`；⑤ `HugeiconsIcon` 只接收图标数据对象，组件内不访问 `window`/`document`；⑥ 装饰图标默认 `aria-hidden="true"`，按钮语义由调用方 `aria-label` 承担；⑦ 统一 `strokeWidth≈1.6`、视觉尺寸 20px，与 FA 观感对齐 |
| DoD | ① `cd client && npm ls @hugeicons/react @hugeicons/core-free-icons` 显示精确版本；② `client/package.json` 中两包版本无 `^`/`~`，`server` 零变更；③ 全仓 `import \* as` 命中 0；④ `npm run build` 退出 0；⑤ `VITE_CARD_ICON_SET=fa npm run build`（在 `client/`）退出 0；⑥ 图标增量 gzip ≤30KB（记录到 T-CARD-21 报告）；⑦ `npm run lint` 退出 0 |
| 覆盖 AC | R-CARD-18/19/20/21 → AC-CARD-18、AC-CARD-19、AC-CARD-20、AC-CARD-21 |
| 预估 | 0.30 人日 |
| 串行性 | 可与 03/04/05 并行；阻塞 07/11 的图标使用；OQ-08 版本与许可须在开工前确认 |
| 验证 | `cd client && npm ls @hugeicons/react @hugeicons/core-free-icons`；`cd client && npx vite build`；`cd client && VITE_CARD_ICON_SET=fa npx vite build` |
| 边界 | 不做全站图标替换；不引图标以外的包；不使用 CDN/远程字体；不改既有 `fas fa-*` 调用点 |

### T-CARD-03 `encyclopediaCards.js`：`CARDS_CONFIG` + 6 纯函数 + 18 单测

| 项 | 内容 |
|---|---|
| 目标 | 卡片配置、参数夹紧、断点派生、卡片集合构造、读屏名与选中索引具备单一来源与确定性，可脱离 DOM 单测 |
| 前置 | T-CARD-01 |
| 涉及文件 | 新增 `client/src/lib/encyclopediaCards.js`（唯一主改）<br/>新增 `client/src/lib/__tests__/encyclopediaCards.test.js` |
| 实现要点 | ① `CARDS_CONFIG` 冻结对象：`DEFAULTS`（15 参数，默认 `delay 4000/cardDistance 60/verticalDistance 70/depth 90/skewAmount 6/visibleCards 4/cardRadius 18/speed 1/bounce .35/parallax .5/hoverSpread .12/dim .5`）、`RANGES`（R-CARD-07 上下限）、`PRESET`（`wide/medium/compact/stacked/narrow/minimal` → `{visibleCards,strength,listFallback}`，**不含像素数字**）、`MOTION`、`DRAG`（threshold 8/commitPx 48/commitVelocity .35/axisSin .5）、`AUTOPLAY`、`LAYOUT`、`ICON`；② `clampDeckOptions(raw, ctx)`：越界夹紧、`null`/`"abc"`/`NaN` 回落默认、`visibleCards` 收敛到 `items.length`、`dim` 保证非当前卡不透明度下限、`reducedMotion` 强制 `bounce/parallax/hoverSpread=0`、DEV 同参数单次 `console.warn`；③ `deckPresetFor(viewport)`；④ `buildCardItems({terms,taxonomy})`：确定性排序（`building` 优先 → `sort_order` → `level` → `id`），字段派生 `dynasty/region` 仅来自主关联建筑、缺类目→`未分类`、缺主关联→隐藏朝代地区、`badge3D` 由主关联建筑 `has_3d` 派生；⑤ `cardAriaLabel(item,index,total,t)`、`cardSelectIndex(items,id)`、`resolveCardAsset(item)`；⑥ 禁止 import React、禁止访问 `window/document`；⑦ 不渲染 `id/status/primary_palace_id` |
| DoD | ① `npx vitest run src/lib/__tests__/encyclopediaCards.test.js`（`client/`）18 条全绿；② `Object.keys(PRESET).sort()` 与 `Object.keys(GRAPH_CONFIG.BREAKPOINTS).sort()` 完全相等；③ `PRESET` 内正则 `\d{3,}` 命中 0；④ `buildCardItems` 同输入两次 `toEqual` 相等；⑤ 缺 `category` 输出 `未分类`、无主关联时 `dynasty/region` 为 `undefined`；⑥ 空数组返回空态标记（不抛错）；⑦ 模块内 `from 'react'` / `window.` / `document.` 命中 0 |
| 覆盖 AC | R-CARD-01~05、07、14、28、37 → AC-CARD-01~05、07、14、28、37 |
| 预估 | 0.90 人日 |
| 串行性 | 不可并行（独占新文件）；阻塞 07 与 13 |
| 验证 | `cd client && npx vitest run src/lib/__tests__/encyclopediaCards.test.js`；`npm run lint` |
| 边界 | 不复制断点像素数字；不写死 43/20/10；不新增过滤逻辑（复用 `filterTerms` 结果） |

### T-CARD-04 `encyclopediaGestures.js` + `raf.js` + 6 单测

| 项 | 内容 |
|---|---|
| 目标 | 卡片与图谱共享同一套「区域归属 + 主轴夹角 + 单帧调度」基础能力，避免两处手势互相夺权 |
| 前置 | T-CARD-01 |
| 涉及文件 | 新增 `client/src/lib/encyclopediaGestures.js`、`client/src/lib/raf.js`<br/>新增 `client/src/lib/__tests__/encyclopediaGestures.test.js` |
| 实现要点 | ① `resolveGestureOwner(target)`：`closest('.enc-deck')`→`'deck'`、`closest('.enc-graph-canvas')`→`'graph'`、其余 `'page'`；对 `null`/无 `closest` 的 target 安全返回 `'page'`；② `isHorizontalIntent(dx,dy,{threshold=8,axisSin=0.5})`：位移未达阈值→`false`，`|dy|/|dx| > 1.73`→`false`，否则 `true`；③ `createRafLoop(cb)`：单例注册表，卡片与图谱各注册一个回调但共享一帧；`stop()` 可移除；④ 模块不 import React、不直接读 `document`（`raf.js` 仅用 `requestAnimationFrame`，并对非浏览器环境提供 no-op 兜底）；⑤ 单测 6 条：3 类区域 + 水平/垂直/临界 30° |
| DoD | ① `cd client && npx vitest run src/lib/__tests__/encyclopediaGestures.test.js` 6 条全绿；② 临界 30°（`|dy|/|dx|≈1.732`）判定为纵向；③ `createRafLoop` 连续两次 `start` 不产生双循环（伪 rAF 下计数为 1）；④ `resolveGestureOwner(null)` 返回 `'page'` 不抛错 |
| 覆盖 AC | R-CARD-09/30/50 → AC-CARD-09、AC-CARD-30、AC-CARD-50 |
| 预估 | 0.30 人日 |
| 串行性 | 可并行（新文件）；阻塞 07/11 |
| 验证 | `cd client && npx vitest run src/lib/__tests__/encyclopediaGestures.test.js` |
| 边界 | 不在此实现任何卡片/图谱业务逻辑；不引第三方手势库 |

### T-CARD-05 i18n 34 键（22 card + 12 graph3d）+ 键集合单测

| 项 | 内容 |
|---|---|
| 目标 | `encyclopedia.card.*` 22 键与 `encyclopedia.graph3d.*` 12 键中英同批就位，键集合可断言，既有键零改动 |
| 前置 | T-CARD-01 |
| 涉及文件 | 修改 `client/src/i18n/zh-CN.json`、`client/src/i18n/en.json`（唯一主改）<br/>新增 `client/src/i18n/__tests__/encyclopediaCardI18n.test.js` |
| 实现要点 | ① 按设计 §8.5 逐键写入：`deckLabel/hint/cardLabel/type.building/type.craft/badge.building/badge.threeD/badge.threeDLabel/unnamed/uncategorized/skip/prev/next/pause/play/autoplayOff/dragHint/empty/emptyAction/error/degraded/backToDeck`；② `graph3d`：`stageLabel/hint/rotateOn/rotateOff/rotateOnShort/rotateOffShort/reset/zoomIn/zoomOut/backfacing/degraded25d/degraded2d`；③ 插值一律单花括号 `{count}/{title}/{category}/{type}/{index}/{total}`，禁 `{{ }}`；④ 既有 `encyclopedia.page/guide/graph` 键不删不改；⑤ 单测：中英 `card`/`graph3d` 键集合排序后完全相等、既有三组键快照相等、无 `{{` 残留 |
| DoD | ① `cd client && npx vitest run src/i18n/__tests__/encyclopediaCardI18n.test.js` 全绿；② `node -e` 校验两 JSON 中 `encyclopedia.card` 各 22 键、`encyclopedia.graph3d` 各 12 键；③ 既有键数量与语义快照相等；④ `rg "\{\{" client/src/i18n` 在新增键范围命中 0 |
| 覆盖 AC | R-CARD-33/38/56/57 → AC-CARD-33、AC-CARD-38、AC-CARD-56、AC-CARD-57 |
| 预估 | 0.35 人日 |
| 串行性 | 可并行（仅两份 JSON + 测试）；阻塞 07/11/13/14 |
| 验证 | `cd client && npx vitest run src/i18n/__tests__/encyclopediaCardI18n.test.js`；`npm run lint` |
| 边界 | 不迁移既有中文字面量；不改英文既有键的措辞 |

### T-CARD-06 `analytics.js` +6 事件（键不变）+ `check-card-events.mjs` 建立

| 项 | 内容 |
|---|---|
| 目标 | 3 个卡片事件与 3 个旋转事件可被白名单接收，属性键保持 12 个；新增静态门禁脚本守住「6 事件 / 0 新键 / 禁库 / 无 canvas / 断点单源」 |
| 前置 | T-CARD-01（同提交） |
| 涉及文件 | 修改 `client/src/lib/analytics.js`（唯一主改）<br/>修改 `client/src/test/analytics.test.js`<br/>新增 `scripts/check-card-events.mjs` |
| 实现要点 | ① `EVENT_NAMES` 追加 `card_view/card_swap/card_drag/graph_rotate/graph_drag/graph_reset`（共 +6），注释分组「卡片」「3D 旋转」；② `ALLOWED_PROP_KEYS` **完全不动**（12 键），新增快照断言；③ `stage` 取值域注释：卡片 `deck_impression/autoplay/drag/keyboard/control/drag_end`，旋转 `on/pause/off/axis_x/axis_y/both/toolbar/keyboard`；④ 测试 +7：6 事件各入队 1 次、非法键（`angle`/`fps`/`term`/`content`）被丢弃、12 键快照相等；⑤ `check-card-events.mjs`（首版）校验：6 事件存在、12 键、禁库清单（含 `three/gsap/react-spring/d3/cytoscape/echarts/swiper/embla`）、百科页与 3D 组件无 `canvas`/`getContext(`/`from 'three'`、无新增路由、`CARDS_CONFIG.PRESET` 与 `GRAPH_3D_CONFIG.FORM` 键集合 = `GRAPH_CONFIG.BREAKPOINTS`、CSS 只追加（`git diff` 中 `encyclopedia.css` 仅新增行）；脚本以 `node scripts/check-card-events.mjs` 直跑（入口登记留给 18） |
| DoD | ① `cd client && npx vitest run src/test/analytics.test.js` 全绿；② 12 键快照逐项相等；③ `node scripts/check-card-events.mjs` 退出 0（CSS 段完成后为最终 PASS）；④ `npm run bg:events` 退出 0（本提交含 01，7 事件一致）；⑤ `npm run lint` 退出 0；⑥ 全仓 `rg "'card_" client/src/lib/analytics.js` 恰 3 个 |
| 覆盖 AC | R-CARD-39/40/63 → AC-CARD-39、AC-CARD-40、AC-CARD-63 |
| 预估 | 0.35 人日 |
| 串行性 | 硬顺序：先于 07/11 的 `track` 调用；**与 01 同提交**；阻塞 18 |
| 验证 | `cd client && npx vitest run src/test/analytics.test.js`；`node scripts/check-card-events.mjs`；`npm run bg:events` |
| 边界 | 不新增属性键；不上报角度/帧率/设备/身份；不改批量与 `sendBeacon` 时机；不把 enc3d 脚本写进根 `package.json`（留给 18） |

---

## 3. 批次 B：CardSwap 组件与测试

### T-CARD-07 `CardSwap.jsx`：卡组/`Card`/错误边界/15 参数/手势/轮播/键盘/降级

| 项 | 内容 |
|---|---|
| 目标 | 主列出现可拖、可轮播、可键盘操作、可降级的 3D 卡组，`items` 与 `<Card>` 两种用法共用同一渲染与交互路径，15 个参数全部生效 |
| 前置 | T-CARD-02、03、04、05、06 |
| 涉及文件 | 新增 `client/src/components/CardSwap.jsx`（唯一主改：default `CardSwap` + 具名 `Card` + `CardDeckErrorBoundary`） |
| 实现要点 | ① 归一：`items[]`→`DeckEntry{...}`（内置默认卡面），`<Card>` 子元素→`DeckEntry{render:child}`，后续渲染与交互共用；② `useDeck` 计算 `rel=(i-active+n)%n`、`visible=rel<visibleCards`，输出 `translate3d/rotateY/scale/opacity`，只写 CSS 变量 `--deck-*`；③ 循环队列只挂载 `visibleCards`（≤5）张，切换瞬间加 `is-swapping` 禁过渡 1 帧；④ 轮播：rAF 累加 `delay`（**不用 `setInterval`**），悬停/聚焦/`document.hidden`/IntersectionObserver(<0.4)→暂停，恢复不补时；用户关闭写模块内存不回弹；触屏默认关、减效强制关；⑤ 拖拽：8px 阈值 + 纵向 1.73 倍交还滚动、`touch-action:pan-y`、横向才 `preventDefault`、`body.enc-no-select`、48px 或 0.35px/ms 切换、回弹 ≤300ms、`dragged` 后吞 1 次 click；⑥ 键盘 roving tabindex（仅 1 张 `tabIndex=0`），`←/→/Home/End` 只移焦点、`Enter/Space` 选中，`Esc` 不拦截；⑦ aria：`role="group"` + 组名、卡片 `aria-current` 唯一、`aria-live="polite"` 每次切换 1 条、`a.enc-card-skip` 跳过；⑧ 降级：`strength===0`→`is-flat`、`minimal`→纵向列表（渲染全部命中，分批 30 + 加载更多）、空态→说明 + 清除筛选、异常→错误边界占位 + 列表出口；⑨ 单卡 DOM ≤12、只用 `transform/opacity`、`width/height` 语义分流（items=容器建议、Card=卡面约束）；⑩ 不写 URL、不读写 storage、不在此上报（埋点由 17 接管） |
| DoD | ① `npm run build` 退出 0；② `npm run lint` 退出 0；③ 单卡 DOM 节点数 ≤12（组件测试断言）；④ 同屏卡数 = `visibleCards`；⑤ `items` 与 `children` 归一后 `DeckEntry` 结构一致；⑥ `rg "setInterval" client/src/components/CardSwap.jsx` 命中 0；⑦ `rg "localStorage\|sessionStorage" client/src/components/CardSwap.jsx` 命中 0 |
| 覆盖 AC | R-CARD-06~17、24、30~35、37、38 → AC-CARD-06~17、24、30~35、37、38 |
| 预估 | 1.00 人日 |
| 串行性 | 不可并行（独占新文件）；阻塞 08/13 |
| 验证 | `cd client && npx vitest run src/components/__tests__/CardSwap.test.jsx`（08 完成后）；`npm run build`；`npm run lint` |
| 边界 | 不引第三方卡组库；不实现第 16 个参数；不做卡片级埋点；不改导引卡组件 |

### T-CARD-08 `CardSwap.test.jsx` 20 条组件测试

| 项 | 内容 |
|---|---|
| 目标 | 覆盖两种用法、单卡 DOM 预算、键盘、拖拽、暂停、降级、空态与错误隔离的 20 条断言全绿 |
| 前置 | T-CARD-07 |
| 涉及文件 | 新增 `client/src/components/__tests__/CardSwap.test.jsx`（唯一主改） |
| 实现要点 | ① 两种用法各 1 条渲染；② 单卡 DOM ≤12、同屏卡数 = `visibleCards`；③ `←/→` 不触发 `onSelect`、`Enter` 触发、`Home/End`；④ `Esc` 不拦截（不 `preventDefault`）；⑤ `aria-current` 唯一、`aria-live` 每次切换 1 条；⑥ 点击角标不触发选择；⑦ 横向拖拽 >8px 切换、纵向拖拽不拦截；⑧ 回弹 ≤300ms（fake timers）；⑨ 悬停 `delay` 内不切换、不可见暂停、用户关闭不回弹；⑩ 减效 `autoplay=false` 且无位移动画；⑪ `strength=0` 有 `is-flat`；⑫ `items=[]` 空态含清除筛选；⑬ 错误边界降级不影响兄弟节点；⑭ 越界参数（`depth=999/visibleCards=0/delay=10`）渲染不崩溃 |
| DoD | ① `cd client && npx vitest run src/components/__tests__/CardSwap.test.jsx` 20 条全绿；② 无 `act()` 告警；③ 单卡 DOM 计数断言真实通过（非 mock）；④ 缺陷只回流 T-CARD-07，不在测试内改实现 |
| 覆盖 AC | R-CARD-07~17、24、30~35 → AC-CARD-07~17、24、30~35 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（依赖 07 冻结） |
| 验证 | `cd client && npx vitest run src/components/__tests__/CardSwap.test.jsx` |
| 边界 | 不测试页面级接线（属 19）；不引入新测试依赖 |

---

## 4. 批次 C：3D 图谱纯函数、组件与测试

### T-CARD-09 `encyclopediaGraph.js` 末尾追加 `GRAPH_3D_CONFIG` + 7 个 3D 纯函数

| 项 | 内容 |
|---|---|
| 目标 | 3D 视角、深度、线段姿态、投影、背向判定与环内导航具备单一配置源与纯数学实现，且既有 2D 布局零改动 |
| 前置 | T-CARD-01 |
| 涉及文件 | 修改 `client/src/lib/encyclopediaGraph.js`（**仅文件末尾追加**，唯一主改 3D 段） |
| 实现要点 | ① `GRAPH_3D_CONFIG`：`PERSPECTIVE:1100`、`DEFAULT_AZIMUTH:-18`、`DEFAULT_PITCH:-8`、`PITCH_MIN:-30`、`PITCH_MAX:30`、`AUTO_DEG_PER_SEC:8`（`AUTO_MIN:6/AUTO_MAX:12`）、`RING_Z:{0:24,1:0,2:-140}`、`BACKFACE_DEG:60`、`SETTLE_MS:600`、`DRAG_AZ_PER_PX:0.35`、`DRAG_PITCH_PER_PX:0.25`、`LABEL_MIN_PX:11`、`FALLBACK_FPS:45`、`FORM:{wide:'full3d',medium:'full3d',compact:'25d',stacked:'2d',narrow:'2d',minimal:'list'}`；② `ringDepth(ring)`、`clampView({azimuth,pitch,scale})`（方位归一 `[-180,180)`、俯仰 ±30、缩放复用 `ZOOM_MIN/MAX` 并夹紧）、`facingAngleDeg(node,view)`、`isBackFacing(node,view)`（>60 且 `ring>0`，中心永不背向）、`segmentTransform(p1,p2)`（返回 `{transform,length}`，退化平行 -X 用 `(0,1,0)` 轴）、`projectToScreen(node,view,canvas)`（等比 `k` + 居中，复用 `CANVAS`）、`ringNavigationTarget(layout,activeId,dir)`（`cw/ccw/in/out/home/end`，跨环取角度最近，空环跳过）；③ 拖拽阈值直接引用 `GRAPH_CONFIG.DRAG_CLICK_THRESHOLD`，不新建第二常量；④ **不修改** `computeLayout`/`buildGraphModel`/`selectWithinBudget`/`neighborIds`/`clampViewBox` 的任何行与导出签名；⑤ 模块无 React/DOM/window |
| DoD | ① 既有 `cd client && npx vitest run src/lib/__tests__/encyclopediaGraph.test.js` 24 条仍全绿；② 7 个新函数均可从模块具名导出；③ `rg "RING_Z\|BACKFACE_DEG\|DEFAULT_AZIMUTH" client/src` 只在 `encyclopediaGraph.js` 定义、其它处只引用；④ `FORM` 键集合 = `GRAPH_CONFIG.BREAKPOINTS` 键集合；⑤ `git diff client/src/lib/encyclopediaGraph.js` 全部为新增行（既有行零修改） |
| 覆盖 AC | R-CARD-46/47/48/51/59/65 → AC-CARD-46、AC-CARD-47、AC-CARD-48、AC-CARD-51、AC-CARD-59、AC-CARD-65 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（同文件追加）；阻塞 10/11 |
| 验证 | `cd client && npx vitest run src/lib/__tests__/encyclopediaGraph.test.js`；`git diff --stat client/src/lib/encyclopediaGraph.js` |
| 边界 | 不改布局算法结论；不按渲染顺序/权重生成 z；不新增节点/边类型 |

### T-CARD-10 `encyclopediaGraph3d.test.js` 20 条纯函数单测（含 2D 回归）

| 项 | 内容 |
|---|---|
| 目标 | 3D 数学可复现、边界夹紧、退化安全、环内导航正确，并证明 2D 布局输出未被改造 |
| 前置 | T-CARD-09 |
| 涉及文件 | 新增 `client/src/lib/__tests__/encyclopediaGraph3d.test.js`（唯一主改） |
| 实现要点 | ① `ringDepth` 同环同值、三环不同；② `clampView` 俯仰 ±30、方位 `-190→170`、`scale` 夹到 0.5/2.0；③ `segmentTransform` 同输入同输出、长度 = 端点距离、重合点长度 0 不抛错、反向轴选择正确；④ `facingAngleDeg` 四象限、`isBackFacing` 60 不隐藏 / 61 隐藏、中心节点永不背向；⑤ `projectToScreen` 中心→画布中心、比例与 `k` 一致；⑥ `ringNavigationTarget` 环内顺/逆、跨环最近角度、Home/End、空环跳过；⑦ `computeLayout` 输出与改造前快照逐项相等；⑧ 超预算数据仍 ≤120 节点 / ≤300 边；⑨ 邻接集合与 2D 一致 |
| DoD | ① `cd client && npx vitest run src/lib/__tests__/encyclopediaGraph3d.test.js` 20 条全绿；② 快照断言直接比对改造前 `encyclopediaGraph.test.js` 同源夹具；③ 纯数值断言（无 DOM、无 mock）；④ 不修改 `encyclopediaGraph.js` |
| 覆盖 AC | R-CARD-45/47/48/53 → AC-CARD-45、AC-CARD-47、AC-CARD-48、AC-CARD-53 |
| 预估 | 0.70 人日 |
| 串行性 | 不可并行（依赖 09 冻结） |
| 验证 | `cd client && npx vitest run src/lib/__tests__/encyclopediaGraph3d.test.js` |
| 边界 | 不新增实现分支；发现缺陷回流 09 |

### T-CARD-11 `Graph3DScene.jsx` + `Graph3DControls.jsx`

| 项 | 内容 |
|---|---|
| 目标 | 图谱以分层 DOM 呈现真实前后层次，可自动旋转、拖拽旋转、缩放与复位，文字始终朝屏，背向节点保留可读名与点击能力 |
| 前置 | T-CARD-04、05、09、10 |
| 涉及文件 | 新增 `client/src/components/Graph3DScene.jsx`、`client/src/components/Graph3DControls.jsx`（唯一主改） |
| 实现要点 | ① 结构：`div.enc-graph3d-stage`（`perspective`）→ `div.enc-graph3d-world`（`--g3d-az/pitch/scale` + `preserve-3d`）→ `edges`（`aria-hidden`，≤300 个 `span` 静态 `matrix3d`）+ `nodes`（≤120 个原生 `button`，静态 `translate3d(x,y,z)`）；② 节点坐标取自 `computeLayout`，z 由 `ringDepth(ring)` 派生，不按 DOM 顺序；③ 标签 `rotateY(calc(-1*var(--g3d-az))) rotateX(calc(-1*var(--g3d-pitch)))` + `font-size:clamp(11px,...)`，`pointer-events:none`；④ 背向：跨越 60° 阈值切 `data-backfacing`，标签 `opacity:0`、形状 0.55，`aria-label` 不删、按钮仍可聚焦；⑤ 自动旋转：rAF 每帧只写 `--g3d-az`，暂停条件 = 悬停 / `focus-within` / `document.hidden` / IntersectionObserver(<0.25) / 拖拽 / 滚轮 300ms / 开关关 / 减效；恢复不补偿；⑥ 拖拽：4px 阈值（同源）、`Δaz=dx*0.35`、`Δpitch=-dy*0.25`、`clampView` 夹紧、`touch-action:pan-y`、纵向主导不进入、`dragged` 后吞 click、惯性 0.94/帧且 ≤600ms 停稳；⑦ 缩放：滚轮（命中画布/聚焦）、按钮 ×1.2/÷1.2、键盘 `+/-/0`，夹紧 0.5~2.0；复位回 `{-18,-8,1}` 且不改选中与筛选；⑧ 键盘：`Tab` 进入 → `←/→` 环内、`↑/↓` 跨环、`Home/End`、`Enter/Space` 激活、`Esc` 清焦点；⑨ 邻接高亮只切 `is-active/is-neighbor/is-dimmed` 类，DOM 顺序不变；⑩ 无 `canvas`/`getContext`/`three`；`?perf=1` 或 DEV 下暴露 `__encGraph3dPerf`（只读，不进埋点） |
| DoD | ① 节点数 = 输入节点数、边数 = 输入边数；② `rg "canvas\|getContext\|three" client/src/components/Graph3DScene.jsx` 命中 0；③ 旋转一帧只改 1~3 个 CSS 变量（代码审查 + 断言 `setProperty` 调用数）；④ 拖拽 >4px 松手不触发 `onNodeActivate`；⑤ 背向节点仍有 `aria-label` 且可聚焦；⑥ `npm run build` / `npm run lint` 退出 0 |
| 覆盖 AC | R-CARD-45~54、56、57、59 → AC-CARD-45~54、56、57、59 |
| 预估 | 1.30 人日 |
| 串行性 | 不可并行（独占新文件）；阻塞 12/14 |
| 验证 | `cd client && npx vitest run src/components/__tests__/Graph3DScene.test.jsx`（12 完成后）；`npm run build` |
| 边界 | 不做数据构造与裁剪；不做四类节点业务分派（只回调父组件）；不引 3D/图谱库 |

### T-CARD-12 `Graph3DScene.test.jsx` 16 条 + 既有图谱组件测试扩展 8 条

| 项 | 内容 |
|---|---|
| 目标 | 3D 场景的节点/边集合、背向规则、手势阈值、缩放夹紧、复位、键盘与降级被断言锁死；既有 2D 组件测试同步扩展且不回归 |
| 前置 | T-CARD-11 |
| 涉及文件 | 新增 `client/src/components/__tests__/Graph3DScene.test.jsx`<br/>修改 `client/src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`（17 后再次扩展的 8 条由 T-CARD-14 触发） |
| 实现要点 | ① `Graph3DScene` 16 条：节点数/边数、无 canvas、`data-backfacing` 正确、背向仍有 `aria-label`、节点可聚焦、拖拽 >4px 不激活、拖拽改 `--g3d-az`、俯仰夹紧、缩放夹紧、复位回默认、邻接类切换不改节点顺序、`reducedMotion` 不启动自动旋转、`→` 环内、`↑` 跨环、非法矩阵不抛错；② 既有文件扩展 8 条：`mode` 选择（3D/2.5D/2D/list）、2D 路径行为不变、compact 折叠条位次、合成异常上报 `graph_fallback`、开关 `aria-pressed`、增删节点后高亮重算、打印媒体 3D 容器隐藏、回滚 off 走 2D；③ 既有 16 条一条不删 |
| DoD | ① `cd client && npx vitest run src/components/__tests__/Graph3DScene.test.jsx` 16 条全绿；② 既有文件 16+8 条全绿；③ 2D 回归用例不改断言目标类名；④ 无 `act()` 告警 |
| 覆盖 AC | R-CARD-45~54、56、57 → AC-CARD-45~54、56、57 |
| 预估 | 0.70 人日 |
| 串行性 | 不可并行（依赖 11 冻结）；8 条扩展需在 14 完成后补齐 |
| 验证 | `cd client && npx vitest run src/components/__tests__/Graph3DScene.test.jsx`；`cd client && npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx` |
| 边界 | 不在测试内改实现；不删除既有断言 |

---

## 5. 批次 D：页面接线与图谱形态分支

### T-CARD-13 `EncyclopediaPage.jsx` 唯一主改

| 项 | 内容 |
|---|---|
| 目标 | 引导态主列由导引卡变为可选卡组，点卡写入 `term` 进入既有详情区；详情态提供"返回卡片选择"；筛选、图谱、深链、焦点行为不回归 |
| 前置 | T-CARD-05、07、08、14（14 提供受控入口） |
| 涉及文件 | 修改 `client/src/pages/EncyclopediaPage.jsx`（唯一主改） |
| 实现要点 | ① 回滚开关：构建期 `VITE_ENC_3D`（默认 `on`）；`off` → 既有 `EncyclopediaGuide` 4 张导引卡 + 2D 图谱，卡片代码不进渲染分支；② 引导态：主列首位渲染 `<CardDeckErrorBoundary><CardSwap items={cardItems} selectedId onSelect={selectTerm} visibleCards={preset.visibleCards} strength={preset.strength} t={t}/></CardDeckErrorBoundary>`，`cardItems` 由 `buildCardItems({terms:filteredTerms,taxonomy})` 在同一 `useMemo` 链派生；③ `EncyclopediaGuide` 降为卡组下方紧凑"按类目浏览"入口，`onPick` 语义不变；④ 详情态不渲染卡组，正文头部加"← 返回卡片选择"（清 `term` 保留筛选，焦点回还刚才的卡）；⑤ 选中态唯一：卡片、图谱节点、左栏列表共用 `selectedTermId`；卡片选择只写 `term`（复用 `selectTerm` → `syncUrl`），复用既有 `encyclopedia_term_open`；⑥ **选卡后焦点移入正文标题**（OQ-03 用户口径；`#enc-article` 的标题加 `tabIndex=-1` 后 `focus()`，不 `scrollIntoView({block:'start'})` 以免顶飞）；`Esc` 从详情返回卡组并把焦点还给该卡；⑦ 筛选变化清 `term`（既有行为），卡组重建后回未选中；空态渲染"清除筛选"，不渲染 0 高卡组容器；⑧ 深链失效 `term` → 轻提示 + 卡组可用（沿用 `droppedNotice` 风格），不空白；⑨ 不改 `.enc-detail-grid` / 侧栏 / 图谱列声明；不改 canonical 与 noindex effect；⑩ 图谱写入仅 `mode/viewport/selectedId` 等既有 props + 新 `viewKind`，不接管视角状态 |
| DoD | ① 1440 引导态：卡组存在、图谱右列存在、两区包围盒不相交；② 点第 2 张：URL 变 `?term=<实时id>`、筛选参数保留、正文出现、无整页刷新；③ 改筛选：`term` 被清、卡片数与左栏命中一致；④ 伪造 `term`：提示 + 卡组可用；⑤ `VITE_ENC_3D=off npm run build`（`client/`）后引导卡回归、2D 图谱可用；⑥ `git diff client/src/pages/EncyclopediaPage.jsx` 不涉及 canonical/noindex 段；⑦ `npm run lint` / `npm run build` 退出 0 |
| 覆盖 AC | R-CARD-10~12、22~27、42~44、55、62、64 → AC-CARD-10~12、22~27、42~44、55、62、64 |
| 预估 | 1.40 人日 |
| 串行性 | 不可并行（独占页面）；阻塞 15/19/20 |
| 验证 | `npm run build`；`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js`（19 完成后）；`cd client && VITE_ENC_3D=off npx vite build` |
| 边界 | 不新增路由/参数；不改左栏与图谱列样式；不新增首屏请求；不做卡片级埋点（17 负责） |

### T-CARD-14 `EncyclopediaKnowledgeGraph.jsx` 形态分支 + 工具条 + 回退

| 项 | 内容 |
|---|---|
| 目标 | 图谱按断点与能力在 完整 3D / 静态 2.5D / 既有 2D / 关联列表 四形态间确定切换，工具条可暂停旋转、缩放、复位，异常自动回退且 2D 路径零改动 |
| 前置 | T-CARD-11、12 |
| 涉及文件 | 修改 `client/src/components/EncyclopediaKnowledgeGraph.jsx`（唯一主改） |
| 实现要点 | ① `viewKind` 判定（`GRAPH_3D_CONFIG.FORM` + `viewport` + `CSS.supports('transform-style','preserve-3d')` + `reducedMotion` + `tier==='smooth'` 仅取 save-data/low-memory/slow-network/small-viewport 四理由，**不因缺 WebGL2 降级** + `VITE_ENC_3D`）；② `full3d` → `<Graph3DScene/>`；`25d` → 既有 2D SVG + 容器 `rotateX(-8deg) rotateY(-18deg) scale(.98)`，`overflow:hidden` + 6% 内边距；`2d` → 既有分支原样；`list` → 既有 `mode='list'`；③ 工具条在既有 `.enc-graph-tools` 旁新增"暂停/继续旋转"（`aria-pressed`）、"放大"、"缩小"、"复位视角"、"列表视图"，全部有 `aria-label` 与 ≥24/44px 热区；④ 回退链：旋转期间 1s 窗口 rAF 中位连续 3 次 <45fps → 先关自动旋转 → `25d` → `2d`；合成异常（`segmentTransform` 抛错/错误边界）→ `2d` + `graph_fallback`（`reason:'render_error'`）；⑤ 旋转事件调用点：`graph_rotate`（状态切换各 1 条）、`graph_drag`（axis_x/axis_y/both）、`graph_reset`（toolbar/keyboard），不含角度；⑥ 筛选变化只换数据不换视角，高亮用既有 `neighborIds` 重算；⑦ 面板 `role="group"` / `aria-label` / `.enc-graph-skip` 全部保留；⑧ **2D 分支代码块逐行不改**（`git diff` 只能出现新增行与新分支包裹） |
| DoD | ① `cd client && npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx` 24 条全绿；② 六断点下 `viewKind` 分别命中 `full3d/full3d/25d/2d/2d/list`；③ 打印媒体下 3D 容器隐藏（样式由 16 提供）；④ `rg "canvas\|getContext\|from 'three'" client/src/components/EncyclopediaKnowledgeGraph.jsx` 命中 0；⑤ `npm run bg:events` 退出 0；⑥ `git diff` 中 2D 渲染分支无 `-` 行 |
| 覆盖 AC | R-CARD-45、52~58、61、62 → AC-CARD-45、52~58、61、62 |
| 预估 | 0.90 人日 |
| 串行性 | 不可并行（独占组件）；阻塞 13 |
| 验证 | `cd client && npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`；`npm run bg:events` |
| 边界 | 不改五类节点/四类边语义；不改折叠与列表降级；不接管页面 URL |

---

## 6. 批次 E：样式末尾追加

### T-CARD-15 `encyclopedia.css` 末尾追加卡片样式

| 项 | 内容 |
|---|---|
| 目标 | 卡组在 1440/1920 下层次清晰、文字可读、无横向滚动、首屏高度受控，且完全符合纸质视觉契约 |
| 前置 | T-CARD-13 |
| 涉及文件 | 修改 `client/src/styles/encyclopedia.css`（**仅末尾追加卡片段**，唯一主改） |
| 实现要点 | ① 新增类：`.enc-deck/.enc-deck-stage/.enc-deck-card/.enc-deck-hint/.enc-deck-controls/.enc-deck-status/.enc-deck-empty/.enc-deck-list/.enc-card-skip/.enc-card-art/.enc-card-title/.enc-card-synopsis/.enc-card-meta/.enc-card-index/.enc-card-badge--building/.enc-card-badge--3d/.is-selected/.is-current/.is-flat/.is-swapping/.is-dragging/.enc-no-select`；② 变量：`--deck-perspective:900px/--deck-x/--deck-y/--deck-z/--deck-skew/--deck-radius/--deck-dim/--deck-shift/--enc-3d-lift`；③ 卡面：`background:var(--enc-surface)`、`1px solid var(--enc-line)`、选中 `box-shadow:inset 0 0 0 2px var(--vermillion)`、阴影 `0 2px 8px rgba(44,44,44,.06)`、圆角 `var(--deck-radius)`（≤28）；④ 固定高度 `block-size:var(--enc-card-h)`（双语不跳高）、标题 2 行 `-webkit-line-clamp`+`title`、摘要 3 行、角标 `pointer-events:none`；⑤ `.enc-deck-stage{overflow:hidden;max-inline-size:100%;touch-action:pan-y}`，焦点环用内层 inset 不被裁；⑥ 高度占比：桌面 ≤45vh、移动 ≤55vh；六断点 `scrollWidth ≤ clientWidth`；⑦ 无 `linear-gradient`、无 `backdrop-filter`、无新增色值；⑧ 仅追加到文件末尾（既有 1594 行之后） |
| DoD | ① `git diff -U0 client/src/styles/encyclopedia.css` 只出现新增行（无 `-` 行）；② `rg "linear-gradient\|backdrop-filter" ` 在新增段命中 0；③ 1440/1920 引导态高度占比达标、无横向滚动；④ 中英切换最长条目无溢出/无高度跳动；⑤ 无图时占位不裂图、尺寸不变 |
| 覆盖 AC | R-CARD-15、29~31、36~38、43、60 → AC-CARD-15、29~31、36~38、43、60 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（独占 CSS 卡片段）；阻塞 16 |
| 验证 | `git diff -U0 client/src/styles/encyclopedia.css`；`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js`（19 完成后）；`npm run bg:measure` |
| 边界 | 不改既有 `.enc-detail-grid`/`.enc-article`/`.enc-graph-*` 规则；不新增 CSS 文件；不做玻璃质感 |

### T-CARD-16 同文件追加 3D 图谱样式 + 断点/打印/减效块

| 项 | 内容 |
|---|---|
| 目标 | 3D 图谱在 wide/medium 有层次、2.5D 在 compact 成立、≤1024 走 2D、打印无 3D 残留、减效无过渡，且不改既有样式行 |
| 前置 | T-CARD-15、T-CARD-14 |
| 涉及文件 | 修改 `client/src/styles/encyclopedia.css`（**末尾追加 3D 段**，与 15 同人串行） |
| 实现要点 | ① 新增类：`.enc-graph-canvas--3d/.enc-graph3d-stage/.enc-graph3d-world/.enc-graph3d-edges/.enc-graph3d-edge/.enc-graph3d-nodes/.enc-graph3d-node/.enc-graph3d-shape/.enc-graph3d-label/.enc-graph3d-rings/.enc-graph3d-panel--25d/.enc-graph3d-controls`；② `stage{perspective:var(--g3d-perspective,1100px)}`、`world{transform-style:preserve-3d;transform:scale3d(var(--g3d-scale,1),var(--g3d-scale,1),1) rotateX(var(--g3d-pitch,-8deg)) rotateY(var(--g3d-az,-18deg))}`；③ 边：`height:1px/background:var(--ink-light)`，虚线/点线用 `border-top:1px dashed\|dotted`（**禁渐变**）；④ 节点：`border-radius/clip-path` 复刻形状，`box-shadow:inset 0 0 0 2px` 焦点，阴影 ≤0.08/12px；⑤ 标签：`font-size:clamp(11px,calc(12px*var(--g3d-inv-scale,1)),14px)`、`max-inline-size:7em`、`pointer-events:none`；⑥ 背向：`[data-backfacing="true"] .enc-graph3d-label{opacity:0}`、形状 `.55`；⑦ 2.5D 容器：`rotateX(-8deg) rotateY(-18deg) scale(.98)` + `overflow:hidden` + 6% 内边距；⑧ 断点：≤1283 `25d` 容器生效、≤1024 不加载 3D 类；⑨ `@media print` 追加 `.enc-deck{display:none}`、`.enc-graph3d-*{display:none}`；⑩ `@media (prefers-reduced-motion:reduce)` 追加新块（不改既有 4 处）：卡片/图谱 transition 归零、无自动动画 |
| DoD | ① `git diff -U0 client/src/styles/encyclopedia.css` 累计只有新增行；② `rg "linear-gradient\|backdrop-filter"` 新增段 0；③ `page.emulateMedia({media:'print'})` 截图无卡片/无 3D 图形；④ 减效下无过渡（计算样式 `transition-duration` 为 0s）；⑤ 六断点 `scrollWidth === clientWidth`；⑥ 既有 `@media print` 块 diff 为空 |
| 覆盖 AC | R-CARD-28、34、36、54、57、58、60、61、64 → AC-CARD-28、34、36、54、57、58、60、61、64 |
| 预估 | 0.80 人日 |
| 串行性 | 不可并行（同文件同人）；阻塞 20/21 |
| 验证 | `git diff -U0 client/src/styles/encyclopedia.css`；`node scripts/measure-enc-3d.mjs`（21 完成后）；`npm run bg:measure` |
| 边界 | 不改 `.enc-graph-panel`/`.enc-graph-svg` 既有声明；不复用 SVG 选择器；不新增品牌色 |

---

## 7. 批次 F：埋点调用点与门禁脚本

### T-CARD-17 埋点调用点收口（3 卡片 + 3 旋转）

| 项 | 内容 |
|---|---|
| 目标 | 6 个新事件在真实交互点上报，节流与去重达标，属性只用 12 键，关键指标可复算 |
| 前置 | T-CARD-07、11、14 |
| 涉及文件 | 修改 `client/src/components/CardSwap.jsx`、`client/src/components/Graph3DScene.jsx`、`client/src/components/EncyclopediaKnowledgeGraph.jsx`（三处调用点，不改实现结构）<br/>新增 `client/src/components/__tests__/cardGraphTracking.test.jsx` |
| 实现要点 | ① 卡片：`card_view`（进入 `visibleCards` 且可见，模块 `Set` 每卡每页面 1 次，`stage:'deck_impression'`、`result_count`=卡组总数）、`card_swap`（切换完成，`stage:'autoplay'\|'drag'\|'keyboard'\|'control'`，500ms 去抖）、`card_drag`（一次拖拽结束，`stage:'drag_end'`，500ms 去抖）；② 旋转：`graph_rotate`（仅开关状态切换，`stage:'on'\|'pause'\|'off'`）、`graph_drag`（拖拽结束，`stage:'axis_x'\|'axis_y'\|'both'`，**不含角度**）、`graph_reset`（`stage:'toolbar'\|'keyboard'`）；③ 统一 `entity_type:'term'` / `'graph'`，`graph` 用 `entity_id:'encyclopedia'`（OQ-02）；④ 选择进入详情**复用** `encyclopedia_term_open`，`stage` 保持 `'list'`，不新增事件；⑤ 节流/去重实现为独立小工具（不污染组件）。**性能打点另走独立通道**：`card:first-paint`、`graph:build:start→graph:paint:end` 只写 `performance` / `__enc*Perf`，绝不进 `track()`；⑥ 埋点关闭（`ac4_analytics_off=1`）与接口失败静默；⑦ 测试：连续滑动 10 次 ≤3 条、曝光去重、6 事件键名正确、无 `angle/fps/device` 键 |
| DoD | ① `cd client && npx vitest run src/components/__tests__/cardGraphTracking.test.jsx` 全绿；② `rg "track\('card_\|track\('graph_rotate\|track\('graph_drag\|track\('graph_reset" client/src/components` 命中 6 处；③ 连续拖拽 10 次上报 ≤3 条；④ `track()` 参数中不出现 `angle\|fps\|device\|term_name\|content`；⑤ `node scripts/check-card-events.mjs` 退出 0 |
| 覆盖 AC | R-CARD-09、39~41、49、63 → AC-CARD-09、39~41、49、63 |
| 预估 | 0.45 人日 |
| 串行性 | 可与 15/16 并行（不同文件）；阻塞 18 |
| 验证 | `cd client && npx vitest run src/components/__tests__/cardGraphTracking.test.jsx`；`node scripts/check-card-events.mjs` |
| 边界 | 不新增属性键；不新增事件；不把帧率/角度塞进埋点；不改既有 4 图谱事件语义 |

### T-CARD-18 根 `package.json` 登记 `enc3d:*` + 门禁补全

| 项 | 内容 |
|---|---|
| 目标 | `npm run enc3d:events` 与 `npm run enc3d:measure` 可用，新门禁成为可复制执行的单一入口 |
| 前置 | T-CARD-06、17（21 提供 measure 脚本） |
| 涉及文件 | 修改 根 `package.json`（唯一主改）<br/>修改 `scripts/check-card-events.mjs`（补全校验项，与 06 同文件串行） |
| 实现要点 | ① 根 `scripts` 追加 `"enc3d:events": "node scripts/check-card-events.mjs"`、`"enc3d:measure": "node scripts/measure-enc-3d.mjs"`，与 `bg:*` 平级；② `check-card-events.mjs` 补全：`measure-enc-3d.mjs` 存在性、`VITE_ENC_3D` / `VITE_CARD_ICON_SET` 开关存在、`encyclopedia.css` 只追加（diff 无 `-` 行）、`App.jsx` diff 为空、`server/**` diff 为空、i18n 键集合一致；③ **不改** `ci:gate` 现有语义（其依赖 MySQL），如需纳入由发布说明单列；④ 输出格式沿用既有 PASS/FAIL + 合计行 |
| DoD | ① `npm run enc3d:events` 退出 0，输出含「6 事件」「12 键」「禁库」「无 canvas」「断点单源」「CSS 只追加」；② `npm run enc3d:measure` 退出 0；③ `npm run bg:events` 退出 0（回归）；④ `git diff package.json` 只新增 2 行；⑤ `npm run lint` 退出 0 |
| 覆盖 AC | R-CARD-18、46、63、65 → AC-CARD-18、AC-CARD-46、AC-CARD-63、AC-CARD-65 |
| 预估 | 0.40 人日 |
| 串行性 | 不可并行（独占根 `package.json`）；阻塞 21/24 |
| 验证 | `npm run enc3d:events`；`npm run enc3d:measure`；`npm run bg:events` |
| 边界 | 不改既有 `bg:*`/`build`/`test:*` 脚本；不新增第三方 lint/门禁依赖 |

---

## 8. 批次 G：E2E、既有回归与性能量测

### T-CARD-19 E2E 卡片组（E-01~05、E-09~13）

| 项 | 内容 |
|---|---|
| 目标 | 卡片组的可见性、选择、深链、筛选联动、断点降级、减效与键盘路径由端到端断言锁死 |
| 前置 | T-CARD-13、15、16 |
| 涉及文件 | 新增 `test/e2e/encyclopedia-3d-card.spec.js`（唯一主改，卡片组段） |
| 实现要点 | ① E-01 1440 引导态：卡组 5 张、图谱右列存在、两区包围盒不相交；② E-02 点第 2 张：URL 变 `?term=`、正文出现、筛选参数保留、`performance.getEntriesByType('navigation')` 计数仍为 1；③ E-03 深链：对应卡 `aria-current=true` 且在视口内；④ E-04 伪造 term：提示 + 卡组可用；⑤ E-05 改筛选：`term` 清空、卡片数与左栏"命中 N 条"一致；⑥ E-09 六断点（1440/1284/1025/721/481/375）：`scrollWidth ≤ clientWidth`、卡片数与强度符合表值；⑦ E-10 ≤480：列表形态、滚动到底存在最后一项；⑧ E-11 减效：`emulateMedia({reducedMotion:'reduce'})` 后无自动轮播、仍可点击切卡；⑨ E-12 键盘：Tab 进卡组 → `→→` → Enter 选中 → 正文 → Esc 返回；⑩ E-13 打印：`emulateMedia({media:'print'})` 截图无卡片；⑪ 选择器只用新增 `.enc-deck-*` / `aria-*`，不依赖行号 |
| DoD | ① `npm run build` 后 `npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js` 通过；② `npm run test:e2e -- --project=mobile-320 test/e2e/encyclopedia-3d-card.spec.js` 中 320 与减效用例通过；③ 无固定 `setTimeout` 等待超过 2s（用 `expect.poll`/`waitFor`）；④ 断言不写死 43/20 |
| 覆盖 AC | R-CARD-01~12、24~31、42、43、55 → AC-CARD-01~12、24~31、42、43、55 |
| 预估 | 0.70 人日 |
| 串行性 | 收尾（依赖 13/15/16）；阻塞 24 |
| 验证 | `npm run build`；`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js` |
| 边界 | 不改既有 spec；不改应用代码（缺陷回流 13/07） |

### T-CARD-20 E2E 图谱 3D（E-06~08、14）+ 既有 graph spec 回归

| 项 | 内容 |
|---|---|
| 目标 | 3D 图谱的拖拽旋转、文字不镜像、四类节点激活、区域手势划界、回滚与打印被端到端断言锁死；既有 13 组图谱 E2E 在 3D 上线后仍全绿 |
| 前置 | T-CARD-14、16、19 |
| 涉及文件 | 修改 `test/e2e/encyclopedia-3d-card.spec.js`（追加图谱段）<br/>修改 `test/e2e/encyclopedia-graph.spec.js`（仅新增形态判别辅助，不删断言） |
| 实现要点 | ① E-06 拖拽 200px：`--g3d-az` 值变化、松手 ≤600ms 停稳、无文字选中、无横向滚动；② 文字不镜像：旋转 0°/90°/180°/270° 四张截图基线，标签始终正立；③ E-07 四类节点点击行为与 AC-BG-18 一致；④ E-08 区域手势：图谱拖拽不换卡、卡片拖拽不改 `--g3d-az`；⑤ E-14 回滚：`VITE_ENC_3D=off` 构建后引导卡 + 2D 图谱；⑥ 打印：3D 容器不可见；⑦ 既有 `encyclopedia-graph.spec.js` 13 组：在 `wide/medium` 下图谱为 3D 时，把"节点选择器/画布选择器"抽象为 helper（2D→`.enc-graph-svg`，3D→`.enc-graph3d-node`），**断言内容与数量不变**；⑧ `no-webgl` project 下 3D 仍正常（证明不依赖 WebGL） |
| DoD | ① `npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js` 通过（含图谱段）；② `npm run test:e2e -- --project=desktop test/e2e/encyclopedia-graph.spec.js` 13 组通过；③ `npm run test:e2e -- --project=no-webgl test/e2e/encyclopedia-3d-card.spec.js` 通过；④ `git diff test/e2e/encyclopedia-graph.spec.js` 无删除的 `expect` 行 |
| 覆盖 AC | R-CARD-22、45~64 → AC-CARD-22、AC-CARD-45~64 |
| 预估 | 0.70 人日 |
| 串行性 | 不可并行（同 spec 文件与既有 spec） |
| 验证 | `npm run build`；`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-graph.spec.js`；`npm run test:e2e -- --project=no-webgl test/e2e/encyclopedia-3d-card.spec.js` |
| 边界 | 不改既有断言语义；不为通过测试改实现（缺陷回流 11/14） |

### T-CARD-21 `measure-enc-3d.mjs` 六断点/首帧/fps/CLS/包体量测

| 项 | 内容 |
|---|---|
| 目标 | 六断点形态、卡片高度占比、横向滚动、首帧、旋转帧率、CLS 与包体增量有一份可复算的量测报告 |
| 前置 | T-CARD-16、18 |
| 涉及文件 | 新增 `scripts/measure-enc-3d.mjs`（唯一主改）<br/>新增 `docs/tasks/assets/enc3d/*.json` |
| 实现要点 | ① 复用 `measure-bg-layout.mjs` 的骨架率与宽度公式，新增卡片区/3D 区两段；② 六断点（2560/1920/1440/1284/1025/721/375）输出 `scrollWidth/clientWidth`、卡片高度/视口高、图谱列宽、首屏是否可见正文标题；③ 首帧：解析 `card:first-paint` 与 `graph:build:start → graph:paint:end`（`?perf=1`），冷/热各 1 次取较差值，门槛 ≤200ms；④ 帧率：120 节点/300 边合成数据（脚本用既有 `buildGraphModel` 注入），10s 旋转录制取中位，desktop ≥50fps、移动（384×854 + CPU 4× 减速）≥45fps；⑤ CLS：`PerformanceObserver({type:'layout-shift'})` 累计 ≤0.02；长任务 ≤50ms；⑥ 包体：`vite build` 前后 gzip 对比，图标 ≤30KB、卡片 ≤40KB、3D ≤20KB；⑦ 输出 JSON + 控制台摘要，超阈值退出码非 0；⑧ OQ-06 边降采样是否启用须在报告字段 `edgeDownsample` 明确记录 |
| DoD | ① `npm run enc3d:measure` 退出 0；② 报告含六断点、首帧、fps、CLS、包体五类字段且均有实测数值（无 `TODO`）；③ 六断点 `scrollWidth === clientWidth`；④ desktop 中位 fps ≥50、mobile ≥45（若未达标须附降级结论）；⑤ `edgeDownsample` 字段有明确值 |
| 覆盖 AC | R-CARD-16、29、41、59、61 → AC-CARD-16、AC-CARD-29、AC-CARD-41、AC-CARD-59、AC-CARD-61 |
| 预估 | 0.70 人日 |
| 串行性 | 可与 19/20 并行（不同文件） |
| 验证 | `npm run build`；`npm run enc3d:measure`；`npm run bg:measure` |
| 边界 | 不把性能数值写进埋点；不改页面实现；脚本不引 Playwright 以外的新依赖 |

---

## 9. 批次 H：人工验收、发布回滚与全量门禁

### T-CARD-22 人工验收 14 项签核

| 项 | 内容 |
|---|---|
| 目标 | 14 条无法自动化的验收项有逐条结果与签核人，未通过项附跟进措施 |
| 前置 | T-CARD-19、20 |
| 涉及文件 | 新增 `docs/tasks/enc3d-manual-signoff.md` |
| 实现要点 | ① 逐条覆盖：AC-CARD-08（悬停/切标签/关闭不回弹）、09（横 50px / 纵 80px）、20（图标语义与热区）、30（320/768 触屏点击与滑动）、32（纯键盘全程）、33（读屏逐卡）、34（减效）、35（无焦点陷阱 + Ctrl+F）、38（中英最长条目）、47（CSS 3D 与既有禁令边界书面结论）、54（旋转 360° 文字不镜像 + 背向可读屏）、56（图谱纯键盘）、57（减效图谱）、58（六断点 + 低端模拟）；② 每条记录：环境（Chrome/Edge 版本、视口、NVDA/VoiceOver）、步骤、预期、实测、结论、签核人、日期；③ 未通过项写明缺陷编号与回流任务（07/11/14/15/16）；④ 不使用 axe 新依赖（沿用 Lighthouse + 人工） |
| DoD | ① 14 条均有"实测/结论/签核人"；② 通过项 ≥11 且未通过项均有回流任务编号；③ 灰度截图与 4 张旋转角度截图归档在 `docs/tasks/assets/enc3d/manual/`；④ 文档不写死词条数量 |
| 覆盖 AC | R-CARD-08、09、20、30、32~35、38、47、54、56~58 → 对应 AC |
| 预估 | 0.40 人日 |
| 串行性 | 可并行（与 21） |
| 验证 | 人工按清单逐条走查；`ls docs/tasks/assets/enc3d/manual/` |
| 边界 | 不替代自动化测试；不改实现 |

### T-CARD-23 发布说明、口径公告与纯前端回滚手册

| 项 | 内容 |
|---|---|
| 目标 | 发布范围、可回滚开关、依赖回退路径与口径变化有可执行文档，回滚不依赖后端与数据迁移 |
| 前置 | T-CARD-21、22 |
| 涉及文件 | 新增 `docs/tasks/enc3d-release-notes.md`（含回滚手册与口径公告） |
| 实现要点 | ① 发布范围：新增文件清单、修改文件清单、零改动清单（`global.css`/`guards.css`/`App.jsx`/`server/**`）；② 回滚开关：`VITE_ENC_3D=off`（同时回卡片与图谱）；图标回退 `VITE_CARD_ICON_SET=fa`；两级可独立使用；③ 回滚步骤：改环境变量 → `npm run build` → 发布静态产物；或直接 revert 本轮提交（纯前端，无迁移、无接口变更、无数据回填）；④ 回滚后回归清单：43 条深链（实时数）、7 参数、2D 图谱折叠/列表、`bg:*` 门禁；⑤ 口径公告：`entity_type:'graph'` 属取值扩展（OQ-02）、页面内记忆而非 sessionStorage（OQ-01）、选卡后焦点移入正文标题（OQ-03，与设计暂定不同）、旋转期边是否降采样（OQ-06 实测结论）；⑥ 性能与包体实测摘要引用 21 的报告 |
| DoD | ① 文档含「开关名 / 命令 / 验证步骤 / 预期结果」四要素；② 回滚路径中 `server/**` 与 DB 出现 0 次改动声明；③ 口径公告逐条对应 OQ 编号；④ 有"回滚后回归清单"可勾选表格 |
| 覆盖 AC | R-CARD-21/44/64/65 → AC-CARD-21、AC-CARD-44、AC-CARD-64、AC-CARD-65 |
| 预估 | 0.30 人日 |
| 串行性 | 可并行；阻塞 24 |
| 验证 | 按文档执行一次 `VITE_ENC_3D=off` 构建并核对引导卡 + 2D 图谱 |
| 边界 | 不做运行期 URL 开关；不写 sessionStorage；不引入后端开关 |

### T-CARD-24 全量门禁 + 65 行签核报告

| 项 | 内容 |
|---|---|
| 目标 | 所有自动化门禁一次跑通，65 条需求逐条勾选到验收结果，形成可归档的签核报告 |
| 前置 | 全部任务 |
| 涉及文件 | 新增 `docs/tasks/enc3d-gate-report.md` |
| 实现要点 | ① 执行并记录退出码：`npm run lint`、`npm run test:client`、`npm run bg:events`、`npm run enc3d:events`、`npm run build`、`npm run enc3d:measure`、`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js`、`npm run test:e2e -- --project=desktop test/e2e/encyclopedia-graph.spec.js`、`npm run test:e2e -- --project=no-webgl test/e2e/encyclopedia-3d-card.spec.js`；② 65 行表格：需求编号 / 任务编号 / AC 编号 / 验证形式 / 结果 / 证据位置（命令输出、截图、JSON）；③ 红线 14 条的复核结论（依赖 diff、路由 diff、CSS diff、存储搜索、`getContext` 搜索、正文哈希 `npm run bg:hash` 不变）；④ 未通过项一律阻断发布 |
| DoD | ① 上列命令全部退出 0（`ci:gate` 如因 MySQL 不可用，须在报告中说明并给出替代证据）；② 65/65 行有结果与证据位置；③ 14 条红线逐条"通过/不适用 + 证据"；④ `npm run bg:hash` 与改造前基线一致；⑤ 报告页首有总负责人与日期 |
| 覆盖 AC | 全部 65 → AC-CARD-01~65 |
| 预估 | 0.50 人日 |
| 串行性 | 不可并行（最后） |
| 验证 | 按报告逐命令复跑；`ls docs/tasks/assets/enc3d/` |
| 边界 | 不为过门禁而放宽断言；不放宽红线 |

---

## 10. R-CARD-01~65 → 任务 → AC 完整映射

| 需求 | 任务 | AC | 需求 | 任务 | AC |
|---|---|---|---|---|---|
| R-CARD-01 | 03、07 | AC-CARD-01 | R-CARD-34 | 07、16 | AC-CARD-34 |
| R-CARD-02 | 03、15 | AC-CARD-02 | R-CARD-35 | 07 | AC-CARD-35 |
| R-CARD-03 | 03、13 | AC-CARD-03 | R-CARD-36 | 15、16 | AC-CARD-36 |
| R-CARD-04 | 03、13 | AC-CARD-04 | R-CARD-37 | 03、15 | AC-CARD-37 |
| R-CARD-05 | 03 | AC-CARD-05 | R-CARD-38 | 05、15 | AC-CARD-38 |
| R-CARD-06 | 07、11、15 | AC-CARD-06 | R-CARD-39 | 06、17 | AC-CARD-39 |
| R-CARD-07 | 03、07 | AC-CARD-07 | R-CARD-40 | 17 | AC-CARD-40 |
| R-CARD-08 | 07 | AC-CARD-08 | R-CARD-41 | 17、21 | AC-CARD-41 |
| R-CARD-09 | 07、17 | AC-CARD-09 | R-CARD-42 | 13 | AC-CARD-42 |
| R-CARD-10 | 07、13 | AC-CARD-10 | R-CARD-43 | 13、15 | AC-CARD-43 |
| R-CARD-11 | 07、13 | AC-CARD-11 | R-CARD-44 | 13、23 | AC-CARD-44 |
| R-CARD-12 | 13 | AC-CARD-12 | R-CARD-45 | 09、11、12 | AC-CARD-45 |
| R-CARD-13 | 07 | AC-CARD-13 | R-CARD-46 | 09、11、18 | AC-CARD-46 |
| R-CARD-14 | 03、07 | AC-CARD-14 | R-CARD-47 | 09、10 | AC-CARD-47 |
| R-CARD-15 | 07、15 | AC-CARD-15 | R-CARD-48 | 09、11 | AC-CARD-48 |
| R-CARD-16 | 07、21 | AC-CARD-16 | R-CARD-49 | 11、12、17 | AC-CARD-49 |
| R-CARD-17 | 07 | AC-CARD-17 | R-CARD-50 | 11、12 | AC-CARD-50 |
| R-CARD-18 | 02、18 | AC-CARD-18 | R-CARD-51 | 09、11、12 | AC-CARD-51 |
| R-CARD-19 | 02、15 | AC-CARD-19 | R-CARD-52 | 11、12、14、20 | AC-CARD-52 |
| R-CARD-20 | 02 | AC-CARD-20 | R-CARD-53 | 11、14 | AC-CARD-53 |
| R-CARD-21 | 02、23 | AC-CARD-21 | R-CARD-54 | 11、12、16 | AC-CARD-54 |
| R-CARD-22 | 13、14 | AC-CARD-22 | R-CARD-55 | 13、14、16 | AC-CARD-55 |
| R-CARD-23 | 13、15 | AC-CARD-23 | R-CARD-56 | 11、12、14 | AC-CARD-56 |
| R-CARD-24 | 07、13 | AC-CARD-24 | R-CARD-57 | 12、16 | AC-CARD-57 |
| R-CARD-25 | 13 | AC-CARD-25 | R-CARD-58 | 14、16、20 | AC-CARD-58 |
| R-CARD-26 | 13 | AC-CARD-26 | R-CARD-59 | 09、11、21 | AC-CARD-59 |
| R-CARD-27 | 07、11、13 | AC-CARD-27 | R-CARD-60 | 15、16 | AC-CARD-60 |
| R-CARD-28 | 03、16 | AC-CARD-28 | R-CARD-61 | 14、16、21 | AC-CARD-61 |
| R-CARD-29 | 15、21 | AC-CARD-29 | R-CARD-62 | 13、14 | AC-CARD-62 |
| R-CARD-30 | 07、15 | AC-CARD-30 | R-CARD-63 | 06、17、18 | AC-CARD-63 |
| R-CARD-31 | 07、15 | AC-CARD-31 | R-CARD-64 | 13、14、16、20、23 | AC-CARD-64 |
| R-CARD-32 | 07、14 | AC-CARD-32 | R-CARD-65 | 18、23、24 | AC-CARD-65 |
| R-CARD-33 | 07、05 | AC-CARD-33 | | | |

> 覆盖核对：65/65 条需求均有任务落点与 AC 编号；无"无主需求"。

---

## 11. 测试拆分与门禁清单

| 层 | 文件 | 用例数 | 断言重点 | 命令 |
|---|---|---|---|---|
| 纯函数 | `client/src/lib/__tests__/encyclopediaCards.test.js` | 18 | 夹紧/单源/确定性/字段派生/读屏名/选中索引 | `npx vitest run src/lib/__tests__/encyclopediaCards.test.js`（client） |
| 纯函数 | `client/src/lib/__tests__/encyclopediaGraph3d.test.js` | 20 | 视角夹紧/深度/线段/投影/背向/导航/2D 回归 | `npx vitest run src/lib/__tests__/encyclopediaGraph3d.test.js` |
| 纯函数 | `client/src/lib/__tests__/encyclopediaGestures.test.js` | 6 | 区域判定 + 主轴夹角 3 类 | `npx vitest run src/lib/__tests__/encyclopediaGestures.test.js` |
| 组件 | `client/src/components/__tests__/CardSwap.test.jsx` | 20 | 两用法/DOM 预算/键盘/拖拽/暂停/降级/空态/隔离 | `npx vitest run src/components/__tests__/CardSwap.test.jsx` |
| 组件 | `client/src/components/__tests__/Graph3DScene.test.jsx` | 16 | 节点边计数/无 canvas/背向/手势/缩放/复位/键盘/降级 | `npx vitest run src/components/__tests__/Graph3DScene.test.jsx` |
| 组件 | `client/src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx`（既有 +8） | 24 | 形态选择/2D 回归/折叠位次/fallback/aria-pressed/打印 | `npx vitest run src/components/__tests__/EncyclopediaKnowledgeGraph.test.jsx` |
| 组件 | `client/src/components/__tests__/cardGraphTracking.test.jsx` | ≥6 | 6 事件/去抖/去重/无敏感键 | `npx vitest run src/components/__tests__/cardGraphTracking.test.jsx` |
| i18n | `client/src/i18n/__tests__/encyclopediaCardI18n.test.js` | ≥4 | 34 键中英一致/既有键不变/无 `{{` | `npx vitest run src/i18n/__tests__/encyclopediaCardI18n.test.js` |
| 埋点 | `client/src/test/analytics.test.js`（既有 +7） | — | 6 事件入队/非法键丢弃/12 键快照 | `npx vitest run src/test/analytics.test.js` |
| E2E | `test/e2e/encyclopedia-3d-card.spec.js` | E-01~14 | 选择/深链/筛选/断点/减效/键盘/打印/旋转/区域手势/回滚 | `npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js` |
| E2E 回归 | `test/e2e/encyclopedia-graph.spec.js` | 13 组 | 既有图谱断言不减量 | `npm run test:e2e -- --project=desktop test/e2e/encyclopedia-graph.spec.js` |
| E2E 无 WebGL | 同上（3D spec） | 关键组 | 禁用 WebGL 时 3D 与交互正常 | `npm run test:e2e -- --project=no-webgl test/e2e/encyclopedia-3d-card.spec.js` |
| 量测 | `scripts/measure-enc-3d.mjs` | — | 六断点/首帧/fps/CLS/包体 | `npm run enc3d:measure` |
| 门禁 | `scripts/check-card-events.mjs` | 10+ 项 | 6 事件/12 键/禁库/无 canvas/断点单源/CSS 只追加 | `npm run enc3d:events` |
| 门禁回归 | `scripts/check-bg-events.mjs` | 12 项 | 7 事件/12 键/禁库/无 WebGL | `npm run bg:events` |

**E2E 断言要点（不可省略）**：旋转可暂停（悬停 5s 角度保持、切标签 10s 不追赶、手动关闭 30s 不回弹）/ reduced-motion（无自动轮播与自动旋转、仍可操作）/ 断点降级（六态形态与无横向滚动）/ 文字不镜像（四角度截图基线）/ 键盘（卡片与图谱双路径）/ 邻接高亮（旋转中不漂移）/ 性能（10s 录制与首帧打点）。

---

## 12. 发布门禁与回滚

**上线前门禁（全部退出 0）**

```text
npm run lint
npm run test:client
npm run bg:events
npm run enc3d:events
npm run build
npm run enc3d:measure
npm run test:e2e -- --project=desktop test/e2e/encyclopedia-3d-card.spec.js
npm run test:e2e -- --project=desktop test/e2e/encyclopedia-graph.spec.js
npm run test:e2e -- --project=no-webgl test/e2e/encyclopedia-3d-card.spec.js
npm run bg:hash          # 正文哈希与改造前基线一致
```

**回滚（纯前端，单一开关）**

| 项 | 内容 |
|---|---|
| 开关 | `VITE_ENC_3D=off`（同时回卡片与图谱）；默认 `on` |
| 步骤 | 改环境变量 → `npm run build` → 发布静态产物；或直接 revert 本轮提交 |
| 回滚后形态 | 引导态回到 `EncyclopediaGuide` 4 张导引卡；图谱回到既有 2D SVG（含折叠/列表） |
| 不依赖 | 后端接口、数据库、数据迁移、路由（本轮零后端改动） |
| 图标回退 | `VITE_CARD_ICON_SET=fa`（功能零损失） |
| 回归 | 全部深链可打开；7 参数语义不变；`bg:*` 与既有 13 组图谱 E2E 全绿 |

---

## 13. 待确认项与记录项

| 编号 | 事项 | 当前处理 | 是否阻塞 |
|---|---|---|---|
| Q-CARD-01~06、09~11 | 需求侧必须确认项 | 均按用户「已采用默认口径」执行（§0.6） | 不阻塞（已确认） |
| OQ-03 差异 | 用户口径「选卡后焦点入正文标题」与设计 §13.2 暂定「留在卡片」不同 | 任务按用户口径（T-CARD-13）；**建议回填设计/需求文档** | 不阻塞，但需书面确认 |
| OQ-08 | hugeicons 精确版本号与 Free 包商用许可 | T-CARD-02 开工前确认；安装当日写入 lock | **阻塞 T-CARD-02** |
| OQ-02 | `entity_type:'graph'` 取值扩展是否可接受 | 暂用 `'graph'` + `entity_id:'encyclopedia'` | 不阻塞；否决则改 `'category'` |
| OQ-06 | 旋转期边是否降采样 | 默认不降采样，量测不达标再启用；报告须记录 `edgeDownsample` | 不阻塞 |
| OQ-01 | 「会话内记忆」是否允许 sessionStorage | 不允许，退化为页面内内存（刷新回默认） | 不阻塞 |
| OQ-05 | 卡片是否使用缩略图 | 默认不用图；有本地授权资源才填 `imagePath` | 不阻塞 |

---

## 14. 签核

| 项 | 结论 | 责任人 | 日期 |
|---|---|---|---|
| 任务范围与批次划分 | 待确认 | — | — |
| 文件唯一主改矩阵（§0.7） | 待确认 | — | — |
| 65 条需求覆盖完整性（§10） | 待确认 | — | — |
| OQ-03 口径差异处理 | 待确认 | — | — |
| OQ-08 hugeicons 版本与许可 | 待确认 | — | — |

**文档结束**。本文件仅定义编码任务与验收口径，不含实现代码；确认后方可进入编码阶段，编码由任务执行方负责。