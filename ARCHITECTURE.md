# AC4 故宫可视化系统 - 新架构方案

## 技术栈
- **后端**: Node.js + Express + MySQL (mysql2)
- **前端**: React 18 + Vite + Three.js (@react-three/fiber, @react-three/drei)
- **数据**: 10座故宫宫殿的3D模型、图片、文本信息

## 项目结构

```
acvisual 4/
├── server/                    # 后端
│   ├── package.json
│   ├── db/
│   │   └── init.sql           # 数据库初始化脚本
│   ├── src/
│   │   ├── app.js             # Express 入口
│   │   ├── db.js              # MySQL 连接池
│   │   └── routes/
│   │       └── palaces.js     # 宫殿 API 路由
│   └── uploads/               # 静态资源目录（模型、图片）
├── client/                    # 前端
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js             # API 请求封装
│       ├── styles/
│       │   └── global.css     # 全局样式
│       ├── components/
│       │   ├── PalaceSearch.jsx      # 搜索栏
│       │   ├── PalaceList.jsx        # 宫殿列表侧边栏
│       │   ├── PalaceCard.jsx        # 宫殿卡片
│       │   ├── ModelViewer.jsx       # Three.js 3D查看器
│       │   └── DetailPanel.jsx       # 右侧详情面板
│       └── pages/
│           └── MuseumPage.jsx        # 主页面
├── data/                      # 现有数据（迁移源）
│   └── forbidden-city-data.js
├── css/                       # 旧CSS（保留museum部分）
├── images/                    # 现有图片
└── models/                    # 现有3D模型
```

## 数据库设计

### palaces 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) PK | 宫殿ID (wumen, taihemen...) |
| name | VARCHAR(50) NOT NULL | 中文名 |
| name_en | VARCHAR(100) | 英文名 |
| order_num | INT | 排列顺序 |
| axis_position | INT | 中轴位置 |
| description | TEXT | 建筑简介 |
| dynasty | VARCHAR(50) | 朝代 |
| built_year | VARCHAR(20) | 建造年份 |
| height | VARCHAR(50) | 高度 |
| area | VARCHAR(50) | 面积 |
| style | VARCHAR(100) | 建筑风格 |
| significance | TEXT | 历史意义 |
| model_path | VARCHAR(255) | 3D模型路径 |
| audio_guide | TEXT | 语音讲解文本 |
| has_video | TINYINT(1) | 是否有视频 |
| video_url | VARCHAR(255) | 视频URL |
| category | VARCHAR(20) | 分类 (宫殿/关隘) |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### palace_images 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT PK | 自增ID |
| palace_id | VARCHAR(50) FK | 关联宫殿ID |
| image_path | VARCHAR(255) | 图片路径 |
| sort_order | INT | 排序 |

### palace_timeline 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT PK | 自增ID |
| palace_id | VARCHAR(50) FK | 关联宫殿ID |
| year | VARCHAR(20) | 年份 |
| event | TEXT | 事件描述 |

### palace_fun_facts 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT PK | 自增ID |
| palace_id | VARCHAR(50) FK | 关联宫殿ID |
| fact | TEXT | 趣味典故内容 |

## API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/palaces | 获取所有宫殿列表 |
| GET | /api/palaces/:id | 获取单个宫殿详情 |
| GET | /api/palaces/search?q=关键词 | 搜索宫殿 |
| GET | /api/palaces/filter?category=宫殿&dynasty=明 | 筛选 |
| GET | /api/images/:palaceId | 获取宫殿图片列表 |
| GET | /api/timeline/:palaceId | 获取历史时间线 |
| GET | /api/facts/:palaceId | 获取趣味典故 |

## 前端设计
- 三栏布局：左侧搜索+列表 | 中央3D模型 | 右侧详情面板
- 保留现有博物馆风格的视觉设计
- 搜索支持按名称、朝代、关键词模糊匹配
- 筛选支持按类别（宫殿/关隘）、朝代
- 3D查看器使用 @react-three/fiber 渲染GLTF模型
