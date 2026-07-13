# AC4 故宫可视化系统

中国古代建筑瑰宝 — 故宫10座宫殿3D可视化展示平台

## 技术栈

- **后端**: Node.js + Express + MySQL
- **前端**: React 18 + Vite + Three.js (@react-three/fiber)
- **数据库**: MySQL (utf8mb4 字符集)

## 快速开始

### 前置条件

1. 安装 Node.js >= 18
2. 安装 MySQL >= 8.0

### 1. 初始化数据库

```bash
mysql -u root -p < server/db/init.sql
```

### 2. 启动后端服务

```bash
cd server
npm start
# 或开发模式: npm run dev
```

后端运行在 `http://localhost:3001`

### 3. 启动前端开发服务器

```bash
cd client
npm run dev
```

前端运行在 `http://localhost:5173`

### 4. 生产构建

```bash
cd client
npm run build
```

## 功能特性

- **搜索**: 按名称、朝代、关键词搜索宫殿
- **筛选**: 按类别（宫殿/关隘）、朝代筛选
- **3D展示**: Three.js 实时渲染，支持旋转、缩放
- **详情面板**: 建筑简介、基本信息、历史沿革、趣味典故
- **响应式布局**: 三栏博物馆风格设计

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/palaces` | 获取所有宫殿列表 |
| GET | `/api/palaces/:id` | 获取单个宫殿详情（含图片、时间线、典故） |
| GET | `/api/palaces/search?q=` | 搜索宫殿 |
| GET | `/api/palaces/filter?category=&dynasty=` | 筛选宫殿 |

## 项目结构

```
acvisual 4/
├── server/              # 后端服务
│   ├── src/
│   │   ├── app.js       # Express 入口
│   │   ├── db.js        # MySQL 连接池
│   │   └── routes/
│   │       └── palaces.js
│   └── db/
│       └── init.sql     # 数据库初始化脚本
├── client/              # 前端应用
│   ├── src/
│   │   ├── App.jsx      # 主组件
│   │   ├── api.js       # API 请求封装
│   │   ├── components/
│   │   │   ├── ModelViewer.jsx    # Three.js 3D查看器
│   │   │   ├── PalaceList.jsx     # 左侧列表
│   │   │   ├── DetailPanel.jsx    # 右侧详情
│   │   │   └── SearchBar.jsx      # 搜索栏
│   │   └── styles/
│   │       └── global.css
│   └── vite.config.js
└── ARCHITECTURE.md      # 架构设计文档
```

## 数据说明

包含故宫中轴线上的10座建筑：

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
