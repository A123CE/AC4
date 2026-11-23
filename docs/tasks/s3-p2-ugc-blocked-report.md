# S3 P2 UGC 笔记公开阻断验收报告

- 结论：**本期不做 UGC 公开**（P2-5 全量阻断），仓库中不存在迁移、路由、接口、UI 或开关痕迹。
- 依据：需求 §6.1/§6.3、ADR-S3-09、AC-S3-29、CG-01~08、MG-01~06。

## 1. 验收记录

| 项 | 内容 |
|---|---|
| 执行时间 | 2026-11-23 |
| 执行人 | 编码侧自检（待评审签字） |
| 静态扫描 | `npm run ugc:check` → 8 项全部 PASS，退出码 0 |
| 负向自测 | 临时创建 `server/db/migration_public_16_ugc_public.sql`（空文件）→ 退出码 1；删除后恢复 0 |
| 运行时探测 | `test/e2e/ugc-blocked.spec.js` → 3 条通过 |
| SEO 侧 | `npm run seo:check` → 18 项全绿（sitemap 不含 note/ugc） |

### 1.1 静态扫描输出摘要

```
PASS  server/db 无迁移 16 UGC
PASS  server/src/routes 无 ugc 路由文件
PASS  app.js 无 /api/ugc 挂载
PASS  server/src/config 不存在或无 UGC 键
PASS  前端无 data-testid=public*
PASS  前端无 UGC 可达文案
PASS  searchService 不查询 user_collections
PASS  sitemapService 不含 user_collections/note
```

### 1.2 运行时探测

| 请求 | 期望 | 结果 |
|---|---|---|
| `GET /api/ugc/public` | 404 | 404 |
| `POST /api/ugc/reports` | 404 | 404 |
| `GET /api/ugc/moderation/queue` | 404 | 404 |
| `GET /sitemap.xml` | 不含 `user_collections` / `note` / `ugc` | 通过 |
| `GET /api/search?q=笔记` | 无 note/ugc 分组 | 通过 |
| `/profile`、`/exhibition/:id` | 无 `data-testid*=public`、无公开/发布/审核/举报入口 | 通过 |

## 2. 发布门禁

发布前必须同时满足：

1. `npm run ugc:check` → 退出码 0
2. `npm run seo:check` → 退出码 0

任一项失败即阻断发布，不得以"管理员可见/灰度/隐藏入口"方式绕过。

## 3. 解禁条件（不成立即维持阻断）

- CG-01~08 全部满足；
- MG-01~06 继承并签字；
- 审核人力与 SLA 有明确承诺（R-S3-09）；
- 书面评审通过，并另立新编号任务，不沿用本期编号。

## 4. 边界声明

- 本报告不包含任何 UGC 设计实现细节，仅引用 `docs/design/s3-p2-design.md`；
- "验收通过"仅表示**阻断成立**，不表示可以开启灰度或隐藏入口；
- `user_collections` 仍维持既有私有语义（本人可见），未做任何公开化改动。