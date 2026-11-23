# AC4 故宫可视化系统 — 架构文档

## 技术栈

- **后端**: Node.js + Express + MySQL (mysql2 连接池)
- **前端**: React 19 + Vite + Three.js (@react-three/fiber, @react-three/drei, postprocessing)
- **认证**: JWT (jsonwebtoken) + bcryptjs
- **动画**: framer-motion

## 系统架构

```
┌─────────────────────────────────────────────┐
│                 浏览器                        │
│  React SPA (React Router, 10 个页面)         │
│  ├─ 认证状态: AuthContext (localStorage 持久化)│
│  ├─ API 层: api.js (axios + JWT 拦截器)       │
│  ├─ 3D 渲染: @react-three/fiber              │
│  └─ 程序化建筑: procedural/ (无 GLB 实时生成)  │
└──────────────────┬──────────────────────────┘
                   │ HTTP (Bearer Token)
┌──────────────────▼──────────────────────────┐
│          Express 后端 (:3001)                 │
│  ├─ JWT 中间件 (authMiddleware/optionalAuth)  │
│  ├─ 路由: palaces/auth/encyclopedia/quiz/    │
│  │        signin/skins                       │
│  ├─ 推荐引擎: services/tagEngine.js          │
│  └─ 静态托管: /images /models /videos        │
│              + client/dist (生产模式)         │
└──────────────────┬──────────────────────────┘
                   │ mysql2 连接池
┌──────────────────▼──────────────────────────┐
│              MySQL (ac4_db)                  │
│  16 张表: 内容数据 + 用户数据 + 互动数据      │
└─────────────────────────────────────────────┘
```

## 前端设计

### 页面体系

| 页面 | 定位 | 核心组件 |
|------|------|---------|
| 总览 `/` | 公开卡片预览: 海报轮播 + 分类筛选 + 建筑卡片 | OverviewPage, BuildingCard |
| 3D 展厅 `/gallery` | 建筑轴 + 3D 舞台 + 可折叠建筑档案 | ModelViewer, HallAxis, DetailPanel |
| 时空地图 `/map` | 5 张故宫主题舆图, 点击建筑跳转 3D | MapPage |
| 历史沿革 `/timeline` | 横向年表 | TimelinePage |
| 营造法式百科 `/encyclopedia` | 古建筑知识库 (API 驱动) | EncyclopediaPage |
| 翰林院答题 `/quiz` | 答题 + 统计 + 功名榜 | QuizPage, QuizModal |
| 沉浸式展览 `/exhibition/:id` | 宣纸底色博物馆展览风格 | ExhibitionViewer, HotspotSystem |
| 清式十八斗 `/douba-eighteen` | 斗拱构件拆解展示 | EighteenDouViewer |
| 个人中心 `/profile` | 足迹/收藏/徽章/皮肤/集章 | ProfilePage |
| 登录 `/login` | 登录注册 | LoginPage |

### 3D 渲染架构

- **ModelViewer**: 通用查看器, 支持旋转/缩放/平移, 皮肤系统 (线稿/雪景/古画) 通过材质与后处理切换; `model_path` 为 `procedural:<key>` 时切换为程序化渲染
- **程序化建筑 (procedural/)**: 三座无 GLB 资源的古建筑由 Three.js 实时生成:
  - `YingxianPagoda` 应县木塔 — 八角五层、逐层出檐、平座栏杆、塔刹
  - `FoguangHall` 佛光寺东大殿 — 七间四进柱网、额枋、柱头/补间铺作、曲面庑殿顶
  - `YueyangTower` 岳阳楼 — 三层三檐、四角盔顶、平座栏杆
  - `architectureUtils` 提供曲面庑殿顶 (`createCurvedHipGeometry`) 与反宇檐口/攒尖旋转体 (`createSkirtGeometry`)
  - `LayerGroup` 负责五层 (台基/柱网梁架/斗拱/屋顶/装饰) 显隐与拆解动画
- **HotspotSystem**: 3D 场景中的可交互脉冲标记, 基于 `data/buildingHotspots.js` 的坐标数据, 点击弹出 HotspotInfoCard
- **ExhibitionViewer**: 展览专用查看器, 精确过滤模型内部地面/底座使模型贴地; 通过 `proceduralKey` 支持程序化模型

### 状态管理

- **AuthContext**: 全局认证状态, localStorage (`palace_auth`) 持久化, 提供 login/register/logout/refreshAuth
- **API 层**: `api.js` 统一封装 axios 实例, 请求拦截器自动携带 JWT

## 数据库设计

16 张表分三类:

### 内容数据

| 表 | 说明 |
|------|------|
| `palaces` | 建筑主表: 名称/朝代/尺寸/简介/模型路径/分类/诗句/标签/海报/四视图/相机预设等（20 座） |
| `palace_images` | 宫殿图片 (palace_id 外键, sort_order 排序) |
| `palace_timeline` | 历史沿革事件 (year, event) |
| `palace_fun_facts` | 趣味典故 |
| `encyclopedia_terms` | 百科术语 (分类/内容/图片) |

### 用户数据

| 表 | 说明 |
|------|------|
| `users` | 用户 (bcrypt 密码, 积分, 兴趣标签) |
| `user_history` | 游览历史 (palace_id, duration_seconds) |
| `user_collections` | 收藏 (palace_id, category, note) |
| `user_signins` | 每日签到 (连续天数, 积分) |
| `user_skins` | 已解锁皮肤 (uk_user_skin 唯一约束) |
| `user_tags` | 兴趣标签权重 (推荐引擎输入) |
| `user_recommendations` | 推荐记录 |
| `badges` / `user_badges` | 徽章定义与用户获得记录 |

### 互动数据

| 表 | 说明 |
|------|------|
| `quiz_questions` | 题库 (难度/标签/关联宫殿) |
| `quiz_records` | 答题记录 (对错/得分) |

## 后端设计

### 中间件

- `authMiddleware`: 强制认证, 校验 Bearer Token, 401 时返回 `NO_TOKEN` / `TOKEN_EXPIRED` / `INVALID_TOKEN` 错误码
- `optionalAuth`: 可选认证, Token 无效时按未登录处理

### 路由

| 路由 | 认证 | 职责 |
|------|------|------|
| `/api/palaces` | 否 | 宫殿列表/搜索/筛选/详情 |
| `/api/auth` | 部分 | 注册/登录 (公开), 足迹/收藏 (认证) |
| `/api/encyclopedia` | 否 | 百科术语 |
| `/api/quiz` | 是 | 题目/作答/记录/统计/成就 |
| `/api/signin` | 是 | 每日签到 |
| `/api/skins` | 是 | 皮肤解锁/切换 (积分消费) |

### 推荐引擎 (services/tagEngine.js)

基于用户行为 (游览、收藏、答题正确类别) 更新 `user_tags` 权重, 为用户推荐感兴趣的建筑与百科内容。

### 静态资源与部署

- 开发模式: Vite (:5173) 代理 `/api`、`/images`、`/models` (静态资源) 到后端 (:3001)
- 生产模式: `client/dist` 构建产物由 Express 直接托管, 单端口 (:3001) 部署
- 注意: 前端 3D 展厅路由为 `/gallery`, 避免与静态资源代理 `/models/*` 冲突

## 安全设计

- 密码 bcrypt 加盐哈希存储
- JWT 7 天有效期, 支持通过 `JWT_SECRET` 环境变量注入密钥
- 所有 SQL 使用参数化查询 (pool.execute), 防注入
