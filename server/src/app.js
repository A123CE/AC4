const express = require('express');
const cors = require('cors');
const path = require('path');
const palaceRoutes = require('./routes/palaces');
const authRoutes = require('./routes/auth');
const encyclopediaRoutes = require('./routes/encyclopedia');
const quizRoutes = require('./routes/quiz');
const signinRoutes = require('./routes/signin');
const skinRoutes = require('./routes/skins');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 指向项目根目录的图片、模型等资源
const projectRoot = path.resolve(__dirname, '../../');
app.use('/images', express.static(path.join(projectRoot, 'images')));
app.use('/models', express.static(path.join(projectRoot, 'models')));
app.use('/videos', express.static(path.join(projectRoot, 'videos')));

// 生产环境下提供前端构建产物
const clientDist = path.join(projectRoot, 'client', 'dist');
app.use(express.static(clientDist));

// API 路由
app.use('/api/palaces', palaceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/encyclopedia', encyclopediaRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/signin', signinRoutes);
app.use('/api/skins', skinRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`故宫可视化后端服务已启动: http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}/api/palaces`);
});

module.exports = app;
