# AC4 故宫可视化系统

中国古代建筑瑰宝 — 故宫 10 座宫殿 + 7 座华夏名筑 + 3 座程序化复原古建筑 3D 可视化展示与古建筑知识互动平台

## 技术栈

- **后端**: Node.js + Express + MySQL (mysql2)
- **前端**: React 19 + Vite + Three.js (@react-three/fiber + drei)
- **认证**: JWT (jsonwebtoken) + bcryptjs 密码加密
- **动画**: framer-motion、postprocessing

## 功能特性

### 3D 展示

- **模型查看器**: Three.js 实时渲染，支持旋转、缩放、平移；兼容 Draco 与 Meshopt 两种压缩格式
- **华夏名筑**: 故宫之外 7 座全国古建筑（长城、故宫全景、黄鹤楼、莫高窟、布达拉宫、天坛、福建土楼），每座带最佳观察相机预设
- **程序化复原**: 应县木塔 / 佛光寺东大殿 / 岳阳楼三座古建筑不依赖 GLB 资源，由 Three.js 实时生成几何体，可无限扩展建筑库
- **营造拆解**: 程序化建筑支持台基 / 柱网梁架 / 斗拱 / 屋顶 / 装饰五层独立显隐，并可一键拆解层叠，直观展示中国木构建筑的营造层次
- **热点系统**: 3D 场景中的可交互脉冲标记，点击查看构件讲解
- **3D 皮肤**: 默认模式 / 线稿模式 / 雪景模式 / 古画模式，可用答题积分解锁
- **清式十八斗**: 斗拱构件的独立拆解展示页
- **沉浸式展览**: 明亮优雅的博物馆展览风格独立页面

### 知识模块

- **营造法式百科**: 古建筑知识库，涵盖屋顶等级、斗拱、彩画、柱础、台基、门窗、琉璃、脊兽、纹饰、建筑规制
- **时空地图**: 5 张故宫主题舆图（游览路线 / 建筑形式 / 建筑等级 / 原状陈列 / 常设专馆），支持拖拽平移、滚轮缩放、点击建筑跳转 3D
- **历史沿革时间轴**: 横向年表，串联所有建筑的历史事件

### 互动与用户系统

- **认证系统**: 注册 / 登录 / JWT 会话保持
- **翰林院答题**: 随机题目、难度标签、答题统计、功名榜成就徽章
- **每日签到**: 连续签到奖励积分
- **收藏与足迹**: 宫殿收藏、游览历史记录
- **个人中心（养心殿）**: 御览足迹、珍宝阁、徽章成就、虚拟集章
- **兴趣标签推荐**: 基于用户标签权重的内容推荐

### 基础功能

- **搜索**: 按名称、朝代、关键词搜索建筑（覆盖诗句、标签、地区）
- **筛选**: 按类别（宫殿/关隘/楼阁/佛塔/寺庙/石窟/军事工程/坛庙/民居）、朝代筛选
- **详情面板**: 建筑简介、经典诗句、标签、关键数据、四视图画廊、历史沿革、趣味典故
- **响应式布局**: 三栏博物馆风格设计

## 快速开始

### 前置条件

1. 安装 Node.js >= 18
2. 安装 MySQL >= 8.0

### 1. 安装依赖

```bash
# 根目录（concurrently 一键启动、playwright 截图工具）
npm install
# 后端
cd server && npm install
# 前端
cd client && npm install
```

### 2. 初始化数据库

```bash
npm run db:init
# 等价于: mysql -u root -p < server/db/init_full.sql
```

数据库名为 `ac4_db`（脚本自动创建，含建表与种子数据）。

> **已有数据库升级**（不丢数据）：依次执行迁移脚本：
>
> ```bash
> mysql -u root -p ac4_db < server/db/migration_national_monuments.sql
> mysql -u root -p ac4_db < server/db/migration_procedural_buildings.sql
> ```
>
> 也可使用项目自带执行器：
>
> ```bash
> node server/scripts/apply-migration.js server/db/migration_procedural_buildings.sql
> ```

### 3. 一键启动（开发模式）

```bash
npm run dev
```

