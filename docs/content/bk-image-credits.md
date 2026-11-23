# 配图与许可台账（T-BK-02）

- 状态：**本轮无可用授权图片**
- 现状：`images/encyclopedia/` 目录当前不存在（0 个文件），仓库内无对应授权图源
- 处理口径（依任务卡 T-BK-02 ⑤ 与设计）“无授权即无图”：不建占位裂图，前端由「无图隐藏轮播」承接降级
- **DoD 差异（需用户决策）**：T-BK-02 原 DoD 要求 17 个目录各 ≥1 张图；在没有授权图源的情况下无法达成。当前采用「全部无图 + 降级」的过渡方案，待图片与许可到位后按本台账逐条补齐，不改动代码结构。

## 逐条台账

| term_id | image_dir | 计划文件 | 状态 | source | license | author | retrieved_at | 备注 |
|---|---|---|---|---|---|---|---|---|
| `changcheng-wall` | `images/encyclopedia/changcheng-wall/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 需自有拍摄或 CC 授权 |
| `gugong-axis` | `images/encyclopedia/gugong-axis/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 航拍/中轴全景需授权 |
| `huanghelou-eaves` | `images/encyclopedia/huanghelou-eaves/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 檐角特写 |
| `mogao-cliff` | `images/encyclopedia/mogao-cliff/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 洞窟内拍摄多受限 |
| `potala-fortress` | `images/encyclopedia/potala-fortress/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 外观全景 |
| `tiantan-eaves` | `images/encyclopedia/tiantan-eaves/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 祈年殿正面 |
| `tulou-earthen` | `images/encyclopedia/tulou-earthen/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 环形平面俯拍更佳 |
| `yingxian-bracket` | `images/encyclopedia/yingxian-bracket/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 斗拱局部 |
| `foguangsi-eave` | `images/encyclopedia/foguangsi-eave/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 殿内禁止闪光 |
| `yueyanglou-helmet` | `images/encyclopedia/yueyanglou-helmet/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 盔顶轮廓 |
| `hangtu` | `images/encyclopedia/hangtu/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 夯层纹理特写 |
| `fengsui` | `images/encyclopedia/fengsui/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 烽燧与墙体关系 |
| `shiqiang` | `images/encyclopedia/shiqiang/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 条石错缝 |
| `yabi-kaizao` | `images/encyclopedia/yabi-kaizao/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 崖面窟门 |
| `bihua-caisu` | `images/encyclopedia/bihua-caisu/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 壁画局部需授权 |
| `feiyan` | `images/encyclopedia/feiyan/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 翼角起翘 |
| `yuanxing-weiyuan` | `images/encyclopedia/yuanxing-weiyuan/` | `cover.webp` | 无图（待补） | 待定 | 待定 | 待定 | — | 内院与廊道 |

## 补齐要求（图片到位时）

1. 每条词条 1~4 张，单张 ≤300KB，优先 WebP/AVIF；
2. 固定命名 `cover.webp`、`fig-1.webp`、`fig-2.webp`；
3. 逐图补全 `source` / `license` / `author` / `retrieved_at`；
4. 含个人联系方式的图片不得进公开页；
5. 不移动、不重命名既有 `images/posters/`、`images/views/` 文件。

## 验证

- 当前降级路径：前端在无图时不渲染轮播、不出现裂图（T-BK-13/15 验收）
- 图片到位后：`npm run audit:assets` + 逐图体积检查