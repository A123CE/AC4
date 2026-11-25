# 百科图谱改造前基线（T-BG-01）

- 执行时间：2026-11-23
- 分支：建筑模型的功能修改（`55852d8` 之后的 BK 阶段提交 + BG 文档提交）
- 服务：`http://localhost:3001`（生产构建，改造前状态：无图谱、详情区单列 1040px）
- 采集脚本：`scripts/bg-content-hash.mjs`（内容哈希）、临时 Playwright 脚本（布局，未入库）
- 原始数据：`docs/tasks/assets/bg-baseline/layout-before.json`、`content-hash-before.json`

## 1. 内容哈希基线

```json
{
  "total": 43,
  "fetched": 43,
  "aggregate": "7302b5fa51d0536b38c8cf617941377428711ad14a4e5a53545a9d8b9e7963ad",
  "perIdKeys": 43
}
```

- 口径：`/api/encyclopedia?page_size=500&include=content`，缺 content 回退 `/:id`；按 id 升序拼接
  `id / term / synopsis / content / category`（`\u0000` 分隔）逐条 SHA-256，再对全部条目拼接取 SHA-256。
- 复算：
  `node scripts/bg-content-hash.mjs --base-url=http://localhost:3001 --out=docs/tasks/assets/bg-baseline/content-hash-after.json`
- 判定：`total` 由接口给出（脚本不写死数量）；`aggregate` 必须为 64 位十六进制；改造后须与本节一致。

## 2. 四组合布局基线（改造前）

| 视口 | 模式 | detailClientWidth | padding L/R | contentBox | articleWidth | blankRatio | scrollOverflow | readingChars | titleRect（w/left） | CLS |
|---|---|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 引导 | 1580 | 40/40 | 1500 | 0 | 100.0%（无 article） | false | — | — | 0 |
| 1920×1080 | 详情 | 1580 | 40/40 | 1500 | 1040 | **30.7%** | false | 116.7 | 974 / 413 | 0 |
| 1440×900 | 引导 | 1100 | 40/40 | 1020 | 0 | 100.0%（无 article） | false | — | — | 0 |
| 1440×900 | 详情 | 1100 | 40/40 | 1020 | 1020 | **0.0%** | false | 114.4 | 954 / 413 | 0.0001 |

说明：
- 引导态无 `.enc-article`，故 `blankRatio=100%` 是公式空值表现；改造后统一以 `.enc-detail-grid/.enc-detail-main/.enc-graph-panel` 计算（§13.1）。
- 1920 详情态 30.7% 与设计测算一致（允许 30.0~31.0），空白只在 ≥1460px 出现。
- `readingChars` 改造前 114~117ch，改造后目标 60~75ch（1440 详情态）。
- CLS 实测 0 / 0.0001（目标 ≤0.02）。

## 3. 改造前截图

| 文件 | 视口 | 模式 |
|---|---|---|
| `docs/tasks/assets/bg-baseline/1920-guide-before.png` | 1920×1080 | 引导 |
| `docs/tasks/assets/bg-baseline/1920-detail-before.png` | 1920×1080 | 详情 |
| `docs/tasks/assets/bg-baseline/1440-guide-before.png` | 1440×900 | 引导 |
| `docs/tasks/assets/bg-baseline/1440-detail-before.png` | 1440×900 | 详情 |

> 截图通过 CDP `Page.captureScreenshot` 获取（避免 Playwright 等待字体加载超时），仅作视觉基线。

## 4. 阶段隔离提交

- BK A~G 与 BG 文档已按阶段拆分为 9 个提交（`c9bf20a`…`59e963f`），工作区在此文档前无未提交业务改动。
- 本轮 T-BG-01 产物（哈希脚本、基线文档、截图/JSON）单独提交。
- `test-results/` 已清理，不入库。

## 5. 结论

- 基线完整可复算：空白率、CLS、行宽、标题位置、滚动溢出、43 条内容哈希。
- 后续 T-BG-12/17 复用同一口径；若 `aggregate` 变化，视为词条正文被改动，需单独说明。