- 后端运行在 `http://localhost:3001`
- 前端运行在 `http://localhost:5173`（Vite 代理 `/api`、`/images`、`/models` 到后端）

### 4. 分开启动（可选）

```bash
# 后端（支持 --watch 热重载）
cd server && npm run dev
# 前端
cd client && npm run dev
```

### 5. 生产构建与部署

```bash
# 构建前端
npm run build
# 启动后端（自动托管 client/dist 与静态资源）
cd server && npm start
```

构建后后端直接托管前端产物，访问 `http://localhost:3001` 即可。

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页总览 | 公开的卡片预览页（海报轮播 + 建筑卡片） |
| `/login` | 登录注册 | 已登录自动跳转首页 |
| `/gallery` | 3D 模型展厅 | 建筑轴 + 3D 舞台 + 建筑档案 |
| `/map` | 时空地图 | 5 张故宫主题舆图 |
| `/timeline` | 历史沿革 | 横向年表 |
| `/encyclopedia` | 营造法式百科 | 古建筑知识库 |
| `/quiz` | 翰林院答题 | 答题 + 统计 + 成就 |
| `/exhibition/:id` | 沉浸式展览 | 单建筑 3D 展览页（支持 GLB 与程序化模型） |
| `/douba-eighteen` | 清式十八斗 | 斗拱构件拆解展示 |
| `/profile` | 个人中心 | 足迹、收藏、徽章、皮肤 |

> 注意：前端页面路由使用 `/gallery`，而静态资源 `/models/*` 由 Vite 代理到后端，二者互不冲突。
>
> 除 `/` 与 `/login` 外所有页面需要登录访问。

## API 接口

统一前缀 `/api`，除注册/登录外均需 `Authorization: Bearer <token>`。

### 宫殿

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/palaces` | 获取所有宫殿列表 |
| GET | `/api/palaces/search?q=` | 搜索宫殿 |
| GET | `/api/palaces/filter?category=&dynasty=` | 筛选宫殿 |
| GET | `/api/palaces/:id` | 单个宫殿详情（含图片、时间线、典故） |

### 认证与用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（username, password, email, interest_tag） |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/profile` | 获取用户信息 |
| PUT | `/api/auth/profile` | 更新用户信息 |
| GET | `/api/auth/history` | 游览历史 |
| POST | `/api/auth/history` | 记录游览（palace_id, duration_seconds） |
| GET | `/api/auth/collections` | 收藏列表 |
| POST | `/api/auth/collections` | 添加收藏 |
| DELETE | `/api/auth/collections/:palaceId` | 取消收藏 |

### 百科

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/encyclopedia` | 术语列表（category, search） |
| GET | `/api/encyclopedia/categories` | 分类列表 |
| GET | `/api/encyclopedia/:id` | 术语详情 |

### 翰林院答题

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/quiz/questions` | 随机题目（difficulty, tags, count, palace_id） |
| GET | `/api/quiz/questions/:id` | 单题详情 |
| POST | `/api/quiz/answer` | 提交答案（question_id, answer） |
| GET | `/api/quiz/records` | 答题记录（page, limit） |
| GET | `/api/quiz/stats` | 答题统计 |
| GET | `/api/quiz/achievements` | 功名榜成就 |

### 每日签到

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/signin` | 执行签到 |
| GET | `/api/signin/status` | 签到状态 |

### 3D 皮肤

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skins` | 所有皮肤及用户解锁状态 |
| POST | `/api/skins/unlock` | 用积分解锁皮肤（skin_type） |
| PUT | `/api/skins/activate` | 切换激活皮肤（skin_type） |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

## 数据库

16 张表（`ac4_db`，utf8mb4）：

