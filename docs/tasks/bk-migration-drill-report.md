# 迁移 16 演练与对账报告（T-BK-07）

| 项 | 内容 |
|---|---|
| 执行时间 | 2026-11-23 |
| 环境 | 本地 MySQL，库 `ac4_test`（由 `npm run db:test:init` 重建） |
| 迁移文件 | `server/db/migration_public_16_building_knowledge.sql` |
| 回滚文件 | `server/db/rollback_public_16_building_knowledge.sql` |
| 结构对比 | `npm run schema:diff` → **通过**（init_full 与全部 migration_public 结构一致） |

## 1. 执行顺序

1. `npm run db:test:init`（init_full 重建 + 迁移）
2. 迁移 16 连续执行两遍（第二遍幂等）
3. 执行回滚脚本
4. 再次执行迁移 16（恢复）
5. 每阶段执行 6 项对账

## 2. 六项对账

| # | 对账项 | 期望 | 迁移后实际 | 回滚后实际 | 再迁移后实际 | 结论 |
|---|---|---|---|---|---|---|
| 1 | 词条总数 | 26 → 26+17 → 26 → 43 | 43 | 26 | 43 | ✅ |
| 2 | 既有 26 条 id 集合 | 完全一致 | 一致 | 一致 | 一致 | ✅ |
| 3 | 既有 26 条 `content` 哈希 | 不变 | `5a0e25c6…` | 同上 | 同上 | ✅ |
| 4 | `related_palaces` 只增 | 追加项存在、旧值不丢 | 22 条含追加建筑 | 追加项 0 | 22 条恢复 | ✅ |
| 5 | 失效主关联数 | 0 | 0 | —（列已删） | 0 | ✅ |
| 6 | 17 条新词条 id 存在性 | 17 → 0 → 17 | 17 | 0 | 17 | ✅ |
| 附 | 英文译稿（term） | 34 → 0 → 34 | 34 | 0 | 34 | ✅ |
| 附 | 新列 / 新索引 | 11 / 3 → 0 / 0 → 11 / 3 | 11 / 3 | 0 / 0 | 11 / 3 | ✅ |

## 3. 幂等性

- 迁移连续执行两遍：总数、哈希、draft 数、列/索引计数完全一致；
- 回滚脚本重复执行：第二次为空操作（列/索引判存、`DELETE ... IN` 白名单）；
- 再迁移：结构与数据恢复至首次迁移后状态，与被删前逐项一致。

## 4. 关键实现说明

- 列/索引：`information_schema` 判存 + `PREPARE/EXECUTE`；
- 种子：`INSERT ... ON DUPLICATE KEY UPDATE id = id`（存在即不改正文）；
- 关联：先 `JSON_VALID` 归一，再 `JSON_ARRAY_APPEND ... WHERE NOT JSON_CONTAINS`（只追加）；
- 译稿：`ON DUPLICATE KEY UPDATE value = value`（不覆盖既有译文）；
- 回滚：按依赖倒序删除译稿 → 删除 17 条白名单词条 → 移除本轮追加的 55 项关联（仅移除基线中原本不存在的值）→ 删索引 → 删列。

## 5. 遗留

- `init_full.sql` 已同步：表定义（11 列 + 3 索引）、17 条种子、55 项关联补丁、34 条译稿；
- 配图仍未获得授权（见 `docs/content/bk-image-credits.md`），前端按“无图降级”处理；
- 迁移执行器按已应用记录跳过重复文件，本报告中的“再迁移”通过直接执行迁移 SQL 完成，用于验证幂等逻辑本身。