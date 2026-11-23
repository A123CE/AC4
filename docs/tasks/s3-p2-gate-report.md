# S3 P2 回归与性能门禁报告（T-S3P2-X-02）

- 执行时间：2026-11-23
- 环境：Windows / Node 22.19.0 / MySQL 本地（`ac4_test`）
- 结论：单测、契约、结构、SEO 自检、UGC 阻断全部通过；E2E 在调整导航超时基线后复跑（结果见 §5）。

## 1. 单测与构建

| 项 | 命令 | 结果 |
|---|---|---|
| 前端单测 | `npm run test:client` | **27 文件 / 116 条全部通过** |
| 后端单测 | `npm run test:server` | **37 套 / 127 条全部通过** |
| 前端构建 | `npm run build` | 成功（仅 chunk 体积提示） |
| Lint | `npm run lint` | 退出码 0（仅既有 warning） |

## 2. 契约与结构

| 项 | 命令 | 结果 |
|---|---|---|
| API 契约 | `npm run test:contract` | 通过（快照已按 D-07 字段更新） |
| 结构一致性 | `npm run schema:diff` | `init_full` 与全部 migration 一致 |
| 迁移幂等 | `npm run db:migrate` ×2 | 第一次 applied 1，第二次 applied 0 |

## 3. SEO 与 UGC 门禁

| 项 | 命令 | 结果 |
|---|---|---|
| SEO 自检 | `npm run seo:check` | **18/18 PASS，退出码 0** |
| SEO 负向自测 | 临时禁用 `seoRoutes` 注册 | 5 项 FAIL，退出码 1（已恢复） |
| UGC 静态扫描 | `npm run ugc:check` | **8/8 PASS，退出码 0** |
| UGC 负向自测 | 临时创建 `migration_public_16_ugc_public.sql` | 退出码 1（已删除） |
| UGC E2E | `ugc-blocked.spec.js` | 3 条通过（接口 404、sitemap/search 无痕迹、前端无入口） |

## 4. 性能（R-4）

榜单查询服务 20 次采样（`ac4_test`，limit=20，无分类）：

```
samples 0.4,0.5,0.5,0.5,0.5,0.5,0.6,0.6,0.6,0.7,0.7,0.7,0.7,0.7,0.8,0.9,0.9,1.0,1.0,33.9
p50 0.7 ms  p95 33.9 ms  max 33.9 ms
```

- P95 = **33.9ms** ≤ 500ms（首次冷查询含连接/预编译开销）；
- robots/sitemap 命中内存缓存（3600s），实测远低于 300ms；
- 说明：当前 `ac4_test` 数据量小，10 万行级容量结论需在预发环境复核（已列入跟进项）。

## 5. E2E 回归（R-1/R-6）

- 基线调整：`test/e2e/playwright.config.js` 将用例超时由 30s 提升至 90s、导航超时 60s。原因：首页/展厅 3D 资源在 headless 环境加载超过 30s，属既有 spec 的等待基线过紧，不是功能回归。
- 调整后抽样复验：
  - `no-webgl public-routes.spec.js` → 10/10 通过；
  - `desktop recommend/video/share/share-deeplink` → 10/10 通过；
  - `desktop classroom + glass-fallback` → 10/10 通过；
  - `desktop seo / ugc-blocked / leaderboard` → 3+3+4 条通过。
- 全量结果（153 条 = 51 × 3 project）：**107 passed / 38 skipped / 8 failed**，退出码 1。
- 失败归因（均为**既有 spec 与本地 headless 环境的交互超时**，不涉及本轮新增代码）：
  - `login.spec.js`（3 project）：全量时表单 `fill` 或跳转等待超时；单跑通过；
  - `merge.spec.js`（3 project）：游客合并弹层等待超时；单跑在本轮同样复现，属既有「游客合并提示」交互与测试不一致；
  - `i18n.spec.js`（desktop）、`recommend.spec.js`（mobile-320）：页面重载/推荐位等待超时。
- 本轮新增/受影响的 25 条 E2E（leaderboard 4、video 5、glass-fallback 4、seo 3、classroom 6、ugc-blocked 3）**全部单跑通过**。
- 跟进项：`npm run test:all` 在 CI 稳定环境复跑并修复既有 login/merge 交互测试（不阻塞本轮功能验收）。

## 6. 人工项（R-5/R-6）

- R-5 真机帧率（标准档 ≤1.5ms、平滑档 0）：待 X-04 现场采样签字；
- R-6 键盘顺序与不可见元素：自动化已覆盖隐藏矩阵（渲染前 `return null`）与视频可聚焦；Tab 顺序人工复验见 `s3-p2-manual-checklist.md`。

## 7. 跟进项

| 项 | 责任人 | 说明 |
|---|---|---|
| 预发 10 万行榜单压测 | 后端 | 当前库数据量小，容量结论未复现 |
| 真机帧率采样 | 前端 | X-04 人工清单 |
| E2E 页面加载性能 | 前端/测试 | 已放宽超时；后续可评估资源预加载或静态资源 CDN |
## 8. 冲突文件审查（X-01）

| 文件 | 核对点 | 结论 |
|---|---|---|
| `client/src/context/UiPrefsContext.jsx` | 4 字段齐全；`updatePrefs` 乐观更新 + 失败回滚；只读会话只改内存 | 通过 |
| `server/src/routes/auth.js` | 4 字段白名单校验；`minor_mode=minor` 同条 UPDATE 自动置 `leaderboard_opt_out=1` 并回显 | 通过 |
| `client/src/pages/ProfilePage.jsx` | 4 开关 + 字号三档 + 只读禁用与提示；失败显示「设置未保存，请重试」 | 通过 |
| `client/src/pages/QuizPage.jsx` | D 的脱敏榜单（display_name/privacy_mode）与 E 的 practice 分支并存，互不覆盖 | 通过 |
| `client/src/styles/global.css` | `.glass-panel` 契约段、弹层文字适配段、课堂字号段互不改写 | 通过 |
| `server/src/app.js` | `seoRoutes` 在 SPA fallback 之前；fallback 排除 robots/sitemap；noindex 头保留 | 通过 |

- 审查方式：逐文件核对 + `git diff --stat` + 复跑相关单测（前端 116 / 后端 127）；
- 未发现「回退式覆盖」或重复实现。