| 表 | 说明 |
|------|------|
| `palaces` | 建筑主表（20 座：故宫 10 + 华夏名筑 7 + 程序化复原 3） |
| `palace_images` | 宫殿图片 |
| `palace_timeline` | 历史时间线 |
| `palace_fun_facts` | 趣味典故 |
| `users` | 用户（bcrypt 加密密码） |
| `user_history` | 游览历史 |
| `user_collections` | 收藏 |
| `user_signins` | 每日签到 |
| `user_skins` | 已解锁的 3D 皮肤 |
| `user_tags` | 兴趣标签权重（推荐引擎） |
| `user_recommendations` | 推荐记录 |
| `badges` | 徽章定义 |
| `user_badges` | 用户已获徽章 |
| `encyclopedia_terms` | 百科术语 |
| `quiz_questions` | 题库 |
| `quiz_records` | 答题记录 |

## 项目结构

```
acvisual 4/
├── server/                      # 后端服务
│   ├── src/
│   │   ├── app.js               # Express 入口（托管静态资源与前端构建产物）
│   │   ├── db.js                # MySQL 连接池
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT 认证中间件
│   │   ├── routes/
│   │   │   ├── palaces.js       # 宫殿 API
│   │   │   ├── auth.js          # 注册/登录/足迹/收藏
│   │   │   ├── encyclopedia.js  # 百科 API
│   │   │   ├── quiz.js          # 答题 API
│   │   │   ├── signin.js        # 签到 API
│   │   │   └── skins.js         # 3D 皮肤 API
│   │   └── services/
│   │       └── tagEngine.js     # 兴趣标签推荐引擎
│   └── db/
│       ├── init_full.sql                     # 数据库初始化脚本（建库建表 + 种子数据）
│       ├── migration_national_monuments.sql  # 华夏名筑迁移脚本
│       └── migration_procedural_buildings.sql # 程序化复原建筑迁移脚本
├── client/                      # 前端应用
│   ├── public/
│   │   └── draco/               # Draco 解码器（本地, 不依赖 Google CDN）
│   ├── src/
│   │   ├── App.jsx              # 路由定义
│   │   ├── api.js               # API 请求封装（axios + JWT 拦截器）
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # 全局认证状态
│   │   ├── pages/               # 9 个页面（见"页面路由"）
│   │   ├── lib/
│   │   │   └── modelLoader.js       # GLB 加载 / 归一化 / 自动构图
│   │   ├── components/          # 组件库
│   │   │   ├── ModelViewer.jsx      # Three.js 3D 查看器（GLB + 程序化）
│   │   │   ├── procedural/          # 程序化复原建筑
│   │   │   │   ├── index.jsx            # 注册表 / 舞台 / 拆解图层定义
│   │   │   │   ├── YingxianPagoda.jsx   # 应县木塔（八角五层）
│   │   │   │   ├── FoguangHall.jsx      # 佛光寺东大殿（唐代庑殿顶）
│   │   │   │   ├── YueyangTower.jsx     # 岳阳楼（三层盔顶）
│   │   │   │   ├── architectureUtils.js # 曲面屋顶／檐口几何工具
│   │   │   │   └── LayerGroup.jsx       # 分层显隐与拆解动画
│   │   │   ├── ExhibitionViewer.jsx # 沉浸式展览查看器
│   │   │   ├── EighteenDouViewer.jsx # 十八斗拆解查看器
│   │   │   ├── HotspotSystem.jsx    # 3D 热点系统
│   │   │   ├── HotspotInfoCard.jsx  # 热点信息卡片
│   │   │   ├── PalaceList.jsx       # 宫殿列表
│   │   │   ├── DetailPanel.jsx      # 详情面板
│   │   │   ├── SearchBar.jsx        # 搜索栏
│   │   │   ├── QuizModal.jsx        # 答题弹窗
│   │   │   ├── LoginModal.jsx       # 登录弹窗
│   │   │   ├── LoginPage.jsx        # 登录页
│   │   │   ├── SigninButton.jsx     # 签到按钮
│   │   │   ├── AchievementBadge.jsx # 成就徽章
│   │   │   ├── CoinAnimation.jsx    # 积分动画
│   │   │   ├── PixelBlast.jsx       # 像素粒子特效
│   │   │   ├── ShinyText.jsx        # 金属光泽文字
│   │   │   ├── SpotlightCard.jsx    # 光晕卡片
│   │   │   └── LoadingScreen.jsx    # 加载页
│   │   ├── data/
│   │   │   └── buildingHotspots.js  # 建筑热点数据
│   │   └── styles/
│   │       └── global.css       # 全局样式
│   └── vite.config.js           # Vite 配置（代理到后端）
├── images/                      # 图片资源（不随 git 提交）
│   ├── posters/                 #   华夏名筑海报图
│   └── views/                   #   华夏名筑四视图
├── models/                      # 3D 模型资源（不随 git 提交）
│   ├── forbidden-city/          #   故宫 10 座建筑（Meshopt 压缩）
│   └── national/                #   华夏名筑 7 座（Draco 压缩）
├── videos/                      # 视频资源（不随 git 提交）
└── ARCHITECTURE.md              # 架构设计文档
```

