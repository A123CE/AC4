const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`华夏古建可视化后端服务已启动: http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}/api/palaces`);
});