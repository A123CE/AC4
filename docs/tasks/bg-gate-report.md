# 百科知识图谱全量门禁与 39 行签核报告（T-BG-17）

- 分支：建筑模型的功能修改
- 日期：2026-11-24
- 结论：**有条件发布**（功能与自动门禁全部通过；3 项人工签字待补，登记 BG-M-01~03）

## 1. 门禁命令（§14.1）

| 序 | 命令 | 结果 |
|---|---|---|
| 1 | `npm run lint` | ✅ 退出 0 |
| 2 | `npm run test:client` | ✅ **33 文件 / 184 条通过**（含图谱 24 + 组件 16） |
| 3 | `npm run db:test:init && npm run test:server` | ✅ **133 通过 / 0 失败** |
| 4 | `npm run build` | ✅ 成功 |
| 5 | `npm run bk:events` | ✅ 14/14 |
| 6 | `npm run bg:events` | ✅ 10/10（负向注入 `graph_extra` → 退出 1，已恢复） |
| 7 | `npm run bg:measure` | ✅ `passed=true`；四组合 blank 0.0%、CLS 中位 ≤0.02、行宽 61.9/74ch、renderTotal ≤200 |
| 8 | `npm run test:e2e -- --project=desktop encyclopedia-graph.spec.js` | ✅ 12 passed / 1 skipped（320 专项） |
| 9 | `npm run test:e2e -- --project=mobile-320 encyclopedia-graph.spec.js` | ✅ 2 passed / 11 skipped（其余为桌面专项） |
| 10 | `npm run test:contract` | ✅ 通过（快照含新 meta） |
| 11 | `npm run schema:diff` | ✅ init_full 与迁移一致 |

**词条哈希**：`7302b5fa51d0536b38c8cf617941377428711ad14a4e5a53545a9d8b9e7963ad`，与 T-BG-01 基线**完全一致**（43 条）。

## 2. 回归 9 项

| # | 项 | 结果 |
|---|---|---|
| 1 | 抽样深链 `?term=tiantan-eaves` | ✅ 标题「天坛·三重攒尖与二十八柱的祈年殿」 |
| 2 | 搜索「斗拱」「屋顶」 | ✅ groups 含 `term`（及 palace/question/timeline），命中不减 |
| 3 | 双主轴筛选 `?building=tiantan` | ✅ 列表 6 条，与图谱同源 |
| 4 | 列表键盘/点击（AnimatedList） | ✅ 点击进入 `?term=` |
| 5 | 3D 联动 | ✅「前往 3D 模型查看该构件」→ `/gallery` |
| 6 | `ShareButton` | ✅ 详情头部 1 个分享入口 |
| 7 | canonical | ✅ 1 个且为 `?term=tiantan-eaves` |
| 8 | noindex | ✅ `?building=` 返回 `X-Robots-Tag: noindex, follow` |
| 9 | 其他页面冒烟 | ✅ `/`、`/gallery`、`/quiz`、`/routes` 均 200 |

## 3. 39 行签核

> 需求编号以 `docs/requirements/encyclopedia-knowledge-graph-spec.md` 为准；证据类型：U=单测、E=E2E、M=量测、D=文档、H=人工待签。

