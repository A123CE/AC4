# 建筑知识内容台账（T-BK-01）

- 上游：`docs/design/building-knowledge-enrichment-design.md`（ADR-BK-01~13）
- 正文稿件：`docs/content/entries/<term_id>.md`（每条 ≥300 字，≥3 个 ▲ 小节）
- 口径：建筑专属词条 `entry_type='building'`，通用术语 `entry_type='craft'`；类目为「名筑档案」或既有 11 类；不新增「营造工艺」类目
- 维度枚举：`site-layout`（选址与布局）、`structure-material`（结构与材料）、`roof-decoration`（屋顶与装饰）、`ritual-function`（礼制与功能）、`conservation-heritage`（保护与遗产）

## 1. 建筑专属词条（10 条）

| term_id | 标题 | category | entry_type | primary_palace_id | synopsis 字数 | knowledge_dimensions | related_terms（≥3） | related_palaces | source_refs | image_dir | 许可 | 审核 | 核校日期 | 正文 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `changcheng-wall` | 长城·依山就势的墙体与烽燧体系 | 名筑档案 | building | `changcheng` | 60–110 | `structure-material`、`conservation-heritage` | `hangtu`、`fengsui`、`shiqiang` | `changcheng` | 中国长城学会公开资料；国家文物局长城保护公开文本 | `images/encyclopedia/changcheng-wall/` | 本轮无图（降级） | 待审 | 2026-11-23 | `changcheng-wall.md` |
| `gugong-axis` | 故宫全景·中轴秩序与「三朝五门」 | 名筑档案 | building | `gugong` | 80–120 | `site-layout`、`ritual-function` | `sanchaodian`、`gongdian-buju`、`qianchaohouqin` | `gugong` | 故宫博物院官网公开资料；《周礼·考工记》 | `images/encyclopedia/gugong-axis/` | 本轮无图（降级） | 待审 | 2026-11-23 | `gugong-axis.md` |
| `huanghelou-eaves` | 黄鹤楼·五层飞檐与屡毁屡建 | 名筑档案 | building | `huanghelou` | 60–110 | `roof-decoration`、`site-layout` | `roof-ranking`、`feiyan`、`xiangyunwen` | `huanghelou` | 黄鹤楼公园管理处公开资料；地方志《武昌府志》相关记载 | `images/encyclopedia/huanghelou-eaves/` | 本轮无图（降级） | 待审 | 2026-11-23 | `huanghelou-eaves.md` |
| `mogao-cliff` | 莫高窟·崖壁开窟与千年壁画彩塑 | 名筑档案 | building | `mogao` | 70–120 | `structure-material`、`conservation-heritage` | `yabi-kaizao`、`bihua-caisu`、`goudang` | `mogao` | 敦煌研究院公开资料；世界遗产中心莫高窟条目 | `images/encyclopedia/mogao-cliff/` | 本轮无图（降级） | 待审 | 2026-11-23 | `mogao-cliff.md` |
| `potala-fortress` | 布达拉宫·依山而建的宫堡体系 | 名筑档案 | building | `potala` | 60–110 | `site-layout`、`structure-material` | `hangtu`、`gongdian-buju`、`gongmen` | `potala` | 世界遗产中心布达拉宫条目；布达拉宫管理处公开资料 | `images/encyclopedia/potala-fortress/` | 本轮无图（降级） | 待审 | 2026-11-23 | `potala-fortress.md` |
| `tiantan-eaves` | 天坛·三重攒尖与二十八柱的祈年殿 | 名筑档案 | building | `tiantan` | 70–120 | `ritual-function`、`roof-decoration` | `roof-ranking`、`dougong`、`goudang` | `tiantan` | 世界遗产中心天坛条目；天坛公园管理处公开资料 | `images/encyclopedia/tiantan-eaves/` | 本轮无图（降级） | 待审 | 2026-11-23 | `tiantan-eaves.md` |
| `tulou-earthen` | 福建土楼·生土夯筑的环形围合 | 名筑档案 | building | `tulou` | 60–110 | `structure-material`、`site-layout` | `hangtu`、`yuanxing-weiyuan`、`goudang` | `tulou` | 世界遗产中心福建土楼条目；永定/南靖地方志 | `images/encyclopedia/tulou-earthen/` | 本轮无图（降级） | 待审 | 2026-11-23 | `tulou-earthen.md` |
| `yingxian-bracket` | 应县木塔·明五暗四与斗拱博物馆 | 名筑档案 | building | `yingxian_muta` | 70–120 | `structure-material`、`conservation-heritage` | `dougong`、`dougong-levels`、`goudang` | `yingxian_muta` | 全国重点文物保护单位名录；应县木塔管理处公开资料 | `images/encyclopedia/yingxian-bracket/` | 本轮无图（降级） | 待审 | 2026-11-23 | `yingxian-bracket.md` |
| `foguangsi-eave` | 佛光寺东大殿·七铺作斗拱与深远出檐 | 名筑档案 | building | `foguangsi` | 70–120 | `structure-material`、`roof-decoration` | `dougong`、`dougong-levels`、`wudian-roof` | `foguangsi` | 五台山世界遗产资料；国家文物局公开资料 | `images/encyclopedia/foguangsi-eave/` | 本轮无图（降级） | 待审 | 2026-11-23 | `foguangsi-eave.md` |
| `yueyanglou-helmet` | 岳阳楼·三层三檐与四角盔顶 | 名筑档案 | building | `yueyanglou` | 60–110 | `roof-decoration`、`site-layout` | `roof-ranking`、`feiyan`、`xiangyunwen` | `yueyanglou` | 岳阳楼景区管理处公开资料；范仲淹《岳阳楼记》 | `images/encyclopedia/yueyanglou-helmet/` | 本轮无图（降级） | 待审 | 2026-11-23 | `yueyanglou-helmet.md` |