## 数据说明

### 20 座建筑

**故宫中轴线（10 座）**

| 序号 | 名称 | 分类 |
|------|------|------|
| 1 | 午门 | 关隘 |
| 2 | 太和门 | 关隘 |
| 3 | 太和殿 | 宫殿 |
| 4 | 中和殿 | 宫殿 |
| 5 | 保和殿 | 宫殿 |
| 6 | 乾清门 | 关隘 |
| 7 | 乾清宫 | 宫殿 |
| 8 | 交泰殿 | 宫殿 |
| 9 | 坤宁宫 | 宫殿 |
| 10 | 神武门 | 关隘 |

**华夏名筑（7 座，全国古建筑扩展）**

| 序号 | 名称 | 分类 | 地区 |
|------|------|------|------|
| 11 | 长城 | 军事工程 | 横贯北疆 |
| 12 | 故宫全景 | 宫殿 | 北京 |
| 13 | 黄鹤楼 | 楼阁 | 湖北武汉 |
| 14 | 莫高窟 | 石窟 | 甘肃敦煌 |
| 15 | 布达拉宫 | 宫殿 | 西藏拉萨 |
| 16 | 天坛 | 坛庙 | 北京 |
| 17 | 福建土楼 | 民居 | 福建 |

每座华夏名筑自带：中英双语数据、经典诗句、标签、关键数据、海报图、四视图画廊与最佳观察相机预设。

**程序化复原（3 座，无 GLB 资源，Three.js 实时生成）**

| 序号 | 名称 | 分类 | 地区 | 结构原型 |
|------|------|------|------|---------|
| 18 | 应县木塔 | 佛塔 | 山西应县 | 八角五层楼阁式木塔，塔刹收顶 |
| 19 | 佛光寺东大殿 | 寺庙 | 山西五台山 | 唐式单檐庑殿顶，七间四进柱网 |
| 20 | 岳阳楼 | 楼阁 | 湖南岳阳 | 三层三檐四角盔顶 |

程序化建筑的数据约定：`palaces.model_path = 'procedural:<key>'`，前端 `client/src/components/procedural/index.jsx` 的注册表按 key 匹配组件；新增建筑只需实现组件并注册，无需准备模型文件。查看器会自动构图，并提供「营造拆解」面板（台基 / 柱网梁架 / 斗拱 / 屋顶 / 装饰分层显隐 + 拆解层叠动画）。

### 3D 皮肤

| 皮肤 | 解锁积分 |
|------|---------|
| 默认模式（朱墙黄瓦） | 免费 |
| 线稿模式（结构线稿） | 500 |
| 雪景模式（飘雪效果） | 500 |
| 古画模式（绢本设色） | 800 |

### 静态资源说明

`images/`、`models/`、`videos/` 目录存放宫殿图片、GLB/GLTF 模型与视频，由于体积较大**不随 git 仓库提交**（见 `.gitignore`）。数据库中的路径引用这些目录，新环境需自行放置对应资源。

## 环境变量

后端支持通过环境变量配置（均提供默认值）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端端口 |
| `DB_HOST` | `localhost` | 数据库地址 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_USER` | `root` | 数据库用户 |
| `DB_PASSWORD` | — | 数据库密码 |
| `DB_NAME` | `ac4_db` | 数据库名 |
| `JWT_SECRET` | — | JWT 签名密钥（**生产环境必须设置**） |
| `JWT_EXPIRES_IN` | `7d` | Token 有效期 |