| 需求 | 任务 | 证据 | 结论 |
|---|---|---|---|
| R-BG-01 | T-BG-10/11/12 | M 四组合 blank 0.0% | ✅ |
| R-BG-02 | T-BG-11/12 | M 1920/1440 四组合、CLS 中位 | ✅（首访 0.022 已记录） |
| R-BG-03 | T-BG-12/13 | E 组 3（320/900/1440/1920 无横向） | ✅ |
| R-BG-04 | T-BG-11/12 | M `readingChars` 61.9/74 | ✅ |
| R-BG-05 | T-BG-11/12 | M 左栏 340、contentBox 1500 | ✅ |
| R-BG-06 | T-BG-05/07 | U G-01/G-14/G-17 | ✅ |
| R-BG-07 | T-BG-05/07 | U G-06/G-12 | ✅ |
| R-BG-08 | T-BG-05/07 | U G-01/G-03/G-15 | ✅ |
| R-BG-09 | T-BG-05/07 | U G-07/G-08 | ✅ |
| R-BG-10 | T-BG-15 | `bg:events` 无新路由/图库 | ✅ |
| R-BG-11 | T-BG-10/13 | E 组 4/5 同源联动 | ✅ |
| R-BG-12 | T-BG-05/07 | U G-03/G-09 | ✅ |
| R-BG-13 | T-BG-10/11/16 | D 发布说明 G1 口径 | ✅ |
| R-BG-14 | T-BG-10/12/13 | E 组 1/2 常驻 320~420 | ✅ |
| R-BG-15 | T-BG-11/14/16 | `bg:check` 无全站浮层；H 灰度 | ✅/H |
| R-BG-16 | T-BG-10/13 | E 组 1/2（两态） | ✅ |
| R-BG-17 | T-BG-15/16 | `bg:events` 无 fixed 浮层 | ✅ |
| R-BG-18 | T-BG-08/09 | U C-03~C-06 | ✅ |
| R-BG-19 | T-BG-09/13 | E 组 4/6；U C-06 | ✅ |
| R-BG-20 | T-BG-06/07/09 | U G-16/G-19；C-09 不位移 | ✅ |
| R-BG-21 | T-BG-06/07/09 | U G-21；C-13 复位 | ✅ |
| R-BG-22 | T-BG-09/14 | C-07/C-08；H 读屏 | ✅/H |
| R-BG-23 | T-BG-08/09/13 | C-01/C-02；E 组 10 | ✅ |
| R-BG-24 | T-BG-08/09/14 | C-14；H 灰度/读屏 | ✅/H |
| R-BG-25 | T-BG-16 | D 回滚手册 + dry-run | ✅ |
| R-BG-26 | T-BG-03/04/09/13 | U i18n 3 + Guide 2；E 组 9 | ✅ |
| R-BG-27 | T-BG-03/14 | U 键集合/占位符；文案检索 0 | ✅ |
| R-BG-28 | T-BG-03 | U 既有键保留（`{{count}}` 不动） | ✅ |
| R-BG-29 | T-BG-08/11/14 | D 双编码；H 灰度 | ✅/H |
| R-BG-30 | T-BG-12/17 | M 性能/体积入表 | ✅ |
| R-BG-31 | T-BG-10/11/13 | E 组 3/8；H 打印已自动验 | ✅ |
| R-BG-32 | T-BG-09/14 | C-08；H NVDA 播报 | ✅/H |
| R-BG-33 | T-BG-05/07 | U G-02/G-03（仅 published 池） | ✅ |
| R-BG-34 | T-BG-02/09/13 | U analytics 6；C-15；E 组 12 | ✅ |
| R-BG-35 | T-BG-02/15/13 | `bg:events` 12 键；E 组 12 无身份 | ✅ |
| R-BG-36 | T-BG-12/17 | M 四组合 + 本报告 | ✅ |
| R-BG-37 | T-BG-13/17 | E 12/13 组 + 回归 9 项 | ✅ |
| R-BG-38 | T-BG-02/09/13 | 4 事件抓包（E 组 12） | ✅ |
| R-BG-39 | T-BG-14/17 | 人工清单 6 项 + 跟进编号 | ⚠️ 有条件（待签 3 项） |

**统计**：39/39 有任务与证据；36 项自动通过，1 项（R-BG-39）待人工签字完成，2 项（R-BG-15/R-BG-24/R-BG-29/R-BG-32 的人工部分）以“自动通过 + 人工待签”记录。

## 4. 体积与依赖

| 项 | 值 |
|---|---|
| 全站 JS gzip | 705,000 B |
| 全站 CSS gzip | 46,895 B（图谱新增段 6,295 B） |
| 依赖变更 | **0**（根/客户端依赖段未变） |
| 第三方图库/axe | 未引入 |

## 5. 未通过项与跟进

| 编号 | 项 | 影响 | 跟进 | 是否阻塞 |
|---|---|---|---|---|
| BG-M-01 | 键盘全流程人工复验 | R-BG-22/39 | 人工签字 | 否（自动已覆盖） |
| BG-M-02 | Achromatopsia 灰度截图 | R-BG-24/29 | 人工签字 | 否 |
| BG-M-03 | Lighthouse Accessibility + 读屏 | R-BG-32/39 | 人工签字 | 否 |
| Q-BG-08 等记录项 | 见发布说明 §5 | 无 | 后续 | 否 |

## 6. 结论

**有条件发布**：代码、测试、量测、门禁与回归全部通过；人工签字项（BG-M-01~03）在发布前补齐证据并签核。无阻塞缺陷，无需数据库回滚（纯前端 revert 手册见 `bg-release-notes.md`）。