## 2. 新增通用术语（7 条）

| term_id | 标题 | category | entry_type | primary_palace_id | synopsis 字数 | knowledge_dimensions | related_terms（≥2） | related_palaces | source_refs | image_dir | 许可 | 审核 | 核校日期 | 正文 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hangtu` | 夯土版筑 | 建筑规制 | craft | null | 50–100 | `structure-material` | `shiqiang`、`yuanxing-weiyuan`、`fengsui` | `changcheng`、`tulou`、`potala` | 中国古代建筑技术史公开资料 | `images/encyclopedia/hangtu/` | 本轮无图（降级） | 待审 | 2026-11-23 | `hangtu.md` |
| `fengsui` | 烽燧与关隘 | 建筑规制 | craft | null | 50–100 | `site-layout`、`structure-material` | `hangtu`、`shiqiang`、`changcheng-wall` | `changcheng` | 长城保护公开资料；国家文物局公开文本 | `images/encyclopedia/fengsui/` | 本轮无图（降级） | 待审 | 2026-11-23 | `fengsui.md` |
| `shiqiang` | 条石与砖石砌筑 | 建筑规制 | craft | null | 50–100 | `structure-material` | `hangtu`、`sumeru`、`fengsui` | `changcheng`、`potala` | 中国古代建筑技术史公开资料 | `images/encyclopedia/shiqiang/` | 本轮无图（降级） | 待审 | 2026-11-23 | `shiqiang.md` |
| `yabi-kaizao` | 崖壁开窟 | 建筑规制 | craft | null | 50–100 | `structure-material`、`ritual-function` | `bihua-caisu`、`goudang`、`sumeru` | `mogao` | 敦煌研究院公开资料；《中国石窟寺》相关论述 | `images/encyclopedia/yabi-kaizao/` | 本轮无图（降级） | 待审 | 2026-11-23 | `yabi-kaizao.md` |
| `bihua-caisu` | 壁画与彩塑 | 建筑装饰 | craft | null | 50–100 | `roof-decoration`、`ritual-function` | `yabi-kaizao`、`caihua-hexi`、`caihua-xuanzi` | `mogao` | 敦煌研究院公开资料 | `images/encyclopedia/bihua-caisu/` | 本轮无图（降级） | 待审 | 2026-11-23 | `bihua-caisu.md` |
| `feiyan` | 飞檐与翼角 | 屋顶 | craft | null | 50–100 | `roof-decoration` | `roof-ranking`、`dougong`、`xiangyunwen` | `huanghelou`、`yueyanglou` | 中国古代建筑营造公开资料；《营造法式》相关论述 | `images/encyclopedia/feiyan/` | 本轮无图（降级） | 待审 | 2026-11-23 | `feiyan.md` |
| `yuanxing-weiyuan` | 环形围合 | 建筑规制 | craft | null | 50–100 | `site-layout`、`structure-material` | `hangtu`、`gongdian-buju`、`goudang` | `tulou` | 世界遗产中心福建土楼条目；地方志 | `images/encyclopedia/yuanxing-weiyuan/` | 本轮无图（降级） | 待审 | 2026-11-23 | `yuanxing-weiyuan.md` |

## 3. 既有 26 条词条关联补丁（只追加，不改原值）

> 执行口径：`JSON_CONTAINS(related_palaces, '"<palace_id>"') = 0` 才追加；回滚按同清单反向移除且只移除本迁移追加项。

| 既有词条 id | 追加关联建筑（只追加） | 追加理由 | 标注 |
|---|---|---|---|
| `roof-ranking` | `gugong`、`tiantan`、`foguangsi`、`yueyanglou` | 屋顶等级在宫城整体、坛庙、唐代殿堂、楼阁上的体现 | 追加/不改原值 |
| `wudian-roof` | `foguangsi`、`gugong` | 单檐庑殿顶的唐代实例与宫城整体 | 追加/不改原值 |
| `dougong` | `yingxian_muta`、`foguangsi` | 斗拱博物馆与七铺作斗拱 | 追加/不改原值 |
| `dougong-levels` | `yingxian_muta`、`foguangsi` | 斗拱层数/铺作等级的实物对照 | 追加/不改原值 |
| `goudang` | `yingxian_muta`、`tiantan`、`tulou` | 纯木榫卯、无钉穹顶、土楼木构内环 | 追加/不改原值 |
| `sumeru` | `gugong`、`mogao` | 宫城台基体系与石窟佛坛基座对照 | 追加/不改原值 |
| `gongmen` | `gugong`、`potala` | 宫城门制与宫堡门户 | 追加/不改原值 |
| `menshi` | `gugong`、`potala` | 门饰构件在宫城与宫堡中的差异 | 追加/不改原值 |
| `screen-wall` | `gugong` | 宫城影壁体系 | 追加/不改原值 |
| `liulizhaobi` | `gugong` | 宫城琉璃照壁 | 追加/不改原值 |
| `caihua-hexi` | `gugong`、`mogao` | 官式彩画与石窟彩绘对照 | 追加/不改原值 |
| `caihua-xuanzi` | `gugong`、`mogao` | 旋子彩画与石窟彩绘对照 | 追加/不改原值 |
| `sanchaodian` | `gugong`、`potala`、`tulou` | 礼制布局在宫城、宫堡、聚落中的变体 | 追加/不改原值 |
| `qianchaohouqin` | `gugong`、`potala`、`tulou` | 前后分区在不同建筑类型中的变体 | 追加/不改原值 |
| `gongdian-buju` | `gugong`、`potala`、`tulou` | 院落/聚落布局的跨类型对照 | 追加/不改原值 |
| `huangliuwa` | `gugong`、`tiantan` | 黄瓦/蓝瓦体系的对照 | 追加/不改原值 |
| `jishou-xianren` | `gugong`、`tiantan` | 脊兽在宫城与坛庙的配置差异 | 追加/不改原值 |
| `chiwen` | `gugong`、`tiantan` | 正吻在宫城与坛庙屋顶上的形制 | 追加/不改原值 |
| `longwen` | `gugong`、`mogao`、`yueyanglou` | 龙纹跨建筑类型对照 | 追加/不改原值 |
| `fengwen` | `gugong`、`mogao`、`yueyanglou` | 凤纹跨建筑类型对照 | 追加/不改原值 |
| `xiangyunwen` | `gugong`、`mogao`、`yueyanglou` | 祥云纹跨建筑类型对照 | 追加/不改原值 |
| `chuchu` | `foguangsi`、`tulou` | 唐代柱础与土楼木构柱础 | 追加/不改原值 |
| `caisson` | `gugong`、`mogao` | 殿内藻井与石窟窟顶 | 追加/不改原值 |
| `yubaoshi` | `gugong` | 宫城石雕体系 | 追加/不改原值 |
| `xieshan-roof` | `gugong` | 宫城歇山实例（既有条目已含故宫单体，补全景） | 追加/不改原值 |

> `xuanshan-roof` 保持原值（本轮无新增建筑需要追加，且不得为凑数改写）。

## 4. 文案 key 表（供 T-BK-19 落地）

| key | 中文文案 |
|---|---|
| `encyclopedia.filter.all` | 全部 |
| `encyclopedia.filter.building` | 按建筑 |
| `encyclopedia.filter.category` | 按构件 |
| `encyclopedia.filter.dynasty` | 按朝代 |
| `encyclopedia.filter.region` | 按地区 |
| `encyclopedia.filter.reset` | 清除筛选 |
| `encyclopedia.group.building` | 名筑档案 |
| `encyclopedia.group.craft` | 构件术语 |
| `encyclopedia.group.count` | {{count}} 条 |
| `encyclopedia.empty.title` | 暂无匹配的建筑知识 |
| `encyclopedia.empty.hint` | 试试清除筛选，或从建筑详情页进入 |
| `encyclopedia.coverage.label` | 建筑知识覆盖 |
| `encyclopedia.coverage.value` | {{covered}} / {{total}} 座 |
| `encyclopedia.knowledge.relatedTerms` | 相关构件术语 |
| `encyclopedia.knowledge.relatedPalaces` | 关联建筑 |
| `encyclopedia.knowledge.source` | 资料来源 |
| `encyclopedia.knowledge.dimensions` | 知识维度 |
| `encyclopedia.englishComingSoon` | 英文版整理中 |

## 5. 台账自检

- [x] 10 条建筑专属词条，`primary_palace_id` 与建筑 id 一致
- [x] 7 条通用术语，`category` 均在既有 11 类内（无「营造工艺」）
- [x] 既有 26 条中 25 条有追加清单，`xuanshan-roof` 明确不改
- [x] 每行 `source_refs` 非空
- [x] `synopsis` 目标字数区间已记录
- [x] 正文文件 17 个已生成于 `docs/content/entries/`
- [ ] 配图尚未获得授权（见 `docs/content/bk-image-credits.md